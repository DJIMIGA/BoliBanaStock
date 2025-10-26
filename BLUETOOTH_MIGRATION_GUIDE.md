# Migration vers Bluetooth pour imprimantes thermiques

## Configuration requise

### 1. Prébuild Expo
```bash
cd BoliBanaStockMobile
npx expo prebuild
```

### 2. Installation des dépendances Bluetooth
```bash
npm install react-native-bluetooth-escpos-printer
npm install react-native-permissions
```

### 3. Configuration Android (android/app/src/main/AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
```

### 4. Configuration iOS (ios/BoliBanaStockMobile/Info.plist)
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Cette application utilise Bluetooth pour se connecter aux imprimantes thermiques</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Cette application utilise Bluetooth pour se connecter aux imprimantes thermiques</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Cette application utilise la localisation pour découvrir les imprimantes Bluetooth à proximité</string>
```

## Implémentation

### Service Bluetooth pour imprimantes thermiques
```typescript
// BoliBanaStockMobile/src/services/bluetoothPrinterService.ts
import BluetoothEscposPrinter from 'react-native-bluetooth-escpos-printer';
import { PermissionsAndroid, Platform } from 'react-native';

export interface BluetoothPrinter {
  device_name: string;
  device_address: string;
  device_id: string;
}

export interface PrinterSettings {
  density: number;
  speed: number;
  direction: number;
  gap: number;
}

class BluetoothPrinterService {
  private connectedPrinter: BluetoothPrinter | null = null;

  // Demander les permissions Bluetooth
  async requestBluetoothPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];

      if (Platform.Version >= 31) {
        permissions.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
        );
      }

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      return Object.values(granted).every(status => status === 'granted');
    }
    return true; // iOS gère les permissions différemment
  }

  // Découvrir les imprimantes Bluetooth disponibles
  async discoverPrinters(): Promise<BluetoothPrinter[]> {
    try {
      const hasPermission = await this.requestBluetoothPermissions();
      if (!hasPermission) {
        throw new Error('Permissions Bluetooth refusées');
      }

      const devices = await BluetoothEscposPrinter.discover();
      console.log('🔍 Imprimantes Bluetooth découvertes:', devices);
      
      return devices.map(device => ({
        device_name: device.device_name || 'Imprimante inconnue',
        device_address: device.device_address,
        device_id: device.device_id || device.device_address,
      }));
    } catch (error) {
      console.error('❌ Erreur découverte Bluetooth:', error);
      throw error;
    }
  }

  // Se connecter à une imprimante
  async connectToPrinter(printer: BluetoothPrinter): Promise<boolean> {
    try {
      console.log('🔗 Connexion à l\'imprimante:', printer.device_name);
      
      await BluetoothEscposPrinter.connect(printer.device_address);
      this.connectedPrinter = printer;
      
      console.log('✅ Connexion réussie à:', printer.device_name);
      return true;
    } catch (error) {
      console.error('❌ Erreur connexion:', error);
      this.connectedPrinter = null;
      return false;
    }
  }

  // Se déconnecter de l'imprimante
  async disconnectPrinter(): Promise<void> {
    try {
      if (this.connectedPrinter) {
        await BluetoothEscposPrinter.disconnect();
        console.log('🔌 Déconnexion de:', this.connectedPrinter.device_name);
        this.connectedPrinter = null;
      }
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error);
    }
  }

  // Vérifier si une imprimante est connectée
  isConnected(): boolean {
    return this.connectedPrinter !== null;
  }

  // Obtenir l'imprimante connectée
  getConnectedPrinter(): BluetoothPrinter | null {
    return this.connectedPrinter;
  }

  // Imprimer du texte
  async printText(text: string): Promise<void> {
    if (!this.connectedPrinter) {
      throw new Error('Aucune imprimante connectée');
    }

    try {
      await BluetoothEscposPrinter.printText(text);
      console.log('📄 Texte imprimé:', text);
    } catch (error) {
      console.error('❌ Erreur impression texte:', error);
      throw error;
    }
  }

  // Imprimer une étiquette complète
  async printLabel(labelData: {
    productName: string;
    cug: string;
    barcode?: string;
    price?: string;
    settings: PrinterSettings;
  }): Promise<void> {
    if (!this.connectedPrinter) {
      throw new Error('Aucune imprimante connectée');
    }

    try {
      const { productName, cug, barcode, price, settings } = labelData;
      
      // Configuration de l'imprimante
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.setBlob(settings.density);
      
      // Impression du nom du produit
      await BluetoothEscposPrinter.printText(productName + '\n');
      
      // Impression du CUG
      await BluetoothEscposPrinter.printText(`CUG: ${cug}\n`);
      
      // Impression du code-barres si disponible
      if (barcode) {
        await BluetoothEscposPrinter.printBarCode(
          barcode,
          BluetoothEscposPrinter.BARCODE_TYPE.EAN13,
          100,
          50
        );
        await BluetoothEscposPrinter.printText('\n');
      }
      
      // Impression du prix si disponible
      if (price) {
        await BluetoothEscposPrinter.printText(`Prix: ${price}\n`);
      }
      
      // Espacement et coupure
      await BluetoothEscposPrinter.printText('\n\n\n');
      await BluetoothEscposPrinter.cutOne();
      
      console.log('🏷️ Étiquette imprimée avec succès');
    } catch (error) {
      console.error('❌ Erreur impression étiquette:', error);
      throw error;
    }
  }

  // Imprimer plusieurs étiquettes
  async printMultipleLabels(
    labels: Array<{
      productName: string;
      cug: string;
      barcode?: string;
      price?: string;
    }>,
    settings: PrinterSettings,
    copies: number = 1
  ): Promise<void> {
    for (const label of labels) {
      for (let i = 0; i < copies; i++) {
        await this.printLabel({ ...label, settings });
        // Petite pause entre les impressions
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
}

export default new BluetoothPrinterService();
```

