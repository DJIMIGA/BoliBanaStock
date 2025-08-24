import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';

interface ImageAsset {
  uri: string;
  width: number;
  height: number;
  type?: string;
  fileName?: string;
  fileSize?: number;
}

interface UseImageManagerReturn {
  selectedImage: ImageAsset | null;
  isProcessing: boolean;
  pickImage: () => Promise<void>;
  takePhoto: () => Promise<void>;
  removeImage: () => void;
  showImageOptions: () => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_DIMENSIONS = { width: 1920, height: 1080 };
const COMPRESSION_QUALITY = 0.8;

export const useImageManager = (): UseImageManagerReturn => {
  const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const requestPermissions = useCallback(async (type: 'camera' | 'mediaLibrary') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Autorisez l\'accès à l\'appareil photo pour prendre une photo.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Autorisez l\'accès à la galerie pour sélectionner une image.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  }, []);

  const processImage = useCallback(async (asset: ImagePicker.ImagePickerAsset): Promise<ImageAsset> => {
    try {
      setIsProcessing(true);

      // Vérifier la taille de l'image
      if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
        throw new Error('Image trop volumineuse. Taille maximale : 5MB');
      }

      // Redimensionner et compresser l'image si nécessaire
      let processedImage = asset;
      
      if (asset.width > MAX_IMAGE_DIMENSIONS.width || asset.height > MAX_IMAGE_DIMENSIONS.height) {
        const result = await ImageManipulator.manipulateAsync(
          asset.uri,
          [
            {
              resize: {
                width: MAX_IMAGE_DIMENSIONS.width,
                height: MAX_IMAGE_DIMENSIONS.height,
              },
            },
          ],
          {
            compress: COMPRESSION_QUALITY,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );
        
        processedImage = {
          ...asset,
          uri: result.uri,
          width: result.width,
          height: result.height,
        };
      }

      return {
        uri: processedImage.uri,
        width: processedImage.width,
        height: processedImage.height,
        type: 'image/jpeg',
        fileName: `product_${Date.now()}.jpg`,
        fileSize: processedImage.fileSize,
      };
    } catch (error) {
      console.error('❌ Erreur lors du traitement de l\'image:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const pickImage = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions('mediaLibrary');
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1, // Qualité maximale pour le traitement
        allowsEditing: false,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.length) {
        const processedImage = await processImage(result.assets[0]);
        setSelectedImage(processedImage);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sélection d\'image:', error);
      Alert.alert('Erreur', 'Impossible de traiter l\'image sélectionnée');
    }
  }, [requestPermissions, processImage]);

  const takePhoto = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions('camera');
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1, // Qualité maximale pour le traitement
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.length) {
        const processedImage = await processImage(result.assets[0]);
        setSelectedImage(processedImage);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la prise de photo:', error);
      Alert.alert('Erreur', 'Impossible de traiter la photo prise');
    }
  }, [requestPermissions, processImage]);

  const removeImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const showImageOptions = useCallback(() => {
    Alert.alert(
      'Sélectionner une image',
      'Choisissez la source de l\'image',
      [
        {
          text: 'Appareil photo',
          onPress: takePhoto,
        },
        {
          text: 'Galerie',
          onPress: pickImage,
        },
        ...(selectedImage ? [{
          text: 'Supprimer l\'image',
          style: 'destructive',
          onPress: removeImage,
        }] : []),
        {
          text: 'Annuler',
          style: 'cancel',
        },
      ]
    );
  }, [takePhoto, pickImage, removeImage, selectedImage]);

  return {
    selectedImage,
    isProcessing,
    pickImage,
    takePhoto,
    removeImage,
    showImageOptions,
  };
};
