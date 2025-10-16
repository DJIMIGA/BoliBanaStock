/**
 * 🚨 COMPOSANT BARCODE SCANNER - HISTORIQUE COMPLEXE DE MIGRATION 🚨
 * 
 * ⚠️  PROBLÈME MAJEUR RENCONTRÉ :
 * Ce composant a été le plus difficile à implémenter à cause d'une incompatibilité
 * majeure entre les versions d'Expo et React Native.
 * 
 * 🔴 ERREURS RENCONTRÉES (par ordre chronologique) :
 * 1. "Cannot find module '@babel/preset-env'" → Résolu en supprimant .babelrc conflictuel
 * 2. "cannot find native expobarcodescanner" → expo-barcode-scanner déprécié depuis SDK 51
 * 3. "Element type is invalid" → API Camera incompatible avec SDK 53 + React 19
 * 4. "Cannot read property 'back' of undefined" → CameraType.back undefined
 * 5. "Property 'barcodeScannerEnabled' does not exist" → API CameraView changée
 * 6. "Demande d'autorisation caméra" bloquée → Mauvais appel de permissions
 * 
 * 🎯 SOLUTION FINALE :
 * Migration forcée vers expo-camera avec la nouvelle API CameraView pour SDK 53
 * 
 * 📚 POURQUOI C'ÉTAIT SI COMPLIQUÉ :
 * - expo-barcode-scanner : DÉPRÉCIÉ et RETIRÉ depuis Expo SDK 51/52
 * - expo-camera : API complètement changée entre SDK 52 et SDK 53
 * - React 19 : Incompatibilités avec les anciennes versions de modules
 * - Metro Bundler : Problèmes de résolution de modules avec les nouvelles APIs
 * 
 * 🔧 MIGRATION TECHNIQUE :
 * Ancien (SDK 50-52) : <BarCodeScanner /> + expo-barcode-scanner
 * Nouveau (SDK 53+) : <CameraView /> + expo-camera + barcodeScannerEnabled
 * 
 * ⚡ PERFORMANCE :
 * - Scan automatique en temps réel des codes EAN-13, EAN-8, UPC-A, Code 128, Code 39
 * - Gestion automatique des permissions caméra
 * - Optimisé pour React 19 et Expo SDK 53
 * 
 * 🚀 LEÇONS APPRISES :
 * 1. Toujours vérifier la compatibilité des modules avec la version Expo
 * 2. expo-barcode-scanner est MORT, utiliser expo-camera
 * 3. CameraView est la nouvelle norme pour SDK 53+
 * 4. Les permissions doivent être demandées via Camera.requestCameraPermissionsAsync()
 * 
 * 📱 UTILISATION :
 * <BarcodeScanner 
 *   onScan={(barcode) => handleBarcodeScan(barcode)} 
 *   onClose={() => setShowScanner(false)} 
 *   visible={showScanner} 
 * />
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, StatusBar, Alert } from 'react-native';
import { CameraView, CameraType, BarcodeScanningResult, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';

const { width, height } = Dimensions.get('window');

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  visible: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose, visible }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scannerDisabled, setScannerDisabled] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (visible) {
      getCameraPermissions();
      // Réinitialiser le scanner quand il devient visible
      setScanned(false);
      setScannerDisabled(false);
    }
  }, [visible]);

  const getCameraPermissions = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'L\'accès à la caméra est nécessaire pour scanner les codes-barres.', [{ text: 'OK', onPress: onClose }]);
      }
    } catch (error) {
      setHasPermission(false);
    }
  };

  const handleBarCodeScanned = (scanResult: BarcodeScanningResult) => {
    // Protection absolue : si déjà scanné ou scanner désactivé, ignorer complètement
    if (scanned || scannerDisabled) return;
    
    // Désactiver immédiatement le scanner
    setScanned(true);
    setScannerDisabled(true);
    
    // Envoyer le code scanné
    onScan(scanResult.data);
    
    // Fermer le scanner immédiatement
    onClose();
    
    // Garder le scanner désactivé pendant 3 secondes
    setTimeout(() => {
      setScannerDisabled(false);
    }, 3000);
  };

  const resetScanner = () => {
    setScanned(false);
    setScannerDisabled(false);
  };

  if (!visible) return null;
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Demande d'autorisation caméra...</Text>
        </View>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="camera" size={64} color={theme.colors.error[500]} />
          <Text style={styles.errorText}>Accès à la caméra refusé</Text>
          <TouchableOpacity style={styles.retryButton} onPress={getCameraPermissions}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned || scannerDisabled ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'code128', 'code39', 'qr'],
        }}
      >
        <View style={styles.scannerOverlay}>
          <View style={styles.scanArea}>
            <View style={styles.scanCorner} />
            <View style={[styles.scanCorner, styles.scanCornerTopRight]} />
            <View style={[styles.scanCorner, styles.scanCornerBottomLeft]} />
            <View style={[styles.scanCorner, styles.scanCornerBottomRight]} />
          </View>
          <View style={styles.scannerInstructions}>
            <Text style={styles.scannerInstructionText}>
              Placez le code-barres, CUG ou EAN dans la zone de scan
            </Text>
          </View>
        </View>
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.controlButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={resetScanner}>
            <Ionicons name="refresh" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ccc',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: width * 0.7,
    height: width * 0.7,
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
  controlsContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 60,
    height: 60,
    backgroundColor: theme.colors.primary[500],
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
});

export default BarcodeScanner;