### Composant de sélection d'imprimante Bluetooth
```typescript
// BoliBanaStockMobile/src/components/BluetoothPrinterSelector.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import bluetoothPrinterService, { BluetoothPrinter } from '../services/bluetoothPrinterService';

interface BluetoothPrinterSelectorProps {
  onPrinterSelected: (printer: BluetoothPrinter) => void;
  onConnectionStatusChange: (connected: boolean) => void;
}

const BluetoothPrinterSelector: React.FC<BluetoothPrinterSelectorProps> = ({
  onPrinterSelected,
  onConnectionStatusChange,
}) => {
  const [printers, setPrinters] = useState<BluetoothPrinter[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<BluetoothPrinter | null>(null);

  const scanForPrinters = async () => {
    setScanning(true);
    try {
      const discoveredPrinters = await bluetoothPrinterService.discoverPrinters();
      setPrinters(discoveredPrinters);
      
      if (discoveredPrinters.length === 0) {
        Alert.alert(
          'Aucune imprimante trouvée',
          'Assurez-vous que votre imprimante thermique est allumée et en mode découverte Bluetooth.'
        );
      }
    } catch (error) {
      console.error('Erreur scan:', error);
      Alert.alert('Erreur', 'Impossible de scanner les imprimantes Bluetooth');
    } finally {
      setScanning(false);
    }
  };

  const connectToPrinter = async (printer: BluetoothPrinter) => {
    setConnecting(true);
    try {
      const success = await bluetoothPrinterService.connectToPrinter(printer);
      if (success) {
        setConnectedPrinter(printer);
        onPrinterSelected(printer);
        onConnectionStatusChange(true);
        Alert.alert('Connexion réussie', `Connecté à ${printer.device_name}`);
      } else {
        Alert.alert('Échec de connexion', 'Impossible de se connecter à l\'imprimante');
      }
    } catch (error) {
      console.error('Erreur connexion:', error);
      Alert.alert('Erreur', 'Erreur lors de la connexion');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectPrinter = async () => {
    try {
      await bluetoothPrinterService.disconnectPrinter();
      setConnectedPrinter(null);
      onConnectionStatusChange(false);
      Alert.alert('Déconnexion', 'Imprimante déconnectée');
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  const renderPrinterItem = ({ item }: { item: BluetoothPrinter }) => (
    <TouchableOpacity
      style={styles.printerItem}
      onPress={() => connectToPrinter(item)}
      disabled={connecting}
    >
      <View style={styles.printerInfo}>
        <Ionicons name="print" size={24} color={theme.colors.primary[500]} />
        <View style={styles.printerDetails}>
          <Text style={styles.printerName}>{item.device_name}</Text>
          <Text style={styles.printerAddress}>{item.device_address}</Text>
        </View>
      </View>
      {connecting && (
        <ActivityIndicator size="small" color={theme.colors.primary[500]} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Imprimantes Bluetooth</Text>
      
      {connectedPrinter ? (
        <View style={styles.connectedContainer}>
          <View style={styles.connectedInfo}>
            <Ionicons name="checkmark-circle" size={24} color="#28a745" />
            <View style={styles.connectedDetails}>
              <Text style={styles.connectedName}>{connectedPrinter.device_name}</Text>
              <Text style={styles.connectedAddress}>{connectedPrinter.device_address}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={disconnectPrinter}
          >
            <Text style={styles.disconnectButtonText}>Déconnecter</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.scanButton, scanning && styles.disabledButton]}
            onPress={scanForPrinters}
            disabled={scanning}
          >
            {scanning ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="search" size={20} color="white" />
            )}
            <Text style={styles.scanButtonText}>
              {scanning ? 'Recherche...' : 'Rechercher des imprimantes'}
            </Text>
          </TouchableOpacity>

          {printers.length > 0 && (
            <FlatList
              data={printers}
              keyExtractor={(item) => item.device_address}
              renderItem={renderPrinterItem}
              style={styles.printersList}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  printersList: {
    maxHeight: 200,
  },
  printerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  printerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  printerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  printerName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  printerAddress: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  connectedContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  connectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  connectedDetails: {
    marginLeft: 12,
    flex: 1,
  },
  connectedName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#28a745',
  },
  connectedAddress: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  disconnectButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  disconnectButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: theme.colors.neutral[400],
  },
});

export default BluetoothPrinterSelector;
```

## Migration du système existant

### 1. Remplacer la configuration réseau par Bluetooth
- Supprimer les champs IP/Port
- Ajouter le composant BluetoothPrinterSelector
- Adapter la logique de connexion

### 2. Modifier le service d'impression
- Utiliser bluetoothPrinterService au lieu de l'API réseau
- Adapter les paramètres d'impression pour ESC/POS Bluetooth

### 3. Mettre à jour l'interface
- Remplacer les tests de connectivité réseau par la découverte Bluetooth
- Adapter les messages d'erreur pour Bluetooth

## Avantages du Bluetooth
- ✅ Pas besoin de réseau WiFi
- ✅ Connexion directe appareil-imprimante
- ✅ Plus portable et pratique
- ✅ Pas de configuration IP/port
- ✅ Découverte automatique des imprimantes

## Limitations
- ⚠️ Portée limitée (10-30m)
- ⚠️ Nécessite Expo prebuild
- ⚠️ Permissions Bluetooth et localisation
- ⚠️ Compatibilité selon les modèles d'imprimantes
