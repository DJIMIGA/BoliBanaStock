import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { productService, categoryService, brandService } from '../services/api';
import { useImageManager } from '../hooks';
import theme from '../utils/theme';
import BarcodeModal from '../components/BarcodeModal';
import HierarchicalCategorySelector from '../components/HierarchicalCategorySelector';
import AddBrandModal from '../components/AddBrandModal';
import BrandFilterField from '../components/BrandFilterField';

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface Brand {
  id: number;
  name: string;
  description?: string;
}

interface ProductForm {
  name: string;
  cug: string;
  description: string;
  purchase_price: string;
  selling_price: string;
  quantity: string;
  alert_threshold: string;
  category_id: string;
  brand_id: string;
  image?: any;
  barcodes: Array<{
    id: number;
    ean: string;
    is_primary: boolean;
    notes?: string;
  }>;
  is_active: boolean;
}

export default function AddProductScreen({ navigation, route }: any) {
  const editId = route?.params?.editId as number | undefined;
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Hook personnalisé pour la gestion des images
  const { selectedImage, isProcessing, showImageOptions } = useImageManager();
  
  // États pour les modals de création rapide
  const [hierarchicalCategoryModalVisible, setHierarchicalCategoryModalVisible] = useState(false);
  const [addBrandModalVisible, setAddBrandModalVisible] = useState(false);
  const [barcodeModalVisible, setBarcodeModalVisible] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [form, setForm] = useState<ProductForm>({
    name: '',
    cug: '',
    description: '',
    purchase_price: '',
    selling_price: '',
    quantity: '',
    alert_threshold: '5',
    category_id: '',
    brand_id: '',
    image: undefined,
    barcodes: [],
    is_active: true,
  });

  useEffect(() => {
    loadFormData();
  }, []);

  // Surveiller les changements du formulaire
  useEffect(() => {
    // Formulaire surveillé
  }, [form]);

  // Surveiller spécifiquement le champ barcodes
  useEffect(() => {
    // Champ barcodes surveillé
  }, [form?.barcodes]);

  // Synchroniser l'image sélectionnée avec le formulaire
  useEffect(() => {
    if (selectedImage) {
      setForm(prev => ({ ...prev, image: selectedImage }));
    }
  }, [selectedImage]);

  useEffect(() => {
    const loadForEdit = async () => {
      if (!editId) return;
      try {
        const p = await productService.getProduct(editId);
        
        setForm({
          name: p?.name || '',
          cug: p?.cug || '',
          description: p?.description || '',
          purchase_price: p?.purchase_price ? String(p.purchase_price) : '',
          selling_price: p?.selling_price ? String(p.selling_price) : '',
          quantity: p?.quantity ? String(p.quantity) : '',
          alert_threshold: p?.alert_threshold ? String(p.alert_threshold) : '5',
          category_id: p?.category?.id ? String(p.category.id) : '',
          brand_id: p?.brand?.id ? String(p.brand.id) : '',
          image: p?.image_url ? { uri: p.image_url, type: 'image/jpeg', fileName: 'existing_image.jpg' } : undefined,
          barcodes: p?.barcodes || [],
          is_active: p?.is_active ?? true,
        });
        

      } catch (e) {
        console.error('❌ Erreur lors du chargement pour édition:', e);
        setForm(prev => ({
          name: '',
          cug: '',
          description: '',
          purchase_price: '',
          selling_price: '',
          quantity: '',
          alert_threshold: '5',
          category_id: '',
          brand_id: '',
          image: undefined,
          barcodes: [],
          is_active: true,
        }));
      }
    };
    loadForEdit();
  }, [editId]);

  const loadFormData = async () => {
    try {
      setLoadingData(true);
      const [categoriesData, brandsData] = await Promise.all([
        categoryService.getCategories(),
        brandService.getBrands(),
      ]);
      
      const categoriesArray = Array.isArray(categoriesData?.results) ? categoriesData.results : 
                            Array.isArray(categoriesData) ? categoriesData : [];
      const brandsArray = Array.isArray(brandsData?.results) ? brandsData.results : 
                         Array.isArray(brandsData) ? brandsData : [];
      
      setCategories(categoriesArray);
      setBrands(brandsArray);
    } catch (error: any) {
      console.error('❌ Erreur chargement données:', error);
      Alert.alert('Erreur', 'Impossible de charger les catégories et marques');
      setCategories([]);
      setBrands([]);
    } finally {
      setLoadingData(false);
    }
  };

  // Fonction pour gérer la sélection hiérarchisée
  const handleHierarchicalCategorySelect = (categoryId: string, categoryName: string) => {
    setForm(prev => ({ ...prev, category_id: categoryId }));
    setSelectedCategoryName(categoryName);
    setHierarchicalCategoryModalVisible(false);
  };



  // Fonction pour gérer l'ajout d'une nouvelle marque
  const handleBrandAdded = (newBrand: Brand) => {
    setBrands(prev => [...prev, newBrand]);
    setForm(prev => ({ ...prev, brand_id: String(newBrand.id) }));
    setAddBrandModalVisible(false);
    Alert.alert('Succès', 'Marque créée et sélectionnée !');
  };

    // Fonction pour générer un CUG aléatoire à 5 chiffres
  const generateRandomCUG = (): string => {
    const min = 10000;
    const max = 99999;
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  };

  const updateForm = useCallback((field: keyof ProductForm, value: string | boolean) => {
    setForm(prev => {
      if (!prev) {
        return {
          name: '',
          cug: '',
          description: '',
          purchase_price: '',
          selling_price: '',
          quantity: '',
          alert_threshold: '5',
          category_id: '',
          brand_id: '',
          image: undefined,
          barcodes: [],
          is_active: true,
        };
      }
      return { ...prev, [field]: value };
    });
  }, []);

  const validateForm = (): boolean => {
    if (!form) {
      console.error('❌ Formulaire non défini dans validateForm');
      return false;
    }
    
    if (!form.name.trim()) {
      Alert.alert('Erreur', 'Le nom du produit est requis');
      return false;
    }



    if (!form.purchase_price || parseFloat(form.purchase_price) < 0) {
      Alert.alert('Erreur', 'Le prix d\'achat doit être positif');
      return false;
    }

    if (!form.selling_price || parseFloat(form.selling_price) < 0) {
      Alert.alert('Erreur', 'Le prix de vente doit être positif');
      return false;
    }

    if (parseFloat(form.selling_price) < parseFloat(form.purchase_price)) {
      Alert.alert('Erreur', 'Le prix de vente ne peut pas être inférieur au prix d\'achat');
      return false;
    }

    if (!form.quantity || parseInt(form.quantity) < 0) {
      Alert.alert('Erreur', 'La quantité doit être positive');
      return false;
    }

    if (!form.alert_threshold || parseInt(form.alert_threshold) < 0) {
      Alert.alert('Erreur', 'Le seuil d\'alerte doit être positif');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!form) {
      console.error('❌ Formulaire non défini dans handleSubmit');
      Alert.alert('Erreur', 'Erreur interne: formulaire non défini');
      return;
    }
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const productData: any = {
        name: form.name.trim(),
        description: form.description.trim(),
        purchase_price: parseInt(form.purchase_price),
        selling_price: parseInt(form.selling_price),
        quantity: parseInt(form.quantity),
        alert_threshold: parseInt(form.alert_threshold),
        category: form.category_id ? parseInt(form.category_id) : null,
        brand: form.brand_id ? parseInt(form.brand_id) : null,
        is_active: form.is_active,
      };

      if (form.cug.trim()) {
        productData.cug = form.cug.trim();
      }

      if (form.image) {
        productData.image = {
          uri: form.image.uri,
          name: form.image.fileName || 'product.jpg',
          type: form.image.type || 'image/jpeg',
        };
      }

      if (form.barcodes && form.barcodes.length > 0) {
        productData.barcodes = form.barcodes;
      }

      if (editId) {
        await productService.updateProduct(editId, productData);
        Alert.alert(
          'Succès',
          'Produit modifié avec succès',
          [
            {
              text: 'Voir le produit',
              onPress: () => navigation.navigate('ProductDetail', { productId: editId })
            },
            {
              text: 'Continuer',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        const newProduct = await productService.createProduct(productData);
        
        // Vérifier si l'image a été uploadée avec succès
        if (newProduct.image_uploaded === false && newProduct.image_error) {
          Alert.alert(
            'Produit créé avec succès',
            newProduct.image_error,
            [
              {
                text: 'Voir le produit',
                onPress: () => navigation.navigate('ProductDetail', { productId: newProduct.id })
              },
              {
                text: 'Ajouter un autre',
                onPress: () => resetForm()
              }
            ]
          );
        } else {
          Alert.alert(
            'Succès',
            'Produit ajouté avec succès',
            [
              {
                text: 'Voir le produit',
                onPress: () => navigation.navigate('ProductDetail', { productId: newProduct.id })
              },
              {
                text: 'Ajouter un autre',
                onPress: () => resetForm()
              }
            ]
          );
        }
      }
    } catch (error: any) {
      console.error('❌ Erreur produit:', error);
      
      let errorMessage = '';
      let errorTitle = 'Erreur';
      
      if (error.message?.includes('connexion réseau')) {
        errorTitle = 'Erreur de Connexion';
        errorMessage = 'Vérifiez votre connexion internet et que le serveur est accessible.';
      } else if (error.message?.includes('Image trop volumineuse')) {
        errorTitle = 'Image Trop Volumineuse';
        errorMessage = 'L\'image est trop lourde. Réduisez sa taille ou choisissez une image plus légère.';
      } else if (error.message?.includes('Données invalides')) {
        errorTitle = 'Données Incorrectes';
        errorMessage = error.message;
      } else if (error.response?.status === 413) {
        errorTitle = 'Image Trop Volumineuse';
        errorMessage = 'L\'image dépasse la taille maximale autorisée.';
      } else if (error.response?.status === 400) {
        errorTitle = 'Données Incorrectes';
        errorMessage = error.response?.data?.detail || 
                      error.response?.data?.message || 
                      'Vérifiez les informations saisies.';
      } else if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        errorTitle = 'Erreur de Connexion';
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion réseau.';
      } else {
        errorMessage = error.response?.data?.detail || 
                      error.response?.data?.message || 
                      error.message ||
                      (editId ? 'Erreur lors de la modification du produit' : 'Erreur lors de la création du produit');
      }
      
      Alert.alert(errorTitle, errorMessage, [
        { text: 'OK' },
        { 
          text: 'Réessayer', 
          onPress: () => handleSubmit()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(prev => ({
      name: '',
      cug: '',
      description: '',
      purchase_price: '',
      selling_price: '',
      quantity: '',
      alert_threshold: '5',
      category_id: '',
      brand_id: '',
      image: undefined,
      barcodes: [],
      is_active: true,
    }));
  };

  // ✅ Fonction pour gérer la mise à jour des codes-barres
  const handleBarcodesUpdate = (updatedBarcodes: any[]) => {
    setForm(prev => ({
      ...prev,
      barcodes: updatedBarcodes
    }));
  };



  const FormField = useCallback(({ 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    keyboardType = 'default',
    multiline = false,
    required = false 
  }: any) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        style={[styles.textInput, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoCapitalize="none"
        autoCorrect={false}
        blurOnSubmit={false}
        returnKeyType="next"
        enablesReturnKeyAutomatically={true}
        contextMenuHidden={false}
        selectTextOnFocus={false}
      />
    </View>
  ), []);


  if (loadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Chargement des données...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!form) {
    console.error('❌ Formulaire non défini dans le render');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Initialisation du formulaire...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          <Text style={styles.title}>{editId ? 'Modifier le produit' : 'Nouveau Produit'}</Text>
            <TouchableOpacity onPress={resetForm} disabled={loading}>
              <Ionicons name="refresh" size={24} color={theme.colors.primary[500]} />
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Informations générales</Text>

            <View style={styles.imageRow}>
              <TouchableOpacity 
                style={[styles.imagePicker, isProcessing && styles.imagePickerDisabled]} 
                onPress={showImageOptions}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                ) : (
                  <Ionicons name="camera-outline" size={20} color={theme.colors.primary[500]} />
                )}
                <Text style={styles.imagePickerText}>
                  {isProcessing ? 'Traitement...' : (form.image ? 'Changer l\'image' : 'Ajouter une image')}
                </Text>
              </TouchableOpacity>
              {form.image ? (
                <Image source={{ uri: form.image.uri }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholderSmall}>
                  <Ionicons name="image" size={20} color={theme.colors.neutral[400]} />
                </View>
              )}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Activer le produit</Text>
              <TouchableOpacity
                accessibilityRole="switch"
                onPress={() => updateForm('is_active', !form.is_active)}
                style={[styles.toggle, form.is_active && styles.toggleOn]}
              >
                <View style={[styles.knob, form.is_active && styles.knobOn]} />
              </TouchableOpacity>
            </View>
            
            <FormField
              label="Nom du produit"
              value={form.name}
              onChangeText={(value: string) => updateForm('name', value)}
              placeholder="Ex: iPhone 14 Pro"
              required
            />

            <View style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>
                  CUG (Code Unique de Gestion)
                </Text>
                <TouchableOpacity 
                  style={styles.generateCugButton}
                  onPress={() => updateForm('cug', generateRandomCUG())}
                >
                  <Ionicons name="refresh" size={16} color={theme.colors.primary[500]} />
                  <Text style={styles.generateCugButtonText}>Générer</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.textInput}
                value={form.cug}
                onChangeText={(value: string) => updateForm('cug', value)}
                placeholder="Laissé vide pour génération automatique"
                keyboardType="numeric"
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                returnKeyType="next"
                enablesReturnKeyAutomatically={true}
                contextMenuHidden={false}
                selectTextOnFocus={false}
              />
              <Text style={styles.helpText}>
                💡 Le CUG sera généré automatiquement si laissé vide, ou saisissez un code personnalisé
              </Text>
            </View>

            <FormField
              label="Description"
              value={form.description}
              onChangeText={(value: string) => updateForm('description', value)}
              placeholder="Description du produit (optionnel)"
              multiline
            />

            {/* Sélection de catégorie avec options hiérarchisées */}
            <View style={styles.categorySection}>
              <Text style={styles.fieldLabel}>Catégorie</Text>
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setHierarchicalCategoryModalVisible(true)}
              >
                <Text style={[
                  styles.categorySelectorText,
                  !form.category_id && styles.placeholderText
                ]}>
                  {selectedCategoryName || 'Sélectionner une catégorie'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.colors.primary[500]} />
              </TouchableOpacity>
              
            </View>

            <BrandFilterField
              label="Marque"
              value={form.brand_id}
              onValueChange={(value: string) => updateForm('brand_id', value)}
              placeholder="Sélectionner une marque"
              showAddButton={true}
              onAddPress={() => setAddBrandModalVisible(true)}
            />

            <Text style={styles.sectionTitle}>Prix et stock</Text>

            <FormField
              label="Prix d'achat (FCFA)"
              value={form.purchase_price}
              onChangeText={(value: string) => updateForm('purchase_price', value)}
              placeholder="0"
              keyboardType="numeric"
              required
            />

            <FormField
              label="Prix de vente (FCFA)"
              value={form.selling_price}
              onChangeText={(value: string) => updateForm('selling_price', value)}
              placeholder="0"
              keyboardType="numeric"
              required
            />

            <FormField
              label="Quantité en stock"
              value={form.quantity}
              onChangeText={(value: string) => updateForm('quantity', value)}
              placeholder="0"
              keyboardType="numeric"
              required
            />

            <FormField
              label="Seuil d'alerte"
              value={form.alert_threshold}
              onChangeText={(value: string) => updateForm('alert_threshold', value)}
              placeholder="5"
              keyboardType="numeric"
              required
            />

            {/* ✅ Section des codes-barres */}
            <View style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>
                  Codes-barres EAN
                </Text>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => setBarcodeModalVisible(true)}
                >
                  <Ionicons name="barcode-outline" size={20} color={theme.colors.primary[500]} />
                  <Text style={styles.addButtonText}>
                    {form.barcodes && form.barcodes.length > 0 ? 'Gérer' : 'Ajouter'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Affichage des codes-barres existants */}
              {form.barcodes && form.barcodes.length > 0 ? (
                <View style={styles.barcodesDisplay}>
                  {form.barcodes.map((barcode, index) => (
                    <View key={index} style={styles.barcodeItem}>
                      <Text style={styles.barcodeEan}>{barcode.ean}</Text>
                      {barcode.is_primary && (
                        <Text style={styles.primaryBadge}>Principal</Text>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noBarcodeText}>Aucun code-barres ajouté</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="add-circle" size={20} color="white" />
              )}
              <Text style={styles.submitButtonText}>
                {loading ? (editId ? 'Modification...' : 'Création...') : (editId ? 'Enregistrer' : 'Créer le produit')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>


      {/* Modal de création de marque avec rayons */}
      <AddBrandModal
        visible={addBrandModalVisible}
        onClose={() => setAddBrandModalVisible(false)}
        onBrandAdded={handleBrandAdded}
      />

      {/* ✅ Modal de gestion des codes-barres */}
      <BarcodeModal
        visible={barcodeModalVisible}
        onClose={() => setBarcodeModalVisible(false)}
        productId={editId || 0}
        barcodes={form.barcodes || []}
        onBarcodesUpdate={handleBarcodesUpdate}
      />

      {/* Modal de sélection hiérarchisée des catégories */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={hierarchicalCategoryModalVisible}
        onRequestClose={() => setHierarchicalCategoryModalVisible(false)}
      >
        <HierarchicalCategorySelector
          selectedCategoryId={form.category_id}
          onCategorySelect={handleHierarchicalCategorySelect}
          onClose={() => setHierarchicalCategoryModalVisible(false)}
        />
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text.tertiary,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  formContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 15,
    marginTop: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    flex: 1,
  },
  addButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.background.secondary,
  },
  generateCugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  generateCugButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary[500],
    marginLeft: 4,
  },
  helpText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  required: {
    color: theme.colors.error[500],
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: theme.colors.text.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  imagePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.background.primary,
  },
  imagePickerDisabled: {
    opacity: 0.6,
    backgroundColor: theme.colors.neutral[100],
  },
  imagePickerText: {
    color: theme.colors.primary[500],
    fontWeight: '600',
  },
  imagePlaceholderSmall: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.primary,
  },
  imagePreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  toggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e5e7eb',
    padding: 3,
  },
  toggleOn: {
    backgroundColor: theme.colors.success[500],
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    transform: [{ translateX: 0 }],
  },
  knobOn: {
    transform: [{ translateX: 22 }],
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 8,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    padding: 16,
    borderRadius: 8,
    marginTop: 30,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.text.tertiary,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // ✅ Styles pour les codes-barres
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary[500],
    marginLeft: 4,
  },
  barcodesDisplay: {
    marginTop: 8,
  },
  barcodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.secondary,
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  barcodeEan: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  primaryBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary[600],
    backgroundColor: theme.colors.primary[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  noBarcodeText: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  
  // Styles pour la sélection hiérarchisée
  categorySection: {
    marginBottom: 20,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  categorySelectorText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    flex: 1,
  },
  placeholderText: {
    color: theme.colors.text.tertiary,
  },
});
