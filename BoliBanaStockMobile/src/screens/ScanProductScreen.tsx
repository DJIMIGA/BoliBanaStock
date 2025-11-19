import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Vibration,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../utils/theme';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { productService } from '../services/api';
import { BarcodeScanner } from '../components';
import { useKeepAwake } from '../hooks/useKeepAwake';

type ScanProductScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ScanProduct'>;

const ScanProductScreen: React.FC = () => {
  const navigation = useNavigation<ScanProductScreenNavigationProp>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [scannerBlocked, setScannerBlocked] = useState(false);
  
  // Garder l'écran allumé uniquement quand le scanner est actif pour faciliter le scan
  useKeepAwake(showScanner);

  useEffect(() => {
    // Les permissions sont gérées par le composant BarcodeScanner
    setHasPermission(true);
  }, []);

  // Fonctions pour les vibrations
  const playSuccessSound = () => {
    // Vibration de succès : courte et douce
    Vibration.vibrate([0, 100, 50, 100]);
  };

  const playErrorSound = () => {
    // Vibration d'erreur : plus longue et répétée
    Vibration.vibrate([0, 200, 100, 200]);
  };

  const handleBarCodeScanned = async (barcode: string) => {
    const currentTime = Date.now();
    
    // Protection absolue : si déjà en cours de traitement ou scanner bloqué, ignorer
    if (scanned || loading || scannerBlocked) {
      return;
    }
    
    // Protection contre les scans trop rapides (minimum 3 secondes entre scans)
    if (currentTime - lastScanTime < 3000) {
      return;
    }
    
    // Protection contre le même code-barres scanné plusieurs fois
    if (barcode === lastScannedCode && currentTime - lastScanTime < 10000) {
      return;
    }
    
    // Bloquer le scanner immédiatement
    setScannerBlocked(true);
    setScanned(true);
    setLoading(true);
    setLastScanTime(currentTime);
    setLastScannedCode(barcode);
    setShowScanner(false);
    
    // Traiter le code-barres scanné (peut être CUG, EAN, ou autre)
    await processBarcode(barcode);
    
    // Débloquer le scanner après 5 secondes
    setTimeout(() => {
      setScannerBlocked(false);
    }, 5000);
  };

  const processBarcode = async (barcode: string) => {
    if (!barcode.trim()) {
      return;
    }

    try {
      // Utiliser l'API de scan qui gère automatiquement CUG, EAN, etc.
      const response = await productService.scanProduct(barcode.trim());
      
      // Vibration de succès
      playSuccessSound();
      
      // Log du produit scanné
      console.log('🔍 SCAN RAPIDE - Produit trouvé:', {
        barcode,
        productId: response.id,
        name: response.name,
        cug: response.cug,
        price: response.selling_price,
        stock: response.quantity,
        timestamp: new Date().toISOString()
      });
      
      // Navigation directe vers le détail du produit
      navigation.navigate('ProductDetail', { productId: response.id });
      
    } catch (error: any) {
      // Vibration d'erreur
      playErrorSound();
      
      // Log du produit non trouvé
      console.log('❌ SCAN RAPIDE - Produit non trouvé:', {
        barcode,
        error: error.response?.data?.message || 'Produit non trouvé',
        timestamp: new Date().toISOString()
      });
      
      // Navigation directe vers l'ajout de produit sans modal
      navigation.navigate('AddProduct', { barcode: barcode.trim() });
    } finally {
      setLoading(false);
    }
  };


  const startScanning = () => {
    setScanned(false);
    setLastScanTime(0); // Reset du timer
    setLastScannedCode(''); // Reset du dernier code scanné
    setScannerBlocked(false); // Reset du blocage
    setShowScanner(true);
  };

  const stopScanning = () => {
    setShowScanner(false);
    setScanned(false);
    setLastScanTime(0); // Reset du timer
    setLastScannedCode(''); // Reset du dernier code scanné
    setScannerBlocked(false); // Reset du blocage
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
            <Text style={styles.scannerSubtitle}>
              Scannez un code-barres pour trouver rapidement un produit
            </Text>
            
            <TouchableOpacity
              style={styles.scanButton}
              onPress={startScanning}
            >
              <Ionicons name="camera" size={24} color={theme.colors.text.inverse} />
              <Text style={styles.scanButtonText}>📷 Scanner Code-barres</Text>
            </TouchableOpacity>
          </View>

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
              • <Text style={styles.instructionsBold}>Scanner :</Text> Appuyez sur le bouton pour activer la caméra
            </Text>
            <Text style={styles.instructionsText}>
              • <Text style={styles.instructionsBold}>Positionner :</Text> Centrez le code-barres dans le cadre de scan
            </Text>
            <Text style={styles.instructionsText}>
              • <Text style={styles.instructionsBold}>Automatique :</Text> Le produit sera trouvé et affiché automatiquement
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
  scannerSubtitle: {
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