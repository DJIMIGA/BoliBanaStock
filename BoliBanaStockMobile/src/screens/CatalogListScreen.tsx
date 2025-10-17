import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { catalogService } from '../services/api';

const { width } = Dimensions.get('window');

interface CatalogItem {
  id: number;
  name: string;
  total_products: number;
  total_pages: number;
  status: string;
  created_at: string;
  completed_at?: string;
}

const CatalogListScreen: React.FC = () => {
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCatalogs = async () => {
    try {
      setLoading(true);
      const response = await catalogService.getCatalogs();
      
      // Adapter les données de l'API au format attendu
      const catalogsData: CatalogItem[] = response.results || response || [];
      setCatalogs(catalogsData);
    } catch (error) {
      console.error('Erreur lors du chargement des catalogues:', error);
      Alert.alert('Erreur', 'Impossible de charger les catalogues');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCatalogs();
    setRefreshing(false);
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return theme.colors.success[500];
      case 'processing':
        return theme.colors.warning[500];
      case 'error':
        return theme.colors.error[500];
      default:
        return theme.colors.neutral[500];
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Terminé';
      case 'processing':
        return 'En cours';
      case 'error':
        return 'Erreur';
      default:
        return status;
    }
  };

  const handleCatalogPress = (catalog: CatalogItem) => {
    Alert.alert(
      'Catalogue',
      `Nom: ${catalog.name}\nProduits: ${catalog.total_products}\nPages: ${catalog.total_pages}\nStatut: ${getStatusText(catalog.status)}`,
      [
        { text: 'Fermer', style: 'cancel' },
        { text: 'Voir', onPress: () => handleViewCatalog(catalog) },
      ]
    );
  };

  const handleViewCatalog = (catalog: CatalogItem) => {
    // TODO: Naviguer vers un écran de visualisation du catalogue
    Alert.alert('Info', 'Fonctionnalité de visualisation à implémenter');
  };

  const renderCatalogItem = ({ item }: { item: CatalogItem }) => (
    <TouchableOpacity
      style={styles.catalogCard}
      onPress={() => handleCatalogPress(item)}
    >
      <View style={styles.catalogHeader}>
        <View style={styles.catalogInfo}>
          <Text style={styles.catalogName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.catalogDate}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      
      <View style={styles.catalogStats}>
        <View style={styles.statItem}>
          <Ionicons name="cube-outline" size={16} color={theme.colors.primary[500]} />
          <Text style={styles.statText}>{item.total_products} produits</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="document-outline" size={16} color={theme.colors.primary[500]} />
          <Text style={styles.statText}>{item.total_pages} pages</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-outline" size={64} color={theme.colors.neutral[400]} />
      <Text style={styles.emptyTitle}>Aucun catalogue</Text>
      <Text style={styles.emptySubtitle}>
        Générez votre premier catalogue depuis l'écran Étiquettes
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Catalogues générés</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={theme.colors.primary[500]} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={catalogs}
        renderItem={renderCatalogItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  refreshButton: {
    padding: 8,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  catalogCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  catalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  catalogInfo: {
    flex: 1,
    marginRight: 12,
  },
  catalogName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  catalogDate: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  catalogStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default CatalogListScreen;
