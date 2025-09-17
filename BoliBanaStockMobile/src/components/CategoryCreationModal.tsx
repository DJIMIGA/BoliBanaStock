import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { categoryService } from '../services/api';
import theme from '../utils/theme';

interface CategoryCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onCategoryCreated: (newCategory: any) => void;
}

interface RayonType {
  value: string;
  label: string;
}

const RAYON_TYPES: RayonType[] = [
  { value: 'frais_libre_service', label: 'Frais Libre Service' },
  { value: 'rayons_traditionnels', label: 'Rayons Traditionnels' },
  { value: 'epicerie', label: 'Épicerie' },
  { value: 'petit_dejeuner', label: 'Petit-déjeuner' },
  { value: 'tout_pour_bebe', label: 'Tout pour bébé' },
  { value: 'liquides', label: 'Liquides, Boissons' },
  { value: 'non_alimentaire', label: 'Non Alimentaire' },
  { value: 'dph', label: 'DPH (Droguerie, Parfumerie, Hygiène)' },
  { value: 'textile', label: 'Textile' },
  { value: 'bazar', label: 'Bazar' },
  { value: 'sante_pharmacie', label: 'Santé et Pharmacie, Parapharmacie' },
  { value: 'jardinage', label: 'Jardinage' },
  { value: 'high_tech', label: 'High-tech, Téléphonie' },
  { value: 'jouets_livres', label: 'Jouets, Jeux Vidéo, Livres' },
  { value: 'meubles_linge', label: 'Meubles, Linge de Maison' },
  { value: 'animalerie', label: 'Animalerie' },
  { value: 'mode_bijoux', label: 'Mode, Bijoux, Bagagerie' },
];

