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
import { Category } from '../types';
import theme from '../utils/theme';

interface CategoryEditModalProps {
  visible: boolean;
  onClose: () => void;
  onCategoryUpdated: (updatedCategory: Category) => void;
  category: Category | null;
}

const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  visible,
  onClose,
  onCategoryUpdated,
  category,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [parent, setParent] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingRayons, setLoadingRayons] = useState(false);
  const [parentCategories, setParentCategories] = useState<any[]>([]);

  useEffect(() => {
    if (visible && category) {
      setName(category.name || '');
      setDescription(category.description || '');
      setIsGlobal(category.is_global || false);
      setParent(category.parent || null);
      loadParentCategories();
    }
  }, [visible, category]);

  const loadParentCategories = async () => {
    setLoadingRayons(true);
    try {
      console.log('🔄 Chargement des rayons parents...');
      const response = await categoryService.getRayons();
      console.log('📡 Réponse rayons:', response);
      
      if (response.success && response.rayons) {
        setParentCategories(response.rayons);
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

  const handleUpdate = async () => {
    if (!category) return;

    // Validation
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom de la catégorie est obligatoire');
      return;
    }

    try {
      setLoading(true);
      
      const updateData = {
        name: name.trim(),
        description: description.trim() || undefined,
        is_global: isGlobal,
        parent: parent || undefined,
      };

      const updatedCategory = await categoryService.updateCategory(category.id, updateData);
      
      Alert.alert('Succès', 'Catégorie mise à jour avec succès');
      onCategoryUpdated(updatedCategory);
      onClose();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      Alert.alert(
        'Erreur', 
        error.response?.data?.message || 'Impossible de mettre à jour la catégorie'
      );
    } finally {
      setLoading(false);
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
                    Une catégorie globale est visible par tous les sites
                  </Text>
                </View>
                <Switch
                  value={isGlobal}
                  onValueChange={setIsGlobal}
                  disabled={loading || (category as any).is_rayon}
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
                      onValueChange={(value) => setParent(value)}
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

            {(category as any).is_rayon && (category as any).rayon_type && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Type de rayon:</Text>
                <Text style={styles.infoValue}>{(category as any).rayon_type}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Créée le:</Text>
              <Text style={styles.infoValue}>
                {new Date(category.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dernière modification:</Text>
              <Text style={styles.infoValue}>
                {new Date(category.updated_at).toLocaleDateString('fr-FR')}
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


