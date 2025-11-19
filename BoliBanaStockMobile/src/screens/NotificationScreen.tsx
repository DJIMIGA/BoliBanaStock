import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme, { actionColors } from '../utils/theme';

const NOTIFICATION_PREFS_KEY = '@bbstock:notification_preferences';

interface NotificationPreferences {
  stockAlerts: boolean;
  lowStockAlerts: boolean;
  salesNotifications: boolean;
  systemNotifications: boolean;
}

const NotificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    stockAlerts: true,
    lowStockAlerts: true,
    salesNotifications: true,
    systemNotifications: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur chargement préférences notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Erreur sauvegarde préférences notifications:', error);
    }
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };
    savePreferences(newPreferences);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="notifications" size={24} color={theme.colors.primary[500]} />
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Gérer les alertes</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {/* Préférences de notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alertes de stock</Text>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLeft}>
              <Ionicons name="cube-outline" size={20} color={theme.colors.warning[500]} />
              <View style={styles.preferenceText}>
                <Text style={styles.preferenceTitle}>Alertes de stock faible</Text>
                <Text style={styles.preferenceSubtitle}>
                  Recevoir des notifications quand le stock est faible
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.lowStockAlerts}
              onValueChange={() => togglePreference('lowStockAlerts')}
              trackColor={{ false: theme.colors.neutral[300], true: actionColors.primary }}
              thumbColor={preferences.lowStockAlerts ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLeft}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.colors.error[500]} />
              <View style={styles.preferenceText}>
                <Text style={styles.preferenceTitle}>Alertes de rupture de stock</Text>
                <Text style={styles.preferenceSubtitle}>
                  Recevoir des notifications quand un produit est en rupture
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.stockAlerts}
              onValueChange={() => togglePreference('stockAlerts')}
              trackColor={{ false: theme.colors.neutral[300], true: actionColors.primary }}
              thumbColor={preferences.stockAlerts ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Notifications de ventes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ventes</Text>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLeft}>
              <Ionicons name="receipt-outline" size={20} color={theme.colors.success[500]} />
              <View style={styles.preferenceText}>
                <Text style={styles.preferenceTitle}>Notifications de ventes</Text>
                <Text style={styles.preferenceSubtitle}>
                  Recevoir des notifications pour les ventes importantes
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.salesNotifications}
              onValueChange={() => togglePreference('salesNotifications')}
              trackColor={{ false: theme.colors.neutral[300], true: actionColors.primary }}
              thumbColor={preferences.salesNotifications ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Notifications système */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Système</Text>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLeft}>
              <Ionicons name="settings-outline" size={20} color={theme.colors.info[500]} />
              <View style={styles.preferenceText}>
                <Text style={styles.preferenceTitle}>Notifications système</Text>
                <Text style={styles.preferenceSubtitle}>
                  Recevoir des notifications pour les mises à jour et alertes système
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.systemNotifications}
              onValueChange={() => togglePreference('systemNotifications')}
              trackColor={{ false: theme.colors.neutral[300], true: actionColors.primary }}
              thumbColor={preferences.systemNotifications ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Information */}
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.info[500]} />
            <Text style={styles.infoText}>
              Les notifications push nécessitent l'autorisation de votre appareil. 
              Vous pouvez les activer ou désactiver dans les paramètres de votre téléphone.
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
    padding: 16,
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
    marginBottom: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  preferenceText: {
    flex: 1,
    marginLeft: 12,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  preferenceSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.info[50],
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.info[700],
    lineHeight: 20,
  },
});

export default NotificationScreen;

