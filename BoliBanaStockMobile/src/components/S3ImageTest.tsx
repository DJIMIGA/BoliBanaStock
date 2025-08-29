import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

const S3ImageTest: React.FC = () => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // URL S3 qui fonctionne (celle que vous avez trouvée)
  const workingS3Url = "https://bolibana-stock.s3.eu-north-1.amazonaws.com/assets/media/assets/products/site-17/assets/products/site-17/ccac5a32-2d5d-4918-b38c-d105d0f85394.jpg";

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
    console.log('✅ Image S3 chargée avec succès!');
  };

  const handleImageError = (error: any) => {
    setImageError(true);
    setImageLoaded(false);
    console.log('❌ Erreur chargement image S3:', error);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Test Image S3</Text>
      
      {/* Image S3 qui fonctionne */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: workingS3Url }}
          style={styles.image}
          resizeMode="contain"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </View>

      {/* Statut de l'image */}
      <View style={styles.statusContainer}>
        {imageLoaded && (
          <Text style={styles.successText}>✅ Image S3 chargée !</Text>
        )}
        {imageError && (
          <Text style={styles.errorText}>❌ Erreur chargement S3</Text>
        )}
        {!imageLoaded && !imageError && (
          <Text style={styles.loadingText}>⏳ Chargement image S3...</Text>
        )}
      </View>

      {/* URL de test */}
      <Text style={styles.urlText} numberOfLines={2}>
        {workingS3Url}
      </Text>

      {/* Bouton de test */}
      <TouchableOpacity 
        style={styles.testButton}
        onPress={() => {
          setImageLoaded(false);
          setImageError(false);
          console.log('🔄 Retest image S3...');
        }}
      >
        <Text style={styles.testButtonText}>🔄 Retester</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 16,
  },
  imageContainer: {
    width: 200,
    height: 200,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  statusContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  successText: {
    color: '#28a745',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorText: {
    color: '#dc3545',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingText: {
    color: '#6c757d',
    fontSize: 14,
  },
  urlText: {
    fontSize: 10,
    color: '#6c757d',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: '#e9ecef',
    padding: 8,
    borderRadius: 4,
  },
  testButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default S3ImageTest;
