import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import receiptPrinterService, { ReceiptData } from '../services/receiptPrinterService';
import { receiptService } from '../services/api';

// Timeout utilitaire pour éviter les spinners infinis
const withTimeout = async <T,>(promise: Promise<T>, ms = 15000, label = 'Opération') => {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} expirée après ${ms / 1000}s`)), ms);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result as T;
  } finally {
    clearTimeout(timeoutId);
  }
};

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
  // Remplacer 'loading' global par des états séparés
  const [loadingBluetooth, setLoadingBluetooth] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [bluetoothPrinters, setBluetoothPrinters] = useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<any>(null);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [discoveringPrinters, setDiscoveringPrinters] = useState(false);
  const [connectingToPrinter, setConnectingToPrinter] = useState(false);
  const [showPrinterList, setShowPrinterList] = useState(false);

  // Réinitialiser l'état quand la modal s'ouvre
  React.useEffect(() => {
    if (visible) {
      setBluetoothPrinters([]);
      setSelectedPrinter(null);
      setPrinterConnected(false);
      setShowPrinterList(false);
      setLoadingBluetooth(false);
      setLoadingPdf(false);
    }
  }, [visible]);

  const handleBluetoothPrint = async () => {
    if (loadingBluetooth || connectingToPrinter || discoveringPrinters) return;
    setLoadingBluetooth(true);
    try {
      console.log('🔵 [RECEIPT] Impression Bluetooth...');
      
      // Générer les données du ticket (avec timeout)
      const receiptResponse = await withTimeout(
        receiptService.generateReceipt({
          sale_id: saleId,
          printer_type: 'escpos',
        }),
        15000,
        'Génération du ticket'
      );
      
      if (!receiptResponse.success) {
        throw new Error(receiptResponse.error || 'Erreur lors de la génération du ticket');
      }
      
      const receiptData: ReceiptData = receiptResponse.receipt;
      console.log('🧾 [RECEIPT] Données complètes reçues:', JSON.stringify(receiptData, null, 2));
      
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
      
      // Imprimer le ticket (avec timeout)
      await withTimeout(
        receiptPrinterService.printReceipt(receiptData),
        15000,
        'Impression du ticket'
      );
      
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
      const message = error?.message || 'Erreur inconnue lors de l\'impression';
      Alert.alert(
        'Erreur',
        message.includes('expirée') ? message : `${message}\n\nVérifiez la connexion Bluetooth et réessayez.`
      );
    } finally {
      setLoadingBluetooth(false);
    }
  };

  const handlePDFGeneration = async () => {
    if (loadingPdf) return;
    setLoadingPdf(true);
    try {
      console.log('🧾 [RECEIPT] Génération PDF...');
      
      // Générer les données du ticket (avec timeout)
      const receiptResponse = await withTimeout(
        receiptService.generateReceipt({
          sale_id: saleId,
          printer_type: 'pdf',
        }),
        15000,
        'Génération du ticket'
      );
      
      if (!receiptResponse.success) {
        throw new Error(receiptResponse.error || 'Erreur lors de la génération du ticket');
      }
      
      const receiptData: ReceiptData = receiptResponse.receipt;
      
      // Générer le PDF (avec timeout)
      const pdfUri = await withTimeout(
        receiptPrinterService.generateReceiptPDF(receiptData),
        15000,
        'Génération du PDF'
      );
      
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
      const message = error?.message || 'Erreur lors de la génération du PDF';
      Alert.alert(
        'Erreur de génération',
        message.includes('expirée') ? message : message,
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingPdf(false);
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
        // Afficher la liste des imprimantes dans l'interface
        setShowPrinterList(true);
      }
      
    } catch (error: any) {
      console.error('❌ [BLUETOOTH] Erreur découverte:', error);
      const errorMessage = error?.message || 'Erreur inconnue lors de la découverte des imprimantes Bluetooth';
      Alert.alert(
        'Erreur de découverte',
        errorMessage + '\n\nAssurez-vous que:\n- Le Bluetooth est activé\n- Vous utilisez un development build (pas Expo Go)\n- Les permissions sont accordées',
        [{ text: 'OK' }]
      );
    } finally {
      setDiscoveringPrinters(false);
    }
  };

  const handleSelectPrinter = async (printer: any) => {
    setShowPrinterList(false);
    await connectToPrinter(printer);
  };

  const handleDisconnectPrinter = async () => {
    try {
      await receiptPrinterService.disconnectPrinter();
      setSelectedPrinter(null);
      setPrinterConnected(false);
      Alert.alert(
        'Déconnexion réussie',
        'Vous avez été déconnecté de l\'imprimante',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ [BLUETOOTH] Erreur déconnexion:', error);
      // Même en cas d'erreur, on réinitialise l'état local
      setSelectedPrinter(null);
      setPrinterConnected(false);
      Alert.alert(
        'Déconnexion',
        'Déconnexion effectuée (avec avertissement)',
        [{ text: 'OK' }]
      );
    }
  };

  const connectToPrinter = async (printer: any) => {
    setConnectingToPrinter(true);
    try {
      console.log('🔗 [BLUETOOTH] Connexion à:', printer.device_name);
      console.log('🔗 [BLUETOOTH] Adresse:', printer.device_address);
      
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
      const errorMessage = error?.message || 'Erreur inconnue lors de la connexion';
      
      // Afficher un message d'erreur détaillé
      let userMessage = 'Impossible de se connecter à l\'imprimante.\n\n';
      
      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        userMessage += 'La connexion a expiré. Vérifiez que l\'imprimante est allumée et à proximité.';
      } else if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        userMessage += 'Permissions Bluetooth insuffisantes. Vérifiez les paramètres de l\'application.';
      } else if (errorMessage.includes('refused') || errorMessage.includes('Refused')) {
        userMessage += 'Connexion refusée. Assurez-vous que l\'imprimante est en mode découverte.';
      } else if (errorMessage.includes('not found') || errorMessage.includes('Not found')) {
        userMessage += 'Imprimante introuvable. Relancez la découverte.';
      } else {
        userMessage += `Détails: ${errorMessage}`;
      }
      
      userMessage += '\n\nVérifiez que:\n- L\'imprimante est allumée\n- Le Bluetooth est activé\n- L\'imprimante est à proximité';
      
      Alert.alert(
        'Erreur de connexion',
        userMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setConnectingToPrinter(false);
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
              disabled={loadingBluetooth}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="bluetooth" size={24} color={theme.colors.primary[500]} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Imprimer via ESC/POS (Bluetooth)</Text>
                <Text style={styles.optionDescription}>
                  Impression directe sur imprimante thermique ESC/POS (par défaut)
                </Text>
                {printerConnected && selectedPrinter && (
                  <Text style={styles.connectedText}>
                    ✓ Connecté à {selectedPrinter.device_name}
                  </Text>
                )}
              </View>
              {loadingBluetooth && (
                <ActivityIndicator size="small" color={theme.colors.primary[500]} />
              )}
            </TouchableOpacity>

            {/* PDF Option */}
            <TouchableOpacity
              style={[styles.optionCard, styles.pdfCard]}
              onPress={handlePDFGeneration}
              disabled={loadingPdf}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="document-text" size={24} color={theme.colors.success[500]} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Générer un PDF</Text>
                <Text style={styles.optionDescription}>
                  Créer un fichier PDF à partager ou imprimer (alternative)
                </Text>
              </View>
              {loadingPdf && (
                <ActivityIndicator size="small" color={theme.colors.success[500]} />
              )}
            </TouchableOpacity>

            {/* Bluetooth Management */}
            {/* [Supprimé] Le bouton Découvrir n'est plus affiché ici; la découverte est lancée automatiquement lors de l'appui sur ESC/POS
            et une liste est affichée si plusieurs imprimantes sont trouvées. */}

            {/* Liste des imprimantes trouvées */}
            {showPrinterList && bluetoothPrinters.length > 0 && (
              <View style={styles.printerListContainer}>
                <View style={styles.printerListHeader}>
                  <Text style={styles.printerListTitle}>
                    Imprimantes trouvées ({bluetoothPrinters.length})
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowPrinterList(false)}
                    style={styles.closePrinterListButton}
                  >
                    <Ionicons name="close" size={20} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={bluetoothPrinters}
                  keyExtractor={(item, index) => item.device_address || `printer-${index}`}
                  renderItem={({ item: printer }) => (
                    <TouchableOpacity
                      style={styles.printerItem}
                      onPress={() => handleSelectPrinter(printer)}
                      disabled={connectingToPrinter}
                    >
                      <View style={styles.printerItemContent}>
                        <Ionicons 
                          name="bluetooth" 
                          size={20} 
                          color={theme.colors.primary[500]} 
                          style={styles.printerItemIcon}
                        />
                        <View style={styles.printerItemText}>
                          <Text style={styles.printerItemName}>{printer.device_name}</Text>
                          <Text style={styles.printerItemAddress}>{printer.device_address}</Text>
                        </View>
                      </View>
                      {connectingToPrinter && (
                        <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                      )}
                      <Ionicons 
                        name="chevron-forward" 
                        size={20} 
                        color={theme.colors.text.secondary} 
                      />
                    </TouchableOpacity>
                  )}
                  style={styles.printerList}
                  contentContainerStyle={styles.printerListContent}
                />
              </View>
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
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error[500] || '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  disconnectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  printerListContainer: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.neutral[50],
    maxHeight: 300,
  },
  printerListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.neutral[100],
  },
  printerListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  closePrinterListButton: {
    padding: 4,
  },
  printerList: {
    maxHeight: 250,
  },
  printerListContent: {
    padding: 8,
  },
  printerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  printerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  printerItemIcon: {
    marginRight: 12,
  },
  printerItemText: {
    flex: 1,
  },
  printerItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  printerItemAddress: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
});

export default ReceiptPrintModal;