const CategoryCreationModal: React.FC<CategoryCreationModalProps> = ({
  visible,
  onClose,
  onCategoryCreated,
}) => {
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [categoryType, setCategoryType] = useState<'rayon' | 'subcategory'>('rayon');
  const [rayonType, setRayonType] = useState<string>('');
  const [parentCategoryId, setParentCategoryId] = useState<string>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRayons, setLoadingRayons] = useState(false);
  const [parentCategories, setParentCategories] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      loadParentCategories();
      // Reset form when modal opens
      setStep('type');
      setCategoryType('rayon');
      setRayonType('');
      setParentCategoryId('');
      setName('');
      setDescription('');
      setIsGlobal(false);
    }
  }, [visible]);

  const loadParentCategories = async () => {
    setLoadingRayons(true);
    try {
      console.log('🔄 Chargement des rayons parents...');
      const response = await categoryService.getRayons();
      console.log('📡 Réponse rayons:', response);
      
      if (response.success && response.rayons) {
        setParentCategories(response.rayons);
        console.log('✅ Rayons parents chargés:', response.rayons.length);
      } else {
        console.warn('⚠️ Aucun rayon trouvé dans la réponse');
        setParentCategories([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des rayons parents:', error);
      setParentCategories([]);
    } finally {
      setLoadingRayons(false);
    }
  };

  const handleNext = () => {
    if (step === 'type') {
      if (categoryType === 'rayon') {
        if (!rayonType) {
          Alert.alert('Erreur', 'Veuillez sélectionner un type de rayon');
          return;
        }
      } else {
        if (!parentCategoryId) {
          Alert.alert('Erreur', 'Veuillez sélectionner un rayon parent');
          return;
        }
      }
      setStep('details');
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom de la catégorie est requis');
      return;
    }

    setLoading(true);
    try {
      const categoryData: any = {
        name: name.trim(),
        description: description.trim() || null,
        is_global: isGlobal,
        is_rayon: categoryType === 'rayon',
      };

      if (categoryType === 'rayon') {
        categoryData.rayon_type = rayonType;
      } else {
        categoryData.parent = parseInt(parentCategoryId);
        categoryData.rayon_type = parentCategories.find(p => p.id === parseInt(parentCategoryId))?.rayon_type;
      }

      console.log('📤 Données envoyées:', categoryData);
      const response = await categoryService.createCategory(categoryData);
      console.log('📥 Réponse reçue:', response);
      
      // L'API Django REST retourne directement l'objet créé, pas de structure {success, data}
      if (response && response.id) {
        Alert.alert('Succès', 'Catégorie créée avec succès');
        onCategoryCreated(response);
        onClose();
      } else {
        console.warn('⚠️ Réponse inattendue:', response);
        Alert.alert('Erreur', 'Réponse inattendue du serveur');
      }
    } catch (error: any) {
      console.error('❌ Erreur création catégorie:', error);
      
      // Gestion des erreurs détaillée
      let errorMessage = 'Erreur lors de la création de la catégorie';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('type');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={step === 'type' ? onClose : handleBack} style={styles.headerButton}>
            <Ionicons 
              name={step === 'type' ? 'close' : 'arrow-back'} 
              size={24} 
              color={theme.colors.primary[500]} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 'type' ? 'Type de catégorie' : 'Détails de la catégorie'}
          </Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'type' ? (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Choisissez le type de catégorie</Text>
              
              {/* Type de catégorie */}
              <View style={styles.typeContainer}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    categoryType === 'rayon' && styles.typeOptionSelected
                  ]}
                  onPress={() => setCategoryType('rayon')}
                >
                  <View style={styles.typeOptionIcon}>
                    <Ionicons 
                      name="storefront" 
                      size={28} 
                      color={categoryType === 'rayon' ? 'white' : theme.colors.primary[500]} 
                    />
                  </View>
                  <View style={styles.typeOptionContent}>
                    <Text style={[
                      styles.typeOptionTitle,
                      categoryType === 'rayon' && styles.typeOptionTitleSelected
                    ]}>
                      Rayon principal
                    </Text>
                    <Text style={[
                      styles.typeOptionDescription,
                      categoryType === 'rayon' && styles.typeOptionDescriptionSelected
                    ]}>
                      Créer un nouveau rayon de supermarché
                    </Text>
                  </View>
                  <View style={[
                    styles.typeOptionCheckbox,
                    categoryType === 'rayon' && styles.typeOptionCheckboxSelected
                  ]}>
                    {categoryType === 'rayon' && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    categoryType === 'subcategory' && styles.typeOptionSelected
                  ]}
                  onPress={() => setCategoryType('subcategory')}
                >
                  <View style={styles.typeOptionIcon}>
                    <Ionicons 
                      name="folder" 
                      size={28} 
                      color={categoryType === 'subcategory' ? 'white' : theme.colors.primary[500]} 
                    />
                  </View>
                  <View style={styles.typeOptionContent}>
                    <Text style={[
                      styles.typeOptionTitle,
                      categoryType === 'subcategory' && styles.typeOptionTitleSelected
                    ]}>
                      Sous-catégorie
                    </Text>
                    <Text style={[
                      styles.typeOptionDescription,
                      categoryType === 'subcategory' && styles.typeOptionDescriptionSelected
                    ]}>
                      Ajouter une sous-catégorie à un rayon existant
                    </Text>
                  </View>
                  <View style={[
                    styles.typeOptionCheckbox,
                    categoryType === 'subcategory' && styles.typeOptionCheckboxSelected
                  ]}>
                    {categoryType === 'subcategory' && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Sélection du type de rayon */}
              {categoryType === 'rayon' && (
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <Ionicons name="list" size={20} color={theme.colors.primary[500]} />
                    <Text style={styles.pickerLabel}>Type de rayon *</Text>
                  </View>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={rayonType}
                      onValueChange={setRayonType}
                      style={styles.picker}
                    >
                      <Picker.Item label="Sélectionnez un type de rayon" value="" />
                      {RAYON_TYPES.map((type) => (
                        <Picker.Item
                          key={type.value}
                          label={type.label}
                          value={type.value}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}

              {/* Sélection du rayon parent */}
              {categoryType === 'subcategory' && (
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <Ionicons name="folder-open" size={20} color={theme.colors.primary[500]} />
                    <Text style={styles.pickerLabel}>Rayon parent *</Text>
                    {loadingRayons && (
                      <ActivityIndicator size="small" color={theme.colors.primary[500]} style={{ marginLeft: 8 }} />
                    )}
                  </View>
                  <View style={styles.pickerWrapper}>
                    {loadingRayons ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
                        <Text style={styles.loadingText}>Chargement des rayons...</Text>
                      </View>
                    ) : (
                      <Picker
                        selectedValue={parentCategoryId}
                        onValueChange={setParentCategoryId}
                        style={styles.picker}
                      >
                        <Picker.Item label="Sélectionnez un rayon parent" value="" />
                        {parentCategories.map((category) => (
                          <Picker.Item
                            key={category.id}
                            label={`${category.name} (${category.subcategories_count || 0} sous-catégories)`}
                            value={category.id.toString()}
                          />
                        ))}
                      </Picker>
                    )}
                  </View>
                  {!loadingRayons && parentCategories.length === 0 && (
                    <Text style={styles.errorText}>
                      Aucun rayon disponible. Créez d'abord un rayon principal.
                    </Text>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.nextButton,
                  ((categoryType === 'rayon' && !rayonType) || 
                   (categoryType === 'subcategory' && !parentCategoryId)) && styles.nextButtonDisabled
                ]}
                onPress={handleNext}
                disabled={(categoryType === 'rayon' && !rayonType) || 
                         (categoryType === 'subcategory' && !parentCategoryId)}
              >
                <View style={styles.nextButtonContent}>
                  <Text style={styles.nextButtonText}>Continuer</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Détails de la catégorie</Text>
              
              {/* Nom */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nom de la catégorie *</Text>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Entrez le nom de la catégorie"
                  placeholderTextColor={theme.colors.text.secondary}
                />
              </View>

              {/* Description */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Description de la catégorie (optionnel)"
                  placeholderTextColor={theme.colors.text.secondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Catégorie globale */}
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Catégorie globale</Text>
                <Switch
                  value={isGlobal}
                  onValueChange={setIsGlobal}
                  trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary[500] }}
                  thumbColor={isGlobal ? 'white' : theme.colors.text.secondary}
                />
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.createButton, loading && styles.createButtonDisabled]}
                  onPress={handleCreate}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Text style={styles.createButtonText}>Créer</Text>
                      <Ionicons name="checkmark" size={20} color="white" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.primary[200],
    backgroundColor: theme.colors.primary[50],
    shadowColor: theme.colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary[500],
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: theme.colors.background.secondary,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary[500],
    marginBottom: 32,
    textAlign: 'center',
    textShadowColor: theme.colors.primary[100],
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  typeContainer: {
    marginBottom: 24,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background.primary,
    shadowColor: theme.colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  typeOptionSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[500],
    shadowColor: theme.colors.primary[500],
    shadowOpacity: 0.4,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  typeOptionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    borderWidth: 2,
    borderColor: theme.colors.primary[200],
  },
  typeOptionContent: {
    flex: 1,
  },
  typeOptionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 6,
  },
  typeOptionTitleSelected: {
    color: 'white',
  },
  typeOptionDescription: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    fontWeight: '500',
  },
  typeOptionDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  typeOptionCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: theme.colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  typeOptionCheckboxSelected: {
    borderColor: 'white',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  pickerContainer: {
    marginBottom: 24,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary[500],
    marginLeft: 8,
  },
  pickerWrapper: {
    borderWidth: 3,
    borderColor: theme.colors.primary[200],
    borderRadius: 16,
    backgroundColor: theme.colors.background.primary,
    shadowColor: theme.colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  picker: {
    height: 50,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary[500],
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 3,
    borderColor: theme.colors.primary[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.primary,
    shadowColor: theme.colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 24,
  },
  switchLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary[500],
  },
  nextButton: {
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 32,
    shadowColor: theme.colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonDisabled: {
    backgroundColor: theme.colors.text.secondary,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  nextButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: theme.colors.neutral[300],
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: theme.colors.background.primary,
  },
  cancelButtonText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginLeft: 16,
    shadowColor: theme.colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonDisabled: {
    backgroundColor: theme.colors.text.secondary,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.error[500],
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default CategoryCreationModal;
