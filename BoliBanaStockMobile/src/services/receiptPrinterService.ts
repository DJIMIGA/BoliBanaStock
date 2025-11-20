import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getCachedCurrency } from '../hooks/useConfiguration';

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

// Interface pour les données de ticket
export interface ReceiptData {
  sale: {
    id: number;
    reference: string;
    sale_date: string;
    status: string;
    payment_status: string;
    payment_method: string;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    amount_paid: number;
    amount_given?: number;
    change_amount?: number;
    sarali_reference?: string;
    notes?: string;
  };
  site: {
    name: string;
    company_name: string;
    address: string;
    phone: string;
    email: string;
    currency: string;
  };
  seller: {
    username: string;
    first_name: string;
    last_name: string;
  };
  customer?: {
    id?: number;
    name: string;
    first_name: string;
    phone: string;
    email: string;
    credit_balance: number;
  };
  items: Array<{
    product_name: string;
    product_cug: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  printer_type: 'pdf' | 'escpos';
  generated_at: string;
}

class ReceiptPrinterService {
  private connectedPrinter: BluetoothPrinter | null = null;
  private BluetoothEscposPrinter: any = null;
  private BluetoothManager: any = null;

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

  // Vérifier l'état réel de la connexion Bluetooth
  async checkConnectionStatus(): Promise<boolean> {
    try {
      if (!this.connectedPrinter) {
        return false;
      }

      if (!this.BluetoothManager) {
        return false;
      }

      // Vérifier l'état de la connexion via BluetoothManager
      // Certaines bibliothèques ont une méthode getState() ou isConnected()
      if (typeof this.BluetoothManager.getState === 'function') {
        const state = await this.BluetoothManager.getState();
        console.log('🔍 [BLUETOOTH] État connexion:', state);
        return state === 'connected' || state === 2; // 2 = CONNECTED
      }

      if (typeof this.BluetoothManager.isConnected === 'function') {
        const connected = await this.BluetoothManager.isConnected();
        console.log('🔍 [BLUETOOTH] Connexion active:', connected);
        return connected;
      }

      // Si aucune méthode de vérification n'est disponible, on suppose que la connexion est active
      // si connectedPrinter n'est pas null
      return this.connectedPrinter !== null;
    } catch (error) {
      console.error('❌ [BLUETOOTH] Erreur vérification connexion:', error);
      return false;
    }
  }

  // Obtenir l'imprimante connectée
  getConnectedPrinter(): BluetoothPrinter | null {
    return this.connectedPrinter;
  }

  // Helpers d'impression ESC/POS avec encodage et formatage fr-FR
  private escposOptions() {
    // CP1252 (Western Europe) pour gérer les accents français directement
    // Codepage 16 = CP1252 (Windows-1252) qui supporte les caractères français
    return { encoding: 'CP1252', codepage: 16 } as any;
  }

  // Convertir le texte en CP1252 pour l'impression (gère les accents français)
  private convertToCP1252(text: string): string {
    if (!text) return '';
    
    try {
      // Table de conversion complète pour tous les caractères français et spéciaux
      const charMap: Record<string, string> = {
        // Caractères français avec accents -> sans accents
        'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
        'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
        'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
        'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
        'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
        'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
        'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
        'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
        'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
        'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
        'ý': 'y', 'ÿ': 'y',
        'Ý': 'Y', 'Ÿ': 'Y',
        'ç': 'c', 'Ç': 'C',
        'ñ': 'n', 'Ñ': 'N',
        // Caractères spéciaux
        'œ': 'oe', 'Œ': 'OE',
        'æ': 'ae', 'Æ': 'AE',
        '€': 'EUR',
        '£': 'GBP',
        '¥': 'YEN',
        // Guillemets et apostrophes
        '\u2019': "'", '\u2018': "'", // Apostrophes
        '\u201D': '"', '\u201C': '"', // Guillemets
        '\u00AB': '"', '\u00BB': '"', // Guillemets français
        // Caractères de contrôle et spéciaux
        '\u200B': '', // Zero-width space
        '\u200C': '', // Zero-width non-joiner
        '\u200D': '', // Zero-width joiner
        '\uFEFF': '', // Zero-width no-break space
      };
      
      let result = text;
      
      // Étape 1: Remplacer tous les caractères de la table de conversion
      for (const [char, replacement] of Object.entries(charMap)) {
        result = result.replace(new RegExp(char, 'g'), replacement);
      }
      
      // Étape 2: Normalisation Unicode pour les caractères restants
      // Décomposer les caractères avec diacritiques et supprimer les diacritiques
      let normalized = result.normalize('NFD');
      normalized = normalized.replace(/[\u0300-\u036f]/g, ''); // Supprimer tous les diacritiques (accents)
      
      // Étape 3: Filtrer les caractères restants non supportés
      // Garder seulement les caractères ASCII imprimables (0x20-0x7E)
      normalized = normalized.split('').map(char => {
        const code = char.charCodeAt(0);
        // Garder seulement ASCII imprimable (lettres, chiffres, ponctuation)
        if (code >= 0x20 && code <= 0x7E) {
          return char;
        }
        // Remplacer les caractères de contrôle (0x00-0x1F) sauf \n, \r, \t
        if (code < 0x20) {
          if (code === 0x0A || code === 0x0D || code === 0x09) { // \n, \r, \t
            return char;
          }
          return ' '; // Remplacer par un espace
        }
        // Remplacer tous les autres caractères non-ASCII par un espace
        return ' ';
      }).join('');
      
      // Nettoyer les espaces multiples (mais préserver les sauts de ligne)
      normalized = normalized.replace(/[ \t]+/g, ' '); // Espaces et tabs multiples -> un seul espace
      normalized = normalized.replace(/[ \t]*\n[ \t]*/g, '\n'); // Nettoyer autour des \n
      
      // Log pour débogage si le texte a changé
      if (text !== normalized) {
        console.log('📝 [ESC/POS] Conversion CP1252:', { 
          original: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          converted: normalized.substring(0, 50) + (normalized.length > 50 ? '...' : '')
        });
      }
      
      return normalized;
    } catch (error) {
      console.warn('⚠️ [ESC/POS] Erreur conversion CP1252, utilisation du texte original');
      return text;
    }
  }

  // Convertir les caractères français (approche moderne avec normalisation Unicode)
  // Identique à la fonction utilisée pour les étiquettes TSC
  private convertFrenchCharsForESC(text: string): string {
    if (!text) return '';
    
    // Table de conversion pour les caractères spéciaux (AVANT normalisation)
    const charMap: Record<string, string> = {
      'œ': 'oe', 'Œ': 'OE',
      'æ': 'ae', 'Æ': 'AE',
      '\u2019': "'", '\u2018': "'", '\u201D': '"', '\u201C': '"', '\u00AB': '"', '\u00BB': '"',
      '€': 'EUR', '£': 'GBP', '¥': 'YEN',
      // Préserver les espaces normaux (0x20) - ne pas les remplacer
    };
    
    // Étape 1: Appliquer la table de conversion AVANT normalisation pour préserver les caractères ASCII
    let processed = text.split('').map(char => {
      // Si c'est un espace normal, le garder
      if (char === ' ' || char === '\u0020') return ' ';
      // Si c'est dans la table de conversion, l'utiliser
      if (charMap[char]) return charMap[char];
      // Si c'est un caractère ASCII imprimable, le garder tel quel (IMPORTANT: avant normalisation)
      if (char.charCodeAt(0) >= 0x20 && char.charCodeAt(0) <= 0x7E) return char;
      // Sinon, continuer pour traitement avec normalisation
      return char;
    }).join('');
    
    // Étape 2: Normalisation Unicode (NFD = décompose les caractères avec diacritiques)
    // Seulement pour les caractères non-ASCII qui restent
    let normalized = processed.normalize('NFD');
    
    // Étape 3: Supprimer les diacritiques (accents) en gardant seulement les caractères de base
    normalized = normalized.replace(/[\u0300-\u036f]/g, '');
    
    // Étape 4: Finaliser - garder les caractères ASCII imprimables et remplacer le reste
    return normalized.split('').map(char => {
      // Si c'est un espace normal, le garder
      if (char === ' ' || char === '\u0020') return ' ';
      // Si c'est un caractère ASCII imprimable, le garder tel quel
      if (char.charCodeAt(0) >= 0x20 && char.charCodeAt(0) <= 0x7E) return char;
      // Sinon, remplacer par un espace pour éviter les caractères invalides
      return ' ';
    }).join('');
  }

