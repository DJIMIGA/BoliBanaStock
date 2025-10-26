"""
Service de retrait de background pour les images de produits
"""
try:
    import cv2
    import numpy as np
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False
    cv2 = None
    np = None

from PIL import Image, ImageEnhance
import os
import logging
from typing import Optional, Tuple
from django.conf import settings
from django.core.files.base import ContentFile
from io import BytesIO

logger = logging.getLogger(__name__)

class BackgroundRemover:
    """
    Service pour retirer le background des images de produits
    """
    
    def __init__(self):
        self.supported_formats = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
        self.output_format = 'PNG'  # PNG pour supporter la transparence
    
    def remove_background(self, image_path: str) -> Optional[str]:
        """
        Retire le background d'une image de produit
        
        Args:
            image_path: Chemin vers l'image à traiter
            
        Returns:
            Chemin vers l'image traitée ou None en cas d'erreur
        """
        try:
            if not OPENCV_AVAILABLE:
                logger.warning("⚠️ [BACKGROUND] OpenCV non disponible - traitement ignoré")
                return None
                
            logger.info(f"🖼️ [BACKGROUND] Début du traitement: {image_path}")
            
            # Vérifier que le fichier existe
            if not os.path.exists(image_path):
                logger.error(f"❌ [BACKGROUND] Fichier non trouvé: {image_path}")
                return None
            
            # Charger l'image
            image = cv2.imread(image_path)
            if image is None:
                logger.error(f"❌ [BACKGROUND] Impossible de charger l'image: {image_path}")
                return None
            
            logger.info(f"📊 [BACKGROUND] Image chargée: {image.shape}")
            
            # Méthode 1: Segmentation par couleur (rapide et efficace)
            mask = self._create_mask_by_color(image)
            
            # Méthode 2: Amélioration du masque avec GrabCut
            improved_mask = self._improve_mask_with_grabcut(image, mask)
            
            # Appliquer le masque final
            result = self._apply_mask(image, improved_mask)
            
            # Sauvegarder l'image traitée
            output_path = self._save_processed_image(result, image_path)
            
            if output_path:
                logger.info(f"✅ [BACKGROUND] Image traitée sauvegardée: {output_path}")
                return output_path
            else:
                logger.error(f"❌ [BACKGROUND] Échec de la sauvegarde")
                return None
                
        except Exception as e:
            logger.error(f"❌ [BACKGROUND] Erreur lors du traitement: {str(e)}")
            return None
    
    def _create_mask_by_color(self, image: np.ndarray) -> np.ndarray:
        """
        Crée un masque basé sur la couleur dominante du background
        
        Args:
            image: Image OpenCV (BGR)
            
        Returns:
            Masque binaire (0 = background, 255 = objet)
        """
        try:
            # Convertir en HSV pour une meilleure segmentation
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            
            # Détecter les couleurs de background communes
            # Blanc/Gris clair
            lower_white = np.array([0, 0, 200])
            upper_white = np.array([180, 30, 255])
            mask_white = cv2.inRange(hsv, lower_white, upper_white)
            
            # Gris moyen
            lower_gray = np.array([0, 0, 100])
            upper_gray = np.array([180, 30, 200])
            mask_gray = cv2.inRange(hsv, lower_gray, upper_gray)
            
            # Combiner les masques
            mask = cv2.bitwise_or(mask_white, mask_gray)
            
            # Améliorer le masque avec des opérations morphologiques
            kernel = np.ones((5, 5), np.uint8)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
            
            # Inverser le masque (on veut garder le produit, pas le background)
            mask = cv2.bitwise_not(mask)
            
            logger.info(f"🎭 [BACKGROUND] Masque créé par couleur: {mask.shape}")
            return mask
            
        except Exception as e:
            logger.error(f"❌ [BACKGROUND] Erreur création masque couleur: {str(e)}")
            return np.zeros(image.shape[:2], dtype=np.uint8)
    
    def _improve_mask_with_grabcut(self, image: np.ndarray, initial_mask: np.ndarray) -> np.ndarray:
        """
        Améliore le masque initial avec l'algorithme GrabCut
        
        Args:
            image: Image OpenCV (BGR)
            initial_mask: Masque initial
            
        Returns:
            Masque amélioré
        """
        try:
            # Préparer le masque pour GrabCut
            mask = np.zeros(image.shape[:2], np.uint8)
            
            # Marquer les zones sûres
            mask[initial_mask == 255] = cv2.GC_FGD  # Objet sûr
            mask[initial_mask == 0] = cv2.GC_BGD    # Background sûr
            
            # Créer des modèles pour GrabCut
            bgd_model = np.zeros((1, 65), np.float64)
            fgd_model = np.zeros((1, 65), np.float64)
            
            # Appliquer GrabCut
            cv2.grabCut(image, mask, None, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_MASK)
            
            # Créer le masque final
            mask2 = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')
            mask2 = mask2 * 255
            
            logger.info(f"🎯 [BACKGROUND] Masque amélioré avec GrabCut: {mask2.shape}")
            return mask2
            
        except Exception as e:
            logger.error(f"❌ [BACKGROUND] Erreur GrabCut: {str(e)}")
            return initial_mask
    
    def _apply_mask(self, image: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """
        Applique le masque à l'image pour créer une image avec background transparent
        
        Args:
            image: Image OpenCV (BGR)
            mask: Masque binaire
            
        Returns:
            Image avec background transparent (BGRA)
        """
        try:
            # Convertir en BGRA pour supporter la transparence
            result = cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)
            
            # Appliquer le masque au canal alpha
            result[:, :, 3] = mask
            
            logger.info(f"🎨 [BACKGROUND] Masque appliqué: {result.shape}")
            return result
            
        except Exception as e:
            logger.error(f"❌ [BACKGROUND] Erreur application masque: {str(e)}")
            return image
    
    def _save_processed_image(self, image: np.ndarray, original_path: str) -> Optional[str]:
        """
        Sauvegarde l'image traitée
        
        Args:
            image: Image traitée (BGRA)
            original_path: Chemin de l'image originale
            
        Returns:
            Chemin vers l'image sauvegardée ou None
        """
        try:
            # Générer le nom du fichier de sortie
            base_name = os.path.splitext(original_path)[0]
            output_path = f"{base_name}_no_bg.png"
            
            # Sauvegarder en PNG pour supporter la transparence
            success = cv2.imwrite(output_path, image)
            
            if success:
                logger.info(f"💾 [BACKGROUND] Image sauvegardée: {output_path}")
                return output_path
            else:
                logger.error(f"❌ [BACKGROUND] Échec de la sauvegarde: {output_path}")
                return None
                
        except Exception as e:
            logger.error(f"❌ [BACKGROUND] Erreur sauvegarde: {str(e)}")
            return None
    
    def get_processing_stats(self, image_path: str) -> dict:
        """
        Obtient des statistiques sur l'image pour le traitement
        
        Args:
            image_path: Chemin vers l'image
            
        Returns:
            Dictionnaire avec les statistiques
        """
        try:
            image = cv2.imread(image_path)
            if image is None:
                return {}
            
            # Statistiques de base
            height, width, channels = image.shape
            
            # Analyse des couleurs dominantes
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            
            # Calculer la luminosité moyenne
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            brightness = np.mean(gray)
            
            # Calculer le contraste
            contrast = np.std(gray)
            
            return {
                'dimensions': f"{width}x{height}",
                'channels': channels,
                'brightness': round(brightness, 2),
                'contrast': round(contrast, 2),
                'file_size': os.path.getsize(image_path),
                'format': os.path.splitext(image_path)[1].lower()
            }
            
        except Exception as e:
            logger.error(f"❌ [BACKGROUND] Erreur statistiques: {str(e)}")
            return {}
    
    def validate_image(self, image_path: str) -> Tuple[bool, str]:
        """
        Valide qu'une image peut être traitée
        
        Args:
            image_path: Chemin vers l'image
            
        Returns:
            Tuple (is_valid, error_message)
        """
        try:
            if not OPENCV_AVAILABLE:
                return False, "OpenCV non disponible sur ce serveur"
                
            # Vérifier que le fichier existe
            if not os.path.exists(image_path):
                return False, "Fichier non trouvé"
            
            # Vérifier l'extension
            ext = os.path.splitext(image_path)[1].lower()
            if ext not in self.supported_formats:
                return False, f"Format non supporté: {ext}"
            
            # Vérifier que l'image peut être chargée
            image = cv2.imread(image_path)
            if image is None:
                return False, "Impossible de charger l'image"
            
            # Vérifier les dimensions
            height, width = image.shape[:2]
            if width < 50 or height < 50:
                return False, "Image trop petite (minimum 50x50 pixels)"
            
            if width > 4000 or height > 4000:
                return False, "Image trop grande (maximum 4000x4000 pixels)"
            
            return True, "Image valide"
            
        except Exception as e:
            return False, f"Erreur de validation: {str(e)}"
