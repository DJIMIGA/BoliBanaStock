import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { logout } from '../store/slices/authSlice';
import theme from '../utils/theme';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();

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

  const menuItems = [
    {
      id: 'configuration',
      title: 'Configuration',
      subtitle: 'Paramètres de votre entreprise',
      icon: 'settings',
      iconColor: theme.colors.primary[500],
      iconBg: theme.colors.primary[100],
      onPress: () => navigation.navigate('Configuration' as never),
    },
    {
      id: 'profile',
      title: 'Profil utilisateur',
      subtitle: 'Gérer votre compte',
      icon: 'person',
      iconColor: theme.colors.info[500],
      iconBg: theme.colors.info[100],
      onPress: () => navigation.navigate('Profile' as never),
    },
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