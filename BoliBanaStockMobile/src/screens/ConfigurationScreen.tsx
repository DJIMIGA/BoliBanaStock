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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { configurationService, loyaltyService } from '../services/api';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { updateCache } from '../hooks';
import theme from '../utils/theme';
import { formatAmount } from '../utils/currencyFormatter';

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
  currency?: string;
  points_per_amount: number;
  amount_for_points: number;
  amount_per_point: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ConfigurationScreen: React.FC = () => {
  const navigation = useNavigation();
  const { canManageSite, loading: permissionsLoading } = useUserPermissions();
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Configuration>>({});
  
  // État pour les devises disponibles
  const [currencies, setCurrencies] = useState<Array<{code: string, name: string}>>([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(false);
  
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
    if (!permissionsLoading && !canManageSite) {
      Alert.alert(
        'Accès refusé',
        'Seuls les administrateurs du site peuvent accéder à la configuration.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }
    
    if (canManageSite) {
      loadConfiguration();
      loadLoyaltyProgram();
      loadCurrencies();
    }
  }, [canManageSite, permissionsLoading]);

  const loadCurrencies = async () => {
    try {
      setCurrenciesLoading(true);
      const response = await configurationService.getCurrencies();
      if (response.success) {
        setCurrencies(response.currencies || []);
        console.log('✅ [CONFIG] Devises chargées:', response.currencies?.length || 0, 'devises disponibles');
      }
    } catch (error) {
      console.error('❌ [CONFIG] Erreur chargement devises:', error);
      // Fallback sur une liste par défaut si l'API échoue
      setCurrencies([{code: 'FCFA', name: 'Franc CFA (FCFA)'}]);
    } finally {
      setCurrenciesLoading(false);
    }
  };

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await configurationService.getConfiguration();
      if (response.success) {
        setConfiguration(response.configuration);
        setFormData(response.configuration);
        console.log('✅ [CONFIG] Configuration chargée - Devise actuelle:', response.configuration?.devise || 'Non définie');
      }
    } catch (error) {
      console.error('❌ [CONFIG] Erreur chargement configuration:', error);
      Alert.alert('Erreur', 'Impossible de charger la configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('💾 [CONFIG] Sauvegarde configuration - Devise:', formData.devise);
      const response = await configurationService.updateConfiguration(formData);
      if (response.success) {
        const updatedConfig = response.configuration;
        setConfiguration(updatedConfig);
        setFormData(updatedConfig);
        console.log('✅ [CONFIG] Configuration sauvegardée - Devise:', updatedConfig?.devise);
        
        // Mettre à jour le cache global pour que tous les écrans utilisent la nouvelle devise
        if (updatedConfig) {
          updateCache(updatedConfig);
          console.log('🔄 [CONFIG] Cache global mis à jour - Tous les écrans utiliseront:', updatedConfig.devise);
        }
        
        setEditing(false);
        Alert.alert('Succès', 'Configuration mise à jour avec succès');
      }
    } catch (error) {
      console.error('❌ [CONFIG] Erreur sauvegarde configuration:', error);
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


  if (permissionsLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Chargement de la configuration...</Text>
      </View>
    );
  }

  if (!canManageSite) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="lock-closed" size={64} color="#dc2626" />
        <Text style={[styles.loadingText, { marginTop: 16, color: '#dc2626', fontWeight: 'bold' }]}>
          Accès refusé
        </Text>
        <Text style={[styles.loadingText, { marginTop: 8 }]}>
          Seuls les administrateurs du site peuvent accéder à la configuration.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Configuration</Text>
          <Text style={styles.subtitle}>Paramètres de votre entreprise</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {configuration && (
        <View style={styles.content}>
          {/* Logo */}
          {configuration.logo_url && (
            <View style={styles.logoContainer}>
              <Image source={{ uri: configuration.logo_url }} style={styles.logo} />
            </View>
          )}

          {/* Configuration générale */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Configuration générale</Text>
            </View>
            
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

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Devise</Text>
                {editing ? (
                  <View style={[styles.input, styles.pickerContainer]}>
                    {currenciesLoading ? (
                      <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                    ) : (
                      <Picker
                        selectedValue={formData.devise || 'FCFA'}
                        onValueChange={(itemValue) => {
                          console.log('💰 [CONFIG] Devise sélectionnée:', itemValue);
                          const selectedCurrency = currencies.find(c => c.code === itemValue);
                          console.log('💰 [CONFIG] Détails devise:', selectedCurrency);
                          updateFormData('devise', itemValue);
                        }}
                        style={styles.picker}
                        dropdownIconColor={theme.colors.text.primary}
                      >
                        {currencies.map((currency) => (
                          <Picker.Item
                            key={currency.code}
                            label={currency.name}
                            value={currency.code}
                          />
                        ))}
                      </Picker>
                    )}
                  </View>
                ) : (
                  <View style={[styles.input, styles.inputDisabled]}>
                    <Text style={styles.inputDisabled}>
                      {currencies.find(c => c.code === formData.devise)?.name || formData.devise || 'FCFA'}
                    </Text>
                  </View>
                )}
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
          <View style={[styles.section, styles.loyaltySection]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="star" size={20} color={theme.colors.primary[500]} />
                <Text style={styles.sectionTitle}>Fidélité</Text>
              </View>
            </View>

            {loyaltyLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary[500]} />
            ) : (
              <>
                {/* Statut du programme - Compact */}
                <View style={styles.switchRowCompact}>
                  <Text style={styles.labelCompact}>Programme actif</Text>
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

                {/* Séparateur */}
                <View style={styles.loyaltySeparator} />

                {/* Configuration compacte */}
                <View style={styles.loyaltyCompactGrid}>
                  <View style={styles.loyaltyCompactItem}>
                    <Text style={styles.loyaltyCompactLabel}>Points gagnés</Text>
                    <View style={styles.loyaltyInlineRow}>
                      <TextInput
                        style={[styles.inputCompact, !loyaltyEditing && styles.inputDisabled]}
                        value={Math.round(parseFloat(loyaltyFormData.points_per_amount) || 1).toString()}
                        onChangeText={(text) =>
                          setLoyaltyFormData(prev => ({ ...prev, points_per_amount: text.replace(/[^0-9]/g, '') }))
                        }
                        editable={loyaltyEditing}
                        placeholder="1"
                        keyboardType="numeric"
                      />
                      <Text style={styles.loyaltyInlineText}>pt pour</Text>
                      {loyaltyEditing ? (
                        <TextInput
                          style={[styles.inputCompact, !loyaltyEditing && styles.inputDisabled]}
                          value={loyaltyFormData.amount_for_points}
                          onChangeText={(text) =>
                            setLoyaltyFormData(prev => ({ ...prev, amount_for_points: text.replace(/[^0-9.,]/g, '').replace(',', '.') }))
                          }
                          editable={loyaltyEditing}
                          placeholder="1000"
                          keyboardType="numeric"
                        />
                      ) : (
                        <>
                          <Text style={styles.loyaltyFormattedAmount}>
                            {formatAmount(parseFloat(loyaltyFormData.amount_for_points) || 0, configuration?.devise || 'FCFA')}
                          </Text>
                          <Text style={styles.loyaltyCurrencyText}>{configuration?.devise || 'FCFA'}</Text>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={styles.loyaltyCompactItem}>
                    <Text style={styles.loyaltyCompactLabel}>Valeur d'un point</Text>
                    <View style={styles.loyaltyInlineRow}>
                      <Text style={styles.loyaltyInlineText}>1 pt =</Text>
                      <TextInput
                        style={[styles.inputCompact, !loyaltyEditing && styles.inputDisabled]}
                        value={Math.round(parseFloat(loyaltyFormData.amount_per_point) || 100).toString()}
                        onChangeText={(text) =>
                          setLoyaltyFormData(prev => ({ ...prev, amount_per_point: text.replace(/[^0-9]/g, '') }))
                        }
                        editable={loyaltyEditing}
                        placeholder="100"
                        keyboardType="numeric"
                      />
                      <Text style={styles.loyaltyCurrencyText}>{configuration?.devise || 'FCFA'}</Text>
                    </View>
                  </View>
                </View>

              </>
            )}
          </View>
        </View>
      )}
        </ScrollView>
        
        {/* Actions communes - Collées en bas */}
        <SafeAreaView edges={['bottom']} style={styles.commonActionsContainer}>
        {editing ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => {
                setFormData(configuration);
                setEditing(false);
                setLoyaltyEditing(false);
                if (loyaltyProgram) {
                  setLoyaltyFormData({
                    points_per_amount: loyaltyProgram.points_per_amount?.toString() || '1',
                    amount_for_points: loyaltyProgram.amount_for_points?.toString() || '1000',
                    amount_per_point: loyaltyProgram.amount_per_point?.toString() || '100',
                    is_active: loyaltyProgram.is_active ?? true,
                  });
                }
              }}
              disabled={saving}
            >
              <Text style={styles.buttonTextSecondary}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={async () => {
                await handleSave();
                if (loyaltyEditing) {
                  await handleSaveLoyaltyProgram();
                }
              }}
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
              onPress={() => {
                setEditing(true);
                setLoyaltyEditing(true);
              }}
              disabled={saving}
            >
              <Text style={styles.buttonTextPrimary}>Modifier</Text>
            </TouchableOpacity>
          </View>
        )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '400',
  },
  content: {
    padding: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
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
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  loyaltySection: {
    padding: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: theme.colors.neutral[200],
    marginVertical: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  labelCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: 'white',
  },
  inputCompact: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: 'white',
    minWidth: 60,
    textAlign: 'center',
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  actions: {
    marginTop: 0,
    marginBottom: 0,
  },
  commonActions: {
    marginTop: 4,
    marginBottom: 0,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  commonActionsContainer: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  loyaltyButtonRow: {
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 12,
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
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
    paddingBottom: 0,
  },
  loyaltySeparator: {
    height: 1,
    backgroundColor: theme.colors.neutral[200],
    marginVertical: 14,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  helpText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  loyaltyCompactGrid: {
    gap: 12,
  },
  loyaltyCompactItem: {
    gap: 6,
  },
  loyaltyCompactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  loyaltyInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  loyaltyInlineText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  loyaltyCurrencyText: {
    fontSize: 13,
    color: theme.colors.primary[600],
    fontWeight: '600',
  },
  loyaltyFormattedAmount: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
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