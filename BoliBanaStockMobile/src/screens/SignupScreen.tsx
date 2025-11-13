import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppDispatch, RootState } from '../store';
import { signup, clearError } from '../store/slices/authSlice';
import theme, { actionColors } from '../utils/theme';
import Logo from '../components/Logo';

interface SignupFormData {
  username: string;
  password1: string;
  password2: string;
  first_name: string;
  last_name: string;
  email: string;
}

const SignupScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const [formData, setFormData] = useState<SignupFormData>({
    username: '',
    password1: '',
    password2: '',
    first_name: '',
    last_name: '',
    email: '',
  });

  const handleSignup = async () => {
    // Validation côté client
    if (!formData.username || !formData.password1 || !formData.password2 || 
        !formData.first_name || !formData.last_name || !formData.email) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.password1 !== formData.password2) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password1.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    try {
      const result = await dispatch(signup(formData)).unwrap();
      
      // Si l'inscription réussit et retourne des tokens, l'utilisateur est automatiquement connecté
      if (result.access && result.refresh) {
        Alert.alert(
          'Succès !',
          'Votre compte a été créé avec succès et vous êtes maintenant connecté !',
          [
            {
              text: 'Continuer',
              onPress: () => {
                // La navigation vers le Dashboard se fait automatiquement via Redux
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Succès !',
          'Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.',
          [
            {
              text: 'Se connecter',
              onPress: () => navigation.navigate('Login' as never),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Erreur inscription:', error);
      let errorMessage = 'Erreur lors de la création du compte';
      
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
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) }
        ]}
      >
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <Logo size={90} showBackground={true} />
          </View>
          <Text style={styles.brandName}>BoliBana Stock</Text>
          <View style={styles.badgesContainer}>
            <View style={[styles.badge, styles.badgeGestion]}>
              <Text style={styles.badgeText}>Gestion</Text>
            </View>
            <View style={[styles.badge, styles.badgeStock]}>
              <Text style={styles.badgeText}>Stock</Text>
            </View>
            <View style={[styles.badge, styles.badgeCaisse]}>
              <Text style={styles.badgeText}>Caisse</Text>
            </View>
            <View style={[styles.badge, styles.badgeClient]}>
              <Text style={styles.badgeText}>Client</Text>
            </View>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Créer un compte</Text>
          {/* Informations de base */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations de base</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom d'utilisateur *</Text>
              <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                placeholder="nom.utilisateur"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe *</Text>
              <TextInput
                style={styles.input}
                value={formData.password1}
                onChangeText={(text) => setFormData({ ...formData, password1: text })}
                placeholder="••••••••"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmation du mot de passe *</Text>
              <TextInput
                style={styles.input}
                value={formData.password2}
                onChangeText={(text) => setFormData({ ...formData, password2: text })}
                placeholder="••••••••"
                secureTextEntry
              />
            </View>
          </View>

          {/* Informations personnelles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Prénom *</Text>
              <TextInput
                style={styles.input}
                value={formData.first_name}
                onChangeText={(text) => setFormData({ ...formData, first_name: text })}
                placeholder="Votre prénom"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom *</Text>
              <TextInput
                style={styles.input}
                value={formData.last_name}
                onChangeText={(text) => setFormData({ ...formData, last_name: text })}
                placeholder="Votre nom"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="email@exemple.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Bouton d'inscription */}
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.buttonTextPrimary}>Créer mon compte</Text>
            )}
          </TouchableOpacity>

          {/* Lien vers la connexion */}
          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
              <Text style={styles.loginLinkText}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
    paddingTop: 10,
  },
  logoWrapper: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary[500],
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 3,
    marginVertical: 2,
  },
  badgeGestion: {
    backgroundColor: theme.colors.secondary[100],
    borderColor: theme.colors.secondary[400],
  },
  badgeStock: {
    backgroundColor: theme.colors.primary[100],
    borderColor: theme.colors.primary[400],
  },
  badgeCaisse: {
    backgroundColor: theme.colors.success[100],
    borderColor: theme.colors.success[400],
  },
  badgeClient: {
    backgroundColor: theme.colors.secondary[100],
    borderColor: theme.colors.secondary[500],
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  form: {
    flex: 1,
  },
  section: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 10,
    marginBottom: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: theme.colors.background.primary,
    color: theme.colors.text.primary,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  buttonPrimary: {
    backgroundColor: actionColors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonTextPrimary: {
    color: theme.colors.text.inverse,
    fontSize: 15,
    fontWeight: '600',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  loginText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  loginLinkText: {
    fontSize: 14,
    color: actionColors.primary,
    fontWeight: '600',
  },
});

export default SignupScreen; 