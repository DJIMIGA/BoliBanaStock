import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { theme } from '../utils/theme';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { productService } from '../services/api';
import { BarcodeScanner } from '../components';

type ScanProductScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ScanProduct'>;

const ScanProductScreen: React.FC = () => {
  const navigation = useNavigation<ScanProductScreenNavigationProp>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  // États pour la recherche unifiée simplifiée
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    // Les permissions sont gérées par le composant BarcodeScanner
    setHasPermission(true);
  }, []);

  const handleBarCodeScanned = async (barcode: string) => {
    if (scanned) return; // Éviter les scans multiples
    
    setScanned(true);
    setShowScanner(false);
    
    // Traiter le code-barres scanné (peut être CUG, EAN, ou autre)
    await processBarcode(barcode);
  };

  const processBarcode = async (barcode: string) => {
    if (!barcode.trim()) {
      Alert.alert('Erreur', 'Code invalide');
      return;
    }

    setLoading(true);
    try {
      // Utiliser l'API de scan qui gère automatiquement CUG, EAN, etc.
      const response = await productService.scanProduct(barcode.trim());
      
      // Navigation directe vers le détail du produit
      navigation.navigate('ProductDetail', { productId: response.id });
      
    } catch (error: any) {
      console.error('❌ Erreur scan:', error);
      Alert.alert(
        'Produit non trouvé',
        error.response?.data?.message || 'Ce produit n\'existe pas dans la base de données. Voulez-vous l\'ajouter ?',
        [
          {
            text: 'Annuler',
            style: 'cancel',
            onPress: () => setScanned(false)
          },
          {
            text: 'Ajouter',
            onPress: () => {
              setScanned(false);
              navigation.navigate('AddProduct', { barcode: barcode.trim() });
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // Fonction de recherche unifiée simplifiée
  const handleSearch = async () => {
    if (!searchValue.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une valeur de recherche');
      return;
    }

    setLoading(true);
    try {
      // Utiliser la recherche unifiée qui gère automatiquement CUG, EAN et nom
      const response = await productService.unifiedSearch(searchValue.trim());
      
      if (response && Array.isArray(response)) {
        // Résultats multiples
        setSearchResults(response);
        setShowSearchResults(true);
      } else if (response && response.id) {
        // Un seul produit trouvé
        navigation.navigate('ProductDetail', { productId: response.id });
      }
      
    } catch (error: any) {
      console.error('❌ Erreur recherche:', error);
      Alert.alert(
        'Aucun résultat',
        error.response?.data?.message || 'Aucun produit trouvé avec ces critères',
        [
          {
            text: 'OK',
            style: 'cancel',
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: any) => {
    setShowSearchResults(false);
    setSearchValue('');
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const startScanning = () => {
    setScanned(false);
    setShowScanner(true);
  };

  const stopScanning = () => {
    setShowScanner(false);
    setScanned(false);
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Demande d'autorisation caméra...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="camera-outline" size={64} color={theme.colors.error[500]} />
          <Text style={styles.errorTitle}>Accès caméra refusé</Text>
          <Text style={styles.errorText}>
            L'application a besoin d'accéder à votre caméra pour scanner les codes-barres.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recherche Produit</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          {/* Section Scanner */}
          <View style={styles.scannerSection}>
            <Text style={styles.sectionTitle}>Scanner Code-barres</Text>
            
            <TouchableOpacity
              style={styles.scanButton}
              onPress={startScanning}
            >
              <Ionicons name="camera" size={24} color={theme.colors.text.inverse} />
              <Text style={styles.scanButtonText}>📷 Scanner Code-barres</Text>
            </TouchableOpacity>
          </View>

          {/* Section Recherche unifiée */}
          <View style={styles.searchSection}>
            <Text style={styles.sectionTitle}>Recherche rapide</Text>
            <Text style={styles.searchSubtitle}>
              Entrez un CUG, EAN, nom de produit ou code-barres
            </Text>
            
            <View style={styles.searchInputContainer}>
              <Ionicons name="search-outline" size={20} color={theme.colors.text.secondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="CUG, EAN, nom ou code-barres..."
                value={searchValue}
                onChangeText={setSearchValue}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearch}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={theme.colors.text.inverse} />
                ) : (
                  <Ionicons name="search" size={20} color={theme.colors.text.inverse} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Résultats de recherche */}
          {showSearchResults && searchResults.length > 0 && (
            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>
                Résultats ({searchResults.length})
              </Text>
              {searchResults.map((product, index) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.resultItem}
                  onPress={() => handleProductSelect(product)}
                >
                  <View style={styles.resultItemContent}>
                    <Text style={styles.resultItemName}>{product.name}</Text>
                    <Text style={styles.resultItemCUG}>CUG: {product.cug}</Text>
                    {product.barcodes && product.barcodes.length > 0 && (
                      <Text style={styles.resultItemEAN}>
                        EAN: {product.barcodes.find((b: any) => b.is_primary)?.ean || product.barcodes[0].ean}
                      </Text>
                    )}
                    <Text style={styles.resultItemStock}>
                      Stock: {product.quantity} unités
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Résultats */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
              <Text style={styles.loadingText}>Recherche du produit...</Text>
            </View>
          )}

          {/* Instructions */}
          <View style={styles.instructionsSection}>
            <Text style={styles.instructionsTitle}>💡 Comment utiliser ?</Text>
            <Text style={styles.instructionsText}>
              • <Text style={styles.instructionsBold}>Scanner :</Text> Scannez un code-barres, CUG ou EAN avec la caméra
            </Text>
            <Text style={styles.instructionsText}>
              • <Text style={styles.instructionsBold}>Recherche :</Text> Tapez directement un CUG, EAN, nom ou code-barres
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Scanner modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarCodeScanned}
          onClose={stopScanning}
          visible={showScanner}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary[500],
    zIndex: 1000,
    elevation: 5,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: theme.spacing.sm,
    fontSize: theme.fontSize.lg,
    color: theme.colors.text.inverse,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: { width: 36 },
  scrollContent: {
    flex: 1,
    marginTop: 0,
  },
  content: {
    padding: 16,
  },
  scannerSection: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  searchSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  scanButton: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scanButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.text.tertiary,
    fontSize: 16,
  },
  instructionsSection: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  instructionCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    padding: 16,
  },
  instructionText: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginBottom: 8,
    lineHeight: 20,
  },
  tipsSection: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tipCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    padding: 16,
  },
  tipText: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginBottom: 8,
    lineHeight: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 300,
    height: 300,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: theme.colors.primary[500],
    borderTopWidth: 4,
    borderLeftWidth: 4,
    top: 0,
    left: 0,
  },
  scanCornerTopRight: {
    right: 0,
    left: 'auto',
    borderRightWidth: 4,
    borderLeftWidth: 0,
  },
  scanCornerBottomLeft: {
    bottom: 0,
    top: 'auto',
    borderBottomWidth: 4,
    borderTopWidth: 0,
  },
  scanCornerBottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scannerInstructions: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 8,
  },
  scannerInstructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  scannerBackButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  searchButton: {
    padding: 10,
  },
  resultsSection: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  resultItemContent: {
    flex: 1,
  },
  resultItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  resultItemCUG: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  resultItemEAN: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  resultItemStock: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginBottom: 8,
    lineHeight: 20,
  },
  instructionsBold: {
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});

export default ScanProductScreen; 