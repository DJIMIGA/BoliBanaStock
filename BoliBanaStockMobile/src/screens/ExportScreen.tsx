import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { configurationService } from '../services/api';
import { useUserPermissions } from '../hooks/useUserPermissions';
import theme from '../utils/theme';

const ExportScreen: React.FC = () => {
  const navigation = useNavigation();
  const { canManageSite } = useUserPermissions();
  const [exporting, setExporting] = useState(false);

  const exportConfiguration = async () => {
    if (!canManageSite) {
      Alert.alert(
        'Accès refusé',
        'Seuls les administrateurs du site peuvent exporter la configuration.'
      );
      return;
    }

    try {
      setExporting(true);
      const response = await configurationService.getConfiguration();
      
      if (response.success && response.configuration) {
        const configData = {
          export_date: new Date().toISOString(),
          version: '1.0.0',
          configuration: response.configuration,
        };

        const jsonData = JSON.stringify(configData, null, 2);
        const fileName = `bolibana_stock_config_${new Date().toISOString().split('T')[0]}.json`;

        // Utiliser Share pour partager le JSON
        const result = await Share.share({
          message: jsonData,
          title: fileName,
        });

        if (result.action === Share.sharedAction) {
          Alert.alert('Succès', 'Configuration exportée avec succès');
        }
      } else {
        throw new Error('Impossible de récupérer la configuration');
      }
    } catch (error: any) {
      console.error('Erreur export configuration:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.error || 'Impossible d\'exporter la configuration'
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="save" size={24} color={theme.colors.primary[500]} />
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Sauvegarde & Export</Text>
          <Text style={styles.subtitle}>Exporter vos données</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {/* Export de la configuration */}
        {canManageSite ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exporter la configuration</Text>
            <Text style={styles.sectionDescription}>
              Exportez la configuration de votre entreprise au format JSON. 
              Cette sauvegarde contient toutes les informations de configuration 
              de votre site.
            </Text>
            
            <TouchableOpacity
              style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
              onPress={exportConfiguration}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="download-outline" size={20} color="white" />
              )}
              <Text style={styles.exportButtonText}>
                {exporting ? 'Export en cours...' : 'Exporter la configuration'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.warningBox}>
              <Ionicons name="lock-closed" size={24} color={theme.colors.warning[500]} />
              <Text style={styles.warningText}>
                Seuls les administrateurs du site peuvent exporter la configuration.
              </Text>
            </View>
          </View>
        )}

        {/* Informations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          
          <View style={styles.infoItem}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.info[500]} />
            <Text style={styles.infoText}>
              Les données exportées sont au format JSON et peuvent être importées 
              ultérieurement si nécessaire.
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.success[500]} />
            <Text style={styles.infoText}>
              Vos données sont stockées de manière sécurisée et ne sont jamais 
              partagées avec des tiers.
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning[50],
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.warning[700],
    lineHeight: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});

export default ExportScreen;

