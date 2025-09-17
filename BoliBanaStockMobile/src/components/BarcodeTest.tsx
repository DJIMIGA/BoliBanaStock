import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import NativeBarcode from './NativeBarcode';

const BarcodeTest: React.FC = () => {
  // Codes EAN de test générés depuis les CUG
  const testEANs = [
    { cug: 'API001', ean: '2007138400007', name: 'Produit Test API' },
    { cug: 'INV001', ean: '2006738300007', name: 'Produit Test Inventaire' },
    { cug: 'COUNT002', ean: '2004539100000', name: 'Produit Test Comptage' },
    { cug: 'COUNT001', ean: '2000213600002', name: 'Produit Test Comptage' },
    { cug: 'FINAL001', ean: '2000172100001', name: 'Produit Test Final' },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧪 Test des Codes-Barres EAN</Text>
      <Text style={styles.subtitle}>Codes générés depuis les CUG</Text>
      
      {testEANs.map((item, index) => (
        <View key={index} style={styles.testItem}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          <Text style={styles.itemCug}>CUG: {item.cug}</Text>
          <Text style={styles.itemEan}>EAN: {item.ean}</Text>
          
          <View style={styles.barcodeWrapper}>
            <NativeBarcode
              eanCode={item.ean}
              productName={item.name}
              cug={item.cug}
              size={250}
              showText={true}
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  testItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemCug: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemEan: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 16,
  },
  barcodeWrapper: {
    alignItems: 'center',
  },
});

export default BarcodeTest;