import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/**
 * 🖼️ UTILITAIRES D'IMAGES - BoliBana Stock Mobile
 * Compression et optimisation des images pour l'upload
 */

export interface CompressedImage {
  uri: string;
  type: string;
  fileName: string;
  size?: number;
}

/**
 * Compresse une image pour optimiser l'upload
 */
export const compressImage = async (uri: string): Promise<string> => {
  try {
    console.log('🖼️  Compression d\'image...');
    
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 400 } }], // Redimensionner à 400px max (encore plus petit)
      {
        compress: 0.3, // Compression 30% (très agressive pour Railway)
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    
    console.log('✅ Image compressée:', result.uri);
    return result.uri;
  } catch (error) {
    console.error('❌ Erreur compression image:', error);
    return uri; // Retourner l'image originale en cas d'erreur
  }
};

/**
 * Sélectionne et compresse une image depuis la galerie
 */
export const pickAndCompressImage = async (): Promise<CompressedImage | null> => {
  try {
    console.log('📸 Sélection d\'image...');
    
    // Demander les permissions
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      console.error('❌ Permission galerie refusée');
      return null;
    }
    
    // Sélectionner l'image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1, // Qualité maximale pour la compression manuelle
    });
    
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      console.log('📸 Image sélectionnée:', asset.uri);
      
      // Compresser l'image
      const compressedUri = await compressImage(asset.uri);
      
      // Générer un nom de fichier unique
      const fileName = `product_${Date.now()}.jpg`;
      
      return {
        uri: compressedUri,
        type: 'image/jpeg',
        fileName: fileName,
        size: asset.fileSize,
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erreur sélection image:', error);
    return null;
  }
};

/**
 * Prend une photo et la compresse
 */
export const takeAndCompressPhoto = async (): Promise<CompressedImage | null> => {
  try {
    console.log('📷 Prise de photo...');
    
    // Demander les permissions
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      console.error('❌ Permission caméra refusée');
      return null;
    }
    
    // Prendre la photo
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1, // Qualité maximale pour la compression manuelle
    });
    
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      console.log('📷 Photo prise:', asset.uri);
      
      // Compresser l'image
      const compressedUri = await compressImage(asset.uri);
      
      // Générer un nom de fichier unique
      const fileName = `product_${Date.now()}.jpg`;
      
      return {
        uri: compressedUri,
        type: 'image/jpeg',
        fileName: fileName,
        size: asset.fileSize,
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erreur prise de photo:', error);
    return null;
  }
};

/**
 * Obtient les informations de taille d'une image
 */
export const getImageInfo = async (uri: string): Promise<{ width: number; height: number; size?: number } | null> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [], // Pas de manipulation
      { format: ImageManipulator.SaveFormat.JPEG }
    );
    
    return {
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('❌ Erreur obtention infos image:', error);
    return null;
  }
};

/**
 * Valide une image avant l'upload
 */
export const validateImage = async (image: CompressedImage): Promise<{ valid: boolean; error?: string }> => {
  try {
    // Vérifier que l'URI existe
    if (!image.uri) {
      return { valid: false, error: 'URI d\'image manquant' };
    }
    
    // Vérifier la taille (si disponible)
    if (image.size && image.size > 50 * 1024 * 1024) { // 50MB
      return { valid: false, error: 'Image trop volumineuse (max 50MB)' };
    }
    
    // Vérifier le type
    if (!image.type.startsWith('image/')) {
      return { valid: false, error: 'Type de fichier invalide' };
    }
    
    // Obtenir les dimensions
    const info = await getImageInfo(image.uri);
    if (!info) {
      return { valid: false, error: 'Impossible de lire l\'image' };
    }
    
    // Vérifier les dimensions minimales
    if (info.width < 100 || info.height < 100) {
      return { valid: false, error: 'Image trop petite (min 100x100px)' };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('❌ Erreur validation image:', error);
    return { valid: false, error: 'Erreur de validation' };
  }
};

/**
 * Prépare une image pour l'upload vers l'API
 */
export const prepareImageForUpload = async (image: CompressedImage): Promise<any> => {
  try {
    // Valider l'image
    const validation = await validateImage(image);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Retourner l'objet formaté pour l'API
    return {
      uri: image.uri,
      type: image.type,
      fileName: image.fileName,
    };
  } catch (error) {
    console.error('❌ Erreur préparation image:', error);
    throw error;
  }
};

/**
 * Supprime une image temporaire
 */
export const cleanupTempImage = async (uri: string): Promise<void> => {
  try {
    // Note: Sur React Native, les images temporaires sont généralement
    // nettoyées automatiquement par le système
    console.log('🧹 Nettoyage image temporaire:', uri);
  } catch (error) {
    console.error('❌ Erreur nettoyage image:', error);
  }
};

/**
 * Convertit une taille en bytes en format lisible
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Affiche les informations d'une image
 */
export const logImageInfo = (image: CompressedImage): void => {
  console.log('📊 Informations image:', {
    fileName: image.fileName,
    type: image.type,
    size: image.size ? formatFileSize(image.size) : 'Inconnu',
    uri: image.uri.substring(0, 50) + '...',
  });
};
