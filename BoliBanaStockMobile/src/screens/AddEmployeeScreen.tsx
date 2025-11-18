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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../services/api';
import theme, { actionColors } from '../utils/theme';
import Logo from '../components/Logo';

interface EmployeeFormData {
  username: string;
  password1: string;
  password2: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
}

const AddEmployeeScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>({
    username: '',
    password1: '',
    password2: '',
    first_name: '',
    last_name: '',
    email: '',
    is_staff: false,
  });
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const formatErrorMessage = (error: any): { title: string; message: string } => {
    if (error.response || error.data) {
      const status = error.response?.status;
      const data = error.response?.data || error.data;

      if (status && status >= 500) {
        return {
          title: 'Erreur serveur',
          message: 'Le serveur rencontre des difficultés. Réessayez dans quelques instants.',
        };
      }

      if ((status === 400 || !status) && data?.details) {
        const details = data.details;
        const messages: string[] = [];

        Object.entries(details).forEach(([field, errors]) => {
          const errorList = Array.isArray(errors) ? errors : [errors];
          
          errorList.forEach((errorMsg: string) => {
            let translatedMessage = errorMsg;

            if (field === 'username') {
              if (errorMsg.includes('déjà pris') || errorMsg.includes('already exists') || errorMsg.includes('unique')) {
                translatedMessage = 'Ce nom d\'utilisateur est déjà utilisé. Veuillez en choisir un autre.';
              }
            } else if (field === 'email') {
              if (errorMsg.includes('déjà utilisée') || errorMsg.includes('already exists') || errorMsg.includes('unique')) {
                translatedMessage = 'Cette adresse e-mail est déjà utilisée.';
              }
            } else if (field === 'password1' || field === 'password2') {
              if (errorMsg.includes('trop court') || errorMsg.includes('too short')) {
                translatedMessage = 'Le mot de passe doit contenir au moins 8 caractères.';
              } else if (errorMsg.includes('ne correspondent pas') || errorMsg.includes('don\'t match')) {
                translatedMessage = 'Les deux mots de passe ne correspondent pas.';
              }
            }

            messages.push(translatedMessage);
          });
        });

        return {
          title: 'Erreur de validation',
          message: messages.length > 0 
            ? messages.join('\n\n')
            : 'Veuillez vérifier les informations saisies.',
        };
      }
      
      const errorMessage = data?.error || data?.message || 'Données invalides. Veuillez vérifier les informations saisies.';
      return {
        title: 'Erreur de validation',
        message: errorMessage,
      };
    }

    const errorMessage = typeof error === 'string' 
      ? error 
      : error.error || error.message || 'Une erreur est survenue lors de la création du compte.';
    return {
      title: 'Erreur d\'inscription',
      message: errorMessage,
    };
  };

  const handleAddEmployee = async () => {
    // Validation côté client
    if (!formData.username || !formData.password1 || !formData.password2 || 
        !formData.first_name || !formData.last_name || !formData.email) {
      Alert.alert(
        'Champs manquants',
        'Veuillez remplir tous les champs obligatoires marqués d\'un astérisque (*).'
      );
      return;
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert(
        'Email invalide',
        'Veuillez entrer une adresse e-mail valide (exemple: nom@domaine.com).'
      );
      return;
    }

    // Validation des mots de passe
    if (formData.password1 !== formData.password2) {
      Alert.alert(
        'Mots de passe différents',
        'Les deux mots de passe ne correspondent pas. Vérifiez qu\'ils sont identiques.'
      );
      return;
    }

    if (formData.password1.length < 8) {
      Alert.alert(
        'Mot de passe trop court',
        'Le mot de passe doit contenir au moins 8 caractères.'
      );
      return;
    }

    // Vérifier si le mot de passe est entièrement numérique
    if (/^\d+$/.test(formData.password1)) {
      Alert.alert(
        'Mot de passe invalide',
        'Le mot de passe ne peut pas être entièrement composé de chiffres. Ajoutez des lettres ou des caractères spéciaux.'
      );
      return;
    }

    setLoading(true);
    try {
      const result = await authService.signupEmployee({
        username: formData.username,
        password1: formData.password1,
        password2: formData.password2,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        is_staff: formData.is_staff,
      });
      
      Alert.alert(
        'Succès !',
        `L'employé "${result.user?.username || formData.username}" a été créé avec succès pour votre site.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Erreur création employé:', error);
      const { title, message } = formatErrorMessage(error);
      
      Alert.alert(
        title,
        message,
        [
          {
            text: 'OK',
          },
        ]
      );
    } finally {
      setLoading(false);
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <Logo size={70} showBackground={true} />
          </View>
          <Text style={styles.brandName}>Ajouter un employé</Text>
          <Text style={styles.subtitle}>Créez un compte pour un nouvel employé de votre site</Text>
        </View>

        <View style={styles.form}>
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
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={formData.password1}
                  onChangeText={(text) => setFormData({ ...formData, password1: text })}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword1}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword1(!showPassword1)}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword1 ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmation du mot de passe *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={formData.password2}
                  onChangeText={(text) => setFormData({ ...formData, password2: text })}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword2}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword2(!showPassword2)}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword2 ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
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
                placeholder="Prénom de l'employé"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom *</Text>
              <TextInput
                style={styles.input}
                value={formData.last_name}
                onChangeText={(text) => setFormData({ ...formData, last_name: text })}
                placeholder="Nom de l'employé"
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

          {/* Permissions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Permissions</Text>
            
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setFormData({ ...formData, is_staff: !formData.is_staff })}
            >
              <View style={[styles.checkbox, formData.is_staff && styles.checkboxChecked]}>
                {formData.is_staff && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.checkboxLabelContainer}>
                <Text style={styles.checkboxLabel}>Accès à l'administration</Text>
                <Text style={styles.checkboxDescription}>
                  Permet à l'employé d'accéder à l'interface d'administration
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Bouton d'ajout */}
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
            onPress={handleAddEmployee}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.buttonTextPrimary}>Ajouter l'employé</Text>
            )}
          </TouchableOpacity>

          {/* Bouton annuler */}
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.buttonTextSecondary}>Annuler</Text>
          </TouchableOpacity>
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
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary[500],
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 10,
    padding: 4,
  },
  eyeIcon: {
    fontSize: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.neutral[400],
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.primary,
  },
  checkboxChecked: {
    backgroundColor: actionColors.primary,
    borderColor: actionColors.primary,
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabelContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  checkboxDescription: {
    fontSize: 13,
    color: theme.colors.text.secondary,
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
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonTextPrimary: {
    color: theme.colors.text.inverse,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: theme.colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AddEmployeeScreen;

