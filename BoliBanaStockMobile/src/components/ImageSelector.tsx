import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
// Simplification: nous utilisons uniquement l'API d'image du composant

interface ImageSelectorProps {
  image: any;
  onImageSelected: (image: any) => void;
  placeholderText?: string;
  buttonText?: string;
  style?: any;
}

const ImageSelector: React.FC<ImageSelectorProps> = ({
  image,
  onImageSelected,
  placeholderText = 'Ajouter une image',
  buttonText = 'Changer l\'image',
  style,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour ajouter une image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      onImageSelected(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisez l\'accès à l\'appareil photo pour prendre une photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets?.length) {
      onImageSelected(result.assets[0]);
    }
  };

  const showImageOptions = () => {
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
        {
          text: 'Annuler',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions}>
        <Ionicons 
          name="camera-outline" 
          size={20} 
          color={theme.colors.primary[500]} 
        />
        <Text style={styles.imagePickerText}>
          {image ? buttonText : placeholderText}
        </Text>
      </TouchableOpacity>
      
      {image ? (
        <Image source={{ uri: image.uri }} style={styles.imagePreview} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image" size={20} color={theme.colors.neutral[400]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.primary[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
    marginRight: 12,
  },
  imagePickerText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.primary[700],
    fontWeight: '500',
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[50],
  },
});

export default ImageSelector;
