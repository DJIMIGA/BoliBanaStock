import React from 'react';
import { Text, View } from 'react-native';
import { ErrorBoundary } from './src/components';

// Test simple pour vérifier que ErrorBoundary fonctionne
const TestApp = () => {
  return (
    <ErrorBoundary>
      <View>
        <Text>Test App</Text>
      </View>
    </ErrorBoundary>
  );
};

export default TestApp;
