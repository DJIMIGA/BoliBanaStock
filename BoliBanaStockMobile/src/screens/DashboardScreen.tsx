import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { dashboardService, configurationService } from '../services/api';
import { useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { AppDispatch } from '../store';
import { useAuthError } from '../hooks/useAuthError';
import theme, { stockColors, actionColors } from '../utils/theme';

interface DashboardStats {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_stock_value: number;
}

interface Configuration {
  id: number;
  nom_societe: string;
  adresse: string;
  telephone: string;
  email: string;
  devise: string;
  tva: number;
  site_web: string;
  description: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function DashboardScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { handleApiError } = useAuthError();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getStats();
      
      // Vérifier si la réponse est null (session expirée)
      if (data === null) {
        console.log('🔑 Session expirée - déconnexion automatique en cours...');
        return; // La déconnexion sera gérée automatiquement
      }
      
      setStats(data.stats);
    } catch (error: any) {
      console.error('❌ Erreur chargement dashboard:', error);
      
      // Vérifier si c'est une erreur d'authentification
      if (handleApiError(error)) {
        return; // La déconnexion sera gérée automatiquement
      }
      
      // Utiliser des données par défaut en cas d'erreur
      setStats({
        total_products: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
        total_stock_value: 0,
      });
      Alert.alert('Erreur', 'Impossible de charger le tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const StatCard = ({ title, value, icon, color, onPress }: any) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.statContent}>
        <Ionicons name={icon} size={24} color={color} />
        <View style={styles.statText}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const ActionButton = ({ title, icon, onPress, color }: any) => (
    <TouchableOpacity style={[styles.actionButton, { backgroundColor: color }]} onPress={onPress}>
      <Ionicons name={icon} size={24} color="white" />
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tableau de bord</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="person-circle-outline" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color={theme.colors.error[500]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistiques */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Statistiques</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Produits"
              value={stats?.total_products || 0}
              icon="cube-outline"
              color={stockColors.inStock}
              onPress={() => navigation.navigate('Products')}
            />
            <StatCard
              title="Stock Faible"
              value={stats?.low_stock_count || 0}
              icon="warning-outline"
              color={stockColors.lowStock}
              onPress={() => navigation.navigate('LowStock')}
            />
            <StatCard
              title="Rupture Stock"
              value={stats?.out_of_stock_count || 0}
              icon="close-circle-outline"
              color={stockColors.outOfStock}
              onPress={() => navigation.navigate('OutOfStock')}
            />
            <StatCard
              title="Valeur Stock"
              value={`${(stats?.total_stock_value || 0).toLocaleString()} FCFA`}
              icon="cash-outline"
              color={actionColors.info}
              onPress={() => navigation.navigate('StockValue')}
            />
          </View>
        </View>

        {/* Actions rapides */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.actionsGrid}>
            <ActionButton
              title="Scanner Produit"
              icon="scan-outline"
              color={actionColors.success}
              onPress={() => navigation.navigate('ScanProduct')}
            />
            <ActionButton
              title="Inventaire"
              icon="list-outline"
              color={actionColors.primary}
              onPress={() => navigation.navigate('Inventory')}
            />
            <ActionButton
              title="Réception"
              icon="cube-outline"
              color={actionColors.info}
              onPress={() => navigation.navigate('Delivery')}
            />
            <ActionButton
              title="Rapports"
              icon="bar-chart-outline"
              color={actionColors.secondary}
              onPress={() => navigation.navigate('Reports')}
            />
            <ActionButton
              title="Transactions"
              icon="swap-horizontal-outline"
              color={actionColors.info}
              onPress={() => navigation.navigate('Transactions')}
            />
            <ActionButton
              title="Étiquettes"
              icon="pricetag-outline"
              color={actionColors.warning}
              onPress={() => navigation.navigate('Labels')}
            />
            <ActionButton
              title="Catalogues"
              icon="document-outline"
              color={actionColors.primary}
              onPress={() => navigation.navigate('CatalogList')}
            />
            <ActionButton
              title="Paramètres"
              icon="settings-outline"
              color={theme.colors.neutral[500]}
              onPress={() => navigation.navigate('Settings')}
            />
          </View>
        </View>

        {/* Menu principal supprimé (redondant avec le menu bas fixe) */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.tertiary,
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  configBanner: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  configContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  configText: {
    marginLeft: 12,
    flex: 1,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary[700],
    marginBottom: 4,
  },
  configMessage: {
    fontSize: 14,
    color: theme.colors.primary[600],
  },
  configButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  configButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    width: '48%',
    borderLeftWidth: 4,
    ...theme.shadows.md,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 10,
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  statTitle: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  actionsContainer: {
    padding: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: actionColors.success,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  actionText: {
    color: theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 5,
  },
  menuContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  menuList: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginLeft: 15,
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    marginTop: 10,
  },
  logoutText: {
    color: theme.colors.error[500],
  },
}); 