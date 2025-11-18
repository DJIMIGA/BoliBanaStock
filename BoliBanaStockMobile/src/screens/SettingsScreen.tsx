import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { logout } from '../store/slices/authSlice';
import { configurationService } from '../services/api';
import errorService from '../services/errorService';
import { AppError } from '../types/errors';
import theme from '../utils/theme';
import { getPrivacyPolicyUrl, getDeleteAccountUrl } from '../config/networkConfig';
import { useUserPermissions } from '../hooks/useUserPermissions';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { canManageUsers, canManageSite } = useUserPermissions();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: () => dispatch(logout()),
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

  const openPrivacyPolicy = async () => {
    const url = getPrivacyPolicyUrl();
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Information',
          'Impossible d\'ouvrir la politique de confidentialité pour le moment.'
        );
      }
    } catch (error) {
      console.error('Erreur ouverture politique de confidentialité:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de l\'ouverture de la politique de confidentialité.'
      );
    }
  };

  const openDeleteAccount = async () => {
    const url = getDeleteAccountUrl();
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Information',
          'Impossible d\'ouvrir la page de suppression de compte pour le moment.'
        );
      }
    } catch (error) {
      console.error('Erreur ouverture page suppression compte:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de l\'ouverture de la page de suppression de compte.'
      );
    }
  };

  const menuItems = [
    ...(canManageSite ? [{
      id: 'configuration',
      title: 'Configuration',
      subtitle: 'Paramètres de votre entreprise',
      icon: 'settings',
      iconColor: theme.colors.primary[500],
      iconBg: theme.colors.primary[100],
      onPress: () => navigation.navigate('Configuration' as never),
    }] : []),
    {
      id: 'profile',
      title: 'Profil utilisateur',
      subtitle: 'Gérer votre compte',
      icon: 'person',
      iconColor: theme.colors.info[500],
      iconBg: theme.colors.info[100],
      onPress: () => navigation.navigate('Profile' as never),
    },
    ...(canManageUsers ? [
      {
        id: 'employee_list',
        title: 'Liste des employés',
        subtitle: 'Voir et gérer les employés du site',
        icon: 'people',
        iconColor: theme.colors.info[500],
        iconBg: theme.colors.info[100],
        onPress: () => navigation.navigate('EmployeeList' as never),
      },
      {
        id: 'add_employee',
        title: 'Ajouter un employé',
        subtitle: 'Créer un compte pour un nouvel employé',
        icon: 'person-add',
        iconColor: theme.colors.success[500],
        iconBg: theme.colors.success[100],
        onPress: () => navigation.navigate('AddEmployee' as never),
      },
    ] : []),
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Gérer les alertes',
      icon: 'notifications',
      iconColor: theme.colors.warning[500],
      iconBg: theme.colors.warning[100],
      onPress: () => Alert.alert('Info', 'Notifications - À venir'),
    },
    {
      id: 'backup',
      title: 'Sauvegarde',
      subtitle: 'Exporter vos données',
      icon: 'save',
      iconColor: theme.colors.success[500],
      iconBg: theme.colors.success[100],
      onPress: () => Alert.alert('Info', 'Sauvegarde - À venir'),
    },
    {
      id: 'about',
      title: 'À propos',
      subtitle: 'Informations sur l\'application',
      icon: 'information-circle',
      iconColor: theme.colors.info[500],
      iconBg: theme.colors.info[100],
      onPress: () => Alert.alert('Info', 'À propos - À venir'),
    },
    {
      id: 'categories',
      title: 'Gestion des catégories',
      subtitle: 'Créer et gérer les catégories de produits',
      icon: 'folder',
      iconColor: theme.colors.secondary[500],
      iconBg: theme.colors.secondary[100],
      onPress: () => navigation.navigate('Categories' as never),
    },
    {
      id: 'brands',
      title: 'Gestion des marques',
      subtitle: 'Créer et gérer les marques de produits',
      icon: 'pricetag',
      iconColor: theme.colors.primary[500],
      iconBg: theme.colors.primary[100],
      onPress: () => navigation.navigate('Brands' as never),
    },
    {
      id: 'privacy',
      title: 'Politique de confidentialité',
      subtitle: 'Consulter le document officiel',
      icon: 'document-text',
      iconColor: theme.colors.info[500],
      iconBg: theme.colors.info[100],
      onPress: openPrivacyPolicy,
    },
    {
      id: 'whatsapp',
      title: 'Assistance WhatsApp',
      subtitle: 'Contacter le support technique',
      icon: 'logo-whatsapp',
      iconColor: '#25D366',
      iconBg: '#E8F5E9',
      onPress: handleWhatsAppSupport,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="options" size={24} color={theme.colors.primary[500]} />
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Paramètres</Text>
          <Text style={styles.subtitle}>Gérez votre application</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {/* Menu principal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Général</Text>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions de sécurité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sécurité</Text>
          <TouchableOpacity
            style={[styles.menuItem, styles.dangerItem]}
            onPress={handleLogout}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.error[100] }]}>
                <Ionicons name="log-out" size={20} color={theme.colors.error[500]} />
              </View>
              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, styles.dangerText]}>
                  Déconnexion
                </Text>
                <Text style={styles.menuSubtitle}>
                  Fermer votre session
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, styles.dangerItem]}
            onPress={openDeleteAccount}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.error[100] }]}>
                <Ionicons name="trash-outline" size={20} color={theme.colors.error[500]} />
              </View>
              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, styles.dangerText]}>
                  Supprimer mon compte
                </Text>
                <Text style={styles.menuSubtitle}>
                  Supprimer définitivement votre compte et vos données
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Informations système */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Système</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Dernière mise à jour</Text>
            <Text style={styles.infoValue}>
              {new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  headerRight: {
    width: 40,
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
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    padding: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  menuArrow: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  dangerItem: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#dc2626',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 16,
    color: '#374151',
  },
  infoValue: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});

export default SettingsScreen; 