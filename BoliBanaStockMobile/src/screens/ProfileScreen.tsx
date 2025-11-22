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
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import theme, { actionColors } from '../utils/theme';
import { User } from '../types';
import { profileService } from '../services/api';
import { updateUser, logout } from '../store/slices/authSlice';
import { notifyKeepAwakeChanged } from '../hooks/useKeepAwake';
import { getDeleteAccountUrl } from '../config/networkConfig';
import { Linking } from 'react-native';

const KEEP_SCREEN_AWAKE_KEY = '@bbstock:keep_screen_awake';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [notifications, setNotifications] = useState(true);
  const [keepScreenAwake, setKeepScreenAwake] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Charger les préférences depuis AsyncStorage
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const keepAwakeValue = await AsyncStorage.getItem(KEEP_SCREEN_AWAKE_KEY);
        if (keepAwakeValue !== null) {
          setKeepScreenAwake(JSON.parse(keepAwakeValue));
        }
      } catch (error) {
        console.error('Erreur chargement préférences:', error);
      }
    };
    loadPreferences();
  }, []);

  // Sauvegarder le paramètre keepScreenAwake
  const handleKeepScreenAwakeChange = async (value: boolean) => {
    try {
      setKeepScreenAwake(value);
      await AsyncStorage.setItem(KEEP_SCREEN_AWAKE_KEY, JSON.stringify(value));
      console.log('🔋 Préférence écran sauvegardée:', value ? 'écran allumé' : 'veille activée');
      // Notifier les autres composants du changement
      notifyKeepAwakeChanged();
    } catch (error) {
      console.error('Erreur sauvegarde préférence écran:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la préférence');
    }
  };

  // Charger les données du profil depuis l'API
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const response = await profileService.getProfile();
        if (response.success) {
          // Mettre à jour le store Redux avec les données fraîches
          dispatch(updateUser(response.user));
          setFormData({
            username: response.user.username,
            email: response.user.email || '',
            first_name: response.user.first_name || '',
            last_name: response.user.last_name || '',
            telephone: response.user.telephone || '',
            poste: response.user.poste || '',
            adresse: response.user.adresse || '',
          });
        }
      } catch (error) {
        console.error('Erreur chargement profil:', error);
        // En cas d'erreur, utiliser les données du store
        if (user) {
          setFormData({
            username: user.username,
            email: user.email || '',
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            telephone: user.telephone || '',
            poste: user.poste || '',
            adresse: user.adresse || '',
          });
        }
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [dispatch]);

  // Mettre à jour formData quand user change
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        telephone: user.telephone || '',
        poste: user.poste || '',
        adresse: user.adresse || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await profileService.updateProfile(formData);
      
      if (response.success) {
        // Mettre à jour le store Redux avec les nouvelles données
        dispatch(updateUser(response.user));
        setEditing(false);
        Alert.alert('Succès', 'Profil mis à jour avec succès');
      } else {
        Alert.alert('Erreur', response.error || 'Erreur lors de la mise à jour');
      }
    } catch (error: any) {
      console.error('Erreur mise à jour profil:', error);
      let errorMessage = 'Impossible de mettre à jour le profil';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.details) {
        // Afficher les erreurs de validation
        const details = error.response.data.details;
        const errorDetails = Object.entries(details)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors[0] : errors}`)
          .join('\n');
        errorMessage = `Erreurs de validation:\n${errorDetails}`;
      }
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
  };

  const handleConfirmChangePassword = async () => {
    // Validation côté client
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Tous les champs sont requis');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    try {
      setLoading(true);
      const response = await profileService.changePassword(oldPassword, newPassword, confirmPassword);
      
      if (response.success) {
        setShowChangePasswordModal(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowOldPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        Alert.alert('Succès', response.message || 'Mot de passe modifié avec succès');
      } else {
        Alert.alert('Erreur', response.error || 'Erreur lors du changement de mot de passe');
      }
    } catch (error: any) {
      console.error('Erreur changement mot de passe:', error);
      const errorMessage = error.response?.data?.error || 'Erreur lors du changement de mot de passe';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données seront supprimées définitivement dans les 30 jours.\n\nVoulez-vous continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Voir les instructions',
          onPress: () => {
            const url = getDeleteAccountUrl();
            Linking.openURL(url).catch((err) => {
              console.error('Erreur ouverture URL:', err);
              Alert.alert('Erreur', 'Impossible d\'ouvrir la page de suppression de compte');
            });
          },
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            // Ouvrir le modal pour demander le mot de passe
            setShowDeleteModal(true);
          },
        },
      ]
    );
  };

  const handleConfirmDelete = async () => {
    if (!deletePassword) {
      Alert.alert('Erreur', 'Le mot de passe est requis');
      return;
    }
    try {
      setLoading(true);
      const response = await profileService.deleteAccount(deletePassword);
      if (response.success) {
        setShowDeleteModal(false);
        setDeletePassword('');
        setShowDeletePassword(false);
        Alert.alert(
          'Compte désactivé',
          response.message || 'Votre compte a été désactivé. La suppression définitive sera effectuée dans les 30 jours.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Déconnexion automatique
                dispatch(logout());
              },
            },
          ]
        );
      } else {
        Alert.alert('Erreur', response.error || 'Erreur lors de la suppression du compte');
      }
    } catch (error: any) {
      console.error('Erreur suppression compte:', error);
      const errorMessage = error.response?.data?.error || 'Erreur lors de la suppression du compte';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user || profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={actionColors.primary} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user?.username?.[0]?.toUpperCase() || 'U';
  };

  const getFullName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user?.username || 'Utilisateur';
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          {/* Bouton retour */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          {/* Contenu du header */}
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatar}>
                  {getInitials()}
                </Text>
              </View>
              <View style={styles.avatarBadge}>
                <Ionicons name="checkmark" size={16} color="white" />
              </View>
            </View>
            
            <Text style={styles.name}>{getFullName()}</Text>
            <Text style={styles.username}>@{user?.username || 'username'}</Text>
            
            {user?.poste && (
              <View style={styles.posteContainer}>
                <Ionicons name="briefcase-outline" size={14} color={theme.colors.secondary[500]} />
                <Text style={styles.poste}>{user.poste}</Text>
              </View>
            )}
          </View>
        </View>

      <View style={styles.content}>
        {/* Informations personnelles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(!editing)}
            >
              <Text style={styles.editButtonText}>
                {editing ? 'Annuler' : 'Modifier'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom d'utilisateur</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={formData.username || ''}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              editable={editing}
              placeholder="Nom d'utilisateur"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={formData.first_name || ''}
              onChangeText={(text) => setFormData({ ...formData, first_name: text })}
              editable={editing}
              placeholder="Votre prénom"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={formData.last_name || ''}
              onChangeText={(text) => setFormData({ ...formData, last_name: text })}
              editable={editing}
              placeholder="Votre nom"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={formData.email || ''}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              editable={editing}
              placeholder="votre@email.com"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={formData.telephone || ''}
              onChangeText={(text) => setFormData({ ...formData, telephone: text })}
              editable={editing}
              placeholder="+226 XX XX XX XX"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Poste</Text>
            <TextInput
              style={[styles.input, !editing && styles.inputDisabled]}
              value={formData.poste || ''}
              onChangeText={(text) => setFormData({ ...formData, poste: text })}
              editable={editing}
              placeholder="Ex: Vendeur, Gérant, Comptable"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse</Text>
            <TextInput
              style={[styles.input, styles.textArea, !editing && styles.inputDisabled]}
              value={formData.adresse || ''}
              onChangeText={(text) => setFormData({ ...formData, adresse: text })}
              editable={editing}
              placeholder="Adresse complète"
              multiline
              numberOfLines={3}
            />
          </View>

          {editing && (
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.buttonTextPrimary}>Sauvegarder</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Actions de sécurité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sécurité</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>🔒</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>Changer le mot de passe</Text>
                <Text style={styles.menuSubtitle}>Mettre à jour votre mot de passe</Text>
              </View>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, styles.dangerItem]} 
            onPress={handleDeleteAccount}
          >
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>🗑️</Text>
              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, styles.dangerText]}>Supprimer mon compte</Text>
                <Text style={styles.menuSubtitle}>Supprimer définitivement votre compte et vos données</Text>
              </View>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Préférences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences</Text>
          
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>🔔</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>Notifications push</Text>
                <Text style={styles.menuSubtitle}>Recevoir des alertes</Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: theme.colors.neutral[300], true: actionColors.primary }}
              thumbColor={notifications ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>🔋</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>Garder l'écran allumé</Text>
                <Text style={styles.menuSubtitle}>Empêcher la mise en veille</Text>
              </View>
            </View>
            <Switch
              value={keepScreenAwake}
              onValueChange={handleKeepScreenAwakeChange}
              trackColor={{ false: theme.colors.neutral[300], true: actionColors.primary }}
              thumbColor={keepScreenAwake ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Informations du compte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations du compte</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Membre depuis</Text>
            <Text style={styles.infoValue}>
              {new Date(user.date_joined).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
      </ScrollView>

      {/* Modal de changement de mot de passe */}
      <Modal
        visible={showChangePasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowChangePasswordModal(false);
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setShowOldPassword(false);
          setShowNewPassword(false);
          setShowConfirmPassword(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Changer le mot de passe</Text>
            <Text style={styles.modalMessage}>
              Entrez votre mot de passe actuel et votre nouveau mot de passe :
            </Text>
            
            <View style={styles.modalPasswordContainer}>
              <TextInput
                style={[styles.modalInput, styles.modalPasswordInput]}
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Ancien mot de passe"
                placeholderTextColor={theme.colors.text.tertiary}
                secureTextEntry={!showOldPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.modalEyeButton}
                onPress={() => setShowOldPassword(!showOldPassword)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalEyeIcon}>
                  {showOldPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalPasswordContainer}>
              <TextInput
                style={[styles.modalInput, styles.modalPasswordInput]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nouveau mot de passe (min. 8 caractères)"
                placeholderTextColor={theme.colors.text.tertiary}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.modalEyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalEyeIcon}>
                  {showNewPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalPasswordContainer}>
              <TextInput
                style={[styles.modalInput, styles.modalPasswordInput]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirmer le nouveau mot de passe"
                placeholderTextColor={theme.colors.text.tertiary}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.modalEyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalEyeIcon}>
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, styles.modalButtonFirst]}
                onPress={() => {
                  setShowChangePasswordModal(false);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setShowOldPassword(false);
                  setShowNewPassword(false);
                  setShowConfirmPassword(false);
                }}
                disabled={loading}
              >
                <Text style={styles.modalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleConfirmChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Modifier</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowDeleteModal(false);
          setDeletePassword('');
          setShowDeletePassword(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmer la suppression</Text>
            <Text style={styles.modalMessage}>
              Entrez votre mot de passe pour confirmer la suppression de votre compte :
            </Text>
            <View style={styles.modalPasswordContainer}>
              <TextInput
                style={[styles.modalInput, styles.modalPasswordInput]}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Mot de passe"
                placeholderTextColor={theme.colors.text.tertiary}
                secureTextEntry={!showDeletePassword}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.modalEyeButton}
                onPressIn={() => setShowDeletePassword(!showDeletePassword)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalEyeIcon}>
                  {showDeletePassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, styles.modalButtonFirst]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setShowDeletePassword(false);
                }}
                disabled={loading}
              >
                <Text style={styles.modalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={handleConfirmDelete}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalButtonTextDelete}>Supprimer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.tertiary,
  },
  header: {
    backgroundColor: theme.colors.primary[500],
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.secondary[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  avatar: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.primary[500],
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.success[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  username: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  posteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  poste: {
    fontSize: 14,
    color: 'white',
    marginLeft: 6,
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.neutral[100],
  },
  editButtonText: {
    fontSize: 14,
    color: actionColors.primary,
    fontWeight: '600',
  },
  inputGroup: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.colors.background.primary,
  },
  inputDisabled: {
    backgroundColor: theme.colors.neutral[100],
    color: theme.colors.text.tertiary,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  button: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: actionColors.primary,
  },
  buttonTextPrimary: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
    textAlign: 'center',
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
  },
  menuArrow: {
    fontSize: 18,
    color: theme.colors.neutral[400],
    fontWeight: 'bold',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  infoLabel: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.neutral[400],
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: actionColors.success,
  },
  statusText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  dangerItem: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error[500],
  },
  dangerText: {
    color: theme.colors.error[600],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.colors.background.primary,
    marginBottom: 20,
  },
  modalPasswordContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  modalPasswordInput: {
    paddingRight: 50,
    marginBottom: 0,
  },
  modalEyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  modalEyeIcon: {
    fontSize: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    marginLeft: 12,
  },
  modalButtonFirst: {
    marginLeft: 0,
  },
  modalButtonCancel: {
    backgroundColor: theme.colors.neutral[200],
  },
  modalButtonDelete: {
    backgroundColor: theme.colors.error[500],
  },
  modalButtonPrimary: {
    backgroundColor: actionColors.primary,
  },
  modalButtonTextCancel: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextDelete: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen; 