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
  description: string;
  purchase_price: string;
  selling_price: string;
  quantity: string;
  alert_threshold: string;
  category_id: string;
  brand_id: string;
  image?: any;
  scan_field: string;  // Champ pour le code-barres EAN (optionnel)
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
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [brandModalVisible, setBrandModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandDescription, setNewBrandDescription] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    purchase_price: '',
    selling_price: '',
    quantity: '',
    alert_threshold: '5',
    category_id: '',
    brand_id: '',
    image: undefined,
    scan_field: '',
    is_active: true,
  });

  useEffect(() => {
    loadFormData();
  }, []);

  // Surveiller les changements du formulaire
  useEffect(() => {
    // Formulaire surveillé
  }, [form]);

  // Surveiller spécifiquement le champ barcode
  useEffect(() => {
    // Champ barcode surveillé
  }, [form?.scan_field]);

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
        
        // Ensure all fields have safe fallback values
        setForm({
          name: p?.name || '',
          description: p?.description || '',
          purchase_price: p?.purchase_price ? String(p.purchase_price) : '',
          selling_price: p?.selling_price ? String(p.selling_price) : '',
          quantity: p?.quantity ? String(p.quantity) : '',
          alert_threshold: p?.alert_threshold ? String(p.alert_threshold) : '5',
          category_id: p?.category?.id ? String(p.category.id) : '',
          brand_id: p?.brand?.id ? String(p.brand.id) : '',
          image: p?.image_url ? { uri: p.image_url, type: 'image/jpeg', fileName: 'existing_image.jpg' } : undefined,
          scan_field: p?.barcode || '',
          is_active: p?.is_active ?? true,
        });
        

      } catch (e) {
        console.error('❌ Erreur lors du chargement pour édition:', e);
        // Reset form to initial state on error
        setForm(prev => ({
          name: '',
          description: '',
          purchase_price: '',
          selling_price: '',
          quantity: '',
          alert_threshold: '5',
          category_id: '',
          brand_id: '',
          image: undefined,
          scan_field: '',
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
      
      // Ensure we have arrays even if the API returns unexpected data
      const categoriesArray = Array.isArray(categoriesData?.results) ? categoriesData.results : 
                            Array.isArray(categoriesData) ? categoriesData : [];
      const brandsArray = Array.isArray(brandsData?.results) ? brandsData.results : 
                         Array.isArray(brandsData) ? brandsData : [];
      
      setCategories(categoriesArray);
      setBrands(brandsArray);
    } catch (error: any) {
      console.error('❌ Erreur chargement données:', error);
      Alert.alert('Erreur', 'Impossible de charger les catégories et marques');
      // Set empty arrays on error to prevent crashes
      setCategories([]);
      setCategories([]);
    } finally {
      setLoadingData(false);
    }
  };

  // Fonction pour créer rapidement une catégorie
  const createCategoryQuick = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Erreur', 'Le nom de la catégorie est requis');
      return;
    }

    try {
      setCreatingCategory(true);
      const newCategory = await categoryService.createCategory({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim(),
      });
      
      // Ajouter la nouvelle catégorie à la liste
      setCategories(prev => [...prev, newCategory]);
      
      // Sélectionner automatiquement la nouvelle catégorie
      setForm(prev => ({ ...prev, category_id: String(newCategory.id) }));
      
      // Fermer le modal et réinitialiser
      setCategoryModalVisible(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
      
      Alert.alert('Succès', 'Catégorie créée et sélectionnée !');
    } catch (error) {
      console.error('❌ Erreur création catégorie:', error);
      Alert.alert('Erreur', 'Impossible de créer la catégorie');
    } finally {
      setCreatingCategory(false);
    }
  };

  // Fonction pour créer rapidement une marque
  const createBrandQuick = async () => {
    if (!newBrandName.trim()) {
      Alert.alert('Erreur', 'Le nom de la marque est requis');
      return;
    }

    try {
      setCreatingBrand(true);
      const newBrand = await brandService.createBrand({
        name: newBrandName.trim(),
        description: newBrandDescription.trim(),
      });
      
      // Ajouter la nouvelle marque à la liste
      setBrands(prev => [...prev, newBrand]);
      
      // Sélectionner automatiquement la nouvelle marque
      setForm(prev => ({ ...prev, brand_id: String(newBrand.id) }));
      
      // Fermer le modal et réinitialiser
      setBrandModalVisible(false);
      setNewBrandName('');
      setNewBrandDescription('');
      
      Alert.alert('Succès', 'Marque créée et sélectionnée !');
    } catch (error) {
      console.error('❌ Erreur création marque:', error);
      Alert.alert('Erreur', 'Impossible de créer la marque');
    } finally {
      setCreatingBrand(false);
    }
  };

  const updateForm = useCallback((field: keyof ProductForm, value: string | boolean) => {
    setForm(prev => {
      if (!prev) {
        // Fallback to initial form state if prev is undefined
        return {
          name: '',
          description: '',
          purchase_price: '',
          selling_price: '',
          quantity: '',
          alert_threshold: '5',
          category_id: '',
          brand_id: '',
          image: undefined,
          scan_field: '',
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

      if (form.image) {
        productData.image = {
          uri: form.image.uri,
          name: form.image.fileName || 'product.jpg',
          type: form.image.type || 'image/jpeg',
        };
      }

      if (form.scan_field?.trim()) {
        productData.barcode = form.scan_field.trim();
      }

      if (editId) {
        // Modification d'un produit existant
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
        // Création d'un nouveau produit
        const newProduct = await productService.createProduct(productData);
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
    } catch (error: any) {
      console.error('❌ Erreur produit:', error);
      
      let errorMessage = '';
      let errorTitle = 'Erreur';
      
      // Gestion spécifique des erreurs d'upload d'images
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
      description: '',
      purchase_price: '',
      selling_price: '',
      quantity: '',
      alert_threshold: '5',
      category_id: '',
      brand_id: '',
      image: undefined,
      scan_field: '',
      is_active: true,
    }));
  };

    // Les fonctions de gestion d'images sont maintenant gérées par le hook useImageManager

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

  const PickerField = ({ 
    label, 
    value, 
    onValueChange, 
    items, 
    placeholder,
    required = false,
    showAddButton = false,
    onAddPress = () => {}
  }: any) => (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        {showAddButton && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={onAddPress}
          >
            <Ionicons name="add-circle" size={20} color={theme.colors.primary[500]} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          style={styles.picker}
        >
          <Picker.Item label={placeholder} value="" />
          {items && Array.isArray(items) ? items.map((item: any) => (
            <Picker.Item 
              key={item.id} 
              label={item.name} 
              value={item.id.toString()} 
            />
          )) : null}
        </Picker>
      </View>
    </View>
  );

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

  // Safety check: ensure form is defined before rendering
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          <Text style={styles.title}>{editId ? 'Modifier le produit' : 'Nouveau Produit'}</Text>
            <TouchableOpacity onPress={resetForm} disabled={loading}>
              <Ionicons name="refresh" size={24} color={theme.colors.primary[500]} />
            </TouchableOpacity>
          </View>

          {/* Formulaire */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Informations générales</Text>

            {/* Image */}
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

            {/* Actif / Inactif */}
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

            <FormField
              label="Description"
              value={form.description}
              onChangeText={(value: string) => updateForm('description', value)}
              placeholder="Description du produit (optionnel)"
              multiline
            />

            <PickerField
              label="Catégorie"
              value={form.category_id}
              onValueChange={(value: string) => updateForm('category_id', value)}
              items={categories}
              placeholder="Sélectionner une catégorie"
              showAddButton={true}
              onAddPress={() => setCategoryModalVisible(true)}
            />

            <PickerField
              label="Marque"
              value={form.brand_id}
              onValueChange={(value: string) => updateForm('brand_id', value)}
              items={brands}
              placeholder="Sélectionner une marque"
              showAddButton={true}
              onAddPress={() => setBrandModalVisible(true)}
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

            <FormField
              label="Code-barres EAN (optionnel)"
              value={form.scan_field}
              onChangeText={(value: string) => updateForm('scan_field', value)}
              placeholder="Ex: 3017620422003"
              keyboardType="numeric"
            />

            {/* Bouton de soumission */}
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

      {/* Modal pour créer rapidement une catégorie */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={categoryModalVisible}
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.quickModalOverlay}>
          <View style={styles.quickModalContent}>
            <View style={styles.quickModalHeader}>
              <Text style={styles.quickModalTitle}>Nouvelle Catégorie</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.quickModalBody}>
              <View style={styles.quickInputContainer}>
                <Text style={styles.quickInputLabel}>Nom de la catégorie *</Text>
                <TextInput
                  style={styles.quickTextInput}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Ex: Électronique, Vêtements..."
                  autoFocus
                />
              </View>

              <View style={styles.quickInputContainer}>
                <Text style={styles.quickInputLabel}>Description (optionnel)</Text>
                <TextInput
                  style={[styles.quickTextInput, styles.quickTextArea]}
                  value={newCategoryDescription}
                  onChangeText={setNewCategoryDescription}
                  placeholder="Description de la catégorie..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={styles.quickModalFooter}>
              <TouchableOpacity 
                style={styles.quickCancelButton} 
                onPress={() => setCategoryModalVisible(false)}
              >
                <Text style={styles.quickCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickSaveButton} 
                onPress={createCategoryQuick}
                disabled={creatingCategory}
              >
                {creatingCategory ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.quickSaveButtonText}>Créer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal pour créer rapidement une marque */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={brandModalVisible}
        onRequestClose={() => setBrandModalVisible(false)}
      >
        <View style={styles.quickModalOverlay}>
          <View style={styles.quickModalContent}>
            <View style={styles.quickModalHeader}>
              <Text style={styles.quickModalTitle}>Nouvelle Marque</Text>
              <TouchableOpacity onPress={() => setBrandModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.quickModalBody}>
              <View style={styles.quickInputContainer}>
                <Text style={styles.quickInputLabel}>Nom de la marque *</Text>
                <TextInput
                  style={styles.quickTextInput}
                  value={newBrandName}
                  onChangeText={setNewBrandName}
                  placeholder="Ex: Apple, Samsung, Nike..."
                  autoFocus
                />
              </View>

              <View style={styles.quickInputContainer}>
                <Text style={styles.quickInputLabel}>Description (optionnel)</Text>
                <TextInput
                  style={[styles.quickTextInput, styles.quickTextArea]}
                  value={newBrandDescription}
                  onChangeText={setNewBrandDescription}
                  placeholder="Description de la marque..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={styles.quickModalFooter}>
              <TouchableOpacity 
                style={styles.quickCancelButton} 
                onPress={() => setBrandModalVisible(false)}
              >
                <Text style={styles.quickCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickSaveButton} 
                onPress={createBrandQuick}
                disabled={creatingBrand}
              >
                {creatingBrand ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.quickSaveButtonText}>Créer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  
  // Styles pour les modals
  quickModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickModalContent: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  quickModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  quickModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  quickModalBody: {
    padding: 20,
  },
  quickInputContainer: {
    marginBottom: 20,
  },
  quickInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  quickTextInput: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.text.primary,
  },
  quickTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  quickModalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  quickCancelButton: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.neutral[200],
    alignItems: 'center',
  },
  quickCancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  quickSaveButton: {
    flex: 1,
    padding: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primary[500],
    alignItems: 'center',
  },
  quickSaveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.inverse,
  },
});
