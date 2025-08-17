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
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import theme, { actionColors } from '../utils/theme';
import { User } from '../types';
import { profileService } from '../services/api';
import { updateUser } from '../store/slices/authSlice';

const ProfileScreen: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

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
    Alert.alert(
      'Changer le mot de passe',
      'Cette fonctionnalité sera disponible prochainement',
      [{ text: 'OK' }]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Exporter les données',
      'Cette fonctionnalité sera disponible prochainement',
      [{ text: 'OK' }]
    );
  };

  if (!user || profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={actionColors.primary} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>
            {user.first_name?.[0] || user.username[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>
          {user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.username}
        </Text>
        <Text style={styles.username}>@{user.username}</Text>
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

          <TouchableOpacity style={styles.menuItem} onPress={handleExportData}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>📤</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>Exporter mes données</Text>
                <Text style={styles.menuSubtitle}>Télécharger vos données personnelles</Text>
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
              <Text style={styles.menuIcon}>🌙</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>Mode sombre</Text>
                <Text style={styles.menuSubtitle}>Interface sombre</Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: theme.colors.neutral[300], true: actionColors.primary }}
              thumbColor={darkMode ? '#ffffff' : '#f4f3f4'}
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

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Dernière connexion</Text>
            <Text style={styles.infoValue}>
              {user.last_login
                ? new Date(user.last_login).toLocaleString()
                : 'Jamais'}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Statut</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, user.is_active && styles.statusActive]} />
              <Text style={styles.statusText}>
                {user.is_active ? 'Actif' : 'Inactif'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
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
    padding: 20,
    backgroundColor: theme.colors.background.primary,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: actionColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.inverse,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: theme.colors.text.secondary,
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
});

export default ProfileScreen; 