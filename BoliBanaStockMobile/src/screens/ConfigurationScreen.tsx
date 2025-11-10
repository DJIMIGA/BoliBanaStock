import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { configurationService, loyaltyService } from '../services/api';
import theme from '../utils/theme';

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

interface LoyaltyProgram {
  id: number;
  site_configuration: number;
  site_name: string;
  points_per_amount: number;
  amount_for_points: number;
  amount_per_point: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ConfigurationScreen: React.FC = () => {
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Configuration>>({});
  
  // État pour le programme de fidélité
  const [loyaltyProgram, setLoyaltyProgram] = useState<LoyaltyProgram | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyEditing, setLoyaltyEditing] = useState(false);
  const [loyaltyFormData, setLoyaltyFormData] = useState({
    points_per_amount: '1',
    amount_for_points: '1000',
    amount_per_point: '100',
    is_active: true,
  });

  useEffect(() => {
    loadConfiguration();
    loadLoyaltyProgram();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await configurationService.getConfiguration();
      if (response.success) {
        setConfiguration(response.configuration);
        setFormData(response.configuration);
      }
    } catch (error) {
      console.error('Erreur chargement configuration:', error);
      Alert.alert('Erreur', 'Impossible de charger la configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await configurationService.updateConfiguration(formData);
      if (response.success) {
        setConfiguration(response.configuration);
        setFormData(response.configuration);
        setEditing(false);
        Alert.alert('Succès', 'Configuration mise à jour avec succès');
      }
    } catch (error) {
      console.error('Erreur sauvegarde configuration:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Réinitialiser la configuration',
      'Êtes-vous sûr de vouloir réinitialiser la configuration aux valeurs par défaut ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const response = await configurationService.resetConfiguration();
              if (response.success) {
                setConfiguration(response.configuration);
                setFormData(response.configuration);
                setEditing(false);
                Alert.alert('Succès', 'Configuration réinitialisée avec succès');
              }
            } catch (error) {
              console.error('Erreur réinitialisation:', error);
              Alert.alert('Erreur', 'Impossible de réinitialiser la configuration');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const updateFormData = (field: keyof Configuration, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const loadLoyaltyProgram = async () => {
    try {
      setLoyaltyLoading(true);
      const response = await loyaltyService.getProgram();
      if (response.success && response.program) {
        setLoyaltyProgram(response.program);
        setLoyaltyFormData({
          points_per_amount: response.program.points_per_amount?.toString() || '1',
          amount_for_points: response.program.amount_for_points?.toString() || '1000',
          amount_per_point: response.program.amount_per_point?.toString() || '100',
          is_active: response.program.is_active ?? true,
        });
      }
    } catch (error) {
      console.error('Erreur chargement programme fidélité:', error);
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const handleSaveLoyaltyProgram = async () => {
    try {
      setSaving(true);
      const programData = {
        points_per_amount: parseFloat(loyaltyFormData.points_per_amount) || 1,
        amount_for_points: parseInt(loyaltyFormData.amount_for_points) || 1000,
        amount_per_point: parseFloat(loyaltyFormData.amount_per_point) || 100,
        is_active: loyaltyFormData.is_active,
      };
      
      const response = await loyaltyService.updateProgram(programData);
      if (response.success && response.program) {
        setLoyaltyProgram(response.program);
        setLoyaltyEditing(false);
        Alert.alert('Succès', 'Programme de fidélité mis à jour avec succès');
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde programme fidélité:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.error || 'Impossible de sauvegarder le programme de fidélité'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Chargement de la configuration...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuration</Text>
        <Text style={styles.subtitle}>Paramètres de votre entreprise</Text>
      </View>

      {configuration && (
        <View style={styles.content}>
          {/* Logo */}
          {configuration.logo_url && (
            <View style={styles.logoContainer}>
              <Image source={{ uri: configuration.logo_url }} style={styles.logo} />
            </View>
          )}

          {/* Informations de base */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations de base</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom de l'entreprise</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.nom_societe || ''}
                onChangeText={(text) => updateFormData('nom_societe', text)}
                editable={editing}
                placeholder="Nom de votre entreprise"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse</Text>
              <TextInput
                style={[styles.input, styles.textArea, !editing && styles.inputDisabled]}
                value={formData.adresse || ''}
                onChangeText={(text) => updateFormData('adresse', text)}
                editable={editing}
                placeholder="Adresse de votre entreprise"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.telephone || ''}
                onChangeText={(text) => updateFormData('telephone', text)}
                editable={editing}
                placeholder="+226 XX XX XX XX"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.email || ''}
                onChangeText={(text) => updateFormData('email', text)}
                editable={editing}
                placeholder="contact@votreentreprise.com"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Paramètres commerciaux */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paramètres commerciaux</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Devise</Text>
                <TextInput
                  style={[styles.input, !editing && styles.inputDisabled]}
                  value={formData.devise || ''}
                  onChangeText={(text) => updateFormData('devise', text)}
                  editable={editing}
                  placeholder="FCFA"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>TVA (%)</Text>
                <TextInput
                  style={[styles.input, !editing && styles.inputDisabled]}
                  value={formData.tva?.toString() || ''}
                  onChangeText={(text) => updateFormData('tva', parseFloat(text) || 0)}
                  editable={editing}
                  placeholder="18"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Site web</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.site_web || ''}
                onChangeText={(text) => updateFormData('site_web', text)}
                editable={editing}
                placeholder="https://votreentreprise.com"
                keyboardType="url"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, !editing && styles.inputDisabled]}
                value={formData.description || ''}
                onChangeText={(text) => updateFormData('description', text)}
                editable={editing}
                placeholder="Description de votre entreprise"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Programme de fidélité */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="star" size={24} color={theme.colors.primary[500]} />
                <Text style={styles.sectionTitle}>Programme de fidélité</Text>
              </View>
              {!loyaltyEditing && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setLoyaltyEditing(true)}
                >
                  <Ionicons name="create-outline" size={20} color={theme.colors.primary[500]} />
                </TouchableOpacity>
              )}
            </View>

            {loyaltyLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            ) : (
              <>
                {/* Statut du programme */}
                <View style={styles.inputGroup}>
                  <View style={styles.switchRow}>
                    <View style={styles.switchLabelContainer}>
                      <Text style={styles.label}>Programme actif</Text>
                      <Text style={styles.helpText}>
                        Active ou désactive le programme de fidélité
                      </Text>
                    </View>
                    <Switch
                      value={loyaltyFormData.is_active}
                      onValueChange={(value) =>
                        setLoyaltyFormData(prev => ({ ...prev, is_active: value }))
                      }
                      disabled={!loyaltyEditing}
                      trackColor={{
                        false: theme.colors.neutral[300],
                        true: theme.colors.primary[200],
                      }}
                      thumbColor={loyaltyFormData.is_active ? theme.colors.primary[500] : theme.colors.neutral[400]}
                    />
                  </View>
                </View>

                {/* Configuration des points gagnés */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Configuration des points gagnés</Text>
                  <Text style={styles.helpText}>
                    Définissez combien de points sont gagnés pour un montant dépensé
                  </Text>
                  
                  <View style={styles.loyaltyConfigRow}>
                    <View style={styles.loyaltyConfigInput}>
                      <Text style={styles.loyaltyConfigLabel}>Points</Text>
                      <TextInput
                        style={[styles.input, !loyaltyEditing && styles.inputDisabled]}
                        value={loyaltyFormData.points_per_amount}
                        onChangeText={(text) =>
                          setLoyaltyFormData(prev => ({ ...prev, points_per_amount: text }))
                        }
                        editable={loyaltyEditing}
                        placeholder="1"
                        keyboardType="decimal-pad"
                      />
                    </View>
                    
                    <Text style={styles.loyaltyConfigEquals}>pour</Text>
                    
                    <View style={styles.loyaltyConfigInput}>
                      <Text style={styles.loyaltyConfigLabel}>FCFA dépensés</Text>
                      <TextInput
                        style={[styles.input, !loyaltyEditing && styles.inputDisabled]}
                        value={loyaltyFormData.amount_for_points}
                        onChangeText={(text) =>
                          setLoyaltyFormData(prev => ({ ...prev, amount_for_points: text }))
                        }
                        editable={loyaltyEditing}
                        placeholder="1000"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  
                  <View style={styles.exampleBox}>
                    <Ionicons name="information-circle" size={16} color={theme.colors.primary[500]} />
                    <Text style={styles.exampleText}>
                      Exemple: {loyaltyFormData.points_per_amount} point(s) pour {parseInt(loyaltyFormData.amount_for_points) || 1000} FCFA dépensés
                    </Text>
                  </View>
                </View>

                {/* Configuration de la valeur des points */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Valeur d'un point</Text>
                  <Text style={styles.helpText}>
                    Définissez la valeur en FCFA d'un point de fidélité
                  </Text>
                  
                  <View style={styles.loyaltyConfigRow}>
                    <View style={styles.loyaltyConfigInput}>
                      <Text style={styles.loyaltyConfigLabel}>1 point =</Text>
                      <TextInput
                        style={[styles.input, !loyaltyEditing && styles.inputDisabled]}
                        value={loyaltyFormData.amount_per_point}
                        onChangeText={(text) =>
                          setLoyaltyFormData(prev => ({ ...prev, amount_per_point: text }))
                        }
                        editable={loyaltyEditing}
                        placeholder="100"
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <Text style={styles.loyaltyConfigEquals}>FCFA de réduction</Text>
                  </View>
                  
                  <View style={styles.exampleBox}>
                    <Ionicons name="information-circle" size={16} color={theme.colors.primary[500]} />
                    <Text style={styles.exampleText}>
                      Exemple: 1 point = {parseFloat(loyaltyFormData.amount_per_point) || 100} FCFA de réduction
                    </Text>
                  </View>
                </View>

                {/* Actions pour la fidélité */}
                {loyaltyEditing && (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonSecondary]}
                      onPress={() => {
                        if (loyaltyProgram) {
                          setLoyaltyFormData({
                            points_per_amount: loyaltyProgram.points_per_amount?.toString() || '1',
                            amount_for_points: loyaltyProgram.amount_for_points?.toString() || '1000',
                            amount_per_point: loyaltyProgram.amount_per_point?.toString() || '100',
                            is_active: loyaltyProgram.is_active ?? true,
                          });
                        }
                        setLoyaltyEditing(false);
                      }}
                      disabled={saving}
                    >
                      <Text style={styles.buttonTextSecondary}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonPrimary]}
                      onPress={handleSaveLoyaltyProgram}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.buttonTextPrimary}>Sauvegarder</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {editing ? (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={() => {
                    setFormData(configuration);
                    setEditing(false);
                  }}
                  disabled={saving}
                >
                  <Text style={styles.buttonTextSecondary}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.buttonTextPrimary}>Sauvegarder</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={handleReset}
                  disabled={saving}
                >
                  <Text style={styles.buttonTextSecondary}>Réinitialiser</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={() => setEditing(true)}
                  disabled={saving}
                >
                  <Text style={styles.buttonTextPrimary}>Modifier</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Informations de version */}
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              Créé le: {new Date(configuration.created_at).toLocaleDateString()}
            </Text>
            <Text style={styles.infoText}>
              Modifié le: {new Date(configuration.updated_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  content: {
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    resizeMode: 'cover',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputDisabled: {
    backgroundColor: '#f9fafb',
    color: '#6b7280',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  actions: {
    marginTop: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#1e40af',
  },
  buttonSecondary: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  buttonTextPrimary: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  helpText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  loyaltyConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  loyaltyConfigInput: {
    flex: 1,
  },
  loyaltyConfigLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  loyaltyConfigEquals: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 20,
  },
  exampleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  exampleText: {
    fontSize: 13,
    color: theme.colors.primary[700],
    flex: 1,
  },
});

export default ConfigurationScreen; 