import React, { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProductImageProps {
  imageUrl?: string;
  size?: number;
  borderRadius?: number;
  backgroundColor?: string;
}

const ProductImage: React.FC<ProductImageProps> = ({
  imageUrl,
  size = 60,
  borderRadius = 8,
  backgroundColor = '#f5f5f5'
}) => {
  const [imageError, setImageError] = useState(false);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius,
    backgroundColor,
  };

  // Vérifier si l'URL est valide
  const isValidImageUrl = (url?: string): boolean => {
    if (!url) return false;
    
    // Vérifier si c'est une URL S3 valide
    if (url.includes('s3.amazonaws.com')) {
      return true;
    }
    
    // Vérifier si c'est une URL HTTP/HTTPS valide
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return true;
    }
    
    // Vérifier si c'est une URL relative valide
    if (url.startsWith('/media/') || url.startsWith('/static/')) {
      return true;
    }
    
    return false;
  };

  const handleImageLoad = () => {
    console.log('✅ Image chargée avec succès:', imageUrl);
    setImageError(false);
  };

  const handleImageError = (error: any) => {
    console.error('❌ Erreur de chargement image:', imageUrl, error);
    setImageError(true);
  };

  // Si pas d'URL ou URL invalide, afficher le fallback
  if (!isValidImageUrl(imageUrl)) {
    console.log('⚠️ URL image invalide ou manquante:', imageUrl);
    return (
      <View style={[styles.noImageContainer, containerStyle]}>
        <Ionicons 
          name="image-outline" 
          size={size * 0.4} 
          color="#ccc" 
        />
      </View>
    );
  }

  // Si l'image a eu une erreur, afficher le fallback
  if (imageError) {
    return (
      <View style={[styles.noImageContainer, containerStyle]}>
        <Ionicons 
          name="alert-circle-outline" 
          size={size * 0.4} 
          color="#ff9800" 
        />
      </View>
    );
  }

  // Afficher l'image avec gestion d'erreur
  return (
    <Image 
      source={{ 
        uri: imageUrl,
        // Ajouter des headers pour S3 si nécessaire
        headers: {
          'Cache-Control': 'max-age=31536000',
        }
      }} 
      style={[styles.image, containerStyle]}
      resizeMode="cover"
      onLoad={handleImageLoad}
      onError={handleImageError}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    // Styles de base pour l'image
  },
  noImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProductImage;
