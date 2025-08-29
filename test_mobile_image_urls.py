#!/usr/bin/env python3
"""
Script de test pour vérifier que les URLs d'images côté mobile utilisent la nouvelle structure S3
Teste les sérialiseurs API et la génération des URLs
"""

import os
import sys
import django
from pathlib import Path
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Ajouter le répertoire racine au path Python
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings_railway')
django.setup()

from django.conf import settings
from django.test import RequestFactory
from apps.inventory.models import Product, Category, Brand
from apps.core.models import Configuration
from api.serializers import ProductSerializer, ProductListSerializer

class MobileImageUrlTester:
    """Classe pour tester les URLs d'images côté mobile"""
    
    def __init__(self):
        self.factory = RequestFactory()
        self.test_results = []
        
    def test_product_serializer_image_urls(self):
        """Teste les URLs d'images dans ProductSerializer"""
        logger.info("🔍 Test des URLs d'images dans ProductSerializer...")
        
        try:
            # Créer une requête factice
            request = self.factory.get('/api/products/')
            
            # Récupérer un produit existant
            products = Product.objects.all()[:3]
            
            if not products:
                logger.warning("⚠️ Aucun produit trouvé pour le test")
                return
            
            for product in products:
                try:
                    # Créer le contexte avec la requête
                    context = {'request': request}
                    
                    # Sérialiser le produit
                    serializer = ProductSerializer(product, context=context)
                    data = serializer.data
                    
                    # Vérifier l'URL de l'image
                    image_url = data.get('image_url')
                    
                    if image_url:
                        # Vérifier la structure de l'URL
                        if 'assets/products/site-' in image_url:
                            status = "✅"
                            result = "URL utilise la nouvelle structure S3"
                        elif 's3.amazonaws.com' in image_url:
                            status = "⚠️"
                            result = "URL S3 mais structure ancienne"
                        else:
                            status = "❌"
                            result = "URL locale ou invalide"
                        
                        logger.info(f"{status} Produit {product.id}: {image_url}")
                        logger.info(f"   {result}")
                        
                        self.test_results.append({
                            'product_id': product.id,
                            'image_url': image_url,
                            'status': status,
                            'result': result
                        })
                    else:
                        logger.info(f"ℹ️ Produit {product.id}: Pas d'image")
                        
                except Exception as e:
                    logger.error(f"❌ Erreur lors du test du produit {product.id}: {e}")
                    
        except Exception as e:
            logger.error(f"❌ Erreur lors du test ProductSerializer: {e}")
    
    def test_product_list_serializer_image_urls(self):
        """Teste les URLs d'images dans ProductListSerializer"""
        logger.info("🔍 Test des URLs d'images dans ProductListSerializer...")
        
        try:
            # Créer une requête factice
            request = self.factory.get('/api/products/')
            
            # Récupérer un produit existant
            products = Product.objects.all()[:3]
            
            if not products:
                logger.warning("⚠️ Aucun produit trouvé pour le test")
                return
            
            for product in products:
                try:
                    # Créer le contexte avec la requête
                    context = {'request': request}
                    
                    # Sérialiser le produit
                    serializer = ProductListSerializer(product, context=context)
                    data = serializer.data
                    
                    # Vérifier l'URL de l'image
                    image_url = data.get('image_url')
                    
                    if image_url:
                        # Vérifier la structure de l'URL
                        if 'assets/products/site-' in image_url:
                            status = "✅"
                            result = "URL utilise la nouvelle structure S3"
                        elif 's3.amazonaws.com' in image_url:
                            status = "⚠️"
                            result = "URL S3 mais structure ancienne"
                        else:
                            status = "❌"
                            result = "URL locale ou invalide"
                        
                        logger.info(f"{status} Produit {product.id}: {image_url}")
                        logger.info(f"   {result}")
                        
                        self.test_results.append({
                            'product_id': product.id,
                            'image_url': image_url,
                            'status': status,
                            'result': result,
                            'serializer': 'ProductListSerializer'
                        })
                    else:
                        logger.info(f"ℹ️ Produit {product.id}: Pas d'image")
                        
                except Exception as e:
                    logger.error(f"❌ Erreur lors du test du produit {product.id}: {e}")
                    
        except Exception as e:
            logger.error(f"❌ Erreur lors du test ProductListSerializer: {e}")
    
    def test_s3_configuration(self):
        """Teste la configuration S3"""
        logger.info("🔍 Test de la configuration S3...")
        
        try:
            # Vérifier les paramètres S3
            s3_enabled = getattr(settings, 'AWS_S3_ENABLED', False)
            bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
            media_url = getattr(settings, 'MEDIA_URL', None)
            
            logger.info(f"✅ AWS_S3_ENABLED: {s3_enabled}")
            logger.info(f"✅ AWS_STORAGE_BUCKET_NAME: {bucket_name}")
            logger.info(f"✅ MEDIA_URL: {media_url}")
            
            # Vérifier la structure de MEDIA_URL
            if media_url and 'assets' in media_url:
                logger.info("✅ MEDIA_URL utilise la nouvelle structure 'assets'")
            elif media_url:
                logger.warning(f"⚠️ MEDIA_URL n'utilise pas la nouvelle structure: {media_url}")
            else:
                logger.warning("⚠️ MEDIA_URL non configuré")
                
        except Exception as e:
            logger.error(f"❌ Erreur lors du test de configuration S3: {e}")
    
    def test_model_image_paths(self):
        """Teste les chemins d'images dans les modèles"""
        logger.info("🔍 Test des chemins d'images dans les modèles...")
        
        try:
            # Vérifier un produit avec image
            products_with_images = Product.objects.filter(image__isnull=False)[:3]
            
            if not products_with_images:
                logger.info("ℹ️ Aucun produit avec image trouvé")
                return
            
            for product in products_with_images:
                try:
                    image_path = product.image.name
                    
                    if image_path:
                        # Vérifier la structure du chemin
                        if image_path.startswith('assets/products/site-'):
                            status = "✅"
                            result = "Chemin utilise la nouvelle structure S3"
                        elif image_path.startswith('sites/'):
                            status = "❌"
                            result = "Chemin utilise l'ancienne structure"
                        else:
                            status = "⚠️"
                            result = "Chemin inattendu"
                        
                        logger.info(f"{status} Produit {product.id}: {image_path}")
                        logger.info(f"   {result}")
                        
                except Exception as e:
                    logger.error(f"❌ Erreur lors du test du chemin du produit {product.id}: {e}")
                    
        except Exception as e:
            logger.error(f"❌ Erreur lors du test des chemins de modèles: {e}")
    
    def run_tests(self):
        """Exécute tous les tests"""
        logger.info("🚀 Début des tests des URLs d'images côté mobile...")
        
        try:
            # Tests
            self.test_s3_configuration()
            self.test_model_image_paths()
            self.test_product_serializer_image_urls()
            self.test_product_list_serializer_image_urls()
            
            # Résumé
            self.print_summary()
            
            logger.info("🎉 Tests terminés!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Tests échoués: {e}")
            return False
    
    def print_summary(self):
        """Affiche un résumé des tests"""
        logger.info("\n📊 RÉSUMÉ DES TESTS")
        logger.info("=" * 50)
        
        if not self.test_results:
            logger.info("ℹ️ Aucun test d'URL effectué")
            return
        
        # Compter les résultats
        success_count = sum(1 for r in self.test_results if r['status'] == '✅')
        warning_count = sum(1 for r in self.test_results if r['status'] == '⚠️')
        error_count = sum(1 for r in self.test_results if r['status'] == '❌')
        
        logger.info(f"✅ Succès: {success_count}")
        logger.info(f"⚠️ Avertissements: {warning_count}")
        logger.info(f"❌ Erreurs: {error_count}")
        
        # Afficher les problèmes détectés
        if warning_count > 0 or error_count > 0:
            logger.info("\n🚨 PROBLÈMES DÉTECTÉS:")
            for result in self.test_results:
                if result['status'] in ['⚠️', '❌']:
                    logger.info(f"   {result['status']} Produit {result['product_id']}: {result['result']}")
        
        # Recommandations
        logger.info("\n💡 RECOMMANDATIONS:")
        if error_count > 0:
            logger.info("   - Corriger les chemins d'images dans la base de données")
            logger.info("   - Exécuter: python fix_model_upload_paths.py")
        if warning_count > 0:
            logger.info("   - Vérifier la configuration S3")
            logger.info("   - S'assurer que MEDIA_URL utilise la structure 'assets'")
        if success_count == len(self.test_results):
            logger.info("   - Toutes les URLs utilisent la nouvelle structure S3 ✅")

def main():
    """Fonction principale"""
    try:
        print("🧪 Test des URLs d'images côté mobile - Nouvelle Structure S3")
        print("=" * 70)
        
        tester = MobileImageUrlTester()
        success = tester.run_tests()
        
        if success:
            print("\n✅ Tests terminés avec succès!")
        else:
            print("\n❌ Tests échoués")
            sys.exit(1)
        
    except Exception as e:
        logger.error(f"❌ Tests échoués: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
