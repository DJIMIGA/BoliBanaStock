import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { store } from './src/store';

// Test simple sans navigation complexe
const TestApp = () => {
  return (
    <Provider store={store}>
      <View style={styles.container}>
        <Text style={styles.text}>Test App - Pas d'erreur d'import</Text>
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  text: {
    fontSize: 18,
    color: '#333',
  },
});

export default TestApp;
