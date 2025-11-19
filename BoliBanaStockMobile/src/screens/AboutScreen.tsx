import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import theme from '../utils/theme';
import { getPrivacyPolicyUrl } from '../config/networkConfig';

const AboutScreen: React.FC = () => {
  const navigation = useNavigation();

  const openPrivacyPolicy = async () => {
    const url = getPrivacyPolicyUrl();
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Erreur ouverture politique de confidentialité:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="information-circle" size={24} color={theme.colors.primary[500]} />
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>À propos</Text>
          <Text style={styles.subtitle}>Informations sur l'application</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {/* Informations de l'application */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nom</Text>
            <Text style={styles.infoValue}>BoliBana Stock</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Description</Text>
            <Text style={styles.infoValue}>
              Système de gestion de stock et de point de vente pour les entreprises
            </Text>
          </View>
        </View>

        {/* Fonctionnalités */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fonctionnalités</Text>
          
          <View style={styles.featureItem}>
            <Ionicons name="cube-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.featureText}>Gestion des produits et du stock</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="calculator-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.featureText}>Point de vente (caisse)</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="people-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.featureText}>Gestion des clients</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="stats-chart-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.featureText}>Rapports et statistiques</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="barcode-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.featureText}>Génération d'étiquettes et codes-barres</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="print-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.featureText}>Impression de tickets et catalogues</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="phone-portrait-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.featureText}>Application mobile multiplateforme</Text>
          </View>
        </View>

        {/* Informations techniques */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations techniques</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plateforme</Text>
            <Text style={styles.infoValue}>React Native (iOS & Android)</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Backend</Text>
            <Text style={styles.infoValue}>Django REST Framework</Text>
          </View>
        </View>

        {/* Informations système */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Système</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dernière mise à jour</Text>
            <Text style={styles.infoValue}>
              {new Date().toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </Text>
          </View>
        </View>

        {/* Liens utiles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liens utiles</Text>
          
          <TouchableOpacity style={styles.linkItem} onPress={openPrivacyPolicy}>
            <Ionicons name="document-text-outline" size={20} color={theme.colors.info[500]} />
            <Text style={styles.linkText}>Politique de confidentialité</Text>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <Text style={styles.supportText}>
            Pour toute question ou assistance, utilisez l'option "Assistance WhatsApp" 
            dans les paramètres pour contacter notre équipe de support.
          </Text>
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#6b7280',
    flex: 2,
    textAlign: 'right',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 14,
    color: theme.colors.info[500],
    marginLeft: 12,
    flex: 1,
  },
  supportText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});

export default AboutScreen;

