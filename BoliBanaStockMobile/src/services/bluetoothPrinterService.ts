import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';

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
  private BluetoothManager: any = null;
  private BluetoothTscPrinter: any = null;

  constructor() {
    // Initialiser la librairie Bluetooth (sera chargée dynamiquement)
    this.initializeBluetoothLibrary();
  }

  private async initializeBluetoothLibrary() {
    try {
      // Import dynamique de la librairie Bluetooth
      const bluetoothModule = require('react-native-bluetooth-escpos-printer');
      this.BluetoothEscposPrinter = bluetoothModule.BluetoothEscposPrinter;
      this.BluetoothManager = bluetoothModule.BluetoothManager;
      this.BluetoothTscPrinter = bluetoothModule.BluetoothTscPrinter;
      console.log('✅ Librairie Bluetooth chargée avec succès');
    } catch (error) {
      console.warn('⚠️ Librairie Bluetooth non disponible:', error);
      // En mode développement, on peut simuler
    }
  }

  // Demander les permissions Bluetooth
  async requestBluetoothPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const androidVersion = Platform.Version;
      
      // Vérifier les permissions déjà accordées
      const checkPermissions = async (permissionList: string[]) => {
        const results = await Promise.all(
          permissionList.map(async (permission) => {
            const result = await PermissionsAndroid.check(permission);
            return { permission, granted: result };
          })
        );
        return results;
      };

      if (androidVersion >= 31) {
        // Android 12+ (API 31+)
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        ];

        // Vérifier d'abord les permissions
        const checks = await checkPermissions(permissions);
        const allAlreadyGranted = checks.every(c => c.granted);
        
        if (allAlreadyGranted) {
          console.log('✅ Permissions Bluetooth déjà accordées');
          return true;
        }

        try {
          console.log('📱 Demande des permissions Bluetooth (Android 12+)...');
          const granted = await PermissionsAndroid.requestMultiple(permissions);
          
          // Vérifier chaque permission individuellement
          const allGranted = Object.values(granted).every(status => status === 'granted');
          
          if (!allGranted) {
            const denied = Object.entries(granted)
              .filter(([_, status]) => status !== 'granted')
              .map(([perm, _]) => perm);
            
            console.error('❌ Permissions refusées:', denied);
            Alert.alert(
              'Permissions Bluetooth requises',
              'Les permissions Bluetooth sont nécessaires pour découvrir et se connecter aux imprimantes thermiques.\n\n' +
              'Veuillez accorder les permissions dans les paramètres de l\'application.',
              [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Paramètres', onPress: () => {
                  // Ouvrir les paramètres de l'application
                  if (Platform.OS === 'android') {
                    Linking.openSettings();
                  }
                }}
              ]
            );
          }
          
          return allGranted;
        } catch (error) {
          console.error('❌ Erreur demande permissions Bluetooth:', error);
          return false;
        }
      } else {
        // Android < 12 (API < 31)
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];

        // Vérifier d'abord les permissions
        const checks = await checkPermissions(permissions);
        const allAlreadyGranted = checks.every(c => c.granted);
        
        if (allAlreadyGranted) {
          console.log('✅ Permissions Bluetooth déjà accordées');
          return true;
      }

      try {
          console.log('📱 Demande des permissions Bluetooth (Android < 12)...');
        const granted = await PermissionsAndroid.requestMultiple(permissions);
          
        const allGranted = Object.values(granted).every(status => status === 'granted');
        
        if (!allGranted) {
            const denied = Object.entries(granted)
              .filter(([_, status]) => status !== 'granted')
              .map(([perm, _]) => perm);
            
            console.error('❌ Permissions refusées:', denied);
          Alert.alert(
            'Permissions requises',
              'Les permissions Bluetooth et de localisation sont nécessaires pour découvrir et se connecter aux imprimantes thermiques.\n\n' +
              'Veuillez accorder les permissions dans les paramètres de l\'application.',
              [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Paramètres', onPress: () => {
                  // Ouvrir les paramètres de l'application
                  if (Platform.OS === 'android') {
                    Linking.openSettings();
                  }
                }}
              ]
          );
        }
        
        return allGranted;
      } catch (error) {
        console.error('❌ Erreur demande permissions:', error);
        return false;
        }
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

      // Essayer de charger la librairie si elle n'est pas encore chargée
      if (!this.BluetoothManager || !this.BluetoothEscposPrinter) {
        try {
          const bluetoothModule = require('react-native-bluetooth-escpos-printer');
          this.BluetoothEscposPrinter = bluetoothModule.BluetoothEscposPrinter;
          this.BluetoothManager = bluetoothModule.BluetoothManager;
          console.log('✅ Librairie Bluetooth chargée avec succès');
        } catch (loadError) {
          console.error('❌ Impossible de charger la librairie Bluetooth:', loadError);
          throw new Error('Librairie Bluetooth non disponible. Utilisez un development build avec expo-dev-client.');
        }
      }

      // Appeler la vraie méthode de découverte via BluetoothManager
      console.log('🔍 Démarrage de la découverte Bluetooth...');
      const resultString = await this.BluetoothManager.scanDevices();
      console.log('🔍 Résultat scan Bluetooth (raw):', resultString);
      console.log('🔍 Type du résultat:', typeof resultString);
      
      // Parser le résultat JSON
      let scanResult: any;
      try {
        scanResult = JSON.parse(resultString);
      } catch (parseError) {
        console.error('❌ Erreur parsing résultat scan:', parseError);
        console.error('❌ Résultat brut:', resultString);
        throw new Error('Format de réponse invalide du scan Bluetooth');
      }
      
      console.log('🔍 Résultat scan parsé:', JSON.stringify(scanResult, null, 2));
      
      const pairedDevices = scanResult.paired || [];
      const foundDevices = scanResult.found || [];
      
      console.log('🔍 Appareils appairés (raw):', pairedDevices);
      console.log('🔍 Appareils appairés (count):', pairedDevices.length);
      console.log('🔍 Appareils trouvés (raw):', foundDevices);
      console.log('🔍 Appareils trouvés (count):', foundDevices.length);
      
      // Parser chaque appareil (ils peuvent être des strings JSON ou des objets)
      const allDevices: any[] = [];
      
      // Parser les appareils appairés
      for (let i = 0; i < pairedDevices.length; i++) {
        const deviceData = pairedDevices[i];
        try {
          let device: any;
          // Si c'est déjà un objet, l'utiliser directement
          if (typeof deviceData === 'object' && deviceData !== null) {
            device = deviceData;
          } else if (typeof deviceData === 'string') {
            // Si c'est une string, essayer de parser
            device = JSON.parse(deviceData);
          } else {
            console.warn(`⚠️ Type inattendu pour appareil appairé ${i}:`, typeof deviceData);
            continue;
          }
          console.log(`✅ Appareil appairé ${i}:`, device);
          allDevices.push(device);
        } catch (parseError) {
          console.warn(`⚠️ Erreur parsing appareil appairé ${i}:`, parseError);
          console.warn(`⚠️ Données brutes:`, deviceData);
        }
      }
      
      // Parser les appareils trouvés
      for (let i = 0; i < foundDevices.length; i++) {
        const deviceData = foundDevices[i];
        try {
          let device: any;
          // Si c'est déjà un objet, l'utiliser directement
          if (typeof deviceData === 'object' && deviceData !== null) {
            device = deviceData;
          } else if (typeof deviceData === 'string') {
            // Si c'est une string, essayer de parser
            device = JSON.parse(deviceData);
          } else {
            console.warn(`⚠️ Type inattendu pour appareil trouvé ${i}:`, typeof deviceData);
            continue;
          }
          console.log(`✅ Appareil trouvé ${i}:`, device);
          allDevices.push(device);
        } catch (parseError) {
          console.warn(`⚠️ Erreur parsing appareil trouvé ${i}:`, parseError);
          console.warn(`⚠️ Données brutes:`, deviceData);
        }
      }
      
      console.log('🔍 Total appareils après parsing:', allDevices.length);
      console.log('🔍 Détails des appareils:', JSON.stringify(allDevices, null, 2));
      
      if (allDevices.length === 0) {
        console.log('⚠️ Aucune imprimante Bluetooth trouvée');
        console.log('⚠️ Vérifiez que:\n- Le Bluetooth est activé\n- L\'imprimante est allumée et en mode découverte\n- Les permissions sont accordées');
        return [];
      }
      
      // Mapper les appareils vers notre format
      const mappedDevices = allDevices.map((device, index) => {
        const mapped = {
          device_name: device.device_name || device.name || device.deviceName || 'Imprimante inconnue',
          device_address: device.device_address || device.address || device.deviceAddress,
          device_id: device.device_id || device.deviceId || device.device_address || device.address || device.deviceAddress,
        };
        console.log(`📱 Appareil ${index} mappé:`, mapped);
        return mapped;
      }).filter(device => device.device_address); // Filtrer les appareils sans adresse valide
      
      console.log('🔍 Appareils mappés finaux:', mappedDevices.length);
      return mappedDevices;
    } catch (error) {
      console.error('❌ Erreur découverte Bluetooth:', error);
      // Ne pas retourner de données mockées automatiquement
      // Lever l'erreur pour que l'utilisateur sache qu'il y a un problème
      throw error;
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
      console.log('🔗 Adresse:', printer.device_address);
      
      // Vérifier que les modules sont chargés
      if (!this.BluetoothManager || !this.BluetoothEscposPrinter) {
        try {
          const bluetoothModule = require('react-native-bluetooth-escpos-printer');
          this.BluetoothEscposPrinter = bluetoothModule.BluetoothEscposPrinter;
          this.BluetoothManager = bluetoothModule.BluetoothManager;
          console.log('✅ Modules Bluetooth chargés');
        } catch (loadError) {
          console.error('❌ Impossible de charger les modules Bluetooth:', loadError);
          throw new Error('Modules Bluetooth non disponibles');
        }
      }

      // Vérifier que l'adresse est valide
      if (!printer.device_address) {
        throw new Error('Adresse Bluetooth invalide');
      }

      // Utiliser BluetoothManager.connect() selon la documentation
      console.log('🔗 Tentative de connexion via BluetoothManager...');
      await this.BluetoothManager.connect(printer.device_address);
      
      this.connectedPrinter = printer;
      console.log('✅ Connexion réussie à:', printer.device_name);
      return true;
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
      console.error('❌ Erreur connexion:', errorMessage);
      console.error('❌ Détails erreur:', error);
      this.connectedPrinter = null;
      
      // Propager l'erreur avec un message descriptif
      throw new Error(`Échec de la connexion à ${printer.device_name}: ${errorMessage}`);
    }
  }

  // Se déconnecter de l'imprimante
  async disconnectPrinter(): Promise<void> {
    try {
      if (this.connectedPrinter) {
        if (this.BluetoothManager) {
          // Utiliser BluetoothManager.unpair() pour déconnecter
          try {
            await this.BluetoothManager.unpair(this.connectedPrinter.device_address);
          } catch (unpairError) {
            // Si unpair échoue, on continue quand même
            console.warn('⚠️ Erreur unpair (non bloquant):', unpairError);
          }
        }
        console.log('🔌 Déconnexion de:', this.connectedPrinter.device_name);
        this.connectedPrinter = null;
      }
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error);
      // Ne pas bloquer en cas d'erreur de déconnexion
      this.connectedPrinter = null;
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

  // Imprimer des étiquettes TSC directement (Bluetooth)
  async printTSCLabels(params: {
    products: Array<{ id: number; name: string; cug?: string; generated_ean?: string; selling_price?: number }>,
    copies: number,
    thermalSettings: { density: number; speed: number; direction: number; gap: number; offset: number },
    includeCug: boolean,
    includeEan: boolean,
    includeBarcode: boolean,
    includePrice?: boolean, // Nouveau paramètre pour contrôler l'affichage du prix
  }): Promise<void> {
    // Vérifier la connexion
    if (!this.connectedPrinter) {
      throw new Error('Aucune imprimante connectée');
    }

    // Vérifier que BluetoothManager est connecté
    if (!this.BluetoothManager) {
      try {
        const bluetoothModule = require('react-native-bluetooth-escpos-printer');
        this.BluetoothManager = bluetoothModule.BluetoothManager;
      } catch (loadError) {
        console.error('❌ Impossible de charger BluetoothManager:', loadError);
        throw new Error('BluetoothManager non disponible');
      }
    }

    try {
      const { products, copies, thermalSettings, includeCug, includeEan, includeBarcode, includePrice = true } = params;

      // Vérifier et charger la librairie TSC si nécessaire
      if (!this.BluetoothTscPrinter) {
        try {
          const bluetoothModule = require('react-native-bluetooth-escpos-printer');
          this.BluetoothTscPrinter = bluetoothModule.BluetoothTscPrinter;
          if (!this.BluetoothTscPrinter) {
            throw new Error('Module BluetoothTscPrinter non disponible');
          }
          console.log('✅ Module TSC chargé avec succès');
        } catch (loadError) {
          console.error('❌ Impossible de charger le module TSC:', loadError);
          throw new Error('Module TSC non disponible. Utilisez un development build avec expo-dev-client.');
        }
      }

      // Vérifier que la connexion est toujours active
      console.log('🔍 [TSC] Vérification connexion avant impression...');
      const isConnected = this.isConnected();
      if (!isConnected) {
        throw new Error('Connexion perdue. Veuillez vous reconnecter à l\'imprimante.');
      }

      // Dimensions par défaut (en mm) - Largeur augmentée pour un design plus moderne
      const width = 80; // Largeur augmentée de 40 à 80mm
      const height = 40; // Hauteur augmentée de 30 à 40mm
      
      // Résolution DPI standard pour TSC (203 DPI = 8 dots/mm)
      const DPI = 203;
      const dotsPerMm = DPI / 25.4; // Environ 8 dots/mm pour 203 DPI
      
      // Convertir les dimensions en points (dots)
      const widthDots = Math.floor(width * dotsPerMm);
      const heightDots = Math.floor(height * dotsPerMm);

      console.log('🏷️ [TSC] Début impression TSC:', {
        productsCount: products.length,
        copies,
        printer: this.connectedPrinter.device_name,
        connected: isConnected
      });

      // Fonction pour convertir les caractères français (approche moderne avec normalisation Unicode)
      const convertFrenchChars = (text: string): string => {
        if (!text) return '';
        
        // Étape 1: Normalisation Unicode (NFD = décompose les caractères avec diacritiques)
        let normalized = text.normalize('NFD');
        
        // Étape 2: Supprimer les diacritiques (accents) en gardant seulement les caractères de base
        // IMPORTANT: Préserver les espaces (0x20) et les caractères ASCII imprimables
        normalized = normalized.replace(/[\u0300-\u036f]/g, '');
        
        // Étape 3: Table de conversion pour les caractères spéciaux non gérés par la normalisation
        const charMap: Record<string, string> = {
          'œ': 'oe', 'Œ': 'OE',
          'æ': 'ae', 'Æ': 'AE',
          '\u2019': "'", '\u2018': "'", '\u201D': '"', '\u201C': '"', '\u00AB': '"', '\u00BB': '"',
          '€': 'EUR', '£': 'GBP', '¥': 'YEN',
          // Préserver les espaces normaux (0x20) - ne pas les remplacer
        };
        
        // Étape 4: Appliquer la table de conversion
        // IMPORTANT: Garder les espaces (0x20) et les caractères ASCII imprimables (0x20-0x7E)
        return normalized.split('').map(char => {
          // Si c'est un espace normal, le garder
          if (char === ' ' || char === '\u0020') return ' ';
          // Si c'est dans la table de conversion, l'utiliser
          if (charMap[char]) return charMap[char];
          // Si c'est un caractère ASCII imprimable, le garder tel quel
          if (char.charCodeAt(0) >= 0x20 && char.charCodeAt(0) <= 0x7E) return char;
          // Sinon, remplacer par un espace pour éviter les caractères invalides
          return ' ';
        }).join('');
      };
      
      // Fonction pour nettoyer le code-barres selon son type
      const sanitizeBarcode = (code: string, type: string): string => {
        if (!code) return '';
        
        // CODE39 : uniquement majuscules, chiffres, et certains caractères spéciaux
        if (type === 'CODE39' || type === 'CODE39_EXTENDED') {
          return code.toUpperCase().replace(/[^A-Z0-9\-\.\$\/\+\% ]/g, '');
        }
        
        // CODE93 : similaire à CODE39
        if (type === 'CODE93') {
          return code.toUpperCase().replace(/[^A-Z0-9\-\.\$\/\+\% ]/g, '');
        }
        
        // CODE128 : supporte tous les caractères ASCII imprimables
        if (type === 'CODE128' || type === 'CODE128_A' || type === 'CODE128_B' || type === 'CODE128_M') {
          return code.replace(/[^\x20-\x7E]/g, ''); // Caractères ASCII imprimables uniquement
        }
        
        // EAN13 : uniquement 13 chiffres
        if (type === 'EAN13') {
          return code.replace(/[^0-9]/g, '').slice(0, 13).padStart(13, '0');
        }
        
        // Par défaut : supprimer les caractères non imprimables
        return code.replace(/[^\x20-\x7E]/g, '');
      };

      // Fonction pour formater le prix avec espaces comme séparateurs de milliers
      const formatPrice = (price: number): string => {
        return Math.floor(price).toLocaleString('fr-FR', { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 0,
          useGrouping: true 
        }).replace(/,/g, ' '); // Remplacer les virgules par des espaces
      };

      // Boucler sur chaque produit
      for (const product of products) {
        console.log(`📦 [TSC] Impression produit: ${product.name}`);

        // Convertir le nom du produit pour éviter les problèmes de caractères
        const productName = convertFrenchChars((product.name || '').slice(0, 32));

        // Déterminer la rotation - utiliser ROTATION_0 pour tous les éléments
        // Si l'étiquette est à l'envers, on inversera la direction au lieu de la rotation
        const baseRotation = this.BluetoothTscPrinter.ROTATION.ROTATION_0;

        console.log(`🔄 [TSC] Rotation appliquée:`, {
          direction: thermalSettings.direction,
          rotation: 'ROTATION_0',
          includePrice
        });

        // Layout simple avec positions fixes (comme le code Python qui fonctionne)
        // - Nom en haut à gauche
        // - Code-barres en dessous du nom
        // - Légende du code-barres en dessous
        // - CUG et prix en bas
        
        // Marges de base en mm (optimisées pour utiliser toute la place)
        const marginTop = 1; // 1mm du haut (réduit)
        const marginBottom = 0.5; // 0.5mm du bas (réduit pour utiliser toute la hauteur)
        const marginLeft = 2; // 2mm de la gauche
        const marginRight = 2; // 2mm de la droite
        
        // Hauteur disponible pour le contenu
        const availableHeight = height - marginTop - marginBottom; // 40 - 1 - 1 = 38mm
        
        // Positions fixes en mm (optimisées pour éviter le débordement)
        const nameY_mm = marginTop + 1.0; // Nom à 2mm du haut (1+1)
        const nameHeight_mm = 3.0; // Hauteur estimée du nom
        const spacingAfterName = 2.0; // 2mm après le nom (augmenté pour plus d'espace)
        const barcodeY_mm = nameY_mm + nameHeight_mm + spacingAfterName; // Code-barres après le nom
        const barcodeHeight_mm = 8.0; // Hauteur du code-barres réduite à 8mm
        const spacingAfterBarcode = -0.5; // Légende collée directement au code-barres (légèrement superposée pour éliminer l'espace)
        const legendY_mm = barcodeY_mm + barcodeHeight_mm + spacingAfterBarcode; // Légende collée au code-barres
        const legendHeight_mm = 2.5; // Hauteur estimée de la légende (réduite)
        const spacingAfterLegend = 0.5; // 0.5mm après la légende (réduit)
        // CUG et prix sur la même ligne (justify-between)
        const cugPriceY_mm = legendY_mm + legendHeight_mm + spacingAfterLegend; // CUG et prix après la légende
        const cugHeight_mm = 2.5; // Hauteur estimée du CUG (réduite)
        const priceHeight_mm = 4.0; // Hauteur estimée du prix (plus grand avec MUL_2)
        // Utiliser la hauteur la plus grande pour la ligne commune
        const commonLineHeight_mm = Math.max(cugHeight_mm, priceHeight_mm);
        
        // Calculer les positions ajustées pour utiliser toute la hauteur disponible
        const textHeight_mm_calc = commonLineHeight_mm; // Hauteur de la ligne commune
        const maxAvailableHeight_calc = height - marginBottom;
        const lastElementY_calc = cugPriceY_mm;
        const availableSpaceAtBottom_calc = maxAvailableHeight_calc - (lastElementY_calc + textHeight_mm_calc);
        
        // Ajuster pour utiliser toute la hauteur disponible
        let adjustmentY = 0;
        if (availableSpaceAtBottom_calc > 1) {
          adjustmentY = Math.min(availableSpaceAtBottom_calc - 0.5, 3); // Décaler de max 3mm
        }
        
        // Convertir en points (dots)
        const nameX = Math.floor((marginLeft + 2.0) * dotsPerMm); // x_text = left + 2.0
        const nameY = Math.floor(nameY_mm * dotsPerMm);
        
        // Code-barres sera positionné à droite
        const barcodeYPos = Math.floor(barcodeY_mm * dotsPerMm);
        
        // Positionner la légende alignée avec le code-barres (un peu à gauche du centre)
        const legendY = Math.floor((legendY_mm + adjustmentY) * dotsPerMm);
        
        // CUG et prix sur la même ligne Y
        const cugPriceY = Math.floor((cugPriceY_mm + adjustmentY) * dotsPerMm);
        const barcodeHeightDots = Math.floor(barcodeHeight_mm * dotsPerMm);
        
        // Vérification finale des positions pour éviter les débordements
        const maxY = heightDots - Math.floor(marginBottom * dotsPerMm);
        const textHeightDots = Math.floor(commonLineHeight_mm * dotsPerMm); // Hauteur de la ligne commune
        
        // Ajuster la position Y si elle dépasse
        let finalCugPriceY = cugPriceY;
        
        if (finalCugPriceY + textHeightDots > maxY) {
          console.warn(`⚠️ [TSC] Ligne CUG/Prix dépasse: ${finalCugPriceY + textHeightDots}pts > ${maxY}pts, ajustement...`);
          finalCugPriceY = Math.max(legendY + Math.floor(2.5 * dotsPerMm), maxY - textHeightDots);
        }
        
        // Utiliser la position ajustée pour CUG et prix (même ligne)
        const cugPriceY_final = finalCugPriceY;
        
        // Blocs de texte
        const textBlocks: any[] = [];
        
        // 1. Nom du produit en haut à gauche (comme dans tsc.py)
        const nameFont = this.BluetoothTscPrinter.FONTTYPE.FONT_3 || this.BluetoothTscPrinter.FONTTYPE.FONT_2;
        textBlocks.push({
          text: productName,
          x: nameX, // À gauche avec marge (en points)
          y: nameY, // En haut (en points)
          fonttype: nameFont,
          rotation: baseRotation,
          xscal: this.BluetoothTscPrinter.FONTMUL.MUL_1,
          yscal: this.BluetoothTscPrinter.FONTMUL.MUL_1,
        });
        console.log(`✅ [TSC] Nom ajouté: ${productName} à x=${nameX}, y=${nameY}`);

        // 2. Légende du code-barres (en dessous du code-barres)
        // Sera ajoutée après le code-barres si nécessaire
        
        // 3. CUG et Prix sur la même ligne (justify-between)
        // CUG à gauche, Prix à droite
        if (includeCug && product.cug) {
          const cugText = `CUG: ${convertFrenchChars(product.cug)}`;
          textBlocks.push({
            text: cugText,
            x: nameX, // À gauche (même position X que le nom)
            y: cugPriceY_final, // Même ligne Y que le prix
            fonttype: this.BluetoothTscPrinter.FONTTYPE.FONT_2,
            rotation: baseRotation,
            xscal: this.BluetoothTscPrinter.FONTMUL.MUL_1,
            yscal: this.BluetoothTscPrinter.FONTMUL.MUL_1,
          });
          console.log(`✅ [TSC] CUG ajouté: ${product.cug} à x=${nameX}, y=${cugPriceY_final}`);
        }

        // 4. Prix sur la même ligne que le CUG (justify-between)
        // Mettre le prix en valeur avec une police plus grande, un scale plus élevé et à droite
        if (includePrice && product.selling_price && product.selling_price > 0) {
          const priceText = `${formatPrice(product.selling_price)} FCFA`;
          const convertedPriceText = convertFrenchChars(priceText);
          
          // Utiliser FONT_3 (plus grande) et MUL_2 (double taille) pour mettre le prix en valeur
          const priceFont = this.BluetoothTscPrinter.FONTTYPE.FONT_3 || this.BluetoothTscPrinter.FONTTYPE.FONT_2;
          const priceScale = this.BluetoothTscPrinter.FONTMUL.MUL_2 || this.BluetoothTscPrinter.FONTMUL.MUL_1;
          
          // Positionner le prix à droite (justify-between avec le CUG)
          // Estimer la largeur du texte du prix (FONT_3 avec MUL_2)
          // FONT_3 avec MUL_2 : environ 12 points par caractère
          const estimatedPriceWidthDots = convertedPriceText.length * 12;
          // Positionner à droite avec marge plus grande pour éviter le débordement
          const priceMarginRight_mm = 3; // Marge droite plus grande (3mm au lieu de 2mm)
          let priceX_right = widthDots - priceMarginRight_mm * dotsPerMm - estimatedPriceWidthDots;
          // S'assurer qu'il y a assez d'espace entre CUG et prix (au moins 5mm)
          const minPriceX = nameX + Math.floor(5 * dotsPerMm);
          const maxPriceX = widthDots - priceMarginRight_mm * dotsPerMm - estimatedPriceWidthDots;
          priceX_right = Math.max(minPriceX, Math.min(priceX_right, maxPriceX));
          // S'assurer que le prix ne dépasse pas à droite
          if (priceX_right + estimatedPriceWidthDots > widthDots - priceMarginRight_mm * dotsPerMm) {
            priceX_right = Math.max(marginLeft * dotsPerMm, maxPriceX);
          }
          // S'assurer que le prix ne dépasse pas à gauche et que la position est valide
          let priceX = Math.max(marginLeft * dotsPerMm, Math.min(priceX_right, maxPriceX));
          // Vérification finale : s'assurer que la position est valide (positive)
          if (priceX < 0 || priceX + estimatedPriceWidthDots > widthDots) {
            console.warn(`⚠️ [TSC] Position prix invalide: x=${priceX}, largeur=${estimatedPriceWidthDots}, width=${widthDots}`);
            // Positionner le prix à droite avec marge si la position est invalide
            priceX = Math.max(marginLeft * dotsPerMm, widthDots - priceMarginRight_mm * dotsPerMm - estimatedPriceWidthDots);
          }
          
          textBlocks.push({
            text: convertedPriceText,
            x: priceX, // À droite (justify-between avec CUG)
            y: cugPriceY_final, // Même ligne Y que le CUG
            fonttype: priceFont, // FONT_3 pour une police plus grande
            rotation: baseRotation,
            xscal: priceScale, // MUL_2 pour double largeur
            yscal: priceScale, // MUL_2 pour double hauteur
          });
          
          console.log(`✅ [TSC] Prix ajouté (en valeur, à droite): ${priceText} à x=${priceX}pts (droite), y=${cugPriceY_final}pts (FONT_3, MUL_2)`);
        }

        // 5. Code-barres (comme dans tsc.py - position fixe à gauche)
        const barcodeBlocks: any[] = [];
        if (includeBarcode) {
          let code = (product.generated_ean || product.cug || `${product.id}`).toString();
          console.log(`📊 [TSC] Code-barres original pour produit ${product.name}:`, code);
          
          // Déterminer le type de code-barres et nettoyer le code
          let barcodeType: any;
          let cleanedCode: string;
          
          // Valider que le code est valide pour EAN13 (13 chiffres)
          if (code.length === 13 && /^\d{13}$/.test(code)) {
            cleanedCode = sanitizeBarcode(code, 'EAN13');
            barcodeType = this.BluetoothTscPrinter.BARCODETYPE.EAN13;
            console.log(`📊 [TSC] Utilisation EAN13: ${cleanedCode}`);
          } else if (code.length > 0) {
            // Utiliser CODE128 pour les codes non-EAN13 (plus flexible)
            cleanedCode = sanitizeBarcode(code, 'CODE128');
            barcodeType = this.BluetoothTscPrinter.BARCODETYPE.CODE128;
            console.log(`📊 [TSC] Utilisation CODE128: ${cleanedCode} (original: ${code})`);
          } else {
            console.warn(`⚠️ [TSC] Code-barres vide pour produit ${product.name}`);
            cleanedCode = '';
          }
          
          // Vérifier que le code nettoyé n'est pas vide et a une longueur raisonnable
          if (cleanedCode && cleanedCode.length > 0 && cleanedCode.length <= 48) {
            // Calculer la largeur réelle du code-barres selon son type
            let actualBarcodeWidthDots: number;
            if (barcodeType === this.BluetoothTscPrinter.BARCODETYPE.EAN13) {
              // EAN13 : largeur fixe d'environ 95 modules
              // Avec wide=2 et narrow=2, chaque module fait environ 2 points
              // EAN13 a 95 modules (113 modules avec les zones de garde)
              // Estimation : 95 * 2 = 190 points (plus conservateur)
              actualBarcodeWidthDots = 190;
            } else {
              // CODE128 : largeur variable selon la longueur du code
              // Chaque caractère CODE128 nécessite environ 11 modules
              // Avec wide=2 et narrow=2, estimation : (nombre_caractères * 11 * 2) + zones de garde
              // Zones de garde : environ 20 modules * 2 = 40 points
              const modulesPerChar = 11;
              const guardZones = 20;
              actualBarcodeWidthDots = (cleanedCode.length * modulesPerChar + guardZones) * 2;
            }
            
            // Position du code-barres : centré légèrement à droite, mais s'assurer qu'il ne dépasse pas
            // Calculer la position centrée
            const centerX = Math.floor(widthDots / 2);
            // Décaler légèrement à droite (environ 3mm)
            const offsetRight_mm = 3;
            let actualBarcodeX = centerX - Math.floor(actualBarcodeWidthDots / 2) + Math.floor(offsetRight_mm * dotsPerMm);
            // S'assurer que le code-barres ne dépasse pas à droite
            const maxBarcodeX = widthDots - marginRight * dotsPerMm - actualBarcodeWidthDots;
            if (actualBarcodeX + actualBarcodeWidthDots > widthDots - marginRight * dotsPerMm) {
              actualBarcodeX = Math.max(marginLeft * dotsPerMm, maxBarcodeX);
            }
            // S'assurer que le code-barres ne dépasse pas à gauche et que la position est valide
            actualBarcodeX = Math.max(marginLeft * dotsPerMm, Math.min(actualBarcodeX, maxBarcodeX));
            // Vérification finale : s'assurer que la position est valide (positive)
            if (actualBarcodeX < 0 || actualBarcodeX + actualBarcodeWidthDots > widthDots) {
              console.warn(`⚠️ [TSC] Position code-barres invalide: x=${actualBarcodeX}, largeur=${actualBarcodeWidthDots}, width=${widthDots}`);
              // Centrer le code-barres si la position est invalide
              actualBarcodeX = Math.max(marginLeft * dotsPerMm, Math.floor((widthDots - actualBarcodeWidthDots) / 2));
            }
            
            barcodeBlocks.push({
              x: actualBarcodeX, // Position calculée avec largeur réelle
              y: barcodeYPos, // Position fixe (en points)
              type: barcodeType,
              height: barcodeHeightDots, // Hauteur en points
              readable: 0, // Désactiver le texte automatique pour éviter la duplication
              rotation: baseRotation,
              code: cleanedCode,
              wide: 2, // Comme dans tsc.py (narrow=2, wide=4)
              narrow: 2,
            });
            
            // Ajouter la légende du code-barres manuellement (alignée à droite sous le code-barres)
            const legendText = convertFrenchChars(cleanedCode);
            const estimatedLegendWidthDots = legendText.length * 6; // 6 points par caractère pour FONT_2
            
            // Positionner la légende à droite, alignée avec la fin du code-barres
            // La légende commence à la fin du code-barres (actualBarcodeX + actualBarcodeWidthDots)
            // On la positionne à droite en soustrayant sa largeur estimée
            let legendX_right = actualBarcodeX + actualBarcodeWidthDots - estimatedLegendWidthDots;
            // S'assurer que la légende ne dépasse pas à droite
            const maxLegendX = widthDots - marginRight * dotsPerMm - estimatedLegendWidthDots;
            if (legendX_right + estimatedLegendWidthDots > widthDots - marginRight * dotsPerMm) {
              legendX_right = Math.max(marginLeft * dotsPerMm, maxLegendX);
            }
            // S'assurer que la légende ne dépasse pas à gauche et que la position est valide
            let legendX_final = Math.max(marginLeft * dotsPerMm, Math.min(legendX_right, maxLegendX));
            // Vérification finale : s'assurer que la position est valide (positive)
            if (legendX_final < 0 || legendX_final + estimatedLegendWidthDots > widthDots) {
              console.warn(`⚠️ [TSC] Position légende invalide: x=${legendX_final}, largeur=${estimatedLegendWidthDots}, width=${widthDots}`);
              // Aligner la légende avec le code-barres si la position est invalide
              legendX_final = Math.max(marginLeft * dotsPerMm, actualBarcodeX);
            }
            
            textBlocks.push({
              text: legendText,
              x: legendX_final, // Aligné à droite avec le code-barres
              y: legendY, // En dessous du code-barres (en points)
              fonttype: this.BluetoothTscPrinter.FONTTYPE.FONT_2,
              rotation: baseRotation,
              xscal: this.BluetoothTscPrinter.FONTMUL.MUL_1,
              yscal: this.BluetoothTscPrinter.FONTMUL.MUL_1,
            });
            
            console.log(`✅ [TSC] Code-barres ajouté: ${cleanedCode} (type: ${barcodeType === this.BluetoothTscPrinter.BARCODETYPE.EAN13 ? 'EAN13' : 'CODE128'})`);
            console.log(`📐 [TSC] Position code-barres: x=${actualBarcodeX}pts (à droite), largeur réelle=${actualBarcodeWidthDots}pts, y=${barcodeYPos}pts`);
            console.log(`📐 [TSC] Légende: x=${legendX_final}pts (aligné à droite avec code-barres), largeur=${estimatedLegendWidthDots}pts, y=${legendY}pts`);
          } else {
            console.warn(`⚠️ [TSC] Code-barres invalide après nettoyage: ${cleanedCode} (longueur: ${cleanedCode?.length || 0})`);
          }
        }
        
        // Options TSC - format correct selon la librairie
        // Vérifier que les paramètres sont valides
        // Note: Si l'étiquette sort à l'envers, on doit inverser la direction
        // direction: 0 = FORWARD (normal), 1 = BACKWARD (inversé)
        // Si l'étiquette sort à l'envers, inverser la logique
        const tscDirection = thermalSettings.direction === 0 
          ? this.BluetoothTscPrinter.DIRECTION.BACKWARD  // Si direction === 0 et que ça sort à l'envers, utiliser BACKWARD
          : this.BluetoothTscPrinter.DIRECTION.FORWARD;  // Si direction === 1 et que ça sort à l'envers, utiliser FORWARD

        console.log(`📐 [TSC] Layout final:`, {
          dimensions: `${width}mm x ${height}mm (disponible: ${availableHeight}mm)`,
          name: `${nameX}pts, ${nameY}pts (${nameY_mm.toFixed(1)}mm) - à gauche`,
          spacingAfterName: `${spacingAfterName}mm`,
          barcode: `à droite, y=${barcodeYPos}pts (${barcodeY_mm.toFixed(1)}mm, hauteur: ${barcodeHeight_mm}mm)`,
          spacingAfterBarcode: `${spacingAfterBarcode}mm`,
          legend: `à droite, y=${legendY}pts (${(legendY / dotsPerMm).toFixed(1)}mm)`,
          cugPrice: `CUG à gauche (x=${nameX}pts), Prix à droite, y=${cugPriceY_final}pts (${(cugPriceY_final / dotsPerMm).toFixed(1)}mm) - même ligne`,
          adjustmentY: `${adjustmentY.toFixed(1)}mm`,
          maxY: `${maxY}pts (${(maxY / dotsPerMm).toFixed(1)}mm)`,
          direction: tscDirection === this.BluetoothTscPrinter.DIRECTION.FORWARD ? 'FORWARD' : 'BACKWARD'
        });

        const tscOptions: any = {
          width: widthDots, // Largeur en points
          height: heightDots, // Hauteur en points
          gap: Math.max(0, Math.min(thermalSettings.gap ?? 2, 50)), // Limiter entre 0 et 50
          direction: tscDirection,
          reference: [Math.max(0, Math.min(thermalSettings.offset ?? 0, 100)), 0], // Limiter entre 0 et 100
          tear: this.BluetoothTscPrinter.TEAR.ON,
          sound: 0,
          density: Math.max(0, Math.min(thermalSettings.density ?? 8, 15)), // Limiter entre 0 et 15
          speed: Math.max(1, Math.min(thermalSettings.speed ?? 4, 15)), // Limiter entre 1 et 15
          text: textBlocks,
          barcode: barcodeBlocks,
        };

        console.log(`🔧 [TSC] Paramètres thermiques appliqués:`, {
          density: tscOptions.density,
          speed: tscOptions.speed,
          direction: tscOptions.direction === this.BluetoothTscPrinter.DIRECTION.FORWARD ? 'FORWARD' : 'BACKWARD',
          gap: tscOptions.gap,
          offset: tscOptions.reference[0],
        });

        console.log(`🖨️ [TSC] Options pour produit ${product.name}:`, JSON.stringify(tscOptions, null, 2));
        
        // Vérifier les méthodes disponibles dans BluetoothTscPrinter
        console.log(`🔍 [TSC] Méthodes disponibles dans BluetoothTscPrinter:`, Object.keys(this.BluetoothTscPrinter || {}));
        console.log(`🔍 [TSC] printLabel disponible:`, typeof this.BluetoothTscPrinter.printLabel);
        console.log(`🔍 [TSC] printLabel type:`, typeof this.BluetoothTscPrinter.printLabel);

        // Imprimer le nombre de copies demandées
        for (let i = 0; i < Math.max(1, copies); i++) {
          console.log(`🖨️ [TSC] Impression copie ${i + 1}/${copies} pour produit: ${product.name}`);
          
          try {
            // Vérifier que printLabel existe et est une fonction
            if (typeof this.BluetoothTscPrinter.printLabel !== 'function') {
              console.error(`❌ [TSC] printLabel n'est pas une fonction. Type:`, typeof this.BluetoothTscPrinter.printLabel);
              console.error(`❌ [TSC] Méthodes disponibles:`, Object.keys(this.BluetoothTscPrinter));
              throw new Error('printLabel n\'est pas une fonction disponible');
            }
            
            console.log(`🖨️ [TSC] Appel printLabel avec options...`);
            console.log(`🖨️ [TSC] Options (détails):`, {
              width: tscOptions.width,
              height: tscOptions.height,
              textCount: tscOptions.text?.length || 0,
              barcodeCount: tscOptions.barcode?.length || 0
            });
            
            // Appeler printLabel avec les options
            console.log(`🖨️ [TSC] Appel printLabel...`);
            console.log(`🖨️ [TSC] Options complètes:`, JSON.stringify(tscOptions, null, 2));
            
            const printResult = await this.BluetoothTscPrinter.printLabel(tscOptions);
            
            console.log(`✅ [TSC] printLabel appelé avec succès, résultat:`, printResult);
            console.log(`✅ [TSC] Type du résultat:`, typeof printResult);
            console.log(`✅ [TSC] Résultat est null/undefined:`, printResult === null || printResult === undefined);
            
            // Vérifier si printLabel nécessite une méthode supplémentaire pour envoyer
            // Certaines API nécessitent d'appeler print() ou send() après printLabel()
            if (typeof this.BluetoothTscPrinter.print === 'function') {
              console.log(`🖨️ [TSC] Méthode print() disponible, appel...`);
              await this.BluetoothTscPrinter.print(1); // Imprimer 1 copie
              console.log(`✅ [TSC] print() appelé`);
            } else if (typeof this.BluetoothTscPrinter.send === 'function') {
              console.log(`🖨️ [TSC] Méthode send() disponible, appel...`);
              await this.BluetoothTscPrinter.send();
              console.log(`✅ [TSC] send() appelé`);
            } else {
              console.log(`ℹ️ [TSC] Aucune méthode print() ou send() disponible, printLabel devrait suffire`);
            }
            
            // Attendre un peu pour que l'impression se termine (augmenter le délai)
            await new Promise(resolve => setTimeout(resolve, 800));
            
            console.log(`✅ [TSC] Copie ${i + 1} envoyée à l'imprimante`);
          } catch (printError: any) {
            console.error(`❌ [TSC] Erreur lors de l'impression copie ${i + 1}:`, printError);
            console.error(`❌ [TSC] Détails erreur:`, {
              message: printError?.message,
              stack: printError?.stack,
              error: printError,
              errorType: typeof printError,
              errorString: String(printError)
            });
            
            // Si c'est la première copie et qu'il y a une erreur, la propager
            if (i === 0) {
              throw new Error(`Échec impression TSC: ${printError?.message || String(printError) || 'Erreur inconnue'}`);
            }
            // Sinon, continuer avec les autres copies
          }
          
          // Pause entre les copies
          if (i < copies - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        console.log(`✅ [TSC] Produit ${product.name} traité avec succès`);
      }

      // Attendre un peu à la fin pour s'assurer que tout est imprimé
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🏷️ [TSC] Toutes les étiquettes TSC envoyées avec succès');
    } catch (error: any) {
      console.error('❌ [TSC] Erreur impression TSC:', error);
      console.error('❌ [TSC] Stack trace:', error?.stack);
      const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
      throw new Error(`Échec impression TSC: ${errorMessage}`);
    }
  }

}

export default new BluetoothPrinterService();
