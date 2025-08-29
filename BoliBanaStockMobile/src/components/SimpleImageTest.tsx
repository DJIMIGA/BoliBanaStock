import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SimpleImageTestProps {
  imageUrl?: string;
  size?: number;
}

const SimpleImageTest: React.FC<SimpleImageTestProps> = ({ 
  imageUrl, 
  size = 60 
}) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  if (!imageUrl) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Text style={styles.statusText}>Pas d'URL</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: size, height: size }]}
        onLoad={() => {
          console.log('✅ Image chargée:', imageUrl);
          setStatus('success');
        }}
        onError={(error) => {
          console.error('❌ Erreur image:', imageUrl, error);
          setStatus('error');
        }}
      />
      
      <View style={styles.statusIndicator}>
        {status === 'loading' && (
          <Ionicons name="sync" size={12} color="#FF9800" />
        )}
        {status === 'success' && (
          <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
        )}
        {status === 'error' && (
          <Ionicons name="close-circle" size={12} color="#F44336" />
        )}
      </View>
      
      <Text style={styles.urlText} numberOfLines={1}>
        {imageUrl.includes('s3.amazonaws.com') ? 'S3' : 'HTTP'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  image: {
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  statusIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 1,
  },
  statusText: {
    fontSize: 8,
    color: '#999',
  },
  urlText: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
  },
});

export default SimpleImageTest;
