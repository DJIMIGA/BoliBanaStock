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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrintOptionsConfig } from '../components/PrintOptionsConfig';
import { catalogService } from '../services/api';
import theme from '../utils/theme';

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

interface CatalogPDFScreenProps {
  route?: {
    params?: {
      selectedProducts?: number[];
    };
  };
}

const CatalogPDFScreen: React.FC<CatalogPDFScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [generating, setGenerating] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [lastPdfUri, setLastPdfUri] = useState<string | null>(null);
  const [lastCatalog, setLastCatalog] = useState<any | null>(null);
  
  // Récupérer les paramètres passés depuis PrintModeSelectionScreen
  const selectedProducts = route?.params?.selectedProducts || [];
  
  // Options de configuration
  const [includePrices, setIncludePrices] = useState(true);
  const [includeStock, setIncludeStock] = useState(true);
  const [includeDescriptions, setIncludeDescriptions] = useState(true);
  const [includeImages, setIncludeImages] = useState(true);

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

  const handlePreviewCatalog = (catalog: any) => {
    console.log('👁️ [CATALOG_SCREEN] Prévisualisation du catalogue:', catalog);
    generateAndHandlePdf(catalog, 'preview');
  };


  const handleShareCatalog = (catalog: any) => {
    console.log('📤 [CATALOG_SCREEN] Partage du catalogue:', catalog);
    generateAndHandlePdf(catalog, 'share');
  };

  const handleDownloadCatalog = (catalog: any) => {
    console.log('💾 [CATALOG_SCREEN] Téléchargement du catalogue:', catalog);
    generateAndHandlePdf(catalog, 'download');
  };

  const handlePrintCatalog = (catalog: any) => {
    console.log('🖨️ [CATALOG_SCREEN] Impression du catalogue:', catalog);
    generateAndHandlePdf(catalog, 'print');
  };

  const buildCatalogHtml = (catalog: any) => {
    console.log('🔍 [BUILD_HTML] Données du catalogue reçues:', catalog);
    
    // S'assurer qu'on utilise les bonnes données
    const products = catalog.products || [];
    console.log('🔍 [BUILD_HTML] Produits extraits:', products);
    
    const rows = products.map((p: any, index: number) => {
      console.log(`🔍 [BUILD_HTML] Produit ${index}:`, p);
      
      // Logique pour le code-barres selon la structure Product avec barcodes array
      let eanCode = '';
      let barcodeSource = '';
      
      // 1. Chercher le code-barres principal dans le tableau barcodes
      if (p.barcodes && Array.isArray(p.barcodes) && p.barcodes.length > 0) {
        // Chercher le code-barres principal (is_primary: true)
        const primaryBarcode = p.barcodes.find((b: any) => b.is_primary && b.ean && b.ean.length === 13);
        if (primaryBarcode) {
          eanCode = primaryBarcode.ean;
          barcodeSource = 'primary_barcode';
        } else {
          // Si pas de principal, prendre le premier code-barres valide
          const validBarcode = p.barcodes.find((b: any) => b.ean && b.ean.length === 13);
          if (validBarcode) {
            eanCode = validBarcode.ean;
            barcodeSource = 'barcode_array';
          }
        }
      }
      
      // 2. Fallback vers generated_ean si pas de barcodes dans le tableau
      if (!eanCode && p.generated_ean && p.generated_ean.length === 13) {
        eanCode = p.generated_ean;
        barcodeSource = 'generated_ean';
      }
      
      // 3. Fallback vers les anciens champs pour compatibilité
      if (!eanCode && p.barcode_ean && p.barcode_ean.length === 13) {
        eanCode = p.barcode_ean;
        barcodeSource = 'barcode_ean_legacy';
      } else if (!eanCode && p.ean && p.ean.length === 13) {
        eanCode = p.ean;
        barcodeSource = 'ean_legacy';
      }
      
      // 4. Dernier recours : générer un EAN basé sur l'ID du produit
      if (!eanCode) {
        eanCode = generateEANFromProductId(p.id);
        barcodeSource = 'generated_from_id';
      }
      
      // Valider le code-barres généré
      const isValidBarcode = validateEAN13(eanCode);
      if (!isValidBarcode) {
        console.warn(`⚠️ [CATALOG] Code-barres invalide pour ${p.name}: ${eanCode}`);
        // Régénérer un code valide si nécessaire
        if (barcodeSource === 'generated_from_id') {
          eanCode = generateEANFromProductId(p.id);
          console.log(`🔄 [CATALOG] Code-barres régénéré: ${eanCode}`);
        }
      }
      
      console.log(`🏷️ [CATALOG] Produit ${p.name} - Code-barres: ${eanCode} (source: ${barcodeSource}, valid: ${isValidBarcode})`);
      
      const barcodeHtml = eanCode ? `
        <div style="text-align: center; margin: 0; padding: 2px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="display: flex; justify-content: center; align-items: center; width: 100%; margin-bottom: 1px;">
            <svg width="100%" height="30" viewBox="0 0 150 30" style="display: block; margin: 0 auto;">
              <rect width="150" height="30" fill="white"/>
              ${generateEAN13Barcode(eanCode)}
            </svg>
          </div>
          <div style="font-family: monospace; font-size: 10px; color: #333; text-align: center; width: 100%; display: flex; justify-content: center;">${eanCode}</div>
        </div>
      ` : '<div style="text-align: center; color: #999; padding: 8px; width: 100%; display: flex; justify-content: center; align-items: center;">N/A</div>';
      
      // Gestion des images - utiliser image_url directement (URLs corrigées, comme ProductImage)
      const imageSrc = p.image_url;
      console.log(`🔍 [BUILD_HTML] Image pour produit ${index}:`, { 
        imageSrc: imageSrc ? imageSrc.substring(0, 50) + '...' : 'null', 
        hasImageData: !!p.image_data, 
        hasImageUrl: !!p.image_url,
        includeImages,
        isDataUri: false // Utilisation directe des URLs comme ProductImage
      });
      
      const imageCell = includeImages && imageSrc ? `
        <td>
          <img src="${imageSrc}" alt="${p.name || ''}" 
               onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" 
               onload="console.log('Image loaded successfully:', this.src);" />
          <div style="display:none; color:#999; font-size:10px;">Image non disponible</div>
        </td>
      ` : (includeImages ? `<td>Aucune image</td>` : '');

      // Déterminer la classe de stock selon la quantité
      const stockClass = p.quantity > 10 ? 'in-stock' : p.quantity > 0 ? 'low-stock' : 'out-of-stock';
      
      return `
        <tr>
          ${includeImages ? imageCell : ''}
          <td class="product-name">${p.name || 'N/A'}</td>
          <td>${p.cug || 'N/A'}</td>
          <td class="barcode-cell">${barcodeHtml}</td>
          <td>${p.category || 'N/A'}</td>
          <td>${p.brand || 'N/A'}</td>
          <td class="price">${p.selling_price ? `${p.selling_price} FCFA` : 'N/A'}</td>
          <td class="stock ${stockClass}">${p.quantity || 'N/A'}</td>
      </tr>
      `;
    }).join('');
    
    console.log('🔍 [BUILD_HTML] HTML généré pour les lignes:', rows);
    
    return `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${catalog.name || 'Catalogue'}</title>
        <style>
          body { font-family: -apple-system, Roboto, Arial, sans-serif; padding: 24px; }
          h1 { font-size: 18px; margin: 0 0 4px; text-align: center; }
          .meta { color:#555; margin-bottom: 12px; text-align: center; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { text-align: center; background:#f5f5f5; padding:8px; border:1px solid #ddd; font-weight: bold; }
          td { padding:8px; border:1px solid #ddd; text-align: center; vertical-align: middle; }
          .barcode-cell { min-width: 160px; text-align: center; vertical-align: middle; padding: 0 !important; }
          img { max-width: 100px; max-height: 100px; object-fit: contain; display: block; margin: 0 auto; }
          .product-name { text-align: left; font-weight: 500; }
          .price { font-weight: bold; color: #2e7d32; }
          .stock { font-weight: bold; }
          .stock.in-stock { color: #2e7d32; }
          .stock.low-stock { color: #f57c00; }
          .stock.out-of-stock { color: #d32f2f; }
        </style>
      </head>
      <body>
        <h1>${catalog.name || 'Catalogue'}</h1>
        <div class="meta">${catalog.total_products || 0} produits • ${catalog.total_pages || 0} pages</div>
        <table>
          <thead>
            <tr>
              ${includeImages ? '<th>Image</th>' : ''}
              <th>Produit</th>
              <th>CUG</th>
              <th>EAN (Scannable)</th>
              <th>Catégorie</th>
              <th>Marque</th>
              <th>Prix</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>
    `;
  };

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
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
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
    const barHeight = 24;
    const quietZone = 5;
    
    // Calculer la largeur totale du code-barres
    const totalWidth = (quietZone * 2) + (barWidth * 2) + barWidth + (barWidth * 2) + barWidth + (6 * 7 * barWidth) + (5 * barWidth) + (6 * 7 * barWidth) + (barWidth * 2) + barWidth + (barWidth * 2) + barWidth + quietZone;
    
    // Centrer le code-barres dans le SVG
    const svgWidth = 150;
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


  const prepareImagesForPdf = async (catalog: any) => {
    console.log('🖼️ [PREPARE_IMAGES] includeImages:', includeImages);
    console.log('🖼️ [PREPARE_IMAGES] catalog.products:', catalog?.products);
    
    if (!includeImages || !Array.isArray(catalog?.products)) {
      console.log('🖼️ [PREPARE_IMAGES] Images désactivées ou pas de produits');
      return catalog;
    }

    console.log('🖼️ [PREPARE_IMAGES] Préparation des images pour le PDF...');
    const productsWithImages: any[] = [];
    
    for (const prod of catalog.products) {
      console.log(`🖼️ [PREPARE_IMAGES] Produit: ${prod.name}, image_url: ${prod.image_url}`);
      
      if (prod?.image_url) {
        // Corriger les erreurs de frappe dans les URLs S3 (même approche que ProductImage)
        let correctedUrl = prod.image_url;
        if (correctedUrl.includes('bolibana-stockk.s3')) {
          correctedUrl = correctedUrl.replace('bolibana-stockk.s3', 'bolibana-stock.s3');
          console.log(`🔧 [PREPARE_IMAGES] URL corrigée (double k): ${correctedUrl}`);
        }
        if (correctedUrl.includes('bolibanna-stock.s3')) {
          correctedUrl = correctedUrl.replace('bolibanna-stock.s3', 'bolibana-stock.s3');
          console.log(`🔧 [PREPARE_IMAGES] URL corrigée (double n): ${correctedUrl}`);
        }
        if (correctedUrl.includes('bolibana-stock.s3.eeu-north-1')) {
          correctedUrl = correctedUrl.replace('bolibana-stock.s3.eeu-north-1', 'bolibana-stock.s3.eu-north-1');
          console.log(`🔧 [PREPARE_IMAGES] URL corrigée (double e): ${correctedUrl}`);
        }
        if (correctedUrl.includes('site-18')) {
          correctedUrl = correctedUrl.replace('site-18', 'site-default');
          console.log(`🔧 [PREPARE_IMAGES] URL corrigée (site-18 → site-default): ${correctedUrl}`);
        }
        
        // Utiliser directement l'URL corrigée (comme ProductImage)
        console.log(`🖼️ [PREPARE_IMAGES] Utilisation de l'URL directe pour ${prod.name}: ${correctedUrl}`);
        
        productsWithImages.push({ 
          ...prod, 
          image_url: correctedUrl // Utiliser l'URL corrigée directement
        });
      } else {
        console.log(`🖼️ [PREPARE_IMAGES] Pas d'image pour ${prod.name}`);
        productsWithImages.push(prod);
      }
    }
    
    console.log('🖼️ [PREPARE_IMAGES] Produits avec images préparés:', productsWithImages.length);
    return { ...catalog, products: productsWithImages };
  };

  const generateAndHandlePdf = async (catalog: any, mode: 'share'|'download'|'print'|'preview') => {
    try {
      // Préparer les images si nécessaire
      const preparedCatalog = await prepareImagesForPdf(catalog);
      
      const html = buildCatalogHtml(preparedCatalog);
      const { uri } = await Print.printToFileAsync({ html });
      console.log('📝 PDF généré:', uri);
      setLastCatalog(catalog);
      setLastPdfUri(uri);

      if (mode === 'preview') {
        // Pour la prévisualisation, on utilise le partage direct avec une interface améliorée
        console.log('📱 Mode prévisualisation: partage direct avec interface améliorée');
        
        // Afficher une interface de prévisualisation avec les informations du catalogue
        setPreviewUri('preview_interface'); // Marqueur pour afficher l'interface
        setLastPdfUri(uri);
        setLastCatalog(catalog);
        return;
      }

      if (mode === 'print') {
        await Print.printAsync({ uri });
        return;
      }

      // Préparer un nom de fichier sûr
      const safeName = `${(catalog?.name || 'Catalogue').toString().replace(/[^a-z0-9_-]+/gi,'_')}.pdf`;

      // Partage direct depuis le fichier temporaire généré par Print
      if (mode === 'share') {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { dialogTitle: catalog?.name || 'Catalogue' });
        } else {
          Alert.alert('Partage indisponible', 'Le partage n’est pas supporté sur cet appareil.');
        }
        return;
      }

      // Téléchargement: essayer de copier vers un répertoire accessible (cacheDirectory)
          const FS2 = (FileSystem as unknown) as { cacheDirectory?: string | null; documentDirectory?: string | null };
          const baseDir = FS2.cacheDirectory || FS2.documentDirectory;
      if (!baseDir) {
        // Fallback: proposer le partage pour permettre l’enregistrement par l’utilisateur
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { dialogTitle: catalog?.name || 'Catalogue' });
        } else {
          Alert.alert('Enregistrement indisponible', 'Impossible d’enregistrer le fichier sur cet appareil.');
        }
        return;
      }

      const targetPath = baseDir + safeName;
      try {
        await FileSystemLegacy.copyAsync({ from: uri, to: targetPath });
        Alert.alert('Téléchargé', 'Catalogue enregistré dans la mémoire de l’application.');
      } catch (copyErr: any) {
        console.warn('⚠️ Copie échouée, tentative de partage en fallback:', copyErr);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { dialogTitle: catalog?.name || 'Catalogue' });
        } else {
          Alert.alert('Erreur', 'Impossible d’enregistrer ou de partager le fichier.');
        }
      }
    } catch (e: any) {
      console.error('❌ Erreur génération/partage PDF:', e);
      Alert.alert('Erreur', e?.message || 'Impossible de générer le PDF');
    }
  };

  const closePreview = async () => {
    // Nettoyer le fichier de prévisualisation temporaire si nécessaire
    if (previewUri && previewUri.includes('preview_')) {
      try {
        await FileSystem.deleteAsync(previewUri, { idempotent: true });
        console.log('🗑️ Fichier de prévisualisation supprimé:', previewUri);
      } catch (error) {
        console.warn('⚠️ Impossible de supprimer le fichier de prévisualisation:', error);
      }
    }
    setPreviewUri(null);
  };

  const generateCatalog = async () => {
    console.log('🚀 [CATALOG_SCREEN] Début génération catalogue');
    console.log('🚀 [CATALOG_SCREEN] Produits sélectionnés:', selectedProducts);
    console.log('🚀 [CATALOG_SCREEN] Options:', {
      includePrices,
      includeStock,
      includeDescriptions,
      includeImages
    });
    
    setGenerating(true);
    try {
      const catalogData = {
        product_ids: selectedProducts,
        include_prices: includePrices,
        include_stock: includeStock,
        include_descriptions: includeDescriptions,
        include_images: includeImages,
      };

      console.log('📄 [CATALOG_SCREEN] Données préparées pour l\'API:', catalogData);
      
      // Appel API réel pour générer le catalogue
      console.log('📡 [CATALOG_SCREEN] Appel du service catalogService...');
      const catalogResponse = await catalogService.generateCatalog(catalogData);
      
      console.log('✅ [CATALOG_SCREEN] Réponse reçue du service:', catalogResponse);
      
      setGenerating(false);
      
      const successMessage = `Catalogue généré avec succès !\n\n${catalogResponse.catalog.total_products} produits inclus\n${catalogResponse.catalog.total_pages} pages\n\nID du catalogue: ${catalogResponse.catalog.id}`;
      
      console.log('🎉 [CATALOG_SCREEN] Affichage du message de succès:', successMessage);
      
      // Afficher directement la prévisualisation après génération
      console.log('🎉 [CATALOG_SCREEN] Affichage direct de la prévisualisation');
      await handlePreviewCatalog(catalogResponse.catalog);

    } catch (error: any) {
      setGenerating(false);
      console.error('❌ [CATALOG_SCREEN] Erreur capturée dans generateCatalog:');
      console.error('❌ [CATALOG_SCREEN] Error type:', typeof error);
      console.error('❌ [CATALOG_SCREEN] Error message:', error.message);
      console.error('❌ [CATALOG_SCREEN] Error response:', error.response);
      console.error('❌ [CATALOG_SCREEN] Full error:', error);
      
      let errorMessage = 'Impossible de générer le catalogue PDF';
      
      if (error.response) {
        console.log('🔍 [CATALOG_SCREEN] Analyse de la réponse d\'erreur:');
        console.log('🔍 [CATALOG_SCREEN] Status:', error.response.status);
        console.log('🔍 [CATALOG_SCREEN] Data:', error.response.data);
        
        if (error.response.status === 404) {
          errorMessage = 'Service de génération de catalogue non disponible';
        } else if (error.response.status === 500) {
          errorMessage = 'Erreur serveur lors de la génération';
        } else if (error.response.status === 401) {
          errorMessage = 'Erreur d\'authentification - veuillez vous reconnecter';
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.log('💬 [CATALOG_SCREEN] Message d\'erreur final:', errorMessage);
      
      Alert.alert('Erreur', errorMessage);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Catalogue PDF A4</Text>
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
              <Text style={styles.previewTitle}>Catalogue généré !</Text>
              <Text style={styles.previewSubtitle}>
                {lastCatalog?.total_products || 0} produits • {lastCatalog?.total_pages || 0} pages
              </Text>
            </View>
            <TouchableOpacity onPress={closePreview} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {/* Interface de prévisualisation améliorée */}
          <View style={styles.previewContent}>
            <View style={styles.previewInfo}>
              <Ionicons name="document-text" size={64} color={theme.colors.primary[500]} />
              <Text style={styles.previewInfoTitle}>Catalogue PDF prêt !</Text>
              <Text style={styles.previewInfoSubtitle}>
                Votre catalogue a été généré avec succès et contient :
              </Text>
              
              <View style={styles.previewDetails}>
                <View style={styles.previewDetailItem}>
                  <Ionicons name="cube" size={20} color={theme.colors.primary[500]} />
                  <Text style={styles.previewDetailText}>
                    {lastCatalog?.total_products || 0} produits
                  </Text>
                </View>
                <View style={styles.previewDetailItem}>
                  <Ionicons name="document" size={20} color={theme.colors.primary[500]} />
                  <Text style={styles.previewDetailText}>
                    {lastCatalog?.total_pages || 0} pages
                  </Text>
                </View>
                <View style={styles.previewDetailItem}>
                  <Ionicons name="barcode" size={20} color={theme.colors.primary[500]} />
                  <Text style={styles.previewDetailText}>
                    Codes-barres scannables
                  </Text>
                </View>
                {includeImages && (
                  <View style={styles.previewDetailItem}>
                    <Ionicons name="image" size={20} color={theme.colors.primary[500]} />
                    <Text style={styles.previewDetailText}>
                      Images incluses
                    </Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.previewInfoNote}>
                Utilisez les boutons ci-dessous pour partager, imprimer ou télécharger votre catalogue.
              </Text>
            </View>
          </View>
          
          <View style={[styles.previewActions, { paddingBottom: Math.max(34, insets.bottom + 16) }]}>
            <TouchableOpacity 
              style={[styles.previewActionButton, styles.shareButton]} 
              onPress={async () => {
                if (lastPdfUri) {
                  const canShare = await Sharing.isAvailableAsync();
                  if (canShare) {
                    await Sharing.shareAsync(lastPdfUri, { dialogTitle: lastCatalog?.name || 'Catalogue' });
                  } else {
                    Alert.alert('Partage indisponible', 'Le partage n\'est pas supporté sur cet appareil.');
                  }
                }
              }}
            >
              <Ionicons name="share-outline" size={20} color="white" />
              <Text style={styles.previewActionText}>Partager</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.previewActionButton, styles.printButton]} 
              onPress={async () => {
                if (lastPdfUri) {
                  try {
                    await Print.printAsync({ uri: lastPdfUri });
                  } catch (error) {
                    Alert.alert('Erreur d\'impression', 'Impossible d\'imprimer le document.');
                  }
                }
              }}
            >
              <Ionicons name="print-outline" size={20} color="white" />
              <Text style={styles.previewActionText}>Imprimer</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.previewActionButton, styles.downloadButton]} 
              onPress={async () => {
                if (lastPdfUri && lastCatalog) {
                  try {
                    const safeName = `${(lastCatalog?.name || 'Catalogue').toString().replace(/[^a-z0-9_-]+/gi,'_')}.pdf`;
                    const FS = (FileSystem as unknown) as { cacheDirectory?: string | null; documentDirectory?: string | null };
                    const baseDir = FS.cacheDirectory || FS.documentDirectory;
                    
                    if (baseDir) {
                      const targetPath = baseDir + safeName;
                      await FileSystemLegacy.copyAsync({ from: lastPdfUri, to: targetPath });
                      Alert.alert('Téléchargé', 'Catalogue enregistré dans la mémoire de l\'application.');
                    } else {
                      const canShare = await Sharing.isAvailableAsync();
                      if (canShare) {
                        await Sharing.shareAsync(lastPdfUri, { dialogTitle: lastCatalog?.name || 'Catalogue' });
                      } else {
                        Alert.alert('Enregistrement indisponible', 'Impossible d\'enregistrer le fichier sur cet appareil.');
                      }
                    }
                  } catch (error) {
                    Alert.alert('Erreur', 'Impossible d\'enregistrer le fichier.');
                  }
                }
              }}
            >
              <Ionicons name="download-outline" size={20} color="white" />
              <Text style={styles.previewActionText}>Télécharger</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : generating ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Génération du catalogue en cours...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Sous-titre et résumé des produits */}
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>Générer un catalogue professionnel</Text>
          
          {/* Résumé des produits sélectionnés */}
          <View style={styles.selectionSummary}>
            <Text style={styles.selectionSummaryText}>
              📦 {selectedProducts.length} produit{selectedProducts.length > 1 ? 's' : ''} sélectionné{selectedProducts.length > 1 ? 's' : ''}
              </Text>
            <Text style={styles.selectionSummarySubtext}>
              Configuration: {includePrices ? '💰 Prix inclus' : '💰 Prix masqués'} • {includeStock ? '📊 Stock inclus' : '📊 Stock masqué'}
              </Text>
            </View>
        </View>

        {/* Configuration Options */}
        <PrintOptionsConfig
          screenType="catalog"
          includePrices={includePrices}
          setIncludePrices={setIncludePrices}
          includeStock={includeStock}
          setIncludeStock={setIncludeStock}
          includeDescriptions={includeDescriptions}
          setIncludeDescriptions={setIncludeDescriptions}
          includeImages={includeImages}
          setIncludeImages={setIncludeImages}
        />

        {/* Product Selection */}

        {/* Generate Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            selectedProducts.length === 0 && styles.disabledButton
          ]}
          onPress={generateCatalog}
          disabled={selectedProducts.length === 0 || generating}
        >
          {generating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.generateButtonText}>
              🚀 Générer et Partager
            </Text>
          )}
        </TouchableOpacity>

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
    padding: 20,
    paddingTop: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.neutral[600],
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
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    marginBottom: 20,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  selectionSummary: {
    backgroundColor: theme.colors.primary[50],
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
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
    backgroundColor: theme.colors.neutral[200],
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    fontWeight: '500',
  },
  selectionCount: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
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
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
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
  productPrice: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
    marginTop: 4,
  },
  productStock: {
    fontSize: 14,
    color: '#fd7e14',
    fontWeight: '500',
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 18,
    color: theme.colors.primary[500],
    fontWeight: 'bold',
  },
  generateButton: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: theme.colors.neutral[400],
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewContainer: {
    flex: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  previewTitleContainer: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  webview: {
    flex: 1,
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  previewInfo: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 400,
    width: '100%',
  },
  previewInfoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  previewInfoSubtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  previewDetails: {
    width: '100%',
    marginBottom: 24,
  },
  previewDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.primary[50],
    borderRadius: 8,
    marginBottom: 8,
  },
  previewDetailText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    marginLeft: 12,
    fontWeight: '500',
  },
  previewInfoNote: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  previewActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  previewActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
    minHeight: 48,
  },
  shareButton: {
    backgroundColor: theme.colors.primary[500],
  },
  printButton: {
    backgroundColor: theme.colors.success[500],
  },
  downloadButton: {
    backgroundColor: theme.colors.warning[500],
  },
  previewActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
});

export default CatalogPDFScreen;
