"""
Tests unitaires pour le service de retrait de background
"""
import os
import tempfile
import numpy as np
import cv2
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.files.base import ContentFile
from django.conf import settings
from unittest.mock import patch, MagicMock

from apps.inventory.models import Product
from apps.inventory.services.image_processing import BackgroundRemover
from apps.inventory.views_background_removal import (
    remove_product_background,
    get_product_image_info,
    batch_remove_background
)

class BackgroundRemoverTestCase(TestCase):
    """Tests pour le service BackgroundRemover"""
    
    def setUp(self):
        """Configuration des tests"""
        self.background_remover = BackgroundRemover()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Nettoyage après les tests"""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def create_test_image(self, filename='test.jpg', size=(200, 200), color=(255, 255, 255)):
        """Crée une image de test"""
        # Créer une image avec OpenCV
        image = np.ones((size[1], size[0], 3), dtype=np.uint8) * np.array(color)
        
        # Ajouter un objet au centre
        center_x, center_y = size[0] // 2, size[1] // 2
        cv2.rectangle(image, (center_x-50, center_y-50), (center_x+50, center_y+50), (0, 0, 255), -1)
        
        # Sauvegarder l'image
        image_path = os.path.join(self.temp_dir, filename)
        cv2.imwrite(image_path, image)
        
        return image_path
    
    def test_validate_image_valid(self):
        """Test de validation d'une image valide"""
        image_path = self.create_test_image('valid.jpg')
        
        is_valid, message = self.background_remover.validate_image(image_path)
        
        self.assertTrue(is_valid)
        self.assertEqual(message, "Image valide")
    
    def test_validate_image_not_found(self):
        """Test de validation d'une image inexistante"""
        image_path = os.path.join(self.temp_dir, 'nonexistent.jpg')
        
        is_valid, message = self.background_remover.validate_image(image_path)
        
        self.assertFalse(is_valid)
        self.assertEqual(message, "Fichier non trouvé")
    
    def test_validate_image_unsupported_format(self):
        """Test de validation d'un format non supporté"""
        image_path = os.path.join(self.temp_dir, 'test.txt')
        
        # Créer un fichier texte
        with open(image_path, 'w') as f:
            f.write("Ceci n'est pas une image")
        
        is_valid, message = self.background_remover.validate_image(image_path)
        
        self.assertFalse(is_valid)
        self.assertIn("Format non supporté", message)
    
    def test_validate_image_too_small(self):
        """Test de validation d'une image trop petite"""
        image_path = self.create_test_image('small.jpg', size=(30, 30))
        
        is_valid, message = self.background_remover.validate_image(image_path)
        
        self.assertFalse(is_valid)
        self.assertIn("trop petite", message)
    
    def test_validate_image_too_large(self):
        """Test de validation d'une image trop grande"""
        image_path = self.create_test_image('large.jpg', size=(5000, 5000))
        
        is_valid, message = self.background_remover.validate_image(image_path)
        
        self.assertFalse(is_valid)
        self.assertIn("trop grande", message)
    
    def test_get_processing_stats(self):
        """Test d'obtention des statistiques d'image"""
        image_path = self.create_test_image('stats.jpg', size=(300, 200))
        
        stats = self.background_remover.get_processing_stats(image_path)
        
        self.assertIsInstance(stats, dict)
        self.assertEqual(stats['dimensions'], "300x200")
        self.assertEqual(stats['channels'], 3)
        self.assertIn('brightness', stats)
        self.assertIn('contrast', stats)
        self.assertIn('file_size', stats)
        self.assertEqual(stats['format'], '.jpg')
    
    def test_get_processing_stats_invalid_image(self):
        """Test des statistiques pour une image invalide"""
        image_path = os.path.join(self.temp_dir, 'invalid.jpg')
        
        stats = self.background_remover.get_processing_stats(image_path)
        
        self.assertEqual(stats, {})
    
    def test_create_mask_by_color(self):
        """Test de création de masque par couleur"""
        image_path = self.create_test_image('mask.jpg')
        image = cv2.imread(image_path)
        
        mask = self.background_remover._create_mask_by_color(image)
        
        self.assertIsInstance(mask, np.ndarray)
        self.assertEqual(mask.shape, image.shape[:2])
        self.assertTrue(np.all((mask == 0) | (mask == 255)))
    
    def test_improve_mask_with_grabcut(self):
        """Test d'amélioration de masque avec GrabCut"""
        image_path = self.create_test_image('grabcut.jpg')
        image = cv2.imread(image_path)
        initial_mask = self.background_remover._create_mask_by_color(image)
        
        improved_mask = self.background_remover._improve_mask_with_grabcut(image, initial_mask)
        
        self.assertIsInstance(improved_mask, np.ndarray)
        self.assertEqual(improved_mask.shape, image.shape[:2])
        self.assertTrue(np.all((improved_mask == 0) | (improved_mask == 255)))
    
    def test_apply_mask(self):
        """Test d'application de masque"""
        image_path = self.create_test_image('apply.jpg')
        image = cv2.imread(image_path)
        mask = self.background_remover._create_mask_by_color(image)
        
        result = self.background_remover._apply_mask(image, mask)
        
        self.assertIsInstance(result, np.ndarray)
        self.assertEqual(result.shape, (image.shape[0], image.shape[1], 4))  # BGRA
        self.assertEqual(result.dtype, np.uint8)
    
    def test_save_processed_image(self):
        """Test de sauvegarde d'image traitée"""
        image_path = self.create_test_image('save.jpg')
        image = cv2.imread(image_path)
        mask = self.background_remover._create_mask_by_color(image)
        result = self.background_remover._apply_mask(image, mask)
        
        output_path = self.background_remover._save_processed_image(result, image_path)
        
        self.assertIsNotNone(output_path)
        self.assertTrue(os.path.exists(output_path))
        self.assertTrue(output_path.endswith('_no_bg.png'))
        
        # Vérifier que l'image sauvegardée peut être chargée
        saved_image = cv2.imread(output_path, cv2.IMREAD_UNCHANGED)
        self.assertIsNotNone(saved_image)
        self.assertEqual(saved_image.shape[2], 4)  # BGRA
    
    def test_save_processed_image_failure(self):
        """Test d'échec de sauvegarde"""
        image_path = self.create_test_image('fail.jpg')
        invalid_image = np.array([])  # Image invalide
        
        output_path = self.background_remover._save_processed_image(invalid_image, image_path)
        
        self.assertIsNone(output_path)
    
    @patch('apps.inventory.services.image_processing.cv2.imwrite')
    def test_save_processed_image_cv2_failure(self, mock_imwrite):
        """Test d'échec de sauvegarde OpenCV"""
        mock_imwrite.return_value = False  # Simuler un échec
        
        image_path = self.create_test_image('cv2_fail.jpg')
        image = cv2.imread(image_path)
        mask = self.background_remover._create_mask_by_color(image)
        result = self.background_remover._apply_mask(image, mask)
        
        output_path = self.background_remover._save_processed_image(result, image_path)
        
        self.assertIsNone(output_path)
        mock_imwrite.assert_called_once()
    
    def test_remove_background_success(self):
        """Test de retrait de background réussi"""
        image_path = self.create_test_image('success.jpg')
        
        result_path = self.background_remover.remove_background(image_path)
        
        self.assertIsNotNone(result_path)
        self.assertTrue(os.path.exists(result_path))
        self.assertTrue(result_path.endswith('_no_bg.png'))
    
    def test_remove_background_file_not_found(self):
        """Test de retrait de background avec fichier inexistant"""
        image_path = os.path.join(self.temp_dir, 'nonexistent.jpg')
        
        result_path = self.background_remover.remove_background(image_path)
        
        self.assertIsNone(result_path)
    
    def test_remove_background_invalid_image(self):
        """Test de retrait de background avec image invalide"""
        image_path = os.path.join(self.temp_dir, 'invalid.jpg')
        
        # Créer un fichier qui n'est pas une image
        with open(image_path, 'w') as f:
            f.write("Ceci n'est pas une image")
        
        result_path = self.background_remover.remove_background(image_path)
        
        self.assertIsNone(result_path)
    
    @patch('apps.inventory.services.image_processing.cv2.imread')
    def test_remove_background_cv2_error(self, mock_imread):
        """Test de retrait de background avec erreur OpenCV"""
        mock_imread.return_value = None  # Simuler un échec de chargement
        
        image_path = self.create_test_image('cv2_error.jpg')
        
        result_path = self.background_remover.remove_background(image_path)
        
        self.assertIsNone(result_path)
        mock_imread.assert_called_once()


