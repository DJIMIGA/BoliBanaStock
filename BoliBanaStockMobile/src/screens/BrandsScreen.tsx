import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { brandService } from '../services/api';
import { Brand } from '../types';
import theme from '../utils/theme';

interface BrandsScreenProps {
  navigation: any;
}

const BrandsScreen: React.FC<BrandsScreenProps> = ({ navigation }) => {
  console.log('🏷️ BrandsScreen rendu avec succès!');
  
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandDescription, setBrandDescription] = useState('');

  useEffect(() => {
    console.log('🏷️ BrandsScreen useEffect - chargement des marques');
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      setLoading(true);
      
      // Diagnostic de l'authentification
      const accessToken = await AsyncStorage.getItem('access_token');
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      
      console.log('🔍 Diagnostic auth - Access Token:', !!accessToken);
      console.log('🔍 Diagnostic auth - Refresh Token:', !!refreshToken);
      
      const response = await brandService.getBrands();
      setBrands(response.results || response);
    } catch (error) {
      console.error('Erreur lors du chargement des marques:', error);
      
      // Vérifier si c'est une erreur d'authentification
      if ((error as any).response?.status === 401) {
        Alert.alert(
          'Erreur d\'authentification', 
          'Votre session a expiré. Veuillez vous reconnecter.',
          [
            { text: 'OK', onPress: () => navigation.navigate('Login') }
          ]
        );
      } else {
        Alert.alert('Erreur', 'Impossible de charger les marques');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBrands();
    setRefreshing(false);
  };

  const openModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandName(brand.name);
      setBrandDescription(brand.description || '');
    } else {
      setEditingBrand(null);
      setBrandName('');
      setBrandDescription('');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingBrand(null);
    setBrandName('');
    setBrandDescription('');
  };

  const handleSave = async () => {
    if (!brandName.trim()) {
      Alert.alert('Erreur', 'Le nom de la marque est requis');
      return;
    }

    try {
      if (editingBrand) {
        // Mise à jour
        await brandService.updateBrand(editingBrand.id, {
          name: brandName.trim(),
          description: brandDescription.trim(),
        });
        Alert.alert('Succès', 'Marque mise à jour avec succès');
      } else {
        // Création
        await brandService.createBrand({
          name: brandName.trim(),
          description: brandDescription.trim(),
        });
        Alert.alert('Succès', 'Marque créée avec succès');
      }
      
      closeModal();
      loadBrands();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la marque');
    }
  };

  const handleDelete = async (brand: Brand) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer la marque "${brand.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await brandService.deleteBrand(brand.id);
              Alert.alert('Succès', 'Marque supprimée avec succès');
              loadBrands();
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la marque');
            }
          },
        },
      ]
    );
  };

  const renderBrandItem = ({ item }: { item: Brand }) => (
    <View style={styles.brandItem}>
      <View style={styles.brandInfo}>
        <Text style={styles.brandName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.brandDescription}>{item.description}</Text>
        )}
      </View>
      <View style={styles.brandActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openModal(item)}
        >
          <Ionicons name="pencil" size={20} color={theme.colors.primary[500]} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash" size={20} color={theme.colors.error[500]} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text style={styles.loadingText}>Chargement des marques...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Gestion des Marques</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={() => openModal()}>
            <Ionicons name="add" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={brands}
        renderItem={renderBrandItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="logo-apple" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Aucune marque trouvée</Text>
            <Text style={styles.emptySubtext}>
              Appuyez sur le bouton + pour créer votre première marque
            </Text>
          </View>
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBrand ? 'Modifier la marque' : 'Nouvelle marque'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nom de la marque *</Text>
                <TextInput
                  style={styles.textInput}
                  value={brandName}
                  onChangeText={setBrandName}
                  placeholder="Ex: Apple, Samsung, Nike..."
                  autoFocus
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description (optionnel)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={brandDescription}
                  onChangeText={setBrandDescription}
                  placeholder="Description de la marque..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {editingBrand ? 'Modifier' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background.primary,
  },
  listContainer: {
    padding: 16,
  },
  brandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  brandInfo: {
    flex: 1,
    marginRight: 16,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  brandDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  brandActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background.primary,
  },
  deleteButton: {
    backgroundColor: theme.colors.error[100],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  modalBody: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.text.primary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.neutral[200],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  saveButton: {
    flex: 1,
    padding: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primary[500],
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.inverse,
  },
});

export default BrandsScreen;
