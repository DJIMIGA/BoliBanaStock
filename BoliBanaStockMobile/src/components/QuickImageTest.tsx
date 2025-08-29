import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface QuickImageTestProps {
  imageUrl?: string;
}

const QuickImageTest: React.FC<QuickImageTestProps> = ({ imageUrl }) => {
  if (!imageUrl) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>❌ Pas d'URL</Text>
      </View>
    );
  }

  const isS3 = imageUrl.includes('s3.amazonaws.com');
  const isHttp = imageUrl.startsWith('http');
  const urlLength = imageUrl.length;
  
  // URL S3 qui fonctionne (pour test)
  const workingS3Url = "https://bolibana-stock.s3.eu-north-1.amazonaws.com/assets/media/assets/products/site-17/assets/products/site-17/ccac5a32-2d5d-4918-b38c-d105d0f85394.jpg";

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {isS3 ? '☁️ S3' : isHttp ? '🌐 HTTP' : '❓ Inconnu'}
      </Text>
      <Text style={styles.text}>{urlLength} chars</Text>
      <Text style={styles.url} numberOfLines={1}>
        {imageUrl.substring(0, 30)}...
      </Text>
      
      {/* Test avec l'URL qui fonctionne */}
      <TouchableOpacity style={styles.testButton}>
        <Text style={styles.testButtonText}>🧪 Test URL S3</Text>
      </TouchableOpacity>
      
      <Text style={styles.workingUrl} numberOfLines={2}>
        ✅ {workingS3Url.substring(0, 50)}...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: 4,
    borderRadius: 4,
    marginTop: 4,
    alignItems: 'center',
  },
  text: {
    fontSize: 8,
    color: '#666',
  },
  url: {
    fontSize: 6,
    color: '#999',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  testButtonText: {
    fontSize: 8,
    color: 'white',
    fontWeight: 'bold',
  },
  workingUrl: {
    fontSize: 6,
    color: '#28a745',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default QuickImageTest;
