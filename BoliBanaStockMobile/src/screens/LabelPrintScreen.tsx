import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import theme from '../utils/theme';
import { useNavigation } from '@react-navigation/native';
import { PrintOptionsConfig } from '../components/PrintOptionsConfig';
import ThermalPrinterTest from '../components/ThermalPrinterTest';
import { productService, labelPrintService } from '../services/api';

interface Product {
  id: number;
  name: string;
  cug: string;
  generated_ean: string;
  category: string;
  brand: string;
  selling_price: number;
  quantity: number;
  description?: string;
  image_url?: string;
}

interface LabelPrintScreenProps {
  route?: {
    params?: {
      selectedProducts?: number[];
    };
  };
}

const LabelPrintScreen: React.FC<LabelPrintScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [generating, setGenerating] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [lastLabels, setLastLabels] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Récupérer les paramètres passés depuis PrintModeSelectionScreen
  const selectedProducts = route?.params?.selectedProducts || [];
  
  // Options de configuration simplifiées
  const [copies, setCopies] = useState(1);
  const [includePrices, setIncludePrices] = useState(true);
  
  // Configuration de l'imprimante
  const [printerType, setPrinterType] = useState<'pdf' | 'escpos' | 'tsc'>('escpos');
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Paramètres thermiques
  const [thermalSettings, setThermalSettings] = useState({
    density: 8,
    speed: 4,
    direction: 1,
    gap: 2,
    offset: 0
  });

  // Configuration de l'imprimante thermique
  const [printerConfig, setPrinterConfig] = useState({
    ip_address: '',
    port: 9100,
    auto_connect: false,
    connection_type: 'bluetooth' as 'network' | 'bluetooth',
    bluetooth_address: '',
  });

  // État de connexion à l'imprimante
  const [printerConnected, setPrinterConnected] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [bluetoothPrinters, setBluetoothPrinters] = useState<any[]>([]);
  const [selectedBluetoothPrinter, setSelectedBluetoothPrinter] = useState<any>(null);
  
  // Options fixes (toujours incluses)
  const includeCug = true;
  const includeEan = true;
  const includeBarcode = true;

  // Charger les données des produits sélectionnés
  useEffect(() => {
    const loadProducts = async () => {
      if (selectedProducts.length === 0) return;
      
      setLoadingProducts(true);
      try {
        console.log('🏷️ [LABELS] Chargement des produits:', selectedProducts);
        
        // Récupérer les détails de chaque produit
        const productPromises = selectedProducts.map(id => productService.getProduct(id));
        const productsData = await Promise.all(productPromises);
        
        console.log('✅ [LABELS] Produits chargés:', productsData.length);
        setProducts(productsData);
        
      } catch (error) {
        console.error('❌ [LABELS] Erreur chargement produits:', error);
        Alert.alert('Erreur', 'Impossible de charger les données des produits');
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, [selectedProducts]);

  // Charger les modèles d'étiquettes
  useEffect(() => {
    const loadTemplates = async () => {
      setLoadingTemplates(true);
      try {
        console.log('📋 [TEMPLATES] Chargement des modèles d\'étiquettes...');
        
        const templatesData = await labelPrintService.getTemplates();
        console.log('✅ [TEMPLATES] Réponse API complète:', JSON.stringify(templatesData, null, 2));
        
        // Vérifier que templatesData est un tableau
        if (Array.isArray(templatesData)) {
          console.log('✅ [TEMPLATES] Modèles chargés:', templatesData.length);
          setTemplates(templatesData);
          
          // Sélectionner le premier modèle par défaut
          if (templatesData.length > 0) {
            const defaultTemplate = templatesData.find((t: any) => t.is_default) || templatesData[0];
            setSelectedTemplate(defaultTemplate);
          }
        } else {
          console.warn('⚠️ [TEMPLATES] Réponse API non valide, pas un tableau:', typeof templatesData);
          setTemplates([]);
        }
        
      } catch (error) {
        console.error('❌ [TEMPLATES] Erreur chargement modèles:', error);
        Alert.alert('Erreur', 'Impossible de charger les modèles d\'étiquettes');
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, []);

  // Vérifier qu'il y a des produits sélectionnés
  if (selectedProducts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Aucun produit sélectionné</Text>
          <Text style={styles.errorSubtext}>
            Veuillez retourner à l'écran précédent pour sélectionner des produits.
          </Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  // Fonction pour valider un code EAN13
  const validateEAN13 = (code: string): boolean => {
    if (!code || code.length !== 13) return false;
    
    // Vérifier que tous les caractères sont des chiffres
    if (!/^\d{13}$/.test(code)) return false;
    
    // Calculer la clé de contrôle
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]);
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(code[12]);
  };

  // Fonction pour générer un EAN13 valide à partir de l'ID du produit
  const generateEANFromProductId = (productId: number): string => {
    // Convertir l'ID en string et le padder pour avoir 12 chiffres
    const idString = productId.toString().padStart(12, '0');
    
    // Calculer la clé de contrôle EAN13
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(idString[i]);
      // Multiplier par 1 pour les positions impaires, 3 pour les positions paires
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    
    // La clé de contrôle est le complément à 10 du reste de la division par 10
    const checkDigit = (10 - (sum % 10)) % 10;
    
    // Retourner l'EAN13 complet (12 chiffres + clé de contrôle)
    return idString + checkDigit.toString();
  };

  // Fonction pour générer le code-barres EAN13 de qualité scannable
  const generateEAN13Barcode = (code: string) => {
    if (!code || code.length !== 13) return '';
    
    // Patterns EAN13 corrects pour les chiffres 0-9
    const patterns: Record<string, string[]> = {
      '0': ['0001101', '0100111', '1110010'],
      '1': ['0011001', '0110011', '1100110'],
      '2': ['0010011', '0011011', '1101100'],
      '3': ['0111101', '0100001', '1000010'],
      '4': ['0100011', '0011101', '1011100'],
      '5': ['0110001', '0111001', '1001110'],
      '6': ['0101111', '0000101', '1010000'],
      '7': ['0111011', '0010001', '1000100'],
      '8': ['0110111', '0001001', '1001000'],
      '9': ['0001011', '0010111', '1110100']
    };
    
    let svg = '';
    let x = 0;
    const barWidth = 1;
    const barHeight = 12;
    const quietZone = 4;
    
    // Calculer la largeur totale du code-barres
    const totalWidth = (quietZone * 2) + (barWidth * 2) + barWidth + (barWidth * 2) + barWidth + (6 * 7 * barWidth) + (5 * barWidth) + (6 * 7 * barWidth) + (barWidth * 2) + barWidth + (barWidth * 2) + barWidth + quietZone;
    
    // Centrer le code-barres dans le SVG
    const svgWidth = 100;
    const startX = (svgWidth - totalWidth) / 2;
    x = startX;
    
    // Zone de silence gauche
    x += quietZone;
    
    // Barres de garde gauche (101)
    svg += `<rect x="${x}" y="0" width="${barWidth * 2}" height="${barHeight}" fill="black"/>`;
    x += barWidth * 2;
    svg += `<rect x="${x}" y="0" width="${barWidth}" height="${barHeight}" fill="white"/>`;
    x += barWidth;
    svg += `<rect x="${x}" y="0" width="${barWidth * 2}" height="${barHeight}" fill="black"/>`;
    x += barWidth * 2;
    svg += `<rect x="${x}" y="0" width="${barWidth}" height="${barHeight}" fill="white"/>`;
    x += barWidth;
    
    // Chiffres de gauche (6 premiers) - utiliser le pattern L
    for (let i = 1; i <= 6; i++) {
      const digit = code[i];
      const pattern = patterns[digit] || patterns['0'];
      const leftPattern = pattern[0]; // Pattern L
      
      for (let j = 0; j < 7; j++) {
        if (leftPattern[j] === '1') {
          svg += `<rect x="${x}" y="0" width="${barWidth}" height="${barHeight}" fill="black"/>`;
        } else {
          svg += `<rect x="${x}" y="0" width="${barWidth}" height="${barHeight}" fill="white"/>`;
        }
        x += barWidth;
      }
    }
    
    // Barres centrales (01010)
    svg += `<rect x="${x}" y="0" width="${barWidth}" height="${barHeight}" fill="white"/>`;
    x += barWidth;
    svg += `<rect x="${x}" y="0" width="${barWidth}" height="${barHeight}" fill="black"/>`;
    x += barWidth;
    svg += `<rect x="${x}" y="0" width="${barWidth}" height="${barHeight}" fill="white"/>`;
    x += barWidth;
    svg += `<rect x="${x}" y="0" width="${barWidth}" height="${barHeight}" fill="black"/>`;
    x += barWidth;
    svg += `<rect x="${x}" y="0" width="${barWidth}" height="${barHeight}" fill="white"/>`;
    x += barWidth;
    
    // Chiffres de droite (6 derniers) - utiliser le pattern R
    for (let i = 7; i <= 12; i++) {
      const digit = code[i];
      const pattern = patterns[digit] || patterns['0'];
      const rightPattern = pattern[2]; // Pattern R (inversé)
      
      for (let j = 0; j < 7; j++) {
        if (rightPattern[j] === '1') {
          svg += `<rect x="${x}" y="0" width="${barWidth}" height="${barHeight}" fill="black"/>`;
        } else {
          svg += `<rect x="${x}" y="0" width="${barWidth}" height="${barHeight}" fill="white"/>`;
        }
        x += barWidth;
      }
    }
    
    // Barres de garde droite (101)
    svg += `<rect x="${x}" y="0" width="${barWidth * 2}" height="${barHeight}" fill="black"/>`;
    x += barWidth * 2;
    svg += `<rect x="${x}" y="0" width="${barWidth}" height="${barHeight}" fill="white"/>`;
    x += barWidth;
    svg += `<rect x="${x}" y="0" width="${barWidth * 2}" height="${barHeight}" fill="black"/>`;
    x += barWidth * 2;
    svg += `<rect x="${x}" y="0" width="${barWidth}" height="${barHeight}" fill="white"/>`;
    x += barWidth;
    
    // Zone de silence droite
    x += quietZone;
    
    return svg;
  };

  // Fonction pour construire le HTML des étiquettes
  const buildLabelsHtml = (products: any[]) => {
    const totalLabels = products.length * copies;
    const labelsPerRow = 2; // 2 étiquettes par ligne
    const rows = Math.ceil(totalLabels / labelsPerRow);
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Étiquettes Produits</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 5px;
            background: white;
          }
          .label {
            width: 25%;
            height: 60px;
            border: 1px solid #ddd;
            margin: 1px;
            padding: 2px;
            display: inline-block;
            vertical-align: top;
            box-sizing: border-box;
            position: relative;
          }
          .product-name {
            font-size: 8px;
            font-weight: bold;
            margin-bottom: 1px;
            line-height: 1.0;
            max-height: 16px;
            overflow: hidden;
          }
          .cug {
            font-size: 6px;
            color: #666;
            margin-bottom: 1px;
          }
          .price {
            font-size: 7px;
            font-weight: bold;
            color: #28a745;
            margin-bottom: 1px;
          }
          .barcode-container {
            position: absolute;
            bottom: 2px;
            left: 2px;
            right: 2px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .barcode {
            font-size: 5px;
            font-family: monospace;
            margin-bottom: 1px;
            text-align: center;
          }
          .barcode-svg {
            width: 100%;
            height: 10px;
            display: block;
            margin: 0 auto;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .label { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
    `;
    
    // Générer les étiquettes
    for (let i = 0; i < totalLabels; i++) {
      const productIndex = Math.floor(i / copies);
      const product = products[productIndex];
      
      if (product) {
        // Logique pour le code-barres selon la structure Product avec barcodes array
        let eanCode = '';
        let barcodeSource = '';
        
        // 1. Chercher le code-barres principal dans le tableau barcodes
        if (product.barcodes && Array.isArray(product.barcodes) && product.barcodes.length > 0) {
          // Chercher le code-barres principal (is_primary: true)
          const primaryBarcode = product.barcodes.find((b: any) => b.is_primary && b.ean && b.ean.length === 13);
          if (primaryBarcode) {
            eanCode = primaryBarcode.ean;
            barcodeSource = 'primary_barcode';
          } else {
            // Si pas de principal, prendre le premier code-barres valide
            const validBarcode = product.barcodes.find((b: any) => b.ean && b.ean.length === 13);
            if (validBarcode) {
              eanCode = validBarcode.ean;
              barcodeSource = 'barcode_array';
            }
          }
        }
        
        // 2. Fallback vers generated_ean si pas de barcodes dans le tableau
        if (!eanCode && product.generated_ean && product.generated_ean.length === 13) {
          eanCode = product.generated_ean;
          barcodeSource = 'generated_ean';
        }
        
        // 3. Fallback vers les anciens champs pour compatibilité
        if (!eanCode && product.barcode_ean && product.barcode_ean.length === 13) {
          eanCode = product.barcode_ean;
          barcodeSource = 'barcode_ean_legacy';
        } else if (!eanCode && product.ean && product.ean.length === 13) {
          eanCode = product.ean;
          barcodeSource = 'ean_legacy';
        }
        
        // 4. Dernier recours : générer un EAN basé sur l'ID du produit
        if (!eanCode) {
          eanCode = generateEANFromProductId(product.id);
          barcodeSource = 'generated_from_id';
        }
        
        // Valider le code-barres généré
        const isValidBarcode = validateEAN13(eanCode);
        if (!isValidBarcode) {
          console.warn(`⚠️ [LABELS] Code-barres invalide pour ${product.name}: ${eanCode}`);
          // Régénérer un code valide si nécessaire
          if (barcodeSource === 'generated_from_id') {
            eanCode = generateEANFromProductId(product.id);
            console.log(`🔄 [LABELS] Code-barres régénéré: ${eanCode}`);
          }
        }
        
        console.log(`🏷️ [LABELS] Produit ${product.name} - Code-barres: ${eanCode} (source: ${barcodeSource}, valid: ${isValidBarcode})`);
        console.log(`   Barcodes array:`, product.barcodes);
        
        const barcodeSvg = generateEAN13Barcode(eanCode);
        
        // Gérer le prix
        const price = product.selling_price || product.price || 0;
        const priceDisplay = price > 0 ? `${price.toLocaleString()} FCFA` : 'Prix N/A';
        
        html += `
          <div class="label">
            <div class="product-name">${product.name || 'Produit'}</div>
            <div class="cug">CUG: ${product.cug || 'N/A'}</div>
            ${includePrices && price > 0 ? `<div class="price">${priceDisplay}</div>` : ''}
            <div class="barcode-container">
              <div style="display: flex; justify-content: center; align-items: center; width: 100%; margin-bottom: 1px;">
                <svg class="barcode-svg" viewBox="0 0 100 12" style="width: 100%; height: 10px; display: block; margin: 0 auto;">
                  <rect width="100" height="12" fill="white"/>
                  ${barcodeSvg}
                </svg>
              </div>
              <div class="barcode" style="text-align: center; width: 100%; display: flex; justify-content: center;">${eanCode}</div>
            </div>
          </div>
        `;
      }
    }
    
    html += `
      </body>
      </html>
    `;
    
    return html;
  };

  // Fonction pour découvrir les imprimantes Bluetooth

  // Découvrir les imprimantes Bluetooth
  const discoverBluetoothPrinters = async () => {
    setTestingConnection(true);
    try {
      console.log('🔍 [BLUETOOTH] Découverte des imprimantes Bluetooth...');
      
      // Simulation de la découverte (sera remplacé par la vraie implémentation)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockPrinters = [
        { device_name: 'Imprimante Thermique 1', device_address: '00:11:22:33:44:55' },
        { device_name: 'TSC TTP-244ME', device_address: '00:11:22:33:44:66' },
        { device_name: 'Epson TM-T20III', device_address: '00:11:22:33:44:77' },
      ];
      
      setBluetoothPrinters(mockPrinters);
      Alert.alert(
        'Imprimantes trouvées',
        `${mockPrinters.length} imprimante(s) Bluetooth découverte(s)`
      );
    } catch (error) {
      console.error('❌ [BLUETOOTH] Erreur découverte:', error);
      Alert.alert('Erreur', 'Erreur lors de la découverte des imprimantes Bluetooth');
    } finally {
      setTestingConnection(false);
    }
  };

  // Se connecter à une imprimante Bluetooth sélectionnée
  const connectToBluetoothPrinter = async (printer: any) => {
    setTestingConnection(true);
    try {
      console.log('🔗 [BLUETOOTH] Connexion à l\'imprimante:', printer.device_name);
      
      // Simulation de la connexion (sera remplacé par la vraie implémentation)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSelectedBluetoothPrinter(printer);
      setPrinterConnected(true);
      
      Alert.alert(
        'Connexion réussie',
        `Connecté à ${printer.device_name}`
      );
    } catch (error) {
      console.error('❌ [BLUETOOTH] Erreur connexion:', error);
      Alert.alert('Erreur', 'Erreur lors de la connexion à l\'imprimante');
    } finally {
      setTestingConnection(false);
    }
  };

  const generateLabels = async () => {
    if (copies < 1 || copies > 100) {
      Alert.alert('Erreur', 'Le nombre de copies doit être entre 1 et 100');
      return;
    }

    if (products.length === 0) {
      Alert.alert('Erreur', 'Aucune donnée de produit disponible');
      return;
    }

    setGenerating(true);
    try {
      console.log('🏷️ [LABELS] Génération des étiquettes:', {
        products: products.length,
        copies,
        includePrices,
        printerType,
        selectedTemplate: selectedTemplate?.id,
        total: products.length * copies
      });

      // Pour PDF : génération locale (plus rapide et directe)
      if (printerType === 'pdf') {
        console.log('📄 [LABELS] Génération PDF locale...');
        
        // Construire le HTML avec les vraies données
        const html = buildLabelsHtml(products);
        
        // Générer le PDF
        const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
        });

        console.log('📄 [LABELS] PDF généré localement:', uri);

        // Sauvegarder les données pour la prévisualisation
        setLastLabels({
          products: products,
          copies,
          includePrices,
          printerType,
          template: selectedTemplate,
          total: products.length * copies,
          generatedAt: new Date().toISOString()
        });

        // Afficher directement la prévisualisation
        setPreviewUri(uri);
        
      } else {
        // Pour imprimantes thermiques : utiliser l'API backend avec lot d'étiquettes
        console.log('🖨️ [LABELS] Génération via API backend pour imprimante thermique...');
        
        const batchData = {
          product_ids: products.map(p => p.id),
          template_id: selectedTemplate?.id,
          copies,
        include_cug: includeCug,
        include_ean: includeEan,
        include_barcode: includeBarcode,
          printer_type: printerType,
          thermal_settings: thermalSettings
        };

        // Créer un lot d'étiquettes
        const batch = await labelPrintService.createLabelBatch(batchData);
        console.log('✅ [BATCH] Lot d\'étiquettes créé:', batch);

        // Si l'imprimante est connectée, envoyer directement
        if (printerConnected && printerConfig.auto_connect) {
          try {
            if (printerConfig.connection_type === 'bluetooth') {
              console.log('🔵 [BLUETOOTH] Envoi direct à l\'imprimante Bluetooth...');
              const printResult = await labelPrintService.sendToBluetoothPrinter({
                product_ids: products.map(p => p.id),
                template_id: selectedTemplate?.id,
                copies,
                include_cug: includeCug,
                include_ean: includeEan,
                include_barcode: includeBarcode,
                printer_type: printerType,
                thermal_settings: thermalSettings
              });
              
        Alert.alert(
                'Impression Bluetooth réussie',
                `Les étiquettes ont été envoyées directement à l'imprimante Bluetooth ${selectedBluetoothPrinter?.device_name}\n\nTotal: ${products.length * copies} étiquettes`
              );
            } else {
              console.log('🖨️ [PRINTER] Envoi direct à l\'imprimante réseau...');
              const printResult = await labelPrintService.sendToThermalPrinter(batch.id, {
                ip_address: printerConfig.ip_address,
                port: printerConfig.port,
                printer_type: printerType,
                connection_type: 'network'
              });
              
              Alert.alert(
                'Impression réseau réussie',
                `Les étiquettes ont été envoyées directement à l'imprimante ${printerConfig.ip_address}\n\nTotal: ${batch.copies_total || products.length * copies} étiquettes`
              );
            }
          } catch (printError) {
            console.warn('⚠️ [PRINTER] Envoi direct échoué, génération du fichier:', printError);
            
            // Fallback : générer le fichier TSC
            const tscContent = await labelPrintService.getTSCFile(batch.id);
            console.log('📄 [TSC] Fichier TSC généré:', tscContent.length, 'caractères');
            
            Alert.alert(
              'Fichier généré',
              `Le fichier TSC a été généré avec succès.\n\nTotal: ${batch.copies_total || products.length * copies} étiquettes\n\nVous pouvez maintenant l'envoyer à votre imprimante thermique.`
            );
          }
        } else {
          // Générer le fichier TSC pour transfert manuel
          const tscContent = await labelPrintService.getTSCFile(batch.id);
          console.log('📄 [TSC] Fichier TSC généré:', tscContent.length, 'caractères');
          
          Alert.alert(
            'Fichier généré',
            `Le fichier TSC a été généré avec succès.\n\nTotal: ${batch.copies_total || products.length * copies} étiquettes\n\nVous pouvez maintenant l'envoyer à votre imprimante thermique.`
          );
        }

        // Sauvegarder les données
        setLastLabels({
          products: products,
          copies,
          includePrices,
          printerType,
          template: selectedTemplate,
          total: products.length * copies,
          generatedAt: new Date().toISOString(),
          batchId: batch.id
        });
      }

    } catch (error) {
      console.error('❌ [LABELS] Erreur génération:', error);
      Alert.alert('Erreur', 'Impossible de générer les étiquettes');
    } finally {
      setGenerating(false);
    }
  };

  const handleShareLabels = async () => {
    if (!previewUri) return;
    
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(previewUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Partager les étiquettes'
        });
      } else {
        Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
      }
    } catch (error) {
      console.error('❌ [LABELS] Erreur partage:', error);
      Alert.alert('Erreur', 'Impossible de partager les étiquettes');
    }
  };

  const handlePrintLabels = async () => {
    if (!previewUri) return;
    
    try {
      await Print.printAsync({
        uri: previewUri,
      });
    } catch (error) {
      console.error('❌ [LABELS] Erreur impression:', error);
      Alert.alert('Erreur', 'Impossible d\'imprimer les étiquettes');
    }
  };

  const closePreview = () => {
    setPreviewUri(null);
    setLastLabels(null);
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Étiquettes Individuelles</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="help-circle-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {previewUri ? (
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <View style={styles.previewTitleContainer}>
              <Text style={styles.previewTitle}>Étiquettes générées !</Text>
              <Text style={styles.previewSubtitle}>
                {lastLabels?.total || 0} étiquettes • {lastLabels?.products?.length || 0} produits
              </Text>
            </View>
            <TouchableOpacity onPress={closePreview} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.previewContent}>
            <View style={styles.previewInfo}>
              <View style={styles.previewInfoRow}>
                <Ionicons name="document-text" size={20} color="#28a745" />
                <Text style={styles.previewInfoText}>PDF généré avec succès</Text>
              </View>
              <View style={styles.previewInfoRow}>
                <Ionicons name="time" size={20} color="#666" />
                <Text style={styles.previewInfoText}>
                  {lastLabels?.generatedAt ? new Date(lastLabels.generatedAt).toLocaleTimeString() : 'Maintenant'}
            </Text>
              </View>
              <View style={styles.previewInfoRow}>
                <Ionicons name="copy" size={20} color="#666" />
                <Text style={styles.previewInfoText}>
                  {copies} copie{copies > 1 ? 's' : ''} par produit
            </Text>
              </View>
              {includePrices && (
                <View style={styles.previewInfoRow}>
                  <Ionicons name="cash" size={20} color="#28a745" />
                  <Text style={styles.previewInfoText}>Prix inclus</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={[styles.previewActions, { paddingBottom: Math.max(34, insets.bottom + 16) }]}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShareLabels}>
              <Ionicons name="share" size={20} color="white" />
              <Text style={styles.previewActionText}>Partager</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.printButton} onPress={handlePrintLabels}>
              <Ionicons name="print" size={20} color="white" />
              <Text style={styles.previewActionText}>Imprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : loadingProducts ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Chargement des produits...</Text>
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Configuration de l'imprimante */}
        <View style={styles.printerConfigSection}>
          <Text style={styles.sectionTitle}>Configuration de l'imprimante</Text>
          
          {/* Sélection du type d'imprimante */}
          <View style={styles.printerTypeSection}>
            <Text style={styles.printerTypeLabel}>Type d'imprimante</Text>
            <View style={styles.printerTypeButtons}>
              <TouchableOpacity
                style={[styles.printerTypeButton, printerType === 'pdf' && styles.printerTypeButtonActive]}
                onPress={() => setPrinterType('pdf')}
              >
                <Ionicons name="document-text" size={24} color={printerType === 'pdf' ? 'white' : '#666'} />
                <Text style={[styles.printerTypeButtonText, printerType === 'pdf' && styles.printerTypeButtonTextActive]}>
                  PDF
            </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.printerTypeButton, printerType === 'escpos' && styles.printerTypeButtonActive]}
                onPress={() => setPrinterType('escpos')}
              >
                <Ionicons name="print" size={24} color={printerType === 'escpos' ? 'white' : '#666'} />
                <Text style={[styles.printerTypeButtonText, printerType === 'escpos' && styles.printerTypeButtonTextActive]}>
                  Thermique
            </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.printerTypeButton, printerType === 'tsc' && styles.printerTypeButtonActive]}
                onPress={() => setPrinterType('tsc')}
              >
                <Ionicons name="hardware-chip" size={24} color={printerType === 'tsc' ? 'white' : '#666'} />
                <Text style={[styles.printerTypeButtonText, printerType === 'tsc' && styles.printerTypeButtonTextActive]}>
                  TSC
                </Text>
              </TouchableOpacity>
          </View>
          </View>

          {/* Sélection du modèle d'étiquette */}
          {loadingTemplates ? (
            <View style={styles.loadingTemplates}>
              <ActivityIndicator size="small" color={theme.colors.primary[500]} />
              <Text style={styles.loadingTemplatesText}>Chargement des modèles...</Text>
            </View>
          ) : (
            <View style={styles.templateSection}>
              <Text style={styles.templateLabel}>Modèle d'étiquette</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
                {Array.isArray(templates) && templates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[styles.templateButton, selectedTemplate?.id === template.id && styles.templateButtonActive]}
                    onPress={() => setSelectedTemplate(template)}
                  >
                    <Text style={[styles.templateButtonText, selectedTemplate?.id === template.id && styles.templateButtonTextActive]}>
                      {template.name}
                    </Text>
                    <Text style={[styles.templateButtonSubtext, selectedTemplate?.id === template.id && styles.templateButtonSubtextActive]}>
                      {template.width_mm}x{template.height_mm}mm
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
           )}
           
           {/* Configuration de l'imprimante thermique */}
           {(printerType === 'escpos' || printerType === 'tsc') && (
             <View style={styles.printerConfigSection}>
               <Text style={styles.printerConfigTitle}>Configuration de l'imprimante thermique</Text>
               
               {/* Sélection du type de connexion */}
               <View style={styles.connectionTypeSection}>
                 <Text style={styles.connectionTypeLabel}>Type de connexion</Text>
                 <View style={styles.connectionTypeButtons}>
                   <TouchableOpacity
                     style={[
                       styles.connectionTypeButton,
                       printerConfig.connection_type === 'network' && styles.connectionTypeButtonActive
                     ]}
                     onPress={() => setPrinterConfig(prev => ({ ...prev, connection_type: 'network' }))}
                   >
                     <Ionicons 
                       name="wifi" 
                       size={20} 
                       color={printerConfig.connection_type === 'network' ? 'white' : theme.colors.primary[500]} 
                     />
                     <Text style={[
                       styles.connectionTypeButtonText,
                       printerConfig.connection_type === 'network' && styles.connectionTypeButtonTextActive
                     ]}>
                       Réseau
                     </Text>
                   </TouchableOpacity>
                   
                   <TouchableOpacity
                     style={[
                       styles.connectionTypeButton,
                       printerConfig.connection_type === 'bluetooth' && styles.connectionTypeButtonActive
                     ]}
                     onPress={() => setPrinterConfig(prev => ({ ...prev, connection_type: 'bluetooth' }))}
                   >
                     <Ionicons 
                       name="bluetooth" 
                       size={20} 
                       color={printerConfig.connection_type === 'bluetooth' ? 'white' : theme.colors.primary[500]} 
                     />
                     <Text style={[
                       styles.connectionTypeButtonText,
                       printerConfig.connection_type === 'bluetooth' && styles.connectionTypeButtonTextActive
                     ]}>
                       Bluetooth
                     </Text>
                   </TouchableOpacity>
                 </View>
               </View>
               
               {/* Configuration réseau */}
               {printerConfig.connection_type === 'network' && (
                 <View style={styles.printerNetworkSection}>
                   <Text style={styles.printerNetworkLabel}>Connexion réseau</Text>
                   
                   <View style={styles.printerInputRow}>
                     <Text style={styles.printerInputLabel}>Adresse IP:</Text>
                     <TextInput
                       style={styles.printerInput}
                       value={printerConfig.ip_address}
                       onChangeText={(text) => setPrinterConfig(prev => ({ ...prev, ip_address: text }))}
                       placeholder="192.168.1.100"
                       keyboardType="numeric"
                       autoCapitalize="none"
                     />
                   </View>
                   
                   <View style={styles.printerInputRow}>
                     <Text style={styles.printerInputLabel}>Port:</Text>
                     <TextInput
                       style={styles.printerInput}
                       value={printerConfig.port.toString()}
                       onChangeText={(text) => setPrinterConfig(prev => ({ ...prev, port: parseInt(text) || 9100 }))}
                       placeholder="9100"
                       keyboardType="numeric"
                     />
                   </View>
                 </View>
               )}
               
               {/* Configuration Bluetooth */}
               {printerConfig.connection_type === 'bluetooth' && (
                 <View style={styles.printerBluetoothSection}>
                   <Text style={styles.printerBluetoothLabel}>Connexion Bluetooth</Text>
                   
                   <TouchableOpacity
                     style={[styles.discoverButton, testingConnection && styles.disabledButton]}
                     onPress={discoverBluetoothPrinters}
                     disabled={testingConnection}
                   >
                     {testingConnection ? (
                       <ActivityIndicator size="small" color="white" />
                     ) : (
                       <Ionicons name="search" size={16} color="white" />
                     )}
                     <Text style={styles.discoverButtonText}>
                       {testingConnection ? 'Recherche...' : 'Rechercher des imprimantes'}
                     </Text>
                   </TouchableOpacity>
                   
                   {bluetoothPrinters.length > 0 && (
                     <View style={styles.bluetoothPrintersList}>
                       {bluetoothPrinters.map((printer, index) => (
                         <TouchableOpacity
                           key={index}
                           style={[
                             styles.bluetoothPrinterItem,
                             selectedBluetoothPrinter?.device_address === printer.device_address && styles.bluetoothPrinterItemSelected
                           ]}
                           onPress={() => connectToBluetoothPrinter(printer)}
                           disabled={testingConnection}
                         >
                           <Ionicons name="print" size={20} color={theme.colors.primary[500]} />
                           <View style={styles.bluetoothPrinterInfo}>
                             <Text style={styles.bluetoothPrinterName}>{printer.device_name}</Text>
                             <Text style={styles.bluetoothPrinterAddress}>{printer.device_address}</Text>
                           </View>
                           {selectedBluetoothPrinter?.device_address === printer.device_address && (
                             <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                           )}
                         </TouchableOpacity>
                       ))}
                     </View>
                   )}
                   
                   {selectedBluetoothPrinter && (
                     <View style={styles.selectedPrinterContainer}>
                       <Ionicons name="print" size={20} color={theme.colors.primary[500]} />
                       <View style={styles.selectedPrinterInfo}>
                         <Text style={styles.selectedPrinterName}>{selectedBluetoothPrinter.device_name}</Text>
                         <Text style={styles.selectedPrinterAddress}>{selectedBluetoothPrinter.device_address}</Text>
                       </View>
                     </View>
                   )}
                 </View>
               )}
               
               {/* Statut de connexion */}
               {printerConnected && (
                 <View style={styles.connectionStatusContainer}>
                   <View style={styles.connectionStatus}>
                     <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                     <Text style={styles.connectionStatusText}>Imprimante connectée</Text>
                   </View>
                 </View>
               )}
               
               <View style={styles.printerOptionRow}>
                 <TouchableOpacity
                   style={styles.printerOptionToggle}
                   onPress={() => setPrinterConfig(prev => ({ ...prev, auto_connect: !prev.auto_connect }))}
                 >
                   <Ionicons 
                     name={printerConfig.auto_connect ? "checkbox" : "checkbox-outline"} 
                     size={24} 
                     color={printerConfig.auto_connect ? theme.colors.primary[500] : '#666'} 
                   />
                   <Text style={styles.printerOptionText}>Envoi automatique à l'imprimante</Text>
                 </TouchableOpacity>
               </View>
               
               {/* Paramètres d'impression */}
               <View style={styles.thermalSettingsSection}>
                 <Text style={styles.thermalSettingsTitle}>Paramètres d'impression</Text>
                 
                 <View style={styles.thermalSettingsGrid}>
                   <View style={styles.thermalSettingRow}>
                     <Text style={styles.thermalSettingLabel}>Densité</Text>
                     <View style={styles.thermalSettingValue}>
                       <TouchableOpacity
                         style={styles.thermalSettingButton}
                         onPress={() => setThermalSettings(prev => ({ ...prev, density: Math.max(1, prev.density - 1) }))}
                       >
                         <Text style={styles.thermalSettingButtonText}>-</Text>
                       </TouchableOpacity>
                       <Text style={styles.thermalSettingValueText}>{thermalSettings.density}</Text>
                       <TouchableOpacity
                         style={styles.thermalSettingButton}
                         onPress={() => setThermalSettings(prev => ({ ...prev, density: Math.min(15, prev.density + 1) }))}
                       >
                         <Text style={styles.thermalSettingButtonText}>+</Text>
                       </TouchableOpacity>
                     </View>
                   </View>
                   
                   <View style={styles.thermalSettingRow}>
                     <Text style={styles.thermalSettingLabel}>Vitesse</Text>
                     <View style={styles.thermalSettingValue}>
                       <TouchableOpacity
                         style={styles.thermalSettingButton}
                         onPress={() => setThermalSettings(prev => ({ ...prev, speed: Math.max(1, prev.speed - 1) }))}
                       >
                         <Text style={styles.thermalSettingButtonText}>-</Text>
                       </TouchableOpacity>
                       <Text style={styles.thermalSettingValueText}>{thermalSettings.speed}</Text>
                       <TouchableOpacity
                         style={styles.thermalSettingButton}
                         onPress={() => setThermalSettings(prev => ({ ...prev, speed: Math.min(15, prev.speed + 1) }))}
                       >
                         <Text style={styles.thermalSettingButtonText}>+</Text>
                       </TouchableOpacity>
                     </View>
                   </View>
                   
                   <View style={styles.thermalSettingRow}>
                     <Text style={styles.thermalSettingLabel}>Espacement (mm)</Text>
                     <View style={styles.thermalSettingValue}>
                       <TouchableOpacity
                         style={styles.thermalSettingButton}
                         onPress={() => setThermalSettings(prev => ({ ...prev, gap: Math.max(0, prev.gap - 1) }))}
                       >
                         <Text style={styles.thermalSettingButtonText}>-</Text>
                       </TouchableOpacity>
                       <Text style={styles.thermalSettingValueText}>{thermalSettings.gap}</Text>
                       <TouchableOpacity
                         style={styles.thermalSettingButton}
                         onPress={() => setThermalSettings(prev => ({ ...prev, gap: Math.min(10, prev.gap + 1) }))}
                       >
                         <Text style={styles.thermalSettingButtonText}>+</Text>
                       </TouchableOpacity>
                     </View>
                   </View>
                 </View>
               </View>
             </View>
           )}

           {/* Composant de test pour l'imprimante thermique */}
           {(printerType === 'escpos' || printerType === 'tsc') && printerConfig.ip_address && (
             <ThermalPrinterTest
               printerConfig={{
                 ip_address: printerConfig.ip_address,
                 port: printerConfig.port,
                 printer_type: printerType
               }}
               onTestComplete={(success) => setPrinterConnected(success)}
             />
           )}
        </View>

        {/* Configuration Options */}
        <PrintOptionsConfig
          screenType="labels"
          includePrices={includePrices}
          setIncludePrices={setIncludePrices}
          copies={copies}
          setCopies={setCopies}
          {...({} as any)}
        />

          {/* Résumé compact */}
          <View style={styles.compactSummary}>
            <Text style={styles.compactSummaryText}>
              {products.length} produit{products.length > 1 ? 's' : ''} × {copies} copie{copies > 1 ? 's' : ''} = {products.length * copies} étiquettes
            </Text>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
              (products.length === 0 || generating) && styles.disabledButton
          ]}
          onPress={generateLabels}
            disabled={products.length === 0 || generating}
        >
          {generating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.generateButtonText}>
              🖨️ Générer les Étiquettes
            </Text>
          )}
        </TouchableOpacity>
          
          {/* Espace supplémentaire pour éviter la superposition */}
          <View style={{ height: 20 }} />

      </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 120, // Espace pour éviter la superposition avec la navigation
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  // Styles pour la configuration de l'imprimante
  printerConfigSection: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  printerTypeSection: {
    marginBottom: 20,
  },
  printerTypeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  printerTypeButtons: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  printerTypeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
    minHeight: 60,
  },
  printerTypeButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  printerTypeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  printerTypeButtonTextActive: {
    color: 'white',
  },
  templateSection: {
    marginBottom: 8,
  },
  templateLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  templateScroll: {
    flexDirection: 'row',
  },
  templateButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
    marginRight: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  templateButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  templateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  templateButtonTextActive: {
    color: 'white',
  },
  templateButtonSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  templateButtonSubtextActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loadingTemplates: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingTemplatesText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  // Styles pour la configuration de l'imprimante thermique
  printerConfigTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  printerNetworkSection: {
    marginBottom: 16,
  },
  printerNetworkLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  printerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  printerInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    width: 100,
  },
  printerInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
  },
  printerConnectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  testConnectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  testConnectionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectionStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#28a745',
  },
  connectionStatusContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  printerOptionRow: {
    marginTop: 12,
  },
  printerOptionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  printerOptionText: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  // Styles pour le type de connexion
  connectionTypeSection: {
    marginBottom: 16,
  },
  connectionTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  connectionTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  connectionTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
    backgroundColor: 'white',
    gap: 8,
  },
  connectionTypeButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  connectionTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary[500],
  },
  connectionTypeButtonTextActive: {
    color: 'white',
  },
  // Styles pour Bluetooth
  printerBluetoothSection: {
    marginBottom: 16,
  },
  printerBluetoothLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  discoverButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  bluetoothPrintersList: {
    maxHeight: 200,
  },
  bluetoothPrinterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  bluetoothPrinterItemSelected: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary[500],
  },
  bluetoothPrinterInfo: {
    marginLeft: 12,
    flex: 1,
  },
  bluetoothPrinterName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  bluetoothPrinterAddress: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  selectedPrinterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary[500],
  },
  selectedPrinterInfo: {
    marginLeft: 12,
    flex: 1,
  },
  selectedPrinterName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  selectedPrinterAddress: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  // Styles pour les paramètres thermiques
  thermalSettingsSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  thermalSettingsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  thermalSettingsGrid: {
    gap: 12,
  },
  thermalSettingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  thermalSettingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    flex: 1,
  },
  thermalSettingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thermalSettingButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  thermalSettingButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  thermalSettingValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    minWidth: 24,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 32,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background.secondary,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  subtitleContainer: {
    padding: theme.spacing.md,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 12,
  },
  selectionSummary: {
    backgroundColor: theme.colors.primary[50],
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary[500],
  },
  selectionSummaryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary[600],
    textAlign: 'center',
    marginBottom: 4,
  },
  selectionSummarySubtext: {
    fontSize: 12,
    color: theme.colors.primary[700],
    textAlign: 'center',
  },
  labelsSummary: {
    margin: 16,
  },
  summaryCard: {
    backgroundColor: theme.colors.background.secondary,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  summaryText: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.success[500],
    textAlign: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  preselectionInfo: {
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  preselectionInfoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#155724',
    textAlign: 'center',
    marginBottom: 4,
  },
  preselectionInfoSubtext: {
    fontSize: 12,
    color: '#155724',
    textAlign: 'center',
  },
  controls: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  optionLabel: {
    fontSize: 16,
    color: '#495057',
    flex: 1,
  },
  copiesInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  productsSection: {
    margin: 16,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  selectionCount: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    textAlign: 'center',
  },
  totalLabelsInfo: {
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  totalLabelsText: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '500',
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 60,
  },
  selectedProductCard: {
    borderColor: '#28a745',
    backgroundColor: '#f8fff9',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  productCopies: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
    marginTop: 4,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 18,
    color: '#28a745',
    fontWeight: 'bold',
  },
  compactSummary: {
    backgroundColor: theme.colors.primary[50],
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary[500],
  },
  compactSummaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[700],
    textAlign: 'center',
  },
  generateButton: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: theme.colors.neutral[400],
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Styles pour la prévisualisation
  previewContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  previewTitleContainer: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
  },
  previewContent: {
    flex: 1,
    padding: 20,
  },
  previewInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  previewInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewInfoText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  previewActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  shareButton: {
    flex: 1,
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  printButton: {
    flex: 1,
    backgroundColor: theme.colors.success[500],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  previewActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LabelPrintScreen;
