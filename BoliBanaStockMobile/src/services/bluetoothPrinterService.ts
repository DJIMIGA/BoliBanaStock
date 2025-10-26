import { PermissionsAndroid, Platform, Alert } from 'react-native';

// Interface pour les imprimantes Bluetooth
export interface BluetoothPrinter {
  device_name: string;
  device_address: string;
  device_id: string;
}

// Interface pour les paramètres d'impression
export interface PrinterSettings {
  density: number;
  speed: number;
  direction: number;
  gap: number;
}

// Interface pour les données d'étiquette
export interface LabelData {
  productName: string;
  cug: string;
  barcode?: string;
  price?: string;
  settings: PrinterSettings;
}

class BluetoothPrinterService {
  private connectedPrinter: BluetoothPrinter | null = null;
  private BluetoothEscposPrinter: any = null;

  constructor() {
    // Initialiser la librairie Bluetooth (sera chargée dynamiquement)
    this.initializeBluetoothLibrary();
  }

  private async initializeBluetoothLibrary() {
    try {
      // Import dynamique de la librairie Bluetooth
      this.BluetoothEscposPrinter = require('react-native-bluetooth-escpos-printer');
      console.log('✅ Librairie Bluetooth chargée avec succès');
    } catch (error) {
      console.warn('⚠️ Librairie Bluetooth non disponible:', error);
      // En mode développement, on peut simuler
    }
  }

  // Demander les permissions Bluetooth
  async requestBluetoothPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];

      // Permissions pour Android 12+ (API 31+)
      if (Platform.Version >= 31) {
        permissions.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
        );
      }

      try {
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        const allGranted = Object.values(granted).every(status => status === 'granted');
        
        if (!allGranted) {
          Alert.alert(
            'Permissions requises',
            'Les permissions Bluetooth et de localisation sont nécessaires pour découvrir et se connecter aux imprimantes thermiques.'
          );
        }
        
        return allGranted;
      } catch (error) {
        console.error('❌ Erreur demande permissions:', error);
        return false;
      }
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

      if (!this.BluetoothEscposPrinter) {
        // Mode simulation pour le développement
        console.log('🔵 Mode simulation Bluetooth activé');
        return this.simulateBluetoothDiscovery();
      }

      const devices = await this.BluetoothEscposPrinter.discover();
      console.log('🔍 Imprimantes Bluetooth découvertes:', devices);
      
      return devices.map(device => ({
        device_name: device.device_name || 'Imprimante inconnue',
        device_address: device.device_address,
        device_id: device.device_id || device.device_address,
      }));
    } catch (error) {
      console.error('❌ Erreur découverte Bluetooth:', error);
      // Fallback vers simulation
      return this.simulateBluetoothDiscovery();
    }
  }

  // Simulation de découverte Bluetooth (pour développement)
  private simulateBluetoothDiscovery(): BluetoothPrinter[] {
    return [
      { device_name: 'TSC TTP-244ME', device_address: '00:11:22:33:44:55', device_id: 'TSC001' },
      { device_name: 'Epson TM-T20III', device_address: '00:11:22:33:44:66', device_id: 'EPSON001' },
      { device_name: 'Star TSP143III', device_address: '00:11:22:33:44:77', device_id: 'STAR001' },
    ];
  }

  // Se connecter à une imprimante
  async connectToPrinter(printer: BluetoothPrinter): Promise<boolean> {
    try {
      console.log('🔗 Connexion à l\'imprimante:', printer.device_name);
      
      if (!this.BluetoothEscposPrinter) {
        // Mode simulation
        console.log('🔵 Mode simulation: Connexion réussie');
        this.connectedPrinter = printer;
        return true;
      }

      await this.BluetoothEscposPrinter.connect(printer.device_address);
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
        if (this.BluetoothEscposPrinter) {
          await this.BluetoothEscposPrinter.disconnect();
        }
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
      if (!this.BluetoothEscposPrinter) {
        console.log('🔵 Mode simulation: Impression texte:', text);
        return;
      }

      await this.BluetoothEscposPrinter.printText(text);
      console.log('📄 Texte imprimé:', text);
    } catch (error) {
      console.error('❌ Erreur impression texte:', error);
      throw error;
    }
  }

  // Imprimer une étiquette complète
  async printLabel(labelData: LabelData): Promise<void> {
    if (!this.connectedPrinter) {
      throw new Error('Aucune imprimante connectée');
    }

    try {
      const { productName, cug, barcode, price, settings } = labelData;
      
      if (!this.BluetoothEscposPrinter) {
        console.log('🔵 Mode simulation: Impression étiquette');
        console.log('📄 Étiquette:', { productName, cug, barcode, price });
        return;
      }

      // Configuration de l'imprimante
      await this.BluetoothEscposPrinter.printerAlign(this.BluetoothEscposPrinter.ALIGN.CENTER);
      await this.BluetoothEscposPrinter.setBlob(settings.density);
      
      // Impression du nom du produit
      await this.BluetoothEscposPrinter.printText(productName + '\n');
      
      // Impression du CUG
      await this.BluetoothEscposPrinter.printText(`CUG: ${cug}\n`);
      
      // Impression du code-barres si disponible
      if (barcode) {
        await this.BluetoothEscposPrinter.printBarCode(
          barcode,
          this.BluetoothEscposPrinter.BARCODE_TYPE.EAN13,
          100,
          50
        );
        await this.BluetoothEscposPrinter.printText('\n');
      }
      
      // Impression du prix si disponible
      if (price) {
        await this.BluetoothEscposPrinter.printText(`Prix: ${price}\n`);
      }
      
      // Espacement et coupure
      await this.BluetoothEscposPrinter.printText('\n\n\n');
      await this.BluetoothEscposPrinter.cutOne();
      
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

  // Tester la connexion
  async testConnection(): Promise<boolean> {
    if (!this.connectedPrinter) {
      return false;
    }

    try {
      await this.printText('TEST CONNEXION\n');
      return true;
    } catch (error) {
      console.error('❌ Test connexion échoué:', error);
      return false;
    }
  }
}

export default new BluetoothPrinterService();
