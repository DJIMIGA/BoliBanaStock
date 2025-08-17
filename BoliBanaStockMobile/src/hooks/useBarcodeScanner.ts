/**
 * 🎯 HOOK USE BARCODE SCANNER - MIGRATION EXPO SDK 53
 * 
 * 📚 CONTEXTE DE LA MIGRATION :
 * Ce hook a été migré de expo-barcode-scanner (déprécié) vers expo-camera
 * pour assurer la compatibilité avec Expo SDK 53 et React 19.
 * 
 * 🔄 CHANGEMENTS EFFECTUÉS :
 * - Ancien : import { BarCodeScanner } from 'expo-barcode-scanner'
 * - Nouveau : import { Camera } from 'expo-camera'
 * - Permissions : Camera.requestCameraPermissionsAsync() au lieu de BarCodeScanner.requestPermissionsAsync()
 * 
 * ⚠️  IMPORTANT :
 * expo-barcode-scanner est COMPLÈTEMENT déprécié depuis SDK 51
 * et ne fonctionne plus du tout sur SDK 53.
 * 
 * 🎯 UTILISATION :
 * const { hasPermission, requestPermission, startScanning, stopScanning } = useBarcodeScanner();
 */

import { useState, useEffect } from 'react';
import { Camera } from 'expo-camera';
import { Alert } from 'react-native';

interface UseBarcodeScannerReturn {
  hasPermission: boolean | null;
  scanned: boolean;
  showScanner: boolean;
  startScanning: () => void;
  stopScanning: () => void;
  resetScanner: () => void;
  requestPermission: () => Promise<void>;
}

export const useBarcodeScanner = (): UseBarcodeScannerReturn => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission caméra requise',
          'L\'accès à la caméra est nécessaire pour scanner les codes-barres.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission caméra:', error);
      setHasPermission(false);
    }
  };

  const startScanning = () => {
    setShowScanner(true);
    setScanned(false);
  };

  const stopScanning = () => {
    setShowScanner(false);
  };

  const resetScanner = () => {
    setScanned(false);
  };

  return {
    hasPermission,
    scanned,
    showScanner,
    startScanning,
    stopScanning,
    resetScanner,
    requestPermission,
  };
};