class BackgroundRemovalAPITestCase(TestCase):
    """Tests pour les API endpoints de retrait de background"""
    
    def setUp(self):
        """Configuration des tests"""
        self.temp_dir = tempfile.mkdtemp()
        
        # Créer un utilisateur de test
        from django.contrib.auth.models import User
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        # Créer une image de test
        self.test_image_path = self.create_test_image()
        
        # Créer un produit de test
        self.product = Product.objects.create(
            name='Produit Test',
            cug='TEST001',
            price=10.99,
            user=self.user
        )
        
        # Ajouter l'image au produit
        with open(self.test_image_path, 'rb') as f:
            image_file = ContentFile(f.read())
            image_file.name = 'test_product.jpg'
            self.product.image.save('test_product.jpg', image_file, save=True)
    
    def tearDown(self):
        """Nettoyage après les tests"""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def create_test_image(self, filename='test_api.jpg', size=(200, 200)):
        """Crée une image de test pour les API"""
        image = np.ones((size[1], size[0], 3), dtype=np.uint8) * 255  # Background blanc
        
        # Ajouter un objet coloré au centre
        center_x, center_y = size[0] // 2, size[1] // 2
        cv2.rectangle(image, (center_x-50, center_y-50), (center_x+50, center_y+50), (0, 0, 255), -1)
        
        image_path = os.path.join(self.temp_dir, filename)
        cv2.imwrite(image_path, image)
        
        return image_path
    
    def test_remove_product_background_success(self):
        """Test de retrait de background réussi via API"""
        from django.test import Client
        from django.contrib.auth import authenticate
        
        client = Client()
        client.force_login(self.user)
        
        response = client.post(f'/api/v1/products/{self.product.id}/remove-background/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('message', data)
        self.assertIn('processed_image_url', data)
        self.assertIn('image_stats', data)
        
        # Vérifier que le produit a été mis à jour
        self.product.refresh_from_db()
        self.assertTrue(self.product.image_processed)
        self.assertTrue(bool(self.product.image_no_bg))
    
    def test_remove_product_background_no_image(self):
        """Test de retrait de background sans image"""
        from django.test import Client
        
        # Créer un produit sans image
        product_no_image = Product.objects.create(
            name='Produit Sans Image',
            cug='NOIMG001',
            price=5.99,
            user=self.user
        )
        
        client = Client()
        client.force_login(self.user)
        
        response = client.post(f'/api/v1/products/{product_no_image.id}/remove-background/')
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn('Aucune image disponible', data['error'])
    
    def test_remove_product_background_product_not_found(self):
        """Test de retrait de background avec produit inexistant"""
        from django.test import Client
        
        client = Client()
        client.force_login(self.user)
        
        response = client.post('/api/v1/products/99999/remove-background/')
        
        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn('Produit non trouvé', data['error'])
    
    def test_remove_product_background_unauthorized(self):
        """Test de retrait de background sans authentification"""
        from django.test import Client
        
        client = Client()
        
        response = client.post(f'/api/v1/products/{self.product.id}/remove-background/')
        
        self.assertEqual(response.status_code, 401)
    
    def test_get_product_image_info_success(self):
        """Test d'obtention d'informations d'image réussi"""
        from django.test import Client
        
        client = Client()
        client.force_login(self.user)
        
        response = client.get(f'/api/v1/products/{self.product.id}/image-info/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertTrue(data['has_original_image'])
        self.assertFalse(data['has_processed_image'])
        self.assertFalse(data['image_processed'])
        self.assertIn('image_stats', data)
        self.assertIn('is_valid_for_processing', data)
    
    def test_batch_remove_background_success(self):
        """Test de retrait de background en lot réussi"""
        from django.test import Client
        
        # Créer des produits supplémentaires
        products = []
        for i in range(3):
            product = Product.objects.create(
                name=f'Produit Lot {i+1}',
                cug=f'LOT{i+1:03d}',
                price=10.99 + i,
                user=self.user
            )
            
            # Ajouter des images
            with open(self.test_image_path, 'rb') as f:
                image_file = ContentFile(f.read())
                image_file.name = f'lot_product_{i+1}.jpg'
                product.image.save(f'lot_product_{i+1}.jpg', image_file, save=True)
            
            products.append(product)
        
        client = Client()
        client.force_login(self.user)
        
        product_ids = [p.id for p in products]
        
        response = client.post('/api/v1/products/batch-remove-background/', {
            'product_ids': product_ids,
            'force_reprocess': False
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('results', data)
        self.assertIn('summary', data)
        
        # Vérifier que tous les produits ont été traités
        for product in products:
            product.refresh_from_db()
            self.assertTrue(product.image_processed)
    
    def test_batch_remove_background_too_many_products(self):
        """Test de retrait de background en lot avec trop de produits"""
        from django.test import Client
        
        client = Client()
        client.force_login(self.user)
        
        # Créer une liste de plus de 10 produits
        product_ids = list(range(1, 15))
        
        response = client.post('/api/v1/products/batch-remove-background/', {
            'product_ids': product_ids,
            'force_reprocess': False
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn('Maximum 10 produits', data['error'])
    
    def test_batch_remove_background_empty_list(self):
        """Test de retrait de background en lot avec liste vide"""
        from django.test import Client
        
        client = Client()
        client.force_login(self.user)
        
        response = client.post('/api/v1/products/batch-remove-background/', {
            'product_ids': [],
            'force_reprocess': False
        }, content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn('Aucun produit spécifié', data['error'])
