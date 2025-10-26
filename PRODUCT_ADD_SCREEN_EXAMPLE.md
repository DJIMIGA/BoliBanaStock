"""
Exemple d'utilisation du traitement immédiat dans ProductAddScreen
"""
import React, { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { productService } from '../services/api';

const ProductAddScreen = () => {
  const [processingImage, setProcessingImage] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processedImageUri, setProcessedImageUri] = useState<string | null>(null);

  const handleImageSelection = async () => {
    try {
      // Demander les permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Permission d\'accès à la galerie requise');
        return;
      }

      // Sélectionner l'image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImageUri = result.assets[0].uri;
        setImageUri(selectedImageUri);
        
        // Traitement immédiat du background
        await processImageImmediately(selectedImageUri);
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const processImageImmediately = async (imageUri: string) => {
    setProcessingImage(true);
    
    try {
      // Données du produit (exemple)
      const productData = {
        name: 'Nouveau produit',
        cug: 'NEW001',
        price: 10.99,
        process_background: true, // Flag pour traitement immédiat
      };

      // Appel au service avec traitement immédiat
      const result = await productService.processImageImmediately(imageUri, productData);
      
      if (result && result.success) {
        setProcessedImageUri(result.processed_image_url);
        
        Alert.alert(
          'Succès',
          'Image traitée avec succès ! Le background a été retiré automatiquement.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Continuer avec la création du produit
                console.log('Produit créé avec image traitée:', result.product_id);
              }
            }
          ]
        );
      } else {
        Alert.alert('Information', 'Image uploadée sans traitement du background');
      }
    } catch (error) {
      console.error('Erreur traitement immédiat:', error);
      Alert.alert('Erreur', 'Impossible de traiter l\'image');
    } finally {
      setProcessingImage(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ... autres éléments */}
      
      {/* Section image */}
      <View style={styles.imageSection}>
        <TouchableOpacity
          style={styles.imageButton}
          onPress={handleImageSelection}
          disabled={processingImage}
        >
          {processingImage ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : (
            <Ionicons name="camera" size={50} color="#007AFF" />
          )}
          <Text style={styles.imageButtonText}>
            {processingImage ? 'Traitement...' : 'Sélectionner une image'}
          </Text>
        </TouchableOpacity>
        
        {/* Aperçu de l'image originale */}
        {imageUri && (
          <View style={styles.imagePreview}>
            <Text style={styles.imageLabel}>Image originale:</Text>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          </View>
        )}
        
        {/* Aperçu de l'image traitée */}
        {processedImageUri && (
          <View style={styles.imagePreview}>
            <Text style={styles.imageLabel}>Image sans background:</Text>
            <Image source={{ uri: processedImageUri }} style={styles.previewImage} />
          </View>
        )}
      </View>
      
      {/* ... autres éléments */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  imageSection: {
    marginVertical: 20,
    alignItems: 'center',
  },
  imageButton: {
    backgroundColor: '#f0f0f0',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  imageButtonText: {
    marginTop: 10,
    fontSize: 16,
    color: '#007AFF',
  },
  imagePreview: {
    marginVertical: 10,
    alignItems: 'center',
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
});

export default ProductAddScreen;

