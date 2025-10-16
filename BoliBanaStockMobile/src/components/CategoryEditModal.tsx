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
import { categoryService, testConnectivity } from '../services/api';
import { Category } from '../types';
import theme from '../utils/theme';

interface CategoryEditModalProps {
  visible: boolean;
  onClose: () => void;
  onCategoryUpdated: (updatedCategory: Category) => void;
  category: Category | null;
  userInfo?: any; // Informations de permissions de l'utilisateur
}

const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  visible,
  onClose,
  onCategoryUpdated,
  category,
  userInfo,
}) => {
  // Normaliser le niveau de permission (compat userInfo direct ou imbriqué)
  const permissionLevel = (userInfo as any)?.permission_level ?? (userInfo as any)?.permissions?.permission_level;
  const isSuperuser = permissionLevel === 'superuser';
  const isGlobalSwitchDisabled = !isSuperuser;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [parent, setParent] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingRayons, setLoadingRayons] = useState(false);
  const [parentCategories, setParentCategories] = useState<any[]>([]);
  const [rayonType, setRayonType] = useState<string>('');

  // Log des permissions pour le bouton isGlobal
  useEffect(() => {
    console.log('🔐 CategoryEditModal - Permissions utilisateur:', {
      userInfo: userInfo,
      permissionLevel,
      isSuperuser,
      canEditGlobal: isSuperuser,
      categoryId: category?.id,
      categoryName: category?.name
    });
    console.log('🔐 CategoryEditModal - isGlobal switch disabled?', { isGlobalSwitchDisabled });
  }, [userInfo, category]);

  const RAYON_TYPES = [
    { value: 'frais_libre_service', label: 'Frais Libre Service' },
    { value: 'rayons_traditionnels', label: 'Rayons Traditionnels' },
    { value: 'epicerie', label: 'Épicerie' },
    { value: 'petit_dejeuner', label: 'Petit-déjeuner' },
    { value: 'tout_pour_bebe', label: 'Tout pour bébé' },
    { value: 'liquides', label: 'Liquides' },
    { value: 'non_alimentaire', label: 'Non Alimentaire' },
    { value: 'dph', label: 'DPH' },
    { value: 'textile', label: 'Textile' },
    { value: 'bazar', label: 'Bazar' },
  ];

  useEffect(() => {
    if (visible && category) {
      
      setName(category.name || '');
      setDescription(category.description || '');
      // Utiliser la valeur exacte de la catégorie en base de données
      const initialIsGlobal = !!category.is_global;
      setIsGlobal(initialIsGlobal);
      setRayonType(((category as any).rayon_type as string) || '');
      loadParentCategories();
    }
  }, [visible, category]);

  // Effet séparé pour présélectionner le parent une fois les rayons chargés
  useEffect(() => {
    if (category && parentCategories.length > 0) {
      console.log('🔍 Débogage présélection parent:', {
        categoryId: category.id,
        categoryName: category.name,
        categoryParent: category.parent,
        parentType: typeof category.parent,
        parentCategoriesCount: parentCategories.length,
        parentCategoriesIds: parentCategories.map((r: any) => r.id)
      });
      
      // S'assurer que parent est un nombre ou null
      const parentValue = category.parent;
      const parentId = typeof parentValue === 'number' ? parentValue : null;
      
      console.log('🔍 Analyse du parent:', {
        parentValue,
        parentId,
        isNumber: typeof parentValue === 'number',
        isNull: parentValue === null,
        isUndefined: parentValue === undefined
      });
      
      // Vérifier que le parent existe dans la liste des rayons chargés
      if (parentId && parentCategories.some(rayon => rayon.id === parentId)) {
        const selectedParent = parentCategories.find(rayon => rayon.id === parentId);
        setParent(parentId);
        console.log('✅ Parent présélectionné avec succès:', {
          parentId,
          parentName: selectedParent?.name,
          parentDetails: selectedParent
        });
      } else {
        setParent(null);
        console.log('❌ Aucun parent valide trouvé:', {
          parentId,
          parentExists: parentId ? parentCategories.some(rayon => rayon.id === parentId) : false,
          availableParents: parentCategories.map((r: any) => ({ id: r.id, name: r.name }))
        });
      }
    } else {
      console.log('⚠️ Conditions non remplies pour présélection:', {
        hasCategory: !!category,
        hasParentCategories: parentCategories.length > 0,
        parentCategoriesLength: parentCategories.length
      });
    }
  }, [category, parentCategories]);

  const loadParentCategories = async () => {
    setLoadingRayons(true);
    try {
      console.log('🧭 Chargement des rayons parents...');
      const response = await categoryService.getRayons();
      console.log('📡 Réponse rayons:', response);
      
      // Gérer les différents formats de réponse de l'API
      let rayons = [];
      if (response.success && response.rayons) {
        rayons = response.rayons;
        console.log('🧭 Rayons parents chargés (rayons):', rayons.length, rayons.map((r: any) => ({ id: r.id, name: r.name })));
      } else if (response.results && Array.isArray(response.results)) {
        rayons = response.results;
        console.log('🧭 Rayons parents chargés (results):', rayons.length, rayons.map((r: any) => ({ id: r.id, name: r.name })));
      } else if (Array.isArray(response)) {
        rayons = response;
        console.log('🧭 Rayons parents chargés (array):', rayons.length, rayons.map((r: any) => ({ id: r.id, name: r.name })));
      } else {
        console.warn('🧭 Format de réponse rayons inattendu:', response);
        rayons = [];
      }
      
      setParentCategories(rayons);
    } catch (error) {
      setParentCategories([]);
      console.error('🧭 Erreur chargement rayons parents:', (error as any)?.response?.data || (error as any)?.message || error);
    } finally {
      setLoadingRayons(false);
    }
  };

  const handleUpdate = async () => {
    if (!category) return;

    // Validation
    if (!name.trim()) {
      console.warn('❌ Validation échouée: nom vide');
      Alert.alert('Erreur', 'Le nom de la catégorie est obligatoire');
      return;
    }

    // Déterminer si un parent est requis selon la logique serveur:
    // - Les rayons (is_rayon=true) ne peuvent pas avoir de parent
    // - Les catégories globales (is_global=true) peuvent exister sans parent
    // - Les catégories spécifiques au site (is_global=false, is_rayon=false) doivent avoir un parent
    const isRayon = (category as any).is_rayon;
    // Utiliser la valeur du switch pour tous les types de catégories
    const finalIsGlobal = isGlobal;
    const needsParent = !isRayon && !finalIsGlobal;
    const effectiveParent = needsParent ? (parent ?? (category as any).parent ?? null) : null;
    
    
    if (needsParent && (effectiveParent === null || effectiveParent === undefined)) {
      console.warn('❌ Validation échouée: catégorie spécifique au site sans parent', { 
        categoryId: category.id, 
        parent, 
        categoryParent: (category as any).parent, 
        isRayon,
        isGlobal,
        needsParent,
        effectiveParent,
        availableParents: parentCategories.map((r: any) => ({ id: r.id, name: r.name }))
      });
      Alert.alert('Erreur', 'Une catégorie spécifique au site doit avoir un rayon parent.');
      return;
    }
    
    console.log('✅ Validation parent réussie:', {
      categoryId: category.id,
      needsParent,
      effectiveParent,
      parentName: effectiveParent ? parentCategories.find((r: any) => r.id === effectiveParent)?.name : 'N/A'
    });

    // Si c'est un rayon, s'assurer qu'on a toujours un rayon_type (sélectionné ou existant)
    if ((category as any).is_rayon) {
      const effectiveRayonTypeForValidation = rayonType || (category as any).rayon_type;
      if (!effectiveRayonTypeForValidation) {
        console.warn('❌ Validation échouée: rayon sans type', {
          categoryId: category.id,
          isRayon: (category as any).is_rayon,
          rayonType,
          existingRayonType: (category as any).rayon_type
        });
        Alert.alert('Erreur', 'Veuillez sélectionner le type de rayon');
        return;
      }
    }

    try {
      setLoading(true);
      
      // Test de connectivité avant la mise à jour
      console.log('🔍 Test de connectivité avant mise à jour...');
      const connectivityTest = await testConnectivity();
      console.log('📊 Résultat test connectivité:', connectivityTest);
      
      if (!connectivityTest.success) {
        console.warn('⚠️ Problème de connectivité détecté, mais tentative de mise à jour...');
      }
      
      const updateData: {
        name: string;
        description?: string;
        is_global?: boolean;
        is_rayon?: boolean;
        parent?: number | null;
        rayon_type?: string;
      } = {
        name: name.trim(),
        description: description.trim() || undefined,
        // Utiliser la valeur du switch pour tous les types de catégories
        is_global: finalIsGlobal,
        is_rayon: (category as any).is_rayon,
        // Toujours envoyer rayon_type pour un rayon, en retombant sur la valeur existante si non modifiée
        rayon_type: (category as any).is_rayon ? (rayonType || (category as any).rayon_type) : undefined,
      };

      // Solution temporaire : si c'est une catégorie globale personnalisée, 
      // s'assurer que le parent est null pour éviter l'erreur de validation serveur
      if (finalIsGlobal && !(category as any).is_rayon) {
        console.log('🔧 Solution temporaire: catégorie globale personnalisée, parent forcé à null');
        updateData.parent = null;
      }

      // Ajouter parent seulement si nécessaire (catégories spécifiques au site uniquement)
      if (needsParent && effectiveParent) {
        updateData.parent = effectiveParent as number;
      } else if (!needsParent) {
        // Pour les rayons et catégories globales, s'assurer que parent est null
        updateData.parent = null;
      }

      // Nettoyer et valider les données avant envoi
      if (updateData.description === undefined || updateData.description === '') {
        delete updateData.description;
      }
      if (updateData.rayon_type === undefined) {
        delete updateData.rayon_type;
      }
      
      // S'assurer que parent est correctement typé
      if (updateData.parent !== null && typeof updateData.parent !== 'number') {
        console.warn('⚠️ Parent invalide, conversion en null:', updateData.parent, 'Type:', typeof updateData.parent);
        updateData.parent = null;
      }
      
      // Correction spécifique pour les tableaux (problème du Picker)
      if (Array.isArray(updateData.parent)) {
        console.warn('🚨 Parent est un tableau, conversion en null:', updateData.parent);
        updateData.parent = null;
      }
      
      // Log des données finales avant envoi
      console.log('🧹 Données nettoyées avant envoi:', {
        original: {
          name: name.trim(),
          description: description.trim() || undefined,
          is_global: finalIsGlobal,
          parent: needsParent ? (effectiveParent as number) : null,
          rayon_type: (category as any).is_rayon ? rayonType : undefined,
        },
        cleaned: updateData
      });

      console.log('📤 Préparation des données de mise à jour', {
        categoryId: category.id,
        updateData,
        originalCategory: {
          name: category.name,
          description: category.description,
          is_global: category.is_global,
          parent: (category as any).parent,
          rayon_type: (category as any).rayon_type
        },
        changes: {
          nameChanged: category.name !== updateData.name,
          descriptionChanged: category.description !== updateData.description,
          isGlobalChanged: category.is_global !== finalIsGlobal,
          parentChanged: (category as any).parent !== updateData.parent,
          rayonTypeChanged: (category as any).rayon_type !== updateData.rayon_type
        }
      });

      console.log('🌐 Appel API updateCategory...', {
        url: `/categories/${category.id}/`,
        method: 'PUT',
        data: updateData,
        timestamp: new Date().toISOString()
      });

      const updatedCategory = await categoryService.updateCategory(category.id, updateData);
      
      console.log('✅ Mise à jour réussie', {
        categoryId: category.id,
        updatedCategory,
        timestamp: new Date().toISOString()
      });
      
      Alert.alert('Succès', 'Catégorie mise à jour avec succès');
      onCategoryUpdated(updatedCategory);
      onClose();
    } catch (error: any) {
      console.error('❌ Erreur détaillée lors de la mise à jour', {
        categoryId: category.id,
        error: {
          message: error?.message,
          code: error?.code,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          config: {
            url: error?.config?.url,
            method: error?.config?.method,
            baseURL: error?.config?.baseURL,
            timeout: error?.config?.timeout
          }
        },
        networkInfo: {
          online: navigator.onLine,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
      
      let errorMessage = 'Impossible de mettre à jour la catégorie';
      if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
        errorMessage = 'Erreur de connexion réseau. Vérifiez votre connexion internet.';
      } else if (error?.response?.status === 401) {
        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'Permissions insuffisantes pour modifier cette catégorie.';
      } else if (error?.response?.status === 404) {
        errorMessage = 'Catégorie introuvable.';
      } else if (error?.response?.status >= 500) {
        errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
      console.log('🏁 Fin de la mise à jour de catégorie', {
        categoryId: category.id,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleCancel = () => {
    if (category) {
      setName(category.name || '');
      setDescription(category.description || '');
      setIsGlobal(category.is_global || false);
      setParent(category.parent || null);
    }
    onClose();
  };

  if (!category) return null;


  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Modifier la catégorie</Text>
          <TouchableOpacity 
            onPress={handleUpdate} 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Sauvegarder</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Informations de la catégorie */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations de la catégorie</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom de la catégorie *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Entrez le nom de la catégorie"
                maxLength={100}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Description de la catégorie (optionnel)"
                multiline
                numberOfLines={3}
                maxLength={500}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.switchContainer}>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.label}>Catégorie globale</Text>
                  <Text style={styles.switchDescription}>
                    {userInfo?.permissions?.permission_level === 'superuser' 
                      ? 'Une catégorie globale est visible par tous les sites'
                      : 'Seuls les superutilisateurs peuvent modifier les catégories globales'
                    }
                  </Text>
                </View>
                <Switch
                  value={isGlobal}
                  onValueChange={(value) => {
                    console.log('🔐 CategoryEditModal - Switch isGlobal changé:', {
                      newValue: value,
                      permissionLevel,
                      isSuperuser,
                      disabled: isGlobalSwitchDisabled,
                      categoryId: category?.id,
                      categoryName: category?.name
                    });
                    setIsGlobal(value);
                  }}
                  disabled={isGlobalSwitchDisabled}
                  trackColor={{ false: theme.colors.neutral[300], true: theme.colors.primary[300] }}
                  thumbColor={isGlobal ? theme.colors.primary[500] : theme.colors.neutral[500]}
                />
              </View>
            </View>

            {/* Champ parent pour les sous-catégories */}
            {!(category as any).is_rayon && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Rayon parent</Text>
                {loadingRayons ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                    <Text style={styles.loadingText}>Chargement des rayons...</Text>
                  </View>
                ) : (
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={parent}
                      onValueChange={(value) => {
                        console.log('🧭 Sélection parent changée:', value);
                        setParent(value);
                      }}
                      style={styles.picker}
                      enabled={!loading}
                    >
                      <Picker.Item label="Aucun rayon parent" value={null} />
                      {parentCategories.map((rayon) => (
                        <Picker.Item
                          key={rayon.id}
                          label={rayon.name}
                          value={rayon.id}
                        />
                      ))}
                    </Picker>
                  </View>
                )}
                <Text style={styles.fieldDescription}>
                  Sélectionnez un rayon parent pour créer une sous-catégorie
                </Text>
              </View>
            )}
          </View>

          {/* Informations système */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations système</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type:</Text>
              <Text style={styles.infoValue}>
                {(category as any).is_rayon ? 'Rayon' : 'Catégorie personnalisée'}
              </Text>
            </View>

            {(category as any).is_rayon && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Type de rayon</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={rayonType}
                    onValueChange={(value) => setRayonType(value)}
                    style={styles.picker}
                    enabled={!loading}
                  >
                    {RAYON_TYPES.map((type) => (
                      <Picker.Item key={type.value} label={type.label} value={type.value} />
                    ))}
                  </Picker>
                </View>
                <Text style={styles.fieldDescription}>
                  Modifie la famille du rayon (impacte le regroupement et les icônes)
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Créée le:</Text>
              <Text style={styles.infoValue}>
                {(() => {
                  try {
                    const date = new Date(category.created_at);
                    return isNaN(date.getTime()) ? 'Date invalide' : date.toLocaleDateString('fr-FR');
                  } catch (error) {
                    console.warn('⚠️ Erreur formatage date created_at:', error, 'Valeur:', category.created_at);
                    return 'Date invalide';
                  }
                })()}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dernière modification:</Text>
              <Text style={styles.infoValue}>
                {(() => {
                  try {
                    const date = new Date(category.updated_at);
                    return isNaN(date.getTime()) ? 'Date invalide' : date.toLocaleDateString('fr-FR');
                  } catch (error) {
                    console.warn('⚠️ Erreur formatage date updated_at:', error, 'Valeur:', category.updated_at);
                    return 'Date invalide';
                  }
                })()}
              </Text>
            </View>
          </View>

          {/* Note pour les rayons */}
          {(category as any).is_rayon && (
            <View style={styles.warningSection}>
              <View style={styles.warningHeader}>
                <Ionicons name="information-circle" size={20} color="#FF9800" />
                <Text style={styles.warningTitle}>Rayon standardisé</Text>
              </View>
              <Text style={styles.warningText}>
                Ce rayon est géré globalement et synchronisé avec tous les sites. 
                Les modifications peuvent être limitées.
              </Text>
            </View>
          )}

          {/* Note pour les catégories personnalisées */}
          {!(category as any).is_rayon && (
            <View style={styles.infoSection}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle" size={20} color={theme.colors.info[500]} />
                <Text style={styles.infoTitle}>Catégorie personnalisée</Text>
              </View>
              <Text style={styles.infoText}>
                <Text style={styles.boldText}>Globale :</Text> Visible par tous les sites{'\n'}
                <Text style={styles.boldText}>Locale :</Text> Visible uniquement par ce site
              </Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background.secondary,
  },
  cancelButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  saveButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.neutral[400],
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.secondary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchDescription: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  warningSection: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  infoSection: {
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.info[500],
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.info[700],
    marginLeft: 8,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.info[700],
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 8,
    backgroundColor: theme.colors.background.secondary,
  },
  picker: {
    height: 50,
  },
  fieldDescription: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 4,
  },
});

export default CategoryEditModal;


