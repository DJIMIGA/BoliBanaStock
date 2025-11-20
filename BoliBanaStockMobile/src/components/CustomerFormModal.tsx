import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
  Animated,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import { customerService, loyaltyService } from '../services/api';
import { getCachedCurrency } from '../hooks/useConfiguration';

const { width, height } = Dimensions.get('window');

interface CustomerFormModalProps {
  visible: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: any) => void;
  editingCustomer?: any; // Pour l'édition
}

export default function CustomerFormModal({
  visible,
  onClose,
  onCustomerCreated,
  editingCustomer,
}: CustomerFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    first_name: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: '',
  });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [joinLoyalty, setJoinLoyalty] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(height)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const fieldPositions = useRef<{ [key: string]: number }>({});

  const isEditing = !!editingCustomer;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      if (isEditing) {
        setFormData({
          name: editingCustomer.name || '',
          first_name: editingCustomer.first_name || '',
          phone: editingCustomer.phone || '',
          email: editingCustomer.email || '',
          address: editingCustomer.address || '',
          credit_limit: editingCustomer.credit_limit?.toString() || '',
        });
        setJoinLoyalty(editingCustomer.is_loyalty_member || false);
        setShowAdvancedFields(true); // Afficher tous les champs en mode édition
      } else {
        // Réinitialiser pour nouveau client
        setFormData({
          name: '',
          first_name: '',
          phone: '',
          email: '',
          address: '',
          credit_limit: '',
        });
        setJoinLoyalty(false);
        setShowAdvancedFields(false);
      }
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, isEditing, editingCustomer]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (formData.phone && !/^[+]?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Format de téléphone invalide';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (formData.credit_limit && (isNaN(Number(formData.credit_limit)) || Number(formData.credit_limit) < 0)) {
      newErrors.credit_limit = 'La limite de crédit doit être un nombre positif';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearchByPhone = async () => {
    if (!formData.phone.trim()) {
      setErrors({ phone: 'Veuillez saisir un numéro de téléphone' });
      return;
    }

    setChecking(true);
    try {
      // Utiliser search pour rechercher par téléphone
      const existingCustomers = await customerService.getCustomers({
        search: formData.phone.trim(),
      });
      
      // Vérifier si on a trouvé un client avec ce numéro exact
      const customers = existingCustomers.results || existingCustomers || [];
      const existingCustomer = customers.find((c: any) => 
        c.phone && c.phone.trim() === formData.phone.trim()
      );
      
      if (existingCustomer) {
        Alert.alert(
          'Client trouvé',
          `Un client existe déjà avec ce numéro :\n\n${existingCustomer.name} ${existingCustomer.first_name || ''}\n${existingCustomer.phone}\n\nVoulez-vous utiliser ce client ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Utiliser ce client',
              onPress: () => {
                onCustomerCreated(existingCustomer);
                handleClose();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Aucun client trouvé',
          'Aucun client n\'existe avec ce numéro de téléphone. Vous pouvez créer un nouveau client.'
        );
      }
    } catch (error: any) {
      console.error('Erreur lors de la recherche:', error);
      Alert.alert(
        'Erreur',
        'Impossible de rechercher le client. Veuillez réessayer.'
      );
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Vérifier si un client existe déjà avec ce numéro de téléphone (sauf en mode édition)
      if (!isEditing && formData.phone.trim()) {
        try {
          // Utiliser search pour rechercher par téléphone (l'API supporte search_fields incluant phone)
          const existingCustomers = await customerService.getCustomers({
            search: formData.phone.trim(),
          });
          
          // Vérifier si on a trouvé un client avec ce numéro exact
          const customers = existingCustomers.results || existingCustomers || [];
          const existingCustomer = customers.find((c: any) => 
            c.phone && c.phone.trim() === formData.phone.trim()
          );
          
          if (existingCustomer) {
            Alert.alert(
              'Client existant',
              `Un client existe déjà avec ce numéro de téléphone :\n\n${existingCustomer.name} ${existingCustomer.first_name || ''}\n${existingCustomer.phone}\n\nVoulez-vous utiliser ce client ?`,
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Utiliser ce client',
                  onPress: () => {
                    onCustomerCreated(existingCustomer);
                    handleClose();
                  },
                },
              ]
            );
            setLoading(false);
            return;
          }
        } catch (error) {
          // Si erreur lors de la vérification, continuer quand même
          console.error('Erreur lors de la vérification du client:', error);
        }
      }
      
      const customerData = {
        name: formData.name.trim(),
        first_name: formData.first_name.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        credit_limit: formData.credit_limit ? Number(formData.credit_limit) : null,
      };

      let customer;
      if (isEditing) {
        // En mode édition, vérifier si le numéro change et s'il existe déjà
        if (formData.phone.trim() && formData.phone.trim() !== editingCustomer.phone) {
          try {
            // Utiliser search pour rechercher par téléphone
            const existingCustomers = await customerService.getCustomers({
              search: formData.phone.trim(),
            });
            
            const customers = existingCustomers.results || existingCustomers || [];
            const existingCustomer = customers.find((c: any) => 
              c.phone && c.phone.trim() === formData.phone.trim() && c.id !== editingCustomer.id
            );
            
            if (existingCustomer) {
              Alert.alert(
                'Numéro déjà utilisé',
                `Ce numéro de téléphone est déjà utilisé par un autre client :\n\n${existingCustomer.name} ${existingCustomer.first_name || ''}\n\nVeuillez choisir un autre numéro.`
              );
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error('Erreur lors de la vérification du numéro:', error);
          }
        }
        
        // Gérer l'inscription/désinscription à la fidélité
        if (joinLoyalty && !editingCustomer.is_loyalty_member) {
          // Inscrire le client à la fidélité
          try {
            const response = await loyaltyService.createAccount({
              phone: formData.phone.trim(),
              name: formData.name.trim(),
              first_name: formData.first_name.trim() || undefined,
            });
            if (response.success && response.customer) {
              customer = response.customer;
              // Mettre à jour les autres champs si nécessaire
              if (formData.email || formData.address || formData.credit_limit) {
                const updateData: any = {};
                if (formData.email) updateData.email = formData.email.trim();
                if (formData.address) updateData.address = formData.address.trim();
                if (formData.credit_limit) updateData.credit_limit = Number(formData.credit_limit);
                if (Object.keys(updateData).length > 0) {
                  customer = await customerService.updateCustomer(customer.id, updateData);
                }
              }
            } else {
              // Si l'inscription échoue, mettre à jour le client normalement
              customer = await customerService.updateCustomer(editingCustomer.id, customerData);
            }
          } catch (error) {
            console.error('Erreur lors de l\'inscription à la fidélité:', error);
            // Continuer avec la mise à jour normale
            customer = await customerService.updateCustomer(editingCustomer.id, customerData);
          }
        } else if (!joinLoyalty && editingCustomer.is_loyalty_member) {
          // Désinscrire le client (mettre à jour is_loyalty_member via l'API)
          try {
            customer = await customerService.updateCustomer(editingCustomer.id, {
              ...customerData,
              is_loyalty_member: false,
            });
          } catch (error) {
            console.error('Erreur lors de la désinscription:', error);
            // Continuer avec la mise à jour normale
            customer = await customerService.updateCustomer(editingCustomer.id, customerData);
          }
        } else {
          // Mettre à jour le client normalement (pas de changement de statut fidélité)
          customer = await customerService.updateCustomer(editingCustomer.id, customerData);
        }
        
        // Récupérer le client complet depuis l'API pour avoir tous les champs à jour
        try {
          const refreshedCustomer = await customerService.getCustomer(customer.id);
          customer = refreshedCustomer;
        } catch (error) {
          console.error('Erreur lors du rafraîchissement du client:', error);
          // Continuer avec le client retourné par updateCustomer
        }
      } else {
        // Si inscription à la fidélité, utiliser loyaltyService (qui vérifie déjà les doublons)
        if (joinLoyalty) {
          const response = await loyaltyService.createAccount({
            phone: formData.phone.trim(),
            name: formData.name.trim(),
            first_name: formData.first_name.trim() || undefined,
          });
          
          if (response.success && response.customer) {
            customer = response.customer;
            
            // Mettre à jour les autres champs si fournis
            if (formData.email || formData.address || formData.credit_limit) {
              const updateData: any = {};
              if (formData.email) updateData.email = formData.email.trim();
              if (formData.address) updateData.address = formData.address.trim();
              if (formData.credit_limit) updateData.credit_limit = Number(formData.credit_limit);
              
              if (Object.keys(updateData).length > 0) {
                customer = await customerService.updateCustomer(customer.id, updateData);
              }
            }
          } else {
            throw new Error(response.error || 'Impossible de créer le compte de fidélité');
          }
        } else {
          customer = await customerService.createCustomer(customerData);
        }
      }

      const loyaltyMessage = isEditing 
        ? (joinLoyalty && !editingCustomer.is_loyalty_member 
            ? '\n\nInscrit au programme de fidélité'
            : (!joinLoyalty && editingCustomer.is_loyalty_member
                ? '\n\nDésinscrit du programme de fidélité'
                : ''))
        : (joinLoyalty ? '\n\nInscrit au programme de fidélité' : '');
      
      Alert.alert(
        'Succès',
        `Client ${isEditing ? 'modifié' : 'créé'} avec succès !${loyaltyMessage}`,
        [{ text: 'OK' }]
      );

      onCustomerCreated(customer);
      handleClose();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.error || error.response?.data?.detail || error.message || 'Impossible de sauvegarder le client.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      first_name: '',
      phone: '',
      email: '',
      address: '',
      credit_limit: '',
    });
    setErrors({});
    setShowAdvancedFields(false);
    setJoinLoyalty(false);
    onClose();
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerIcon}>
                <Ionicons 
                  name={isEditing ? "person-circle" : "person-add"} 
                  size={24} 
                  color={theme.colors.primary[500]} 
                />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>
                  {isEditing ? 'Modifier le Client' : 'Ajouter un Client'}
                </Text>
                <Text style={styles.subtitle}>
                  {isEditing ? 'Modifiez les informations du client' : 'Créez un nouveau client ou recherchez un client existant'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            {/* Téléphone avec recherche */}
            <View 
              style={styles.fieldContainer}
              onLayout={(event) => {
                const { y } = event.nativeEvent.layout;
                fieldPositions.current.phone = y;
              }}
            >
              <Text style={styles.fieldLabel}>
                Téléphone <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, errors.phone && styles.inputContainerError]}>
                  <Ionicons name="call" size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
                  <TextInput
                    ref={(ref) => { inputRefs.current.phone = ref; }}
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={(value) => updateFormData('phone', value)}
                    placeholder="+223 XX XX XX XX"
                    placeholderTextColor={theme.colors.text.secondary}
                    keyboardType="phone-pad"
                    onFocus={() => {
                      setTimeout(() => {
                        const position = fieldPositions.current.phone || 0;
                        scrollViewRef.current?.scrollTo({ y: Math.max(0, position - 20), animated: true });
                      }, 100);
                    }}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.searchButton, checking && styles.searchButtonDisabled]}
                  onPress={handleSearchByPhone}
                  disabled={checking || !formData.phone.trim()}
                >
                  {checking ? (
                    <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                  ) : (
                    <Ionicons name="search" size={20} color={theme.colors.primary[500]} />
                  )}
                </TouchableOpacity>
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              <Text style={styles.helpText}>
                Cliquez sur la loupe pour rechercher un client existant
              </Text>
            </View>

            {/* Nom (requis) */}
            <View 
              style={styles.fieldContainer}
              onLayout={(event) => {
                const { y } = event.nativeEvent.layout;
                fieldPositions.current.name = y;
              }}
            >
              <Text style={styles.fieldLabel}>
                Nom <Text style={styles.required}>*</Text>
              </Text>
                <View style={[styles.inputContainer, errors.name && styles.inputContainerError]}>
                  <Ionicons name="person" size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
                  <TextInput
                    ref={(ref) => { inputRefs.current.name = ref; }}
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(value) => updateFormData('name', value)}
                    placeholder="Nom de famille"
                    placeholderTextColor={theme.colors.text.secondary}
                    autoCapitalize="words"
                    onFocus={() => {
                      setTimeout(() => {
                        const position = fieldPositions.current.name || 0;
                        scrollViewRef.current?.scrollTo({ y: Math.max(0, position - 20), animated: true });
                      }, 100);
                    }}
                  />
              </View>
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Prénom */}
            <View 
              style={styles.fieldContainer}
              onLayout={(event) => {
                const { y } = event.nativeEvent.layout;
                fieldPositions.current.first_name = y;
              }}
            >
              <Text style={styles.fieldLabel}>Prénom</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
                <TextInput
                  ref={(ref) => { inputRefs.current.first_name = ref; }}
                  style={styles.input}
                  value={formData.first_name}
                  onChangeText={(value) => updateFormData('first_name', value)}
                  placeholder="Prénom (optionnel)"
                  placeholderTextColor={theme.colors.text.secondary}
                  autoCapitalize="words"
                  onFocus={() => {
                    setTimeout(() => {
                      const position = fieldPositions.current.first_name || 0;
                      scrollViewRef.current?.scrollTo({ y: Math.max(0, position - 20), animated: true });
                    }, 100);
                  }}
                />
              </View>
            </View>

            {/* Option Fidélité */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Programme de fidélité {!isEditing && '(optionnel)'}</Text>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setJoinLoyalty(!joinLoyalty)}
              >
                <View style={[styles.checkbox, joinLoyalty && styles.checkboxChecked]}>
                  {joinLoyalty && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
                <View style={styles.checkboxLabel}>
                  <Ionicons name="star" size={20} color={theme.colors.primary[500]} />
                  <View style={styles.checkboxTextContainer}>
                    <Text style={styles.checkboxText}>
                      {isEditing ? 'Membre du programme de fidélité' : 'Inscrire au programme de fidélité'}
                    </Text>
                    <Text style={styles.checkboxSubtext}>
                      {isEditing 
                        ? 'Le client peut gagner et utiliser des points lors des achats'
                        : 'Le client pourra gagner et utiliser des points lors des achats'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              {!isEditing && (
                <Text style={styles.helpText}>
                  Vous pouvez créer un client sans l'inscrire à la fidélité. L'inscription peut être faite plus tard.
                </Text>
              )}
            </View>

            {/* Bouton pour afficher/masquer les champs avancés */}
            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => setShowAdvancedFields(!showAdvancedFields)}
            >
              <Text style={styles.expandButtonText}>
                {showAdvancedFields ? 'Masquer' : 'Afficher'} les informations supplémentaires
              </Text>
              <Ionicons
                name={showAdvancedFields ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.primary[500]}
              />
            </TouchableOpacity>

            {/* Champs avancés (dans un accordéon) */}
            {showAdvancedFields && (
              <View style={styles.advancedFields}>
                {/* Email */}
                <View 
                  style={styles.fieldContainer}
                  onLayout={(event) => {
                    const { y } = event.nativeEvent.layout;
                    fieldPositions.current.email = y;
                  }}
                >
                  <Text style={styles.fieldLabel}>Email</Text>
                  <View style={[styles.inputContainer, errors.email && styles.inputContainerError]}>
                    <Ionicons name="mail-outline" size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
                    <TextInput
                      ref={(ref) => { inputRefs.current.email = ref; }}
                      style={styles.input}
                      value={formData.email}
                      onChangeText={(value) => updateFormData('email', value)}
                      placeholder="email@exemple.com"
                      placeholderTextColor={theme.colors.text.secondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onFocus={() => {
                        setTimeout(() => {
                          const position = fieldPositions.current.email || 0;
                          scrollViewRef.current?.scrollTo({ y: Math.max(0, position - 20), animated: true });
                        }, 100);
                      }}
                    />
                  </View>
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                {/* Adresse */}
                <View 
                  style={styles.fieldContainer}
                  onLayout={(event) => {
                    const { y } = event.nativeEvent.layout;
                    fieldPositions.current.address = y;
                  }}
                >
                  <Text style={styles.fieldLabel}>Adresse</Text>
                  <View style={[styles.inputContainer, styles.textAreaContainer]}>
                    <Ionicons name="location-outline" size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
                    <TextInput
                      ref={(ref) => { inputRefs.current.address = ref; }}
                      style={[styles.input, styles.textArea]}
                      value={formData.address}
                      onChangeText={(value) => updateFormData('address', value)}
                      placeholder="Adresse complète"
                      placeholderTextColor={theme.colors.text.secondary}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      onFocus={() => {
                        setTimeout(() => {
                          const position = fieldPositions.current.address || 0;
                          scrollViewRef.current?.scrollTo({ y: Math.max(0, position - 20), animated: true });
                        }, 100);
                      }}
                    />
                  </View>
                </View>

                {/* Limite de crédit */}
                <View 
                  style={styles.fieldContainer}
                  onLayout={(event) => {
                    const { y } = event.nativeEvent.layout;
                    fieldPositions.current.credit_limit = y;
                  }}
                >
                  <Text style={styles.fieldLabel}>Limite de crédit ({getCachedCurrency()})</Text>
                  <View style={[styles.inputContainer, errors.credit_limit && styles.inputContainerError]}>
                    <Ionicons name="card-outline" size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
                    <TextInput
                      ref={(ref) => { inputRefs.current.credit_limit = ref; }}
                      style={styles.input}
                      value={formData.credit_limit}
                      onChangeText={(value) => updateFormData('credit_limit', value)}
                      placeholder="0"
                      placeholderTextColor={theme.colors.text.secondary}
                      keyboardType="numeric"
                      onFocus={() => {
                        setTimeout(() => {
                          const position = fieldPositions.current.credit_limit || 0;
                          scrollViewRef.current?.scrollTo({ y: Math.max(0, position - 20), animated: true });
                        }, 100);
                      }}
                    />
                  </View>
                  {errors.credit_limit && <Text style={styles.errorText}>{errors.credit_limit}</Text>}
                  <Text style={styles.helpText}>
                    Laisser vide pour aucune limite
                  </Text>
                </View>
              </View>
            )}
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Ionicons name="close-circle-outline" size={20} color={theme.colors.text.primary} />
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="white" style={styles.buttonIcon} />
                  <Text style={styles.saveButtonText}>Enregistrement...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" style={styles.buttonIcon} />
                  <Text style={styles.saveButtonText}>
                    {isEditing ? 'Modifier' : 'Créer le client'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area bottom
    height: height, // Plein écran
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  required: {
    color: theme.colors.error[500],
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    paddingVertical: 0,
    minHeight: 24,
  },
  inputError: {
    borderColor: theme.colors.error[500],
  },
  textArea: {
    height: 100, // Augmenté de 80 à 100
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error[500],
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background.primary,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.neutral[100],
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    ...theme.shadows.md,
  },
  buttonIcon: {
    marginRight: 0,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.neutral[300],
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainerError: {
    borderColor: theme.colors.error[500],
  },
  inputIcon: {
    marginRight: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.primary[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.primary[500],
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  checkboxLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  checkboxText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  checkboxSubtext: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.neutral[100],
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  advancedFields: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingTop: 12,
  },
});
