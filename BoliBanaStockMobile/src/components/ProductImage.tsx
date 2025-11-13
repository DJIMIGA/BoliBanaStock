import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | undefined>(undefined);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousUrlRef = useRef<string | undefined>(imageUrl);
  const maxRetries = 3;

  const containerStyle = {
    width: size,
    height: size,
    borderRadius,
    backgroundColor,
  };

  // Fonction pour corriger les fautes de frappe dans l'URL
  const correctBucketName = (url?: string): string | undefined => {
    if (!url) return undefined;
    let corrected = url;
    corrected = corrected.replace(/bolibana-stocck/g, 'bolibana-stock');
    corrected = corrected.replace(/bolibana-stockk/g, 'bolibana-stock');
    corrected = corrected.replace(/bolibanna-stock/g, 'bolibana-stock');
    corrected = corrected.replace(/bolibana-stock\.s3\.eeu-north-1/g, 'bolibana-stock.s3.eu-north-1');
    return corrected;
  };

  // Fonction pour générer l'URL sans duplication en cas d'erreur (fallback)
  // Note: Les images sont stockées AVEC duplication sur S3, mais on garde ce fallback
  // au cas où certaines images seraient stockées sans duplication
  const getUrlWithoutDuplication = (url: string): string | undefined => {
    try {
      // Pattern: assets/products/site-XXX/assets/products/site-XXX/filename
      const duplicationPattern = /assets\/products\/(site-\d+)\/assets\/products\/\1\/(.+)$/;
      const match = url.match(duplicationPattern);
      if (match) {
        const siteId = match[1];
        const filename = match[2];
        // Reconstruire l'URL sans duplication (fallback uniquement)
        const baseUrl = url.split('/assets/products/')[0];
        return `${baseUrl}/assets/products/${siteId}/${filename}`;
      }
    } catch (e) {
      // Ignorer les erreurs
    }
    return undefined;
  };

  // Réinitialiser l'état quand l'URL change
  useEffect(() => {
    if (previousUrlRef.current !== imageUrl) {
      setImageError(false);
      setRetryCount(0);
      setIsLoading(false);
      setFallbackUrl(undefined); // Réinitialiser le fallback
      previousUrlRef.current = imageUrl;
      // Nettoyer les timeouts précédents
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    }

    // Nettoyer le timeout au démontage
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [imageUrl]);

  // Nettoyer uniquement les paramètres de retry pour éviter les accumulations
  const cleanImageUrl = (url?: string): string | undefined => {
    if (!url) return undefined;
    
    // Nettoyer les paramètres de query de retry précédents pour éviter les accumulations
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.delete('_retry');
      urlObj.searchParams.delete('_t');
      return urlObj.toString();
    } catch (e) {
      // Si ce n'est pas une URL valide, retourner l'URL originale
      return url;
    }
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
    setImageError(false);
    setIsLoading(false);
    setRetryCount(0);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const handleImageError = (error: any) => {
    const cleanedUrl = cleanImageUrl(imageUrl);
    // Corriger les fautes de frappe dans l'URL
    const correctedUrl = correctBucketName(cleanedUrl);
    const currentImageUri = retryCount > 0 && correctedUrl
      ? `${correctedUrl}${correctedUrl.includes('?') ? '&' : '?'}_retry=${retryCount}&_t=${Date.now()}`
      : correctedUrl;
    
    // Logs détaillés pour le débogage
    const errorDetails = {
      originalUrl: imageUrl,
      cleanedUrl: cleanedUrl,
      correctedUrl: correctedUrl,
      currentUri: currentImageUri,
      retryCount: retryCount,
      hasDuplication: imageUrl?.includes('/assets/products/') && imageUrl?.split('/assets/products/').length > 2,
      errorMessage: error?.message || 'Unknown error',
      errorType: error?.type || 'unknown',
      errorCode: error?.code || 'none',
    };
    
    // Logs détaillés au premier essai pour comprendre pourquoi ça échoue
    if (retryCount === 0) {
      console.log(`⚠️ [ProductImage] Erreur chargement image:`);
      console.log(`   URL originale: ${imageUrl}`);
      console.log(`   URL corrigée: ${correctedUrl}`);
      console.log(`   Message d'erreur: ${error?.message || 'Unknown error'}`);
      console.log(`   Type d'erreur: ${error?.type || 'unknown'}`);
      console.log(`   Code d'erreur: ${error?.code || 'none'}`);
      console.log(`   Détails complets:`, JSON.stringify(errorDetails, null, 2));
    }
    
    // Si on a épuisé tous les retries et qu'on a une duplication, essayer sans duplication
    if (retryCount >= maxRetries && !fallbackUrl && correctedUrl) {
      const urlWithoutDuplication = getUrlWithoutDuplication(correctedUrl);
      if (urlWithoutDuplication && urlWithoutDuplication !== correctedUrl) {
        // S'assurer que l'URL sans duplication est aussi corrigée
        const correctedFallback = correctBucketName(urlWithoutDuplication);
        console.log(`🔄 [ProductImage] Essai avec URL sans duplication: ${correctedFallback || urlWithoutDuplication}`);
        setFallbackUrl(correctedFallback || urlWithoutDuplication);
        setRetryCount(0); // Réinitialiser pour réessayer avec le fallback
        setImageError(false);
        setIsLoading(true);
        return;
      }
    }
    
    // Si on utilise déjà le fallback et qu'il échoue aussi, arrêter
    if (retryCount >= maxRetries && fallbackUrl) {
      const correctedFallback = correctBucketName(fallbackUrl);
      console.log(`❌ [ProductImage] Les deux URLs (avec et sans duplication) ont échoué`);
      console.log(`   URL originale: ${correctedUrl || imageUrl}`);
      console.log(`   URL fallback: ${correctedFallback || fallbackUrl}`);
      setImageError(true);
      setIsLoading(false);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      return;
    }
    
    if (retryCount < maxRetries) {
      // Retry avec un délai exponentiel
      const delay = Math.pow(2, retryCount) * 500; // 500ms, 1s, 2s
      setIsLoading(true);
      
      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageError(false); // Réessayer
      }, delay);
    } else {
      // Max retries atteint
      setImageError(true);
      setIsLoading(false);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    }
  };

  // Nettoyer l'URL (uniquement les paramètres de retry)
  // Corriger aussi le fallback s'il existe
  const rawImageUrl = fallbackUrl || imageUrl;
  const cleanedImageUrl = cleanImageUrl(rawImageUrl);
  
  // Les images sont stockées AVEC duplication sur S3
  // L'API retourne l'URL avec duplication, on l'utilise telle quelle
  // Corriger les fautes de frappe courantes dans le nom du bucket
  const finalImageUrl = useMemo(() => {
    if (!cleanedImageUrl) return undefined;
    
    // Corriger les fautes de frappe dans l'URL
    const correctedUrl = correctBucketName(cleanedImageUrl);
    
    // Log si une correction a été effectuée
    if (correctedUrl && correctedUrl !== cleanedImageUrl) {
      console.log(`🔧 [ProductImage] URL corrigée: ${cleanedImageUrl.substring(0, 80)}... -> ${correctedUrl.substring(0, 80)}...`);
    }
    
    return correctedUrl;
  }, [cleanedImageUrl]);
  
  // Si pas d'URL ou URL invalide, afficher le fallback
  if (!isValidImageUrl(finalImageUrl)) {
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

  // Si l'image a eu une erreur après tous les retries, afficher le fallback
  if (imageError && retryCount >= maxRetries && !fallbackUrl) {
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

  // Ajouter un timestamp uniquement en cas de retry
  const imageUri = retryCount > 0 && finalImageUrl
    ? `${finalImageUrl}${finalImageUrl.includes('?') ? '&' : '?'}_retry=${retryCount}&_t=${Date.now()}`
    : finalImageUrl;

  // Afficher l'image avec gestion d'erreur et retry
  return (
    <View style={containerStyle}>
      {isLoading && retryCount > 0 && (
        <View style={[styles.loadingOverlay, containerStyle]}>
          <Ionicons 
            name="refresh" 
            size={size * 0.3} 
            color="#999" 
          />
        </View>
      )}
      <Image 
        key={`img-${finalImageUrl || 'no-url'}`}
        source={{ 
          uri: imageUri,
          cache: 'default',
        }} 
        style={[styles.image, containerStyle]}
        resizeMode="cover"
        // Optimisations pour éviter les problèmes de mémoire avec les grandes images
        progressiveRenderingEnabled={true}
        onLoadStart={() => {
          console.log(`🔄 [ProductImage] Début du chargement: ${imageUri?.substring(0, 80)}...`);
        }}
        onLoad={handleImageLoad}
        onError={(error) => {
          const errorEvent = error.nativeEvent || error;
          console.log(`❌ [ProductImage] Erreur Image component:`, errorEvent);
          
          // Si c'est une erreur de mémoire, ne pas retry
          if (errorEvent.error && errorEvent.error.includes('Pool hard cap violation')) {
            console.log(`⚠️ [ProductImage] Image trop grande, arrêt des retries`);
            setImageError(true);
            setIsLoading(false);
            return;
          }
          
          handleImageError(errorEvent);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});

export default ProductImage;
