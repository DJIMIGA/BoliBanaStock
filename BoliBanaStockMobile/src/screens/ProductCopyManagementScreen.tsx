import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { productCopyService } from '../services/api';
import { ProductCopy } from '../types';
import theme from '../utils/theme';

type ProductCopyManagementScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ProductCopyManagement'>;

interface ProductCopyManagementScreenProps {
  navigation: ProductCopyManagementScreenNavigationProp;
}

const ProductCopyManagementScreen: React.FC<ProductCopyManagementScreenProps> = ({ navigation }) => {
  const [copiedProducts, setCopiedProducts] = useState<ProductCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [syncing, setSyncing] = useState<number | null>(null);

  const loadCopiedProducts = useCallback(async (pageNum: number = 1, search: string = '') => {
    try {
      setLoading(true);
      const response = await productCopyService.getCopiedProducts(search, pageNum);
      
      if (pageNum === 1) {
        setCopiedProducts(response.results || []);
      } else {
        setCopiedProducts(prev => [...prev, ...(response.results || [])]);
      }
      
      setHasMore(!!response.next);
      setPage(pageNum);
    } catch (error) {
      console.error('Erreur lors du chargement des copies:', error);
      Alert.alert('Erreur', 'Impossible de charger les produits copiés');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCopiedProducts(1, searchQuery);
    setRefreshing(false);
  }, [searchQuery]);

  useEffect(() => {
    loadCopiedProducts();
  }, []);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    setPage(1);
    loadCopiedProducts(1, text);
  }, []);

  const handleSync = async (copyId: number) => {
    try {
      setSyncing(copyId);
      await productCopyService.syncProduct(copyId);
      
      // Recharger la liste pour mettre à jour les données
      await loadCopiedProducts(1, searchQuery);
      
      Alert.alert('Succès', 'Produit synchronisé avec succès');
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      Alert.alert('Erreur', 'Impossible de synchroniser le produit');
    } finally {
      setSyncing(null);
    }
  };

  const handleToggleStatus = async (copyId: number, currentStatus: boolean) => {
    try {
      await productCopyService.toggleCopyStatus(copyId, !currentStatus);
      
      // Mettre à jour localement
      setCopiedProducts(prev => 
        prev.map(copy => 
          copy.id === copyId 
            ? { ...copy, is_active: !currentStatus }
            : copy
        )
      );
      
      Alert.alert(
        'Succès', 
        `Copie ${!currentStatus ? 'activée' : 'désactivée'} avec succès`
      );
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      Alert.alert('Erreur', 'Impossible de modifier le statut de la copie');
    }
  };

  const handleDelete = async (copyId: number, productName: string) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer la copie de "${productName}" ? Le produit local sera également supprimé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await productCopyService.deleteCopy(copyId);
              
              // Retirer de la liste locale
              setCopiedProducts(prev => prev.filter(copy => copy.id !== copyId));
              
              Alert.alert('Succès', 'Copie supprimée avec succès');
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la copie');
            }
          }
        }
      ]
    );
  };

  const loadMoreProducts = () => {
    if (hasMore && !loading) {
      loadCopiedProducts(page + 1, searchQuery);
    }
  };

  const renderProductCopyItem = ({ item }: { item: ProductCopy }) => {
    const isActive = item.is_active;
    
    return (
      <View style={[styles.copyCard, !isActive && styles.inactiveCard]}>
        {/* Header */}
        <View style={styles.copyHeader}>
          <View style={styles.copyTitleContainer}>
            <Text style={styles.copyTitle} numberOfLines={2}>
              {item.copied_product.name}
            </Text>
            <Text style={styles.copySubtitle}>
              Copié depuis {item.source_site.site_name}
            </Text>
          </View>
          <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
            <Ionicons
              name={isActive ? 'checkmark-circle' : 'pause-circle'}
              size={16}
              color={isActive ? theme.colors.success : theme.colors.error}
            />
            <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
              {isActive ? 'Actif' : 'Inactif'}
            </Text>
          </View>
        </View>

        {/* Product Image */}
        <View style={styles.imageContainer}>
          {item.copied_product.image_url ? (
            <Image source={{ uri: item.copied_product.image_url }} style={styles.productImage} />
          ) : (
            <View style={styles.noImage}>
              <Ionicons name="image-outline" size={24} color={theme.colors.neutral[400]} />
            </View>
          )}
        </View>

        {/* Product Details */}
        <View style={styles.copyDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>CUG Original:</Text>
            <Text style={styles.detailValue}>{item.original_product.cug}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>CUG Copié:</Text>
            <Text style={styles.detailValue}>{item.copied_product.cug}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Prix de Vente:</Text>
            <Text style={styles.detailValue}>
              {item.copied_product.selling_price.toLocaleString()} FCFA
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Stock Local:</Text>
            <View style={[styles.stockBadge, 
              item.copied_product.quantity === 0 ? styles.stockEmpty :
              item.copied_product.quantity <= item.copied_product.alert_threshold ? styles.stockLow :
              styles.stockGood
            ]}>
              <Text style={styles.stockText}>{item.copied_product.quantity}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date de Copie:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.copied_at).toLocaleDateString('fr-FR')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Dernière Sync:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.last_sync).toLocaleDateString('fr-FR')}
            </Text>
          </View>
        </View>

        {/* Sync Options */}
        <View style={styles.syncOptions}>
          <Text style={styles.syncOptionsTitle}>Options de Synchronisation</Text>
          <View style={styles.syncCheckboxes}>
            <View style={styles.syncCheckbox}>
              <Ionicons
                name={item.sync_prices ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={item.sync_prices ? theme.colors.success : theme.colors.neutral[400]}
              />
              <Text style={styles.syncCheckboxText}>Prix</Text>
            </View>
            <View style={styles.syncCheckbox}>
              <Ionicons
                name={item.sync_stock ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={item.sync_stock ? theme.colors.success : theme.colors.neutral[400]}
              />
              <Text style={styles.syncCheckboxText}>Stock</Text>
            </View>
            <View style={styles.syncCheckbox}>
              <Ionicons
                name={item.sync_images ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={item.sync_images ? theme.colors.success : theme.colors.neutral[400]}
              />
              <Text style={styles.syncCheckboxText}>Images</Text>
            </View>
            <View style={styles.syncCheckbox}>
              <Ionicons
                name={item.sync_description ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={item.sync_description ? theme.colors.success : theme.colors.neutral[400]}
              />
              <Text style={styles.syncCheckboxText}>Description</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.copyActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.syncButton]}
            onPress={() => handleSync(item.id)}
            disabled={syncing === item.id}
          >
            {syncing === item.id ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="sync-outline" size={16} color="white" />
            )}
            <Text style={styles.actionButtonText}>
              {syncing === item.id ? 'Sync...' : 'Synchroniser'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, isActive ? styles.warningButton : styles.successButton]}
            onPress={() => handleToggleStatus(item.id, isActive)}
          >
            <Ionicons
              name={isActive ? 'pause-outline' : 'play-outline'}
              size={16}
              color="white"
            />
            <Text style={styles.actionButtonText}>
              {isActive ? 'Désactiver' : 'Activer'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={() => handleDelete(item.id, item.copied_product.name)}
          >
            <Ionicons name="trash-outline" size={16} color="white" />
            <Text style={styles.actionButtonText}>Supprimer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.infoButton]}
            onPress={() => navigation.navigate('ProductDetail', { productId: item.copied_product.id })}
          >
            <Ionicons name="eye-outline" size={16} color="white" />
            <Text style={styles.actionButtonText}>Voir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestion des Copies</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.newCopyButton}
            onPress={() => navigation.navigate('ProductCopy')}
          >
            <Ionicons name="add-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{copiedProducts.length}</Text>
          <Text style={styles.statLabel}>Produits Copiés</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {copiedProducts.filter(c => c.is_active).length}
          </Text>
          <Text style={styles.statLabel}>Copies Actives</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={theme.colors.neutral[500]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher des copies..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={theme.colors.neutral[400]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.neutral[500]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Copies List */}
      <FlatList
        data={copiedProducts}
        renderItem={renderProductCopyItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.copiesList}
        contentContainerStyle={styles.copiesListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="copy-outline" size={64} color={theme.colors.neutral[400]} />
              <Text style={styles.emptyStateTitle}>Aucun produit copié</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? 'Aucune copie ne correspond à votre recherche'
                  : 'Vous n\'avez pas encore copié de produits depuis le site principal'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => navigation.navigate('ProductCopy')}
                >
                  <Text style={styles.emptyStateButtonText}>Copier des Produits</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </View>
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
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newCopyButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: theme.colors.background.secondary,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  copiesList: {
    flex: 1,
  },
  copiesListContent: {
    padding: 16,
  },
  copyCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  copyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  copyTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  copyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  copySubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusActive: {
    backgroundColor: theme.colors.success + '20',
  },
  statusInactive: {
    backgroundColor: theme.colors.error + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusTextActive: {
    color: theme.colors.success,
  },
  statusTextInactive: {
    color: theme.colors.error,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  noImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: theme.colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  copyDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  stockEmpty: {
    backgroundColor: theme.colors.error + '20',
  },
  stockLow: {
    backgroundColor: theme.colors.warning + '20',
  },
  stockGood: {
    backgroundColor: theme.colors.success + '20',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  syncOptions: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  syncOptionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  syncCheckboxes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  syncCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncCheckboxText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  copyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
    minWidth: 80,
    justifyContent: 'center',
  },
  syncButton: {
    backgroundColor: theme.colors.primary,
  },
  warningButton: {
    backgroundColor: theme.colors.warning,
  },
  successButton: {
    backgroundColor: theme.colors.success,
  },
  dangerButton: {
    backgroundColor: theme.colors.error,
  },
  infoButton: {
    backgroundColor: theme.colors.info,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ProductCopyManagementScreen;
