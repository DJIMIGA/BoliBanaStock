import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { dashboardService, configurationService } from '../services/api';
import { useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { AppDispatch } from '../store';
import { useAuthError } from '../hooks/useAuthError';
import { useDraftStatus } from '../hooks/useDraftStatus';
import errorService from '../services/errorService';
import { AppError } from '../types/errors';
import theme, { stockColors, actionColors } from '../utils/theme';
import { formatCurrency } from '../utils/currencyFormatter';

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
  const draftStatus = useDraftStatus();
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

  const loadConfiguration = async () => {
    try {
      const response = await configurationService.getConfiguration();
      if (response.success) {
        setConfiguration(response.configuration);
      }
    } catch (error) {
      console.error('Erreur chargement configuration:', error);
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


  const formatPhoneNumber = (phone: string): string => {
    // Supprimer tous les caractères non numériques sauf le +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Si le numéro commence par +, le garder tel quel
    if (cleaned.startsWith('+')) {
      // Supprimer le + pour le format WhatsApp
      return cleaned.substring(1);
    }
    
    // Si le numéro commence par 0, le remplacer par l'indicatif du pays (223 pour le Mali)
    if (cleaned.startsWith('0')) {
      cleaned = '223' + cleaned.substring(1);
    }
    
    // Si le numéro commence par 223, le garder tel quel
    if (cleaned.startsWith('223')) {
      return cleaned;
    }
    
    // Sinon, ajouter 223 par défaut
    return '223' + cleaned;
  };

  const formatErrorsForWhatsApp = (errors: AppError[]): string => {
    if (errors.length === 0) {
      return '';
    }

    let errorText = '\n\n📋 *Erreurs récentes :*\n';
    errorText += `_${errors.length} erreur(s) détectée(s)_\n\n`;

    // Limiter à 5 erreurs les plus récentes pour ne pas surcharger le message
    const recentErrors = errors.slice(0, 5);
    
    recentErrors.forEach((error, index) => {
      const date = new Date(error.timestamp);
      const dateStr = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      errorText += `${index + 1}. *${error.title}*\n`;
      errorText += `   📅 ${dateStr}\n`;
      errorText += `   📍 ${error.source || 'Non spécifié'}\n`;
      errorText += `   ⚠️ ${error.userMessage || error.message}\n`;
      
      if (error.details && error.details.length > 0) {
        errorText += `   📝 Détails: ${error.details.map(d => d.message).join(', ')}\n`;
      }
      
      errorText += '\n';
    });

    if (errors.length > 5) {
      errorText += `_... et ${errors.length - 5} autre(s) erreur(s)_\n`;
    }

    return errorText;
  };

  const handleWhatsAppSupport = async () => {
    try {
      // Récupérer le numéro de téléphone depuis la configuration
      let supportPhone = null;
      try {
        const config = await configurationService.getConfiguration();
        if (config && config.configuration && config.configuration.telephone) {
          supportPhone = config.configuration.telephone;
        } else if (config && config.telephone) {
          supportPhone = config.telephone;
        }
      } catch (error) {
        console.error('Erreur récupération configuration:', error);
      }

      // Récupérer les erreurs récentes (dernières 24h)
      // Récupérer toutes les erreurs (de la queue et du stockage)
      const allErrors = errorService.getErrors();
      
      // Trier par date (plus récentes en premier)
      const sortedErrors = [...allErrors].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Filtrer les erreurs des dernières 24h
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentErrors = sortedErrors.filter(
        (error) => new Date(error.timestamp) >= last24Hours
      );

      // Message par défaut
      let defaultMessage = 'Bonjour, j\'ai besoin d\'assistance concernant l\'application BoliBana Stock.';
      
      // Ajouter les erreurs si disponibles
      if (recentErrors.length > 0) {
        defaultMessage += formatErrorsForWhatsApp(recentErrors);
      }

      const encodedMessage = encodeURIComponent(defaultMessage);

      let whatsappUrl = '';
      let webUrl = '';

      if (supportPhone) {
        const formattedPhone = formatPhoneNumber(supportPhone);
        // URL pour ouvrir WhatsApp avec le numéro de support
        whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`;
        webUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      } else {
        // Si pas de numéro, ouvrir WhatsApp sans destinataire
        whatsappUrl = `whatsapp://send?text=${encodedMessage}`;
        webUrl = `https://wa.me/?text=${encodedMessage}`;
      }

      // Vérifier si WhatsApp est installé
      const canOpen = await Linking.canOpenURL(whatsappUrl);

      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Si WhatsApp n'est pas installé, essayer avec l'URL web
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Erreur ouverture WhatsApp:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'ouvrir WhatsApp. Veuillez vérifier que l\'application est installée.',
        [{ text: 'OK' }]
      );
    }
  };

  useEffect(() => {
    loadDashboard();
    loadConfiguration();
  }, []);

  const StatCard = ({ title, value, icon, color, onPress, compact }: any) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }, compact && styles.statCardCompact]} onPress={onPress}>
      <View style={[styles.statContent, compact && styles.statContentCompact]}>
        <Ionicons name={icon} size={compact ? 20 : 24} color={color} />
        <View style={styles.statText}>
          <Text style={[styles.statValue, compact && styles.statValueCompact]} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.7}>{value}</Text>
          <Text style={[styles.statTitle, compact && styles.statTitleCompact]} numberOfLines={1}>{title}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const ActionButton = ({ title, icon, onPress, color, hasPending }: any) => {
    // Utiliser une couleur de badge adaptée selon la couleur du bouton
    const badgeColor = color === actionColors.error 
      ? theme.colors.error[500] 
      : theme.colors.warning[500];
    
    return (
      <TouchableOpacity style={[styles.actionButton, { backgroundColor: color }]} onPress={onPress}>
        <View style={styles.actionButtonContent}>
          <Ionicons name={icon} size={20} color="white" />
          {hasPending && (
            <View style={[styles.actionBadge, { backgroundColor: badgeColor }]}>
              <Ionicons name="ellipse" size={8} color="white" />
            </View>
          )}
        </View>
        <Text style={styles.actionText}>{title}</Text>
      </TouchableOpacity>
    );
  };

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
          <View style={styles.headerIconContainer}>
            <Ionicons name="home" size={24} color={theme.colors.primary[500]} />
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>
              {configuration?.nom_societe || 'Tableau de bord'}
            </Text>
          </View>
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
              onPress={() => navigation.navigate('Products', { filter: 'low_stock' })}
            />
            <StatCard
              title="Rupture Stock"
              value={stats?.out_of_stock_count || 0}
              icon="close-circle-outline"
              color={stockColors.outOfStock}
              onPress={() => navigation.navigate('Products', { filter: 'out_of_stock' })}
            />
            <StatCard
              title="Valeur Stock"
              value={formatCurrency(stats?.total_stock_value || 0)}
              icon="cash-outline"
              color={actionColors.info}
              onPress={() => navigation.navigate('StockReport')}
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
              hasPending={draftStatus.hasInventoryDraft}
            />
            <ActionButton
              title="Réception"
              icon="cube-outline"
              color={actionColors.info}
              onPress={() => navigation.navigate('Reception')}
              hasPending={draftStatus.hasReceptionDraft}
            />
            <ActionButton
              title="Casse"
              icon="trash-outline"
              color={actionColors.error}
              onPress={() => navigation.navigate('Loss')}
              hasPending={draftStatus.hasLossDraft}
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
              title="Assistance"
              icon="logo-whatsapp"
              color="#25D366"
              onPress={handleWhatsAppSupport}
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
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    fontWeight: '400',
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
  statCardCompact: {
    padding: 10,
    marginBottom: 8,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statContentCompact: {
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
    flexShrink: 1,
  },
  statValueCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  statTitle: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginTop: 2,
    flexShrink: 1,
  },
  statTitleCompact: {
    fontSize: 11,
    marginTop: 1,
  },
  actionsContainer: {
    padding: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: actionColors.success,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    width: '48%',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  actionButtonContent: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.warning[500],
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  actionText: {
    color: theme.colors.text.inverse,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
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