  private formatNumberForPDF(n: number): string {
    // Formatter avec espaces comme séparateurs de milliers (ex: 2 000 au lieu de 2000)
    // Préserver le signe négatif
    const isNegative = n < 0;
    const num = Math.abs(n);
    const intPart = Math.floor(num);
    const decPart = Math.round((num - intPart) * 100);
    
    // Formatter la partie entière avec espaces tous les 3 chiffres
    let formatted = intPart.toString();
    formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    
    // Ajouter les décimales si nécessaire
    if (decPart > 0) {
      formatted += ',' + (decPart < 10 ? '0' + decPart : decPart);
    }
    
    // Ajouter le signe négatif si nécessaire
    if (isNegative) {
      formatted = '-' + formatted;
    }
    
    return formatted;
  }

  private formatAmount(n: number, currency: string): string {
    return `${this.formatNumberForPDF(n)} ${currency || ''}`.trim();
  }

  private async escposText(text: string) {
    // Convertir en CP1252 pour gérer les caractères français directement
    const convertedText = this.convertToCP1252(text);
    
    try {
      // Vérifier que l'imprimante est toujours connectée avant d'envoyer
      if (!this.connectedPrinter || !this.BluetoothEscposPrinter) {
        throw new Error('Imprimante non connectée');
      }
      
      // Envoyer le texte avec les options CP1252
      await this.BluetoothEscposPrinter.printText(convertedText, this.escposOptions());
      
      // Certaines bibliothèques nécessitent un flush pour envoyer les données
      if (typeof this.BluetoothEscposPrinter.flush === 'function') {
        await this.BluetoothEscposPrinter.flush();
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
      console.error('❌ [ESC/POS] Erreur envoi texte:', errorMessage);
      console.error('❌ [ESC/POS] Texte:', convertedText);
      
      // Si l'erreur contient "command_not_send" ou "not connected", relancer avec un message clair
      if (errorMessage.includes('command_not_send') || errorMessage.includes('not connected') || errorMessage.includes('connection')) {
        throw new Error('Connexion Bluetooth perdue. Veuillez vérifier la connexion et réessayer.');
      }
      
      throw error;
    }
  }

  // Imprimer du texte en grande taille (pour le nom de société)
  private async escposTextLarge(text: string) {
    // Convertir en CP1252 pour gérer les caractères français directement
    const convertedText = this.convertToCP1252(text);
    
    try {
      // Vérifier que l'imprimante est toujours connectée avant d'envoyer
      if (!this.connectedPrinter || !this.BluetoothEscposPrinter) {
        throw new Error('Imprimante non connectée');
      }
      
      // Nettoyer le texte et éviter les caractères parasites
      const cleanText = convertedText.replace(/\n+$/, '').trim(); // Supprimer les \n en fin et espaces
      
      // Méthode: Envoyer la commande ESC/POS séparément pour éviter l'impression du "!"
      // ESC ! n : Définit le mode d'impression
      // n = 0x30 = double largeur (0x10) + double hauteur (0x20)
      const doubleSizeCommand = Buffer.from([0x1B, 0x21, 0x30]); // ESC ! 30 (double largeur + double hauteur)
      const normalSizeCommand = Buffer.from([0x1B, 0x21, 0x00]); // ESC ! 00 (taille normale)
      
      console.log('📝 [ESC/POS] Envoi texte large avec commandes ESC/POS séparées');
      
      // Essayer d'envoyer la commande via printCommand ou sendRaw si disponible
      let commandSent = false;
      
      // Méthode 1: Utiliser printCommand si disponible
      if (typeof this.BluetoothEscposPrinter.printCommand === 'function') {
        try {
          await this.BluetoothEscposPrinter.printCommand(doubleSizeCommand);
          commandSent = true;
          console.log('✅ [ESC/POS] Commande double taille envoyée via printCommand');
        } catch (cmdError) {
          console.warn('⚠️ [ESC/POS] printCommand échoué, essai autre méthode');
        }
      }
      
      // Méthode 2: Utiliser sendRaw si disponible
      if (!commandSent && typeof this.BluetoothEscposPrinter.sendRaw === 'function') {
        try {
          await this.BluetoothEscposPrinter.sendRaw(doubleSizeCommand);
          commandSent = true;
          console.log('✅ [ESC/POS] Commande double taille envoyée via sendRaw');
        } catch (rawError) {
          console.warn('⚠️ [ESC/POS] sendRaw échoué, essai autre méthode');
        }
      }
      
      // Méthode 3: Utiliser printText avec la commande en string (fallback)
      if (!commandSent) {
        const doubleSizeCommandStr = '\x1B\x21\x30';
        await this.BluetoothEscposPrinter.printText(doubleSizeCommandStr, this.escposOptions());
        console.log('✅ [ESC/POS] Commande double taille envoyée via printText (fallback)');
      }
      
      // Envoyer le texte
      await this.BluetoothEscposPrinter.printText(cleanText + '\n', this.escposOptions());
      
      // Réinitialiser la taille normale
      if (commandSent) {
        if (typeof this.BluetoothEscposPrinter.printCommand === 'function') {
          await this.BluetoothEscposPrinter.printCommand(normalSizeCommand);
        } else if (typeof this.BluetoothEscposPrinter.sendRaw === 'function') {
          await this.BluetoothEscposPrinter.sendRaw(normalSizeCommand);
        } else {
          await this.BluetoothEscposPrinter.printText('\x1B\x21\x00', this.escposOptions());
        }
      } else {
        await this.BluetoothEscposPrinter.printText('\x1B\x21\x00', this.escposOptions());
      }
      
      // Certaines bibliothèques nécessitent un flush pour envoyer les données
      if (typeof this.BluetoothEscposPrinter.flush === 'function') {
        await this.BluetoothEscposPrinter.flush();
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
      console.error('❌ [ESC/POS] Erreur envoi texte large:', errorMessage);
      console.error('❌ [ESC/POS] Texte:', convertedText);
      
      // Fallback: utiliser le texte normal si la méthode échoue
      console.warn('⚠️ [ESC/POS] Fallback vers texte normal');
      await this.escposText(convertedText);
      
      // Si l'erreur contient "command_not_send" ou "not connected", relancer avec un message clair
      if (errorMessage.includes('command_not_send') || errorMessage.includes('not connected') || errorMessage.includes('connection')) {
        throw new Error('Connexion Bluetooth perdue. Veuillez vérifier la connexion et réessayer.');
      }
    }
  }

  // Imprimer un ticket de caisse complet
  async printReceipt(receiptData: ReceiptData): Promise<void> {
    if (!this.connectedPrinter) {
      throw new Error('Aucune imprimante connectée');
    }

    try {
      const { sale, site, seller, customer, items } = receiptData;
      const currency = site.currency || '';
      
      if (!this.BluetoothEscposPrinter) {
        console.log('🔵 Mode simulation: Impression ticket');
        console.log('🧾 Ticket:', { 
          reference: sale.reference, 
          total: sale.total_amount,
          items: items.length 
        });
        return;
      }

      // Vérifier l'état réel de la connexion Bluetooth avant d'envoyer des commandes
      console.log('🔍 [ESC/POS] Vérification connexion Bluetooth...');
      const isReallyConnected = await this.checkConnectionStatus();
      if (!isReallyConnected) {
        console.error('❌ [ESC/POS] Connexion Bluetooth non active');
        throw new Error('Connexion Bluetooth non active. Veuillez vérifier la connexion et réessayer.');
      }
      console.log('✅ [ESC/POS] Connexion Bluetooth vérifiée');

      // Configuration de l'imprimante
      await this.BluetoothEscposPrinter.printerAlign(this.BluetoothEscposPrinter.ALIGN.CENTER);
      
      // Densité maximale pour une meilleure qualité d'impression
      // Essayer plusieurs méthodes pour définir la densité au maximum
      console.log('🔧 [ESC/POS] Configuration densité maximale...');
      
      // Méthode 1: setDensity (si disponible)
      if (typeof this.BluetoothEscposPrinter.setDensity === 'function') {
        try {
          await this.BluetoothEscposPrinter.setDensity(15); // Densité maximale (0-15)
          console.log('✅ [ESC/POS] Densité définie avec setDensity(15)');
        } catch (error) {
          console.warn('⚠️ [ESC/POS] setDensity échoué:', error);
        }
      }
      
      // Méthode 2: setPrintDensity (si disponible)
      if (typeof this.BluetoothEscposPrinter.setPrintDensity === 'function') {
        try {
          await this.BluetoothEscposPrinter.setPrintDensity(15);
          console.log('✅ [ESC/POS] Densité définie avec setPrintDensity(15)');
        } catch (error) {
          console.warn('⚠️ [ESC/POS] setPrintDensity échoué:', error);
        }
      }
      
      // Méthode 3: setBlob (ancienne méthode, peut-être pour la densité)
      if (typeof this.BluetoothEscposPrinter.setBlob === 'function') {
        try {
          await this.BluetoothEscposPrinter.setBlob(15); // Densité maximale (0-15)
          console.log('✅ [ESC/POS] Densité définie avec setBlob(15)');
        } catch (error) {
          console.warn('⚠️ [ESC/POS] setBlob échoué:', error);
        }
      }
      
      // Méthode 4: Commandes ESC/POS brutes pour densité maximale
      // GS (D n1 n2 : Définit la densité d'impression
      // n1 = 0x02 (fonction), n2 = 0x0F (densité maximale = 15)
      try {
        const densityCommand = [0x1D, 0x28, 0x44, 0x02, 0x00, 0x0F]; // GS (D 02 00 0F (densité max)
        
        // Essayer différentes méthodes pour envoyer la commande brute
        if (typeof this.BluetoothEscposPrinter.printCommand === 'function') {
          await this.BluetoothEscposPrinter.printCommand(densityCommand);
          console.log('✅ [ESC/POS] Densité définie avec commande brute printCommand');
        } else if (typeof this.BluetoothEscposPrinter.sendRaw === 'function') {
          await this.BluetoothEscposPrinter.sendRaw(densityCommand);
          console.log('✅ [ESC/POS] Densité définie avec commande brute sendRaw');
        } else if (typeof this.BluetoothEscposPrinter.sendCommand === 'function') {
          await this.BluetoothEscposPrinter.sendCommand(densityCommand);
          console.log('✅ [ESC/POS] Densité définie avec commande brute sendCommand');
        } else if (typeof this.BluetoothEscposPrinter.send === 'function') {
          const uint8Array = new Uint8Array(densityCommand);
          await this.BluetoothEscposPrinter.send(uint8Array);
          console.log('✅ [ESC/POS] Densité définie avec commande brute send');
        }
      } catch (rawError) {
        console.warn('⚠️ [ESC/POS] Commande brute densité échouée:', rawError);
      }
      
      // Méthode 5: Mode d'impression gras pour texte plus foncé
      // ESC ! n : Définit le mode d'impression (n = 0x08 pour gras)
      try {
        const boldCommand = [0x1B, 0x21, 0x08]; // ESC ! 08 (gras activé)
        
        if (typeof this.BluetoothEscposPrinter.printCommand === 'function') {
          await this.BluetoothEscposPrinter.printCommand(boldCommand);
        } else if (typeof this.BluetoothEscposPrinter.sendRaw === 'function') {
          await this.BluetoothEscposPrinter.sendRaw(boldCommand);
        } else if (typeof this.BluetoothEscposPrinter.sendCommand === 'function') {
          await this.BluetoothEscposPrinter.sendCommand(boldCommand);
        } else if (typeof this.BluetoothEscposPrinter.send === 'function') {
          const uint8Array = new Uint8Array(boldCommand);
          await this.BluetoothEscposPrinter.send(uint8Array);
        }
        console.log('✅ [ESC/POS] Mode gras activé pour texte plus foncé');
      } catch (boldError) {
        console.warn('⚠️ [ESC/POS] Activation mode gras échouée:', boldError);
      }
      
      // En-tête du ticket - Nom de société en grande taille et centré
      await this.BluetoothEscposPrinter.printerAlign(this.BluetoothEscposPrinter.ALIGN.CENTER);
      // Ne pas inclure \n dans escposTextLarge, il sera géré par la fonction
      await this.escposTextLarge(site.company_name);
      await this.escposText('\n'); // Ligne vide après le nom
      if (site.address) {
        await this.escposText(`${site.address}\n`);
      }
      if (site.phone) {
        await this.escposText(`Tel: ${site.phone}\n`);
      }
      
      // Séparateur
      await this.escposText('--------------------------------\n');
      
      // Informations de la vente
      await this.escposText(`Ticket: ${sale.reference}\n`);
      await this.escposText(`Date: ${new Date(sale.sale_date).toLocaleString('fr-FR')}\n`);
      await this.escposText(`Vendeur: ${seller.username}\n`);
      
      // Client
      if (customer && (customer.name || customer.first_name)) {
        const customerName = [customer.name, customer.first_name].filter(Boolean).join(' ').trim();
        await this.escposText(`Client: ${customerName}\n`);
        if (customer.phone) {
          await this.escposText(`Tel: ${customer.phone}\n`);
        }
      } else if (sale.payment_method === 'credit') {
        if (customer && customer.id) {
          await this.escposText(`Client: ID #${customer.id} (Nom non spécifié)\n`);
        } else {
          await this.escposText(`Client: Non spécifié (Crédit)\n`);
        }
      } else {
        await this.escposText('Client: Anonyme\n');
      }
      
      await this.escposText('--------------------------------\n');
      
      // Articles
      await this.BluetoothEscposPrinter.printerAlign(this.BluetoothEscposPrinter.ALIGN.LEFT);
      for (const item of items) {
        await this.escposText(`${item.product_name}\n`);
        await this.escposText(`  ${item.quantity} x ${this.formatAmount(item.unit_price, currency)}\n`);
        await this.escposText(`  = ${this.formatAmount(item.total_price, currency)}\n\n`);
      }
      
      // Séparateur
      await this.BluetoothEscposPrinter.printerAlign(this.BluetoothEscposPrinter.ALIGN.CENTER);
      await this.escposText('--------------------------------\n');
      
      // Totaux
      await this.BluetoothEscposPrinter.printerAlign(this.BluetoothEscposPrinter.ALIGN.LEFT);
      await this.escposText(`Sous-total: ${this.formatAmount(sale.subtotal, currency)}\n`);
      if (sale.discount_amount > 0) {
        await this.escposText(`Remise: -${this.formatAmount(sale.discount_amount, currency)}\n`);
      }
      if (sale.tax_amount > 0) {
        await this.escposText(`TVA: ${this.formatAmount(sale.tax_amount, currency)}\n`);
      }
      await this.escposText('--------------------------------\n');
      await this.escposText(`TOTAL: ${this.formatAmount(sale.total_amount, currency)}\n`);
      
      // Paiement
      await this.escposText('--------------------------------\n');
      await this.BluetoothEscposPrinter.printerAlign(this.BluetoothEscposPrinter.ALIGN.CENTER);
      const paymentMethodText = this.getPaymentMethodText(sale.payment_method);
      await this.escposText(`Paiement: ${paymentMethodText}\n`);
      
      if (sale.payment_method === 'cash' && sale.amount_given && sale.change_amount) {
        await this.escposText(`Montant donné: ${this.formatAmount(sale.amount_given, currency)}\n`);
        await this.escposText(`Montant rendu: ${this.formatAmount(sale.change_amount, currency)}\n`);
      } else if (sale.payment_method === 'sarali' && sale.sarali_reference) {
        await this.escposText(`Réf. Sarali: ${sale.sarali_reference}\n`);
      } else if (sale.payment_method === 'credit' && customer) {
        await this.escposText(`Solde client: ${this.formatAmount(customer.credit_balance, currency)}\n`);
      }
      
      // Code-barres pour retour (référence de la vente)
      await this.escposText('\n');
      await this.BluetoothEscposPrinter.printerAlign(this.BluetoothEscposPrinter.ALIGN.CENTER);
      await this.escposText('Retour: Scanner le code\n');
      
      // Utiliser la référence de la vente comme code scannable
      let saleCode = sale.reference || `SALE-${sale.id}`;
      
      // Fonction pour nettoyer le code-barres selon son type
      const sanitizeBarcodeForESC = (code: string, type: string): string => {
        if (!code) return '';
        
        // CODE39 : uniquement majuscules, chiffres, et certains caractères spéciaux
        // CODE39 supporte : A-Z, 0-9, et les caractères spéciaux : - . $ / + % SPACE
        if (type === 'CODE39' || type.includes('CODE39')) {
          // Convertir en majuscules et garder seulement les caractères valides
          return code.toUpperCase().replace(/[^A-Z0-9\-\.\$\/\+\% ]/g, '');
        }
        
        // CODE93 : similaire à CODE39 mais plus compact
        if (type === 'CODE93' || type.includes('CODE93')) {
          return code.toUpperCase().replace(/[^A-Z0-9\-\.\$\/\+\% ]/g, '');
        }
        
        // CODE128 : supporte TOUS les caractères ASCII imprimables (0x20-0x7E)
        // CODE128 est le plus flexible et supporte les lettres majuscules ET minuscules
        // C'est le meilleur choix pour les références avec lettres
        if (type === 'CODE128' || type.includes('CODE128')) {
          // Garder tous les caractères ASCII imprimables (lettres, chiffres, symboles)
          // CODE128 supporte les lettres minuscules et majuscules
          return code.replace(/[^\x20-\x7E]/g, ''); // Caractères ASCII imprimables uniquement (0x20-0x7E)
        }
        
        // Par défaut : supprimer seulement les caractères non imprimables
        // Garder les lettres et chiffres
        return code.replace(/[^\x20-\x7E]/g, '');
      };
      
      // Vérifier les types de code-barres disponibles
      const barcodeTypesAvailable = this.BluetoothEscposPrinter.BARCODE_TYPE ? 
        Object.keys(this.BluetoothEscposPrinter.BARCODE_TYPE) : [];
      
      console.log('📊 [BARCODE] Tentative impression code-barres:', {
        code: saleCode,
        codeLength: saleCode.length,
        codeContainsLetters: /[a-zA-Z]/.test(saleCode),
        methodsAvailable: {
          printBarCode: typeof this.BluetoothEscposPrinter.printBarCode === 'function',
          printBarcode: typeof this.BluetoothEscposPrinter.printBarcode === 'function',
          BARCODE_TYPE: typeof this.BluetoothEscposPrinter.BARCODE_TYPE !== 'undefined',
          barcodeTypes: barcodeTypesAvailable,
          BluetoothEscposPrinter: !!this.BluetoothEscposPrinter,
          allMethods: Object.keys(this.BluetoothEscposPrinter || {}).filter(k => k.toLowerCase().includes('barcode') || k.toLowerCase().includes('print'))
        }
      });
      
      // CODE128 est le meilleur choix pour les codes avec lettres
      // Prioriser CODE128 si le code contient des lettres
      const codeHasLetters = /[a-zA-Z]/.test(saleCode);
      if (codeHasLetters) {
        console.log('📊 [BARCODE] Code contient des lettres, prioriser CODE128');
      }
      
      // Vérifier que BluetoothEscposPrinter est bien disponible
      if (!this.BluetoothEscposPrinter) {
        console.error('❌ [BARCODE] BluetoothEscposPrinter n\'est pas disponible');
        await this.escposText(`[${saleCode}]\n`);
        await this.escposText(`${sale.reference || `ID: ${sale.id}`}\n`);
        return;
      }
      
      // Imprimer le code-barres CODE128 (compatible avec la plupart des scanners)
      let barcodePrinted = false;
      const BARCODE_TYPE = this.BluetoothEscposPrinter.BARCODE_TYPE || {};
      
      // Valeurs numériques par défaut pour les types de code-barres (si BARCODE_TYPE n'est pas défini)
      // Ces valeurs sont communes pour la plupart des imprimantes ESC/POS
      const DEFAULT_BARCODE_TYPES: Record<string, number> = {
        CODE128: 73,      // CODE128 standard
        CODE128_A: 65,    // CODE128 Set A
        CODE128_B: 66,    // CODE128 Set B
        CODE128_M: 77,    // CODE128 Set C (mixte)
        CODE39: 4,        // CODE39
        CODE93: 72,       // CODE93
      };
      
      // Types de code-barres à essayer (dans l'ordre de préférence)
      // Si le code contient des lettres, prioriser CODE128 qui les supporte
      let barcodeTypesToTry = [];
      
      if (codeHasLetters) {
        // Pour les codes avec lettres, prioriser CODE128 (supporte majuscules et minuscules)
        barcodeTypesToTry = [
          { name: 'CODE128', type: BARCODE_TYPE.CODE128 || DEFAULT_BARCODE_TYPES.CODE128 },
          { name: 'CODE128_B', type: BARCODE_TYPE.CODE128_B || DEFAULT_BARCODE_TYPES.CODE128_B }, // CODE128_B supporte aussi les lettres
          { name: 'CODE128_A', type: BARCODE_TYPE.CODE128_A || DEFAULT_BARCODE_TYPES.CODE128_A },
          { name: 'CODE128_M', type: BARCODE_TYPE.CODE128_M || DEFAULT_BARCODE_TYPES.CODE128_M },
          { name: 'CODE39', type: BARCODE_TYPE.CODE39 || DEFAULT_BARCODE_TYPES.CODE39 }, // CODE39 convertit en majuscules
          { name: 'CODE93', type: BARCODE_TYPE.CODE93 || DEFAULT_BARCODE_TYPES.CODE93 },
        ];
      } else {
        // Pour les codes numériques uniquement, tous les types fonctionnent
        barcodeTypesToTry = [
          { name: 'CODE128', type: BARCODE_TYPE.CODE128 || DEFAULT_BARCODE_TYPES.CODE128 },
          { name: 'CODE39', type: BARCODE_TYPE.CODE39 || DEFAULT_BARCODE_TYPES.CODE39 },
          { name: 'CODE93', type: BARCODE_TYPE.CODE93 || DEFAULT_BARCODE_TYPES.CODE93 },
          { name: 'CODE128_M', type: BARCODE_TYPE.CODE128_M || DEFAULT_BARCODE_TYPES.CODE128_M },
          { name: 'CODE128_A', type: BARCODE_TYPE.CODE128_A || DEFAULT_BARCODE_TYPES.CODE128_A },
          { name: 'CODE128_B', type: BARCODE_TYPE.CODE128_B || DEFAULT_BARCODE_TYPES.CODE128_B },
        ];
      }
      
      console.log('📊 [BARCODE] Types de code-barres à essayer:', barcodeTypesToTry.map(bt => bt.name));
      
      try {
        // Méthode 1: printBarCode (avec majuscule C) - Essayer avec différents paramètres
        if (typeof this.BluetoothEscposPrinter.printBarCode === 'function') {
          for (const barcodeType of barcodeTypesToTry) {
            if (barcodePrinted) break;
            console.log(`📊 [BARCODE] Essai printBarCode avec ${barcodeType.name}...`);
            try {
              // Nettoyer le code selon le type de code-barres
              const cleanedCode = sanitizeBarcodeForESC(saleCode, barcodeType.name);
              if (!cleanedCode || cleanedCode.length === 0) {
                console.warn(`⚠️ [BARCODE] Code nettoyé vide pour ${barcodeType.name}, passage au suivant`);
                continue;
              }
              
              console.log(`📊 [BARCODE] Code nettoyé: "${cleanedCode}" (original: "${saleCode}")`);
              
              // Essayer avec différents formats de paramètres
              // Format 1: (code, type, height, width, align, pos) - 6 arguments
              // align: 0=left, 1=center, 2=right
              // pos: 0=no text, 1=above, 2=below
              try {
                await this.BluetoothEscposPrinter.printBarCode(
                  cleanedCode,
                  barcodeType.type,
                  100, // hauteur
                  2,   // largeur (narrow bar width)
                  1,   // align: center
                  2    // pos: texte en dessous
                );
                await this.escposText('\n');
                barcodePrinted = true;
                console.log(`✅ [BARCODE] Code-barres imprimé avec printBarCode ${barcodeType.name} (format 1 - 6 args)`);
                break;
              } catch (format1Error: any) {
                console.log(`⚠️ [BARCODE] Format 1 (6 args) échoué: ${format1Error?.message}, essai format 2...`);
                
                // Format 2: (code, type, height, width) - 4 arguments
                try {
                  await this.BluetoothEscposPrinter.printBarCode(
                    cleanedCode,
                    barcodeType.type,
                    100, // hauteur
                    2    // largeur
                  );
                  await this.escposText('\n');
                  barcodePrinted = true;
                  console.log(`✅ [BARCODE] Code-barres imprimé avec printBarCode ${barcodeType.name} (format 2 - 4 args)`);
                  break;
                } catch (format2Error: any) {
                  console.log(`⚠️ [BARCODE] Format 2 (4 args) échoué: ${format2Error?.message}, essai format 3...`);
                  
                  // Format 3: (code, type, height) - 3 arguments
                  try {
                    await this.BluetoothEscposPrinter.printBarCode(
                      cleanedCode,
                      barcodeType.type,
                      100  // hauteur uniquement
                    );
                    await this.escposText('\n');
                    barcodePrinted = true;
                    console.log(`✅ [BARCODE] Code-barres imprimé avec printBarCode ${barcodeType.name} (format 3 - 3 args)`);
                    break;
                  } catch (format3Error: any) {
                    console.log(`⚠️ [BARCODE] Format 3 (3 args) échoué: ${format3Error?.message}, essai format 4...`);
                    
                    // Format 4: (code, type) - 2 arguments
                    try {
                      await this.BluetoothEscposPrinter.printBarCode(
                        cleanedCode,
                        barcodeType.type
                      );
                      await this.escposText('\n');
                      barcodePrinted = true;
                      console.log(`✅ [BARCODE] Code-barres imprimé avec printBarCode ${barcodeType.name} (format 4 - 2 args)`);
                      break;
                    } catch (format4Error: any) {
                    console.error(`❌ [BARCODE] Tous les formats printBarCode ont échoué pour ${barcodeType.name}`);
                    }
                  }
                }
              }
            } catch (methodError: any) {
              console.error(`❌ [BARCODE] Erreur printBarCode ${barcodeType.name}:`, methodError?.message);
            }
          }
        }
        
        // Méthode 2: printBarcode (avec minuscule c) si la première a échoué
        if (!barcodePrinted && typeof this.BluetoothEscposPrinter.printBarcode === 'function') {
          for (const barcodeType of barcodeTypesToTry) {
            if (barcodePrinted) break;
            console.log(`📊 [BARCODE] Essai printBarcode avec ${barcodeType.name}...`);
            try {
              // Nettoyer le code selon le type de code-barres
              const cleanedCode = sanitizeBarcodeForESC(saleCode, barcodeType.name);
              if (!cleanedCode || cleanedCode.length === 0) {
                console.warn(`⚠️ [BARCODE] Code nettoyé vide pour ${barcodeType.name}, passage au suivant`);
                continue;
              }
              
              console.log(`📊 [BARCODE] Code nettoyé: "${cleanedCode}" (original: "${saleCode}")`);
              
              // Essayer avec différents formats de paramètres
              try {
                await this.BluetoothEscposPrinter.printBarcode(
                  cleanedCode,
                  barcodeType.type,
                  100,
                  50
                );
                await this.escposText('\n');
                barcodePrinted = true;
                console.log(`✅ [BARCODE] Code-barres imprimé avec printBarcode ${barcodeType.name} (format 1)`);
                break;
              } catch (format1Error: any) {
                try {
                  await this.BluetoothEscposPrinter.printBarcode(
                    cleanedCode,
                    barcodeType.type,
                    100
                  );
                  await this.escposText('\n');
                  barcodePrinted = true;
                  console.log(`✅ [BARCODE] Code-barres imprimé avec printBarcode ${barcodeType.name} (format 2)`);
                  break;
                } catch (format2Error: any) {
                  try {
                    await this.BluetoothEscposPrinter.printBarcode(
                      cleanedCode,
                      barcodeType.type
                    );
                    await this.escposText('\n');
                    barcodePrinted = true;
                    console.log(`✅ [BARCODE] Code-barres imprimé avec printBarcode ${barcodeType.name} (format 3)`);
                    break;
                  } catch (format3Error: any) {
                    console.error(`❌ [BARCODE] Tous les formats printBarcode ont échoué pour ${barcodeType.name}`);
                  }
                }
              }
            } catch (methodError: any) {
              console.error(`❌ [BARCODE] Erreur printBarcode ${barcodeType.name}:`, methodError?.message);
            }
          }
        }
        
        // Méthode 3: Commandes ESC/POS brutes (si les méthodes standard échouent)
        if (!barcodePrinted) {
          console.log('📊 [BARCODE] Essai avec commandes ESC/POS brutes...');
          
          // Vérifier les méthodes disponibles pour envoyer des commandes brutes
          const rawMethods = {
            printCommand: typeof this.BluetoothEscposPrinter.printCommand === 'function',
            sendRaw: typeof this.BluetoothEscposPrinter.sendRaw === 'function',
            sendCommand: typeof this.BluetoothEscposPrinter.sendCommand === 'function',
            send: typeof this.BluetoothEscposPrinter.send === 'function',
          };
          
          console.log('📊 [BARCODE] Méthodes brutes disponibles:', rawMethods);
          
          // Nettoyer le code pour les commandes brutes
          const cleanedCode = sanitizeBarcodeForESC(saleCode, 'CODE128');
          if (!cleanedCode || cleanedCode.length === 0) {
            console.warn('⚠️ [BARCODE] Code nettoyé vide pour commandes brutes');
          } else {
            console.log('📊 [BARCODE] Code nettoyé pour commandes brutes:', cleanedCode);
            
            // Essayer d'envoyer des commandes ESC/POS brutes pour CODE128
            // ESC/POS commande pour CODE128: GS k m n d1...dk
            // GS = 0x1D (29), k = 0x6B (107), m = 73 (CODE128), n = hauteur, d = données
            try {
              // Construire la commande ESC/POS brute pour CODE128
              const height = 100; // Hauteur du code-barres
              const hri = 2; // Human Readable Interpretation (2 = au-dessus)
              
              // Convertir le code nettoyé en bytes
              const codeBytes = cleanedCode.split('').map(c => c.charCodeAt(0));
              
              // Commande ESC/POS pour CODE128: GS k 73 {height} {hri} {data}
              // Format: [GS] k 73 {n} {h} {d1}...{dk}
              // où GS = 0x1D, k = 0x6B, 73 = CODE128, n = hauteur (0-255), h = HRI position, d = données
              const barcodeCommand = [0x1D, 0x6B, 73, height, hri, ...codeBytes];
              
              if (rawMethods.printCommand) {
                console.log('📊 [BARCODE] Essai printCommand avec', barcodeCommand.length, 'bytes...');
                await this.BluetoothEscposPrinter.printCommand(barcodeCommand);
                await this.escposText('\n');
                barcodePrinted = true;
                console.log('✅ [BARCODE] Code-barres imprimé avec printCommand');
              } else if (rawMethods.sendRaw) {
                console.log('📊 [BARCODE] Essai sendRaw avec', barcodeCommand.length, 'bytes...');
                await this.BluetoothEscposPrinter.sendRaw(barcodeCommand);
                await this.escposText('\n');
                barcodePrinted = true;
                console.log('✅ [BARCODE] Code-barres imprimé avec sendRaw');
              } else if (rawMethods.sendCommand) {
                console.log('📊 [BARCODE] Essai sendCommand avec', barcodeCommand.length, 'bytes...');
                await this.BluetoothEscposPrinter.sendCommand(barcodeCommand);
                await this.escposText('\n');
                barcodePrinted = true;
                console.log('✅ [BARCODE] Code-barres imprimé avec sendCommand');
              } else if (rawMethods.send) {
                console.log('📊 [BARCODE] Essai send avec', barcodeCommand.length, 'bytes...');
                // Convertir en Uint8Array si nécessaire
                const uint8Array = new Uint8Array(barcodeCommand);
                await this.BluetoothEscposPrinter.send(uint8Array);
                await this.escposText('\n');
                barcodePrinted = true;
                console.log('✅ [BARCODE] Code-barres imprimé avec send');
              }
            } catch (rawError: any) {
              console.error('❌ [BARCODE] Erreur commandes brutes:', rawError?.message);
              console.error('❌ [BARCODE] Stack trace:', rawError?.stack);
            }
          }
        }
        
        // Méthode 4: Essayer CODE39 (plus simple, plus compatible)
        if (!barcodePrinted) {
          console.log('📊 [BARCODE] Essai CODE39 (plus simple)...');
          try {
            // CODE39 est plus simple et plus compatible
            const code39Code = sanitizeBarcodeForESC(saleCode, 'CODE39');
            if (code39Code && code39Code.length > 0 && code39Code.length <= 43) { // CODE39 max 43 caractères
              console.log('📊 [BARCODE] Code CODE39 nettoyé:', code39Code);
              
              if (typeof this.BluetoothEscposPrinter.printBarCode === 'function') {
                try {
                  // Essayer avec 6 arguments d'abord
                  await this.BluetoothEscposPrinter.printBarCode(
                    code39Code,
                    DEFAULT_BARCODE_TYPES.CODE39, // CODE39 = 4
                    100, // hauteur
                    2,   // largeur
                    1,   // align: center
                    2    // pos: texte en dessous
                  );
                  await this.escposText('\n');
                  barcodePrinted = true;
                  console.log('✅ [BARCODE] Code-barres CODE39 imprimé avec printBarCode (6 args)');
                } catch (code39Error6: any) {
                  console.log(`⚠️ [BARCODE] Format 6 args échoué, essai 4 args...`);
                  try {
                    // Essayer avec 4 arguments
                    await this.BluetoothEscposPrinter.printBarCode(
                      code39Code,
                      DEFAULT_BARCODE_TYPES.CODE39, // CODE39 = 4
                      100, // hauteur
                      2    // largeur
                    );
                    await this.escposText('\n');
                    barcodePrinted = true;
                    console.log('✅ [BARCODE] Code-barres CODE39 imprimé avec printBarCode (4 args)');
                } catch (code39Error: any) {
                  console.error('❌ [BARCODE] Erreur CODE39 printBarCode:', code39Error?.message);
                  }
                }
              }
              
              if (!barcodePrinted && typeof this.BluetoothEscposPrinter.printBarcode === 'function') {
                try {
                  await this.BluetoothEscposPrinter.printBarcode(
                    code39Code,
                    BARCODE_TYPE.CODE39 || 4,
                    100,
                    50
                  );
                  await this.escposText('\n');
                  barcodePrinted = true;
                  console.log('✅ [BARCODE] Code-barres CODE39 imprimé avec printBarcode');
                } catch (code39Error: any) {
                  console.error('❌ [BARCODE] Erreur CODE39 printBarcode:', code39Error?.message);
                }
              }
            } else {
              console.warn('⚠️ [BARCODE] Code CODE39 invalide ou trop long:', code39Code);
            }
          } catch (code39Error: any) {
            console.error('❌ [BARCODE] Erreur générale CODE39:', code39Error?.message);
          }
        }
        
        if (!barcodePrinted) {
          console.warn('⚠️ [BARCODE] Aucune méthode de code-barres disponible');
          console.warn('⚠️ [BARCODE] Méthodes testées:', {
            printBarCode: typeof this.BluetoothEscposPrinter.printBarCode === 'function',
            printBarcode: typeof this.BluetoothEscposPrinter.printBarcode === 'function',
            printCommand: typeof this.BluetoothEscposPrinter.printCommand === 'function',
            sendRaw: typeof this.BluetoothEscposPrinter.sendRaw === 'function',
            sendCommand: typeof this.BluetoothEscposPrinter.sendCommand === 'function',
            send: typeof this.BluetoothEscposPrinter.send === 'function',
            BARCODE_TYPE: this.BluetoothEscposPrinter.BARCODE_TYPE
          });
          // Fallback: afficher entre crochets
          await this.escposText(`[${saleCode}]\n`);
        } else {
          console.log('✅ [BARCODE] Code-barres imprimé avec succès !');
        }
        
        // Afficher la référence sous le code-barres
        await this.escposText(`${sale.reference || `ID: ${sale.id}`}\n`);
      } catch (barcodeError: any) {
        console.error('❌ [BARCODE] Erreur générale impression code-barres:', barcodeError);
        console.error('❌ [BARCODE] Stack trace:', barcodeError?.stack);
        // Fallback: afficher le code en texte si le code-barres échoue
        await this.escposText(`[${saleCode}]\n`);
        await this.escposText(`${sale.reference || `ID: ${sale.id}`}\n`);
      }
      
      // Pied de page
      await this.escposText('\n');
      await this.escposText('Merci pour votre achat !\n');
      await this.escposText('À bientôt !\n');
      
      // Espacement et coupure
      await this.escposText('\n\n\n');
      if (typeof this.BluetoothEscposPrinter.cutOne === 'function') {
      await this.BluetoothEscposPrinter.cutOne();
      }
      
      // Flusher ou envoyer les données restantes pour s'assurer que tout est envoyé
      console.log('🔄 [ESC/POS] Envoi des données restantes...');
      try {
        // Essayer différentes méthodes pour envoyer les données
        if (typeof this.BluetoothEscposPrinter.flush === 'function') {
          await this.BluetoothEscposPrinter.flush();
          console.log('✅ [ESC/POS] Données flushées avec flush()');
        } else if (typeof this.BluetoothEscposPrinter.send === 'function') {
          // Envoyer un tableau vide pour forcer l'envoi
          await this.BluetoothEscposPrinter.send(new Uint8Array(0));
          console.log('✅ [ESC/POS] Données envoyées avec send()');
        } else if (typeof this.BluetoothEscposPrinter.print === 'function') {
          await this.BluetoothEscposPrinter.print();
          console.log('✅ [ESC/POS] Données envoyées avec print()');
        }
      } catch (flushError: any) {
        console.warn('⚠️ [ESC/POS] Erreur lors du flush (non bloquant):', flushError?.message);
        // Ne pas bloquer si le flush échoue, les données peuvent déjà être envoyées
      }
      
      console.log('🧾 Ticket imprimé avec succès');
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
      console.error('❌ Erreur impression ticket:', errorMessage);
      console.error('❌ Détails erreur:', error);
      
      // Si l'erreur contient "command_not_send" ou "not connected", relancer avec un message clair
      if (errorMessage.includes('command_not_send') || errorMessage.includes('not connected') || errorMessage.includes('connection')) {
        throw new Error('Connexion Bluetooth perdue. Veuillez vérifier la connexion et réessayer.');
      }
      
      throw error;
    }
  }

  // Générer un PDF du ticket
  async generateReceiptPDF(receiptData: ReceiptData): Promise<string> {
    try {
      console.log('📄 Génération PDF du ticket...');
      
      const html = this.buildReceiptHTML(receiptData);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      console.log('📄 PDF généré:', uri);
      return uri;
    } catch (error) {
      console.error('❌ Erreur génération PDF:', error);
      throw error;
    }
  }

  // Construire le HTML pour le PDF
  private buildReceiptHTML(receiptData: ReceiptData): string {
    const { sale, site, seller, customer, items } = receiptData;
    
    const saleDate = new Date(sale.sale_date);
    const formattedDate = saleDate.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
    const paymentMethodText = this.getPaymentMethodText(sale.payment_method);
    const currency = site.currency || getCachedCurrency();
    
    // Convertir le montant en lettres
    const amountInWords = this.numberToFrenchWords(sale.total_amount);
    
    // Informations client formatées
    const clientName = (() => {
      if (customer && (customer.name || customer.first_name)) {
        const name = [customer.name, customer.first_name].filter(Boolean).join(' ').trim();
        return name;
      } else if (sale.payment_method === 'credit') {
        if (customer && customer.id) {
          return `ID #${customer.id}`;
        }
        return 'Non spécifié';
      }
      return 'Anonyme';
    })();
    
    const clientPhone = customer?.phone || '';
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>FACTURE - ${sale.reference}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            color: #1a1a1a;
            background: #e0f2fe;
            padding: 15px;
            font-size: 12px;
            line-height: 1.5;
          }
          .receipt {
            max-width: 210mm;
            margin: 0 auto;
            background: #ffffff;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #1e40af;
          }
          .company-name {
            font-size: 28px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 8px;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .company-subtitle {
            font-size: 14px;
            color: #4b5563;
            margin-bottom: 10px;
            font-style: italic;
          }
          .company-contact {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 5px;
          }
          .company-location {
            font-size: 11px;
            color: #64748b;
            font-weight: 600;
          }
          .invoice-info {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
            padding: 15px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
          }
          .invoice-info-left {
            flex: 1;
          }
          .invoice-info-right {
            flex: 1;
            text-align: right;
          }
          .info-row {
            margin-bottom: 8px;
            font-size: 12px;
          }
          .info-label {
            font-weight: 600;
            color: #1e40af;
            display: inline-block;
            min-width: 100px;
          }
          .info-value {
            color: #1a1a1a;
            font-weight: 600;
          }
          .client-row {
            margin: 15px 0;
            padding: 12px;
            background: #f1f5f9;
            border-left: 3px solid #1e40af;
          }
          .client-label {
            font-weight: 700;
            color: #1e40af;
            font-size: 13px;
            margin-bottom: 8px;
          }
          .client-value {
            color: #1a1a1a;
            font-size: 14px;
            font-weight: 600;
          }
          .table-container {
            margin: 25px 0;
            overflow-x: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            background: white;
          }
          thead {
            background: #1e40af;
            color: white;
          }
          thead th {
            padding: 10px 8px;
            text-align: left;
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 0.5px;
          }
          thead th:nth-child(1) { width: 10%; text-align: center; }
          thead th:nth-child(2) { width: 45%; }
          thead th:nth-child(3) { width: 22.5%; text-align: right; }
          thead th:nth-child(4) { width: 22.5%; text-align: right; }
          tbody td {
            padding: 10px 8px;
            border-bottom: 1px solid #e5e7eb;
            border-right: 1px solid #f1f5f9;
          }
          tbody td:last-child {
            border-right: none;
          }
          tbody tr:last-child td {
            border-bottom: 2px solid #cbd5e1;
          }
          tbody td:nth-child(1) {
            text-align: center;
            font-weight: 600;
          }
          tbody td:nth-child(3),
          tbody td:nth-child(4) {
            text-align: right;
          }
          .designation {
            font-weight: 600;
            color: #1a1a1a;
          }
          .total-section {
            margin-top: 20px;
            padding: 15px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            font-size: 13px;
          }
          .total-label {
            font-weight: 700;
            color: #1e40af;
            font-size: 14px;
          }
          .total-value {
            font-weight: 700;
            color: #1a1a1a;
            font-size: 14px;
          }
          .amount-in-words {
            margin-top: 15px;
            padding: 12px;
            background: #fff;
            border: 1px dashed #cbd5e1;
            font-size: 11px;
            line-height: 1.6;
          }
          .amount-in-words-label {
            font-weight: 600;
            color: #4b5563;
            margin-bottom: 5px;
          }
          .amount-in-words-value {
            color: #1a1a1a;
            font-weight: 600;
            font-style: italic;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #cbd5e1;
          }
          .signature-left {
            flex: 1;
            text-align: left;
          }
          .signature-right {
            flex: 1;
            text-align: right;
          }
          .signature-label {
            font-weight: 700;
            color: #1e40af;
            font-size: 12px;
            margin-bottom: 40px;
          }
          .barcode-section {
            text-align: center;
            padding: 20px;
            margin-top: 25px;
            background: #f8fafc;
            border-top: 2px dashed #cbd5e1;
            border-bottom: 2px dashed #cbd5e1;
          }
          .barcode-label {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 10px;
            font-weight: 600;
          }
          .barcode-image {
            max-width: 100%;
            height: auto;
            margin: 10px 0;
          }
          .barcode-text {
            font-size: 11px;
            color: #1a1a1a;
            margin-top: 8px;
            font-family: 'Courier New', monospace;
            font-weight: 600;
            letter-spacing: 1px;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <!-- En-tête entreprise -->
        <div class="header">
          <div class="company-name">${site.company_name}</div>
            ${site.address ? `<div class="company-contact">Tel: ${site.phone || ''}</div>` : ''}
            ${site.address ? `<div class="company-location">${site.address}</div>` : ''}
        </div>
        
          <!-- Informations facture -->
          <div class="invoice-info">
            <div class="invoice-info-left">
              <div class="info-row">
                <span class="info-label">FACTURE N°</span>
                <span class="info-value">${sale.reference || `#${sale.id}`}</span>
        </div>
              <div class="info-row">
                <span class="info-label">Date, le</span>
                <span class="info-value">${formattedDate}</span>
              </div>
            </div>
            <div class="invoice-info-right">
              <div class="info-row">
                <span class="info-label">Vendeur:</span>
                <span class="info-value">${seller.username}</span>
            </div>
          </div>
        </div>
        
          <!-- Client -->
          <div class="client-row">
            <div class="client-label">Doit:</div>
            <div class="client-value">${clientName}${clientPhone ? ` (${clientPhone})` : ''}</div>
          </div>

          <!-- Tableau des articles -->
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Qté</th>
                  <th>Désignation</th>
                  <th>P.U</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => {
                  const unitPrice = this.formatNumberForPDF(item.unit_price);
                  const totalPrice = this.formatNumberForPDF(item.total_price);
                  return `
                <tr>
                  <td>${item.quantity}</td>
                  <td class="designation">${item.product_name}</td>
                  <td>${unitPrice} ${currency}</td>
                  <td><strong>${totalPrice} ${currency}</strong></td>
                </tr>
                `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Total -->
          <div class="total-section">
            <div class="total-row">
              <span class="total-label">TOTAL</span>
              <span class="total-value">${this.formatNumberForPDF(sale.total_amount)} ${currency}</span>
          </div>
            <div class="amount-in-words">
              <div class="amount-in-words-label">Arrêté la présente facture à la somme de:</div>
              <div class="amount-in-words-value">${amountInWords} ${currency}</div>
        </div>
        </div>
        
          <!-- Code-barres pour retour -->
          <div class="barcode-section">
            <div class="barcode-label">Retour: Scanner le code</div>
            <img src="https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(sale.reference || `SALE-${sale.id}`)}&code=Code128&dpi=96&dataseparator=" alt="Code-barres" class="barcode-image" />
            <div class="barcode-text">${sale.reference || `ID: ${sale.id}`}</div>
          </div>

          <!-- Signature -->
          <div class="signature-section">
            <div class="signature-left">
              <div class="signature-label">Pour Acquit</div>
        </div>
            <div class="signature-right">
              <div class="signature-label">Le Fournisseur</div>
              <div style="margin-top: 10px; font-size: 11px; color: #1a1a1a; font-weight: 600; font-family: 'Courier New', monospace;">
                ${sale.reference || `#${sale.id}`}
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return html;
  }

  // Convertir un nombre en lettres françaises (pour les montants)
  private numberToFrenchWords(num: number): string {
    if (num === 0) return 'zéro';
    
    // Pour les devises sans décimales, on utilise uniquement la partie entière
    const intPart = Math.floor(num);
    
    let result = '';
    
    // Convertir la partie entière
    if (intPart >= 1000000) {
      const millions = Math.floor(intPart / 1000000);
      result += this.convertHundreds(millions) + ' million' + (millions > 1 ? 's' : '') + ' ';
      const remainder = intPart % 1000000;
      if (remainder > 0) {
        result += this.convertHundreds(remainder);
      }
    } else if (intPart >= 1000) {
      const thousands = Math.floor(intPart / 1000);
      if (thousands === 1) {
        result += 'mille ';
      } else {
        result += this.convertHundreds(thousands) + ' mille ';
      }
      const remainder = intPart % 1000;
      if (remainder > 0) {
        result += this.convertHundreds(remainder);
      }
    } else {
      result += this.convertHundreds(intPart);
    }
    
    return result.trim() || 'zéro';
  }
  
  private convertHundreds(num: number): string {
    const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
      'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    
    if (num === 0) return '';
    if (num < 20) return ones[num];
    
    if (num < 100) {
      const t = Math.floor(num / 10);
      const o = num % 10;
      
      // 70-79: soixante-dix, soixante-onze, etc.
      if (t === 7) {
        if (o === 0) return 'soixante-dix';
        return 'soixante-' + ones[o + 10];
      }
      
      // 80-89: quatre-vingts, quatre-vingt-un, etc.
      if (t === 8) {
        if (o === 0) return 'quatre-vingts';
        if (o === 1) return 'quatre-vingt-un';
        return 'quatre-vingt-' + ones[o];
      }
      
      // 90-99: quatre-vingt-dix, quatre-vingt-onze, etc.
      if (t === 9) {
        if (o === 0) return 'quatre-vingt-dix';
        return 'quatre-vingt-' + ones[o + 10];
      }
      
      // 20-69: vingt, trente, quarante, cinquante, soixante
      const tensNames = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
      let result = tensNames[t];
      
      if (o > 0) {
        if (o === 1 && t !== 8) {
          result += '-et-un';
        } else {
          result += '-' + ones[o];
        }
      }
      
      return result;
    }
    
    // 100-999
    const h = Math.floor(num / 100);
    const remainder = num % 100;
    let result = '';
    
    if (h === 1) {
      result = 'cent';
    } else {
      result = ones[h] + ' cent';
    }
    
    if (remainder > 0) {
      result += ' ' + this.convertHundreds(remainder);
    } else if (h > 1) {
      // Ajouter 's' pour cent au pluriel (ex: deux cents)
      result += 's';
    }
    
    return result;
  }

  // Obtenir le texte du mode de paiement
  private getPaymentMethodText(paymentMethod: string): string {
    const methods: { [key: string]: string } = {
      'cash': 'Espèces',
      'card': 'Carte bancaire',
      'mobile': 'Mobile Money',
      'transfer': 'Virement',
      'sarali': 'Sarali',
      'credit': 'Crédit',
    };
    return methods[paymentMethod] || paymentMethod;
  }

  // Partager le PDF généré
  async shareReceiptPDF(pdfUri: string): Promise<void> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Partager le ticket de caisse',
        });
      } else {
        Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
      }
    } catch (error) {
      console.error('❌ Erreur partage PDF:', error);
      throw error;
    }
  }
}

// Instance singleton
const receiptPrinterService = new ReceiptPrinterService();
export default receiptPrinterService;
