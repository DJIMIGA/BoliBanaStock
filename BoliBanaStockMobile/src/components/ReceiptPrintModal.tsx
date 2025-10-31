import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import receiptPrinterService, { ReceiptData } from '../services/receiptPrinterService';
import { receiptService } from '../services/api';

interface ReceiptPrintModalProps {
  visible: boolean;
  onClose: () => void;
  saleId: number;
  onSuccess?: () => void;
}

const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  visible,
  onClose,
  saleId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [bluetoothPrinters, setBluetoothPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<any>(null);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [discoveringPrinters, setDiscoveringPrinters] = useState(false);

  // Réinitialiser l'état quand la modal s'ouvre
  React.useEffect(() => {
    if (visible) {
      setBluetoothPrinters([]);
      setSelectedPrinter(null);
      setPrinterConnected(false);
    }
  }, [visible]);

  const handleBluetoothPrint = async () => {
    setLoading(true);
    try {
      console.log('🔵 [RECEIPT] Impression Bluetooth...');
      
      // Générer les données du ticket
      const receiptResponse = await receiptService.generateReceipt({
        sale_id: saleId,
        printer_type: 'escpos',
      });
      
      if (!receiptResponse.success) {
        throw new Error(receiptResponse.error || 'Erreur lors de la génération du ticket');
      }
      
      const receiptData: ReceiptData = receiptResponse.receipt;
      
      // DEBUG: Afficher les données reçues dans la console
      console.log('🧾 [RECEIPT] Données complètes reçues:', JSON.stringify(receiptData, null, 2));
      console.log('🧾 [RECEIPT] Customer dans receiptData:', receiptData.customer);
      console.log('🧾 [RECEIPT] Customer présent:', receiptData.customer ? 'OUI' : 'NON');
      if (receiptData.customer) {
        console.log('🧾 [RECEIPT] Customer name:', receiptData.customer.name);
        console.log('🧾 [RECEIPT] Customer first_name:', receiptData.customer.first_name);
        console.log('🧾 [RECEIPT] Customer phone:', receiptData.customer.phone);
      }
      
      // Si aucune imprimante n'est connectée, proposer de découvrir
      if (!receiptPrinterService.isConnected()) {
        await discoverAndConnectPrinter();
        if (!receiptPrinterService.isConnected()) {
          Alert.alert(
            'Aucune imprimante connectée',
            'Veuillez d\'abord découvrir et connecter une imprimante Bluetooth.',
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      // Imprimer le ticket
      await receiptPrinterService.printReceipt(receiptData);
      
      Alert.alert(
        'Impression réussie',
        `Ticket ${receiptData.sale.reference} imprimé avec succès !`,
        [
          { text: 'OK', onPress: () => {
            onSuccess?.();
            onClose();
          }}
        ]
      );
      
    } catch (error: any) {
      console.error('❌ [RECEIPT] Erreur impression Bluetooth:', error);
      Alert.alert(
        'Erreur d\'impression',
        error.message || 'Erreur lors de l\'impression du ticket',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePDFGeneration = async () => {
    setLoading(true);
    try {
      console.log('📄 [RECEIPT] Génération PDF...');
      
      // Générer les données du ticket
      const receiptResponse = await receiptService.generateReceipt({
        sale_id: saleId,
        printer_type: 'pdf',
      });
      
      if (!receiptResponse.success) {
        throw new Error(receiptResponse.error || 'Erreur lors de la génération du ticket');
      }
      
      const receiptData: ReceiptData = receiptResponse.receipt;
      
      // DEBUG: Afficher les données reçues dans la console
      console.log('🧾 [RECEIPT PDF] Données complètes reçues:', JSON.stringify(receiptData, null, 2));
      console.log('🧾 [RECEIPT PDF] Customer dans receiptData:', receiptData.customer);
      console.log('🧾 [RECEIPT PDF] Customer présent:', receiptData.customer ? 'OUI' : 'NON');
      if (receiptData.customer) {
        console.log('🧾 [RECEIPT PDF] Customer name:', receiptData.customer.name);
        console.log('🧾 [RECEIPT PDF] Customer first_name:', receiptData.customer.first_name);
        console.log('🧾 [RECEIPT PDF] Customer phone:', receiptData.customer.phone);
      }
      
      // Générer le PDF
      const pdfUri = await receiptPrinterService.generateReceiptPDF(receiptData);
      
      // Proposer de partager le PDF
      Alert.alert(
        'PDF généré',
        `Ticket ${receiptData.sale.reference} généré avec succès !`,
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Partager', 
            onPress: async () => {
              try {
                await receiptPrinterService.shareReceiptPDF(pdfUri);
                onSuccess?.();
                onClose();
              } catch (shareError) {
                console.error('❌ [RECEIPT] Erreur partage PDF:', shareError);
                Alert.alert('Erreur', 'Impossible de partager le PDF');
              }
            }
          }
        ]
      );
      
    } catch (error: any) {
      console.error('❌ [RECEIPT] Erreur génération PDF:', error);
      Alert.alert(
        'Erreur de génération',
        error.message || 'Erreur lors de la génération du PDF',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const discoverAndConnectPrinter = async () => {
    setDiscoveringPrinters(true);
    try {
      console.log('🔍 [BLUETOOTH] Découverte des imprimantes...');
      
      const printers = await receiptPrinterService.discoverPrinters();
      setBluetoothPrinters(printers);
      
      if (printers.length === 0) {
        Alert.alert(
          'Aucune imprimante trouvée',
          'Aucune imprimante Bluetooth n\'a été découverte. Vérifiez que votre imprimante est allumée et en mode découverte.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Si une seule imprimante, la sélectionner automatiquement
      if (printers.length === 1) {
        await connectToPrinter(printers[0]);
      } else {
        // Afficher la liste des imprimantes
        showPrinterSelection(printers);
      }
      
    } catch (error: any) {
      console.error('❌ [BLUETOOTH] Erreur découverte:', error);
      Alert.alert(
        'Erreur de découverte',
        'Erreur lors de la découverte des imprimantes Bluetooth',
        [{ text: 'OK' }]
      );
    } finally {
      setDiscoveringPrinters(false);
    }
  };

  const showPrinterSelection = (printers: any[]) => {
    const printerOptions = printers.map(printer => ({
      text: printer.device_name,
      onPress: () => connectToPrinter(printer),
    }));
    
    printerOptions.push({ text: 'Annuler', style: 'cancel' as const });
    
    Alert.alert(
      'Sélectionner une imprimante',
      'Choisissez l\'imprimante Bluetooth à utiliser :',
      printerOptions
    );
  };

  const connectToPrinter = async (printer: any) => {
    try {
      console.log('🔗 [BLUETOOTH] Connexion à:', printer.device_name);
      
      const connected = await receiptPrinterService.connectToPrinter(printer);
      
      if (connected) {
        setSelectedPrinter(printer);
        setPrinterConnected(true);
        Alert.alert(
          'Connexion réussie',
          `Connecté à ${printer.device_name}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Erreur de connexion',
          'Impossible de se connecter à l\'imprimante',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('❌ [BLUETOOTH] Erreur connexion:', error);
      Alert.alert(
        'Erreur de connexion',
        'Erreur lors de la connexion à l\'imprimante',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🖨️ Imprimer le ticket</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.subtitle}>
              Choisissez le mode d'impression pour le ticket de caisse :
            </Text>

            {/* Bluetooth Option */}
            <TouchableOpacity
              style={[styles.optionCard, styles.bluetoothCard]}
              onPress={handleBluetoothPrint}
              disabled={loading}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="bluetooth" size={24} color={theme.colors.primary[500]} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Imprimer via Bluetooth</Text>
                <Text style={styles.optionDescription}>
                  Impression directe sur imprimante thermique Bluetooth
                </Text>
                {printerConnected && selectedPrinter && (
                  <Text style={styles.connectedText}>
                    ✓ Connecté à {selectedPrinter.device_name}
                  </Text>
                )}
              </View>
              {loading && (
                <ActivityIndicator size="small" color={theme.colors.primary[500]} />
              )}
            </TouchableOpacity>

            {/* PDF Option */}
            <TouchableOpacity
              style={[styles.optionCard, styles.pdfCard]}
              onPress={handlePDFGeneration}
              disabled={loading}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="document-text" size={24} color={theme.colors.success[500]} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Générer PDF</Text>
                <Text style={styles.optionDescription}>
                  Créer un fichier PDF à partager ou imprimer
                </Text>
              </View>
              {loading && (
                <ActivityIndicator size="small" color={theme.colors.success[500]} />
              )}
            </TouchableOpacity>

            {/* Bluetooth Management */}
            {!printerConnected && (
              <TouchableOpacity
                style={styles.discoverButton}
                onPress={discoverAndConnectPrinter}
                disabled={discoveringPrinters}
              >
                <Ionicons 
                  name="search" 
                  size={16} 
                  color="white" 
                />
                <Text style={styles.discoverButtonText}>
                  {discoveringPrinters ? 'Recherche...' : 'Découvrir imprimantes'}
                </Text>
                {discoveringPrinters && (
                  <ActivityIndicator size="small" color="white" style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  bluetoothCard: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
  },
  pdfCard: {
    backgroundColor: theme.colors.success[50],
    borderColor: theme.colors.success[200],
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },
  connectedText: {
    fontSize: 12,
    color: theme.colors.success[600],
    fontWeight: '500',
    marginTop: 4,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  discoverButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default ReceiptPrintModal;
