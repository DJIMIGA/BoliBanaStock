import React from 'react';
import { View, StyleSheet } from 'react-native';
import BarcodeTest from '../components/BarcodeTest';

const BarcodeTestScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <BarcodeTest />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default BarcodeTestScreen;
