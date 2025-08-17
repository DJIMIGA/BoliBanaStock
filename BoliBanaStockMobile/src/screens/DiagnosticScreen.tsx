import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import ConnectivityTester from '../components/ConnectivityTester';
import theme from '../utils/theme';

export default function DiagnosticScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ConnectivityTester />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
});
