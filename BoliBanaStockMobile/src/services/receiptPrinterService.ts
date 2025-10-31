import { PermissionsAndroid, Platform, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

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

  // Imprimer un ticket de caisse complet
  async printReceipt(receiptData: ReceiptData): Promise<void> {
    if (!this.connectedPrinter) {
      throw new Error('Aucune imprimante connectée');
    }

    try {
      const { sale, site, seller, customer, items } = receiptData;
      
      // DEBUG: Afficher les informations du client
      console.log('🧾 [PRINT] Customer dans receiptData:', customer);
      console.log('🧾 [PRINT] Customer présent:', customer ? 'OUI' : 'NON');
      if (customer) {
        console.log('🧾 [PRINT] Customer ID:', customer.id);
        console.log('🧾 [PRINT] Customer name:', customer.name);
        console.log('🧾 [PRINT] Customer first_name:', customer.first_name);
      }
      console.log('🧾 [PRINT] Payment method:', sale.payment_method);
      
      if (!this.BluetoothEscposPrinter) {
        console.log('🔵 Mode simulation: Impression ticket');
        console.log('🧾 Ticket:', { 
          reference: sale.reference, 
          total: sale.total_amount,
          items: items.length 
        });
        return;
      }

      // Configuration de l'imprimante
      await this.BluetoothEscposPrinter.printerAlign(this.BluetoothEscposPrinter.ALIGN.CENTER);
      await this.BluetoothEscposPrinter.setBlob(8); // Densité normale
      
      // En-tête du ticket
      await this.BluetoothEscposPrinter.printText(`${site.name}\n`);
      await this.BluetoothEscposPrinter.printText(`${site.company_name}\n`);
      if (site.address) {
        await this.BluetoothEscposPrinter.printText(`${site.address}\n`);
      }
      if (site.phone) {
        await this.BluetoothEscposPrinter.printText(`Tel: ${site.phone}\n`);
      }
      
      // Séparateur
      await this.BluetoothEscposPrinter.printText('--------------------------------\n');
      
      // Informations de la vente
      await this.BluetoothEscposPrinter.printText(`Ticket: ${sale.reference}\n`);
      await this.BluetoothEscposPrinter.printText(`Date: ${new Date(sale.sale_date).toLocaleString('fr-FR')}\n`);
      await this.BluetoothEscposPrinter.printText(`Vendeur: ${seller.username}\n`);
      
      // DEBUG: Afficher les informations de debug sur le ticket
      await this.BluetoothEscposPrinter.printText('================================\n');
      await this.BluetoothEscposPrinter.printText('          DEBUG INFO\n');
      await this.BluetoothEscposPrinter.printText('================================\n');
      await this.BluetoothEscposPrinter.printText(`Customer present: ${customer ? 'OUI' : 'NON'}\n`);
      if (customer) {
        await this.BluetoothEscposPrinter.printText(`Customer ID: ${customer.id || 'N/A'}\n`);
        await this.BluetoothEscposPrinter.printText(`Customer name: ${customer.name || 'N/A'}\n`);
        await this.BluetoothEscposPrinter.printText(`Customer first_name: ${customer.first_name || 'N/A'}\n`);
        await this.BluetoothEscposPrinter.printText(`Customer phone: ${customer.phone || 'N/A'}\n`);
      }
      await this.BluetoothEscposPrinter.printText(`Payment method: ${sale.payment_method}\n`);
      await this.BluetoothEscposPrinter.printText('================================\n');
      
      // Afficher le client (même si null, afficher quelque chose pour le crédit)
      if (customer && (customer.name || customer.first_name)) {
        const customerName = [customer.name, customer.first_name].filter(Boolean).join(' ').trim();
        await this.BluetoothEscposPrinter.printText(`Client: ${customerName}\n`);
        if (customer.phone) {
          await this.BluetoothEscposPrinter.printText(`Tel: ${customer.phone}\n`);
        }
      } else if (sale.payment_method === 'credit') {
        // Pour les ventes à crédit sans client ou client sans nom, afficher un avertissement
        if (customer && customer.id) {
          await this.BluetoothEscposPrinter.printText(`Client: ID #${customer.id} (Nom non spécifié)\n`);
        } else {
          await this.BluetoothEscposPrinter.printText(`Client: Non spécifié (Crédit)\n`);
        }
      } else {
        await this.BluetoothEscposPrinter.printText('Client: Anonyme\n');
      }
      
      await this.BluetoothEscposPrinter.printText('--------------------------------\n');
      
      // Articles
      await this.BluetoothEscposPrinter.printerAlign(this.BluetoothEscposPrinter.ALIGN.LEFT);
      
      for (const item of items) {
        const productLine = `${item.product_name}\n`;
        await this.BluetoothEscposPrinter.printText(productLine);
        
        const quantityLine = `  ${item.quantity} x ${item.unit_price.toLocaleString()} ${site.currency}\n`;
        await this.BluetoothEscposPrinter.printText(quantityLine);
        
        const totalLine = `  = ${item.total_price.toLocaleString()} ${site.currency}\n`;
        await this.BluetoothEscposPrinter.printText(totalLine);
        
        await this.BluetoothEscposPrinter.printText('\n');
      }
      
      // Séparateur
      await this.BluetoothEscposPrinter.printerAlign(this.BluetoothEscposPrinter.ALIGN.CENTER);
      await this.BluetoothEscposPrinter.printText('--------------------------------\n');
      
      // Totaux
      await this.BluetoothEscposPrinter.printerAlign(this.BluetoothEscposPrinter.ALIGN.LEFT);
      
      await this.BluetoothEscposPrinter.printText(`Sous-total: ${sale.subtotal.toLocaleString()} ${site.currency}\n`);
      
      if (sale.discount_amount > 0) {
        await this.BluetoothEscposPrinter.printText(`Remise: -${sale.discount_amount.toLocaleString()} ${site.currency}\n`);
      }
      
      if (sale.tax_amount > 0) {
        await this.BluetoothEscposPrinter.printText(`TVA: ${sale.tax_amount.toLocaleString()} ${site.currency}\n`);
      }
      
      await this.BluetoothEscposPrinter.printText('--------------------------------\n');
      await this.BluetoothEscposPrinter.printText(`TOTAL: ${sale.total_amount.toLocaleString()} ${site.currency}\n`);
      
      // Détails de paiement
      await this.BluetoothEscposPrinter.printText('--------------------------------\n');
      await this.BluetoothEscposPrinter.printerAlign(this.BluetoothEscposPrinter.ALIGN.CENTER);
      
      const paymentMethodText = this.getPaymentMethodText(sale.payment_method);
      await this.BluetoothEscposPrinter.printText(`Paiement: ${paymentMethodText}\n`);
      
      // Détails spécifiques selon le mode de paiement
      if (sale.payment_method === 'cash' && sale.amount_given && sale.change_amount) {
        await this.BluetoothEscposPrinter.printText(`Montant donné: ${sale.amount_given.toLocaleString()} ${site.currency}\n`);
        await this.BluetoothEscposPrinter.printText(`Monnaie rendue: ${sale.change_amount.toLocaleString()} ${site.currency}\n`);
      } else if (sale.payment_method === 'sarali' && sale.sarali_reference) {
        await this.BluetoothEscposPrinter.printText(`Réf. Sarali: ${sale.sarali_reference}\n`);
      } else if (sale.payment_method === 'credit' && customer) {
        await this.BluetoothEscposPrinter.printText(`Solde client: ${customer.credit_balance.toLocaleString()} ${site.currency}\n`);
      }
      
      // Pied de page
      await this.BluetoothEscposPrinter.printText('\n');
      await this.BluetoothEscposPrinter.printText('Merci pour votre achat !\n');
      await this.BluetoothEscposPrinter.printText('À bientôt !\n');
      
      // Espacement et coupure
      await this.BluetoothEscposPrinter.printText('\n\n\n');
      await this.BluetoothEscposPrinter.cutOne();
      
      console.log('🧾 Ticket imprimé avec succès');
    } catch (error) {
      console.error('❌ Erreur impression ticket:', error);
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
    
    const saleDate = new Date(sale.sale_date).toLocaleString('fr-FR');
    const paymentMethodText = this.getPaymentMethodText(sale.payment_method);
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket de caisse - ${sale.reference}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            max-width: 300px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .company-name {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 5px;
          }
          .site-name {
            font-size: 14px;
            margin-bottom: 5px;
          }
          .contact-info {
            font-size: 10px;
            color: #666;
          }
          .separator {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .sale-info {
            margin-bottom: 15px;
          }
          .sale-info div {
            margin-bottom: 3px;
          }
          .items {
            margin-bottom: 15px;
          }
          .item {
            margin-bottom: 8px;
            border-bottom: 1px dotted #ccc;
            padding-bottom: 5px;
          }
          .item-name {
            font-weight: bold;
          }
          .item-details {
            margin-left: 10px;
            font-size: 11px;
          }
          .totals {
            border-top: 1px solid #000;
            padding-top: 10px;
            margin-top: 15px;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .total-final {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 10px;
          }
          .payment-info {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px dashed #000;
            text-align: center;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-style: italic;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${site.company_name}</div>
          <div class="site-name">${site.name}</div>
          ${site.address ? `<div class="contact-info">${site.address}</div>` : ''}
          ${site.phone ? `<div class="contact-info">Tel: ${site.phone}</div>` : ''}
        </div>
        
        <div class="separator"></div>
        
        <div class="sale-info">
          <div><strong>Ticket:</strong> ${sale.reference}</div>
          <div><strong>Date:</strong> ${saleDate}</div>
          <div><strong>Vendeur:</strong> ${seller.username}</div>
          <div><strong>Client:</strong> ${(() => {
            if (customer && (customer.name || customer.first_name)) {
              const customerName = [customer.name, customer.first_name].filter(Boolean).join(' ').trim();
              return `${customerName}${customer.phone ? ` (${customer.phone})` : ''}`;
            } else if (sale.payment_method === 'credit') {
              if (customer && customer.id) {
                return `ID #${customer.id} (Nom non spécifié)`;
              }
              return 'Non spécifié (Crédit)';
            }
            return 'Anonyme';
          })()}</div>
        </div>
        
        <!-- DEBUG SECTION - À retirer en production -->
        <div style="background: #FFE082; padding: 15px; margin: 10px 0; font-size: 11px; border: 2px solid #FF6F00; border-radius: 5px;">
          <strong style="color: #E65100; font-size: 13px;">🐛 DEBUG INFO:</strong><br/>
          <div style="margin-top: 5px;">
            <span style="color: #BF360C;">Customer présent:</span> <strong style="color: ${customer ? '#1B5E20' : '#B71C1C'}">${customer ? '✅ OUI' : '❌ NON'}</strong><br/>
            ${customer ? `
              <span style="color: #BF360C;">Customer ID:</span> <strong>${customer.id || 'N/A'}</strong><br/>
              <span style="color: #BF360C;">Customer name:</span> <strong style="color: #1B5E20">${customer.name || 'N/A'}</strong><br/>
              <span style="color: #BF360C;">Customer first_name:</span> <strong style="color: #1B5E20">${customer.first_name || 'N/A'}</strong><br/>
              <span style="color: #BF360C;">Customer phone:</span> <strong>${customer.phone || 'N/A'}</strong><br/>
            ` : ''}
            <span style="color: #BF360C;">Payment method:</span> <strong>${sale.payment_method}</strong><br/>
            <div style="margin-top: 8px; padding: 8px; background: #FFF9C4; border: 1px solid #FBC02D; border-radius: 3px;">
              <span style="color: #BF360C;">Customer data (JSON):</span><br/>
              <code style="font-size: 9px; color: #424242;">${customer ? JSON.stringify(customer, null, 2).replace(/\n/g, '<br/>') : 'null'}</code>
            </div>
          </div>
        </div>
        
        <div class="separator"></div>
        
        <div class="items">
    `;
    
    // Articles
    for (const item of items) {
      html += `
        <div class="item">
          <div class="item-name">${item.product_name}</div>
          <div class="item-details">
            ${item.quantity} x ${item.unit_price.toLocaleString()} ${site.currency} = ${item.total_price.toLocaleString()} ${site.currency}
          </div>
        </div>
      `;
    }
    
    html += `
        </div>
        
        <div class="totals">
          <div class="total-line">
            <span>Sous-total:</span>
            <span>${sale.subtotal.toLocaleString()} ${site.currency}</span>
          </div>
    `;
    
    if (sale.discount_amount > 0) {
      html += `
        <div class="total-line">
          <span>Remise:</span>
          <span>-${sale.discount_amount.toLocaleString()} ${site.currency}</span>
        </div>
      `;
    }
    
    if (sale.tax_amount > 0) {
      html += `
        <div class="total-line">
          <span>TVA:</span>
          <span>${sale.tax_amount.toLocaleString()} ${site.currency}</span>
        </div>
      `;
    }
    
    html += `
          <div class="total-final">
            <span>TOTAL: ${sale.total_amount.toLocaleString()} ${site.currency}</span>
          </div>
        </div>
        
        <div class="payment-info">
          <div><strong>Paiement:</strong> ${paymentMethodText}</div>
    `;
    
    // Détails spécifiques selon le mode de paiement
    if (sale.payment_method === 'cash' && sale.amount_given && sale.change_amount) {
      html += `
        <div>Montant donné: ${sale.amount_given.toLocaleString()} ${site.currency}</div>
        <div>Monnaie rendue: ${sale.change_amount.toLocaleString()} ${site.currency}</div>
      `;
    } else if (sale.payment_method === 'sarali' && sale.sarali_reference) {
      html += `
        <div>Réf. Sarali: ${sale.sarali_reference}</div>
      `;
    } else if (sale.payment_method === 'credit' && customer) {
      html += `
        <div>Solde client: ${customer.credit_balance.toLocaleString()} ${site.currency}</div>
      `;
    }
    
    html += `
        </div>
        
        <div class="footer">
          <div>Merci pour votre achat !</div>
          <div>À bientôt !</div>
        </div>
      </body>
      </html>
    `;
    
    return html;
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
