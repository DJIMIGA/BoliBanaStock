import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImageDebuggerProps {
  imageUrl?: string;
  productName?: string;
}

const ImageDebugger: React.FC<ImageDebuggerProps> = ({ imageUrl, productName }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const testImageUrl = async () => {
    if (!imageUrl) {
      Alert.alert('Erreur', 'Aucune URL d\'image fournie');
      return;
    }

    try {
      console.log('🔍 Test de l\'URL image:', imageUrl);
      
      // Vérifier le format de l'URL
      if (imageUrl.includes('s3.amazonaws.com')) {
        console.log('✅ URL S3 détectée');
        
        // Tester la connectivité
        const response = await fetch(imageUrl, { method: 'HEAD' });
        console.log('📡 Réponse S3:', response.status, response.statusText);
        
        if (response.ok) {
          Alert.alert('Succès', 'Image S3 accessible');
        } else {
          Alert.alert('Erreur', `Image S3 non accessible: ${response.status}`);
        }
      } else if (imageUrl.startsWith('http')) {
        console.log('✅ URL HTTP détectée');
        
        const response = await fetch(imageUrl, { method: 'HEAD' });
        console.log('📡 Réponse HTTP:', response.status, response.statusText);
        
        if (response.ok) {
          Alert.alert('Succès', 'Image HTTP accessible');
        } else {
          Alert.alert('Erreur', `Image HTTP non accessible: ${response.status}`);
        }
      } else {
        Alert.alert('Format invalide', 'URL non reconnue');
      }
    } catch (error: any) {
      console.error('❌ Erreur test image:', error);
      Alert.alert('Erreur', `Erreur de test: ${error.message}`);
    }
  };

  const copyImageUrl = () => {
    if (imageUrl) {
      // En React Native, on peut utiliser le presse-papiers
      console.log('📋 URL copiée:', imageUrl);
      Alert.alert('Copié', 'URL copiée dans la console');
    }
  };

  if (!imageUrl) {
    return (
      <View style={styles.container}>
        <Text style={styles.noImageText}>Aucune image</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Ionicons 
          name={isExpanded ? 'chevron-down' : 'chevron-right'} 
          size={16} 
          color="#666" 
        />
        <Text style={styles.title}>
          Debug Image: {productName || 'Produit'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          <Text style={styles.urlText} numberOfLines={2}>
            {imageUrl}
          </Text>
          
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={testImageUrl}
            >
              <Ionicons name="wifi" size={16} color="#4CAF50" />
              <Text style={styles.actionText}>Tester</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={copyImageUrl}
            >
              <Ionicons name="copy" size={16} color="#2196F3" />
              <Text style={styles.actionText}>Copier</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.info}>
            <Text style={styles.infoText}>
              Type: {imageUrl.includes('s3.amazonaws.com') ? 'S3' : 'HTTP'}
            </Text>
            <Text style={styles.infoText}>
              Longueur: {imageUrl.length} caractères
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginLeft: 4,
  },
  content: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  urlText: {
    fontSize: 10,
    color: '#6c757d',
    fontFamily: 'monospace',
    backgroundColor: '#fff',
    padding: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  actionText: {
    fontSize: 10,
    color: '#495057',
    marginLeft: 4,
  },
  info: {
    gap: 2,
  },
  infoText: {
    fontSize: 10,
    color: '#6c757d',
  },
  noImageText: {
    fontSize: 10,
    color: '#6c757d',
    fontStyle: 'italic',
    padding: 8,
  },
});

export default ImageDebugger;
