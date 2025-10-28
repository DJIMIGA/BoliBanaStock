import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
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

export const useImageManager = (): UseImageManagerReturn => {
  const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null);
  const [isProcessing] = useState(false); // Toujours false - pas de traitement

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

  const pickImage = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions('mediaLibrary');
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
        aspect: undefined,
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: 'image/jpeg',
          fileName: asset.fileName || `product_${Date.now()}.jpg`,
          fileSize: asset.fileSize,
        });
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sélection d\'image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  }, [requestPermissions]);

  const takePhoto = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions('camera');
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
        aspect: undefined,
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: 'image/jpeg',
          fileName: asset.fileName || `product_${Date.now()}.jpg`,
          fileSize: asset.fileSize,
        });
      }
    } catch (error) {
      console.error('❌ Erreur lors de la prise de photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  }, [requestPermissions]);

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
