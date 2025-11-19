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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppDispatch, RootState } from '../store';
import { signup, clearError } from '../store/slices/authSlice';
import theme, { actionColors } from '../utils/theme';
import Logo from '../components/Logo';
import { getPrivacyPolicyUrl } from '../config/networkConfig';

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
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const formatPhoneNumber = (phone: string): string => {
    // Supprimer tous les caractères non numériques sauf le +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Si le numéro commence par +, le garder tel quel
    if (cleaned.startsWith('+')) {
      // Supprimer le + pour le format WhatsApp
      return cleaned.substring(1);
    }
    
    // Si le numéro commence par 0, le remplacer par l'indicatif du pays (223 pour le Mali)
    if (cleaned.startsWith('0')) {
      cleaned = '223' + cleaned.substring(1);
    }
    
    // Si le numéro commence par 223, le garder tel quel
    if (cleaned.startsWith('223')) {
      return cleaned;
    }
    
    // Sinon, ajouter 223 par défaut
    return '223' + cleaned;
  };

  const handleWhatsAppSupport = async () => {
    try {
      // Sur l'écran d'inscription, on ne peut pas récupérer la configuration (pas authentifié)
      // Utiliser un numéro de support par défaut
      const defaultSupportPhone = '+22372464294';
      
      // Message par défaut pour l'assistance
      const defaultMessage = 'Bonjour, j\'ai besoin d\'assistance concernant l\'inscription à l\'application BoliBana Stock.';
      const encodedMessage = encodeURIComponent(defaultMessage);

      // Utiliser le numéro par défaut
      const formattedPhone = formatPhoneNumber(defaultSupportPhone);
      const whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`;
      const webUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

      // Vérifier si WhatsApp est installé
      const canOpen = await Linking.canOpenURL(whatsappUrl);

      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Si WhatsApp n'est pas installé, essayer avec l'URL web
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Erreur ouverture WhatsApp:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'ouvrir WhatsApp. Veuillez vérifier que l\'application est installée.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleOpenPrivacyPolicy = async () => {
    const url = getPrivacyPolicyUrl();
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Information',
          'Impossible d\'ouvrir la politique de confidentialité pour le moment.'
        );
      }
    } catch (error) {
      console.error('Erreur ouverture politique de confidentialité:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de l\'ouverture de la politique de confidentialité.'
      );
    }
  };

  const formatErrorMessage = (error: any): { title: string; message: string } => {
    console.log('🔍 FormatErrorMessage - Error object:', JSON.stringify(error, null, 2));
    console.log('🔍 FormatErrorMessage - error type:', typeof error);
    console.log('🔍 FormatErrorMessage - error.response:', error.response);
    console.log('🔍 FormatErrorMessage - error.response?.data:', error.response?.data);
    console.log('🔍 FormatErrorMessage - error.response?.status:', error.response?.status);
    console.log('🔍 FormatErrorMessage - error.details:', error.details);
    console.log('🔍 FormatErrorMessage - error.error:', error.error);

    // Cas 1: Erreur axios standard (avec error.response) ou erreur Redux Toolkit avec response
    if (error.response || error.data) {
      const status = error.response?.status;
      const data = error.response?.data || error.data;

      // Erreur serveur (500+)
      if (status && status >= 500) {
        console.log('🔍 Erreur serveur détectée (status >= 500)');
        return {
          title: 'Erreur serveur',
          message: 'Le serveur rencontre des difficultés. Réessayez dans quelques instants.',
        };
      }

      // Erreur de validation (400) - vérifier dans data.details
      if ((status === 400 || !status) && data?.details) {
        console.log('🔍 Erreur 400 avec détails détectée:', data.details);
      const details = data.details;
      const messages: string[] = [];

      // Traiter chaque champ avec ses erreurs
      Object.entries(details).forEach(([field, errors]) => {
        const errorList = Array.isArray(errors) ? errors : [errors];
        
        errorList.forEach((errorMsg: string) => {
          let translatedMessage = errorMsg;

          // Traduire les messages Django en français clair
          if (field === 'username') {
            if (errorMsg.includes('déjà pris') || errorMsg.includes('already exists') || errorMsg.includes('unique')) {
              translatedMessage = 'Ce nom d\'utilisateur est déjà utilisé. Veuillez en choisir un autre.';
            } else if (errorMsg.includes('caractères') || errorMsg.includes('characters')) {
              translatedMessage = 'Le nom d\'utilisateur doit contenir au maximum 150 caractères.';
            } else if (errorMsg.includes('invalide') || errorMsg.includes('invalid')) {
              translatedMessage = 'Le nom d\'utilisateur contient des caractères non autorisés. Utilisez uniquement des lettres, chiffres et @/./+/-/_.';
            }
          } else if (field === 'email') {
            if (errorMsg.includes('déjà utilisée') || errorMsg.includes('already exists') || errorMsg.includes('unique')) {
              translatedMessage = 'Cette adresse e-mail est déjà utilisée. Utilisez une autre adresse ou connectez-vous.';
            } else if (errorMsg.includes('invalide') || errorMsg.includes('invalid') || errorMsg.includes('format')) {
              translatedMessage = 'L\'adresse e-mail n\'est pas valide. Vérifiez le format (exemple: nom@domaine.com).';
            }
          } else if (field === 'password1' || field === 'password2') {
            // Messages de validation de mot de passe Django
            if (errorMsg.includes('trop semblable') || errorMsg.includes('too similar') || errorMsg.includes('semblable')) {
              // Vérifier quel champ est concerné (nom d'utilisateur, prénom, nom, email)
              const lowerMsg = errorMsg.toLowerCase();
              if (lowerMsg.includes('nom d\'utilisateur') || lowerMsg.includes('username') || lowerMsg.includes('utilisateur')) {
                translatedMessage = 'Le mot de passe est trop similaire à votre nom d\'utilisateur. Choisissez un mot de passe plus différent.';
              } else if (lowerMsg.includes('prénom') || lowerMsg.includes('first name') || lowerMsg.includes('firstname')) {
                translatedMessage = 'Le mot de passe est trop similaire à votre prénom. Choisissez un mot de passe plus différent.';
              } else if ((lowerMsg.includes('nom') && !lowerMsg.includes('utilisateur')) || lowerMsg.includes('last name') || lowerMsg.includes('lastname')) {
                translatedMessage = 'Le mot de passe est trop similaire à votre nom. Choisissez un mot de passe plus différent.';
              } else if (lowerMsg.includes('e-mail') || lowerMsg.includes('email') || lowerMsg.includes('mail')) {
                translatedMessage = 'Le mot de passe est trop similaire à votre adresse e-mail. Choisissez un mot de passe plus différent.';
              } else {
                translatedMessage = 'Le mot de passe est trop similaire à vos informations personnelles. Choisissez un mot de passe plus différent.';
              }
            } else if (errorMsg.includes('trop court') || errorMsg.includes('too short') || errorMsg.includes('au moins 8')) {
              translatedMessage = 'Le mot de passe doit contenir au moins 8 caractères.';
            } else if (errorMsg.includes('trop commun') || errorMsg.includes('too common') || errorMsg.includes('common password')) {
              translatedMessage = 'Ce mot de passe est trop commun et facile à deviner. Choisissez un mot de passe plus unique.';
            } else if (errorMsg.includes('entièrement numérique') || errorMsg.includes('entirely numeric') || errorMsg.includes('numeric')) {
              translatedMessage = 'Le mot de passe ne peut pas être entièrement composé de chiffres. Ajoutez des lettres ou des caractères spéciaux.';
            } else if (errorMsg.includes('ne correspondent pas') || errorMsg.includes('don\'t match') || errorMsg.includes('match')) {
              translatedMessage = 'Les deux mots de passe ne correspondent pas. Vérifiez qu\'ils sont identiques.';
            }
          } else if (field === 'first_name' || field === 'last_name') {
            if (errorMsg.includes('obligatoire') || errorMsg.includes('required')) {
              translatedMessage = `Le ${field === 'first_name' ? 'prénom' : 'nom'} est obligatoire.`;
            } else if (errorMsg.includes('caractères') || errorMsg.includes('characters')) {
              translatedMessage = `Le ${field === 'first_name' ? 'prénom' : 'nom'} ne peut pas dépasser 30 caractères.`;
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
      
      // Erreur 400 sans détails, utiliser le message d'erreur général
      const errorMessage = data?.error || data?.message || 'Données invalides. Veuillez vérifier les informations saisies.';
      console.log('🔍 Erreur 400 sans détails, message:', errorMessage);
      return {
        title: 'Erreur de validation',
        message: errorMessage,
      };
    }

    // Cas 2: Erreur rejetée par Redux Toolkit (rejectWithValue) - peut être directement l'objet data
    // Vérifier si l'erreur a directement les propriétés details, error, etc.
    if (error.details || error.data?.details || (typeof error === 'object' && error.data && !error.response)) {
      console.log('🔍 Erreur Redux Toolkit détectée (objet data direct):', error);
      
      // Utiliser error.details ou error.data.details
      const details = error.details || error.data?.details;
      if (details) {
        const messages: string[] = [];

        // Traiter chaque champ avec ses erreurs
        Object.entries(details).forEach(([field, errors]) => {
          const errorList = Array.isArray(errors) ? errors : [errors];
          
          errorList.forEach((errorMsg: string) => {
            let translatedMessage = errorMsg;

            // Traduire les messages Django en français clair (même logique que ci-dessus)
            if (field === 'username') {
              if (errorMsg.includes('déjà pris') || errorMsg.includes('already exists') || errorMsg.includes('unique')) {
                translatedMessage = 'Ce nom d\'utilisateur est déjà utilisé. Veuillez en choisir un autre.';
              } else if (errorMsg.includes('caractères') || errorMsg.includes('characters')) {
                translatedMessage = 'Le nom d\'utilisateur doit contenir au maximum 150 caractères.';
              } else if (errorMsg.includes('invalide') || errorMsg.includes('invalid')) {
                translatedMessage = 'Le nom d\'utilisateur contient des caractères non autorisés. Utilisez uniquement des lettres, chiffres et @/./+/-/_.';
              }
            } else if (field === 'email') {
              if (errorMsg.includes('déjà utilisée') || errorMsg.includes('already exists') || errorMsg.includes('unique')) {
                translatedMessage = 'Cette adresse e-mail est déjà utilisée. Utilisez une autre adresse ou connectez-vous.';
              } else if (errorMsg.includes('invalide') || errorMsg.includes('invalid') || errorMsg.includes('format')) {
                translatedMessage = 'L\'adresse e-mail n\'est pas valide. Vérifiez le format (exemple: nom@domaine.com).';
              }
            } else if (field === 'password1' || field === 'password2') {
              // Messages de validation de mot de passe Django
              if (errorMsg.includes('trop semblable') || errorMsg.includes('too similar') || errorMsg.includes('semblable')) {
                const lowerMsg = errorMsg.toLowerCase();
                if (lowerMsg.includes('nom d\'utilisateur') || lowerMsg.includes('username') || lowerMsg.includes('utilisateur')) {
                  translatedMessage = 'Le mot de passe est trop similaire à votre nom d\'utilisateur. Choisissez un mot de passe plus différent.';
                } else if (lowerMsg.includes('prénom') || lowerMsg.includes('first name') || lowerMsg.includes('firstname')) {
                  translatedMessage = 'Le mot de passe est trop similaire à votre prénom. Choisissez un mot de passe plus différent.';
                } else if ((lowerMsg.includes('nom') && !lowerMsg.includes('utilisateur')) || lowerMsg.includes('last name') || lowerMsg.includes('lastname')) {
                  translatedMessage = 'Le mot de passe est trop similaire à votre nom. Choisissez un mot de passe plus différent.';
                } else if (lowerMsg.includes('e-mail') || lowerMsg.includes('email') || lowerMsg.includes('mail')) {
                  translatedMessage = 'Le mot de passe est trop similaire à votre adresse e-mail. Choisissez un mot de passe plus différent.';
                } else {
                  translatedMessage = 'Le mot de passe est trop similaire à vos informations personnelles. Choisissez un mot de passe plus différent.';
                }
              } else if (errorMsg.includes('trop court') || errorMsg.includes('too short') || errorMsg.includes('au moins 8')) {
                translatedMessage = 'Le mot de passe doit contenir au moins 8 caractères.';
              } else if (errorMsg.includes('trop commun') || errorMsg.includes('too common') || errorMsg.includes('common password')) {
                translatedMessage = 'Ce mot de passe est trop commun et facile à deviner. Choisissez un mot de passe plus unique.';
              } else if (errorMsg.includes('entièrement numérique') || errorMsg.includes('entirely numeric') || errorMsg.includes('numeric')) {
                translatedMessage = 'Le mot de passe ne peut pas être entièrement composé de chiffres. Ajoutez des lettres ou des caractères spéciaux.';
              } else if (errorMsg.includes('ne correspondent pas') || errorMsg.includes('don\'t match') || errorMsg.includes('match')) {
                translatedMessage = 'Les deux mots de passe ne correspondent pas. Vérifiez qu\'ils sont identiques.';
              }
            } else if (field === 'first_name' || field === 'last_name') {
              if (errorMsg.includes('obligatoire') || errorMsg.includes('required')) {
                translatedMessage = `Le ${field === 'first_name' ? 'prénom' : 'nom'} est obligatoire.`;
              } else if (errorMsg.includes('caractères') || errorMsg.includes('characters')) {
                translatedMessage = `Le ${field === 'first_name' ? 'prénom' : 'nom'} ne peut pas dépasser 30 caractères.`;
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
    }

    // Cas 3: Erreur réseau (pas de réponse du serveur)
    if (!error.response && typeof error === 'string') {
      console.log('🔍 Erreur réseau détectée (string ou pas de response)');
      return {
        title: 'Problème de connexion',
        message: 'Vérifiez votre connexion internet et réessayez.',
      };
    }

    // Cas 4: Erreur générique (string ou autre format)
    const errorMessage = typeof error === 'string' 
      ? error 
      : error.error || error.message || error.response?.data?.error || error.response?.data?.message || 'Une erreur est survenue lors de la création du compte.';
    console.log('🔍 Erreur générique, message:', errorMessage);
    return {
      title: 'Erreur d\'inscription',
      message: errorMessage,
    };
  };

  const handleSignup = async () => {
    // Validation côté client
    if (!formData.username || !formData.password1 || !formData.password2 || 
        !formData.first_name || !formData.last_name || !formData.email) {
      Alert.alert(
        'Champs manquants',
        'Veuillez remplir tous les champs obligatoires marqués d\'un astérisque (*).'
      );
      return;
    }

    // Validation du nom d'utilisateur
    if (formData.username.length > 150) {
      Alert.alert(
        'Nom d\'utilisateur invalide',
        'Le nom d\'utilisateur ne peut pas dépasser 150 caractères.'
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

    // Validation des noms
    if (formData.first_name.length > 30) {
      Alert.alert(
        'Prénom invalide',
        'Le prénom ne peut pas dépasser 30 caractères.'
      );
      return;
    }

    if (formData.last_name.length > 30) {
      Alert.alert(
        'Nom invalide',
        'Le nom ne peut pas dépasser 30 caractères.'
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
      const { title, message } = formatErrorMessage(error);
      
      Alert.alert(
        title,
        message,
        [
          {
            text: 'OK',
            onPress: () => dispatch(clearError()),
          },
        ]
      );
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

          <View style={styles.legalContainer}>
            <Text style={styles.legalText}>
              En créant un compte, vous acceptez notre{' '}
              <Text style={styles.legalLink} onPress={handleOpenPrivacyPolicy}>
                politique de confidentialité
              </Text>
              .
            </Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Bouton d'assistance WhatsApp flottant */}
      <TouchableOpacity
        style={styles.whatsappButton}
        onPress={handleWhatsAppSupport}
        activeOpacity={0.8}
      >
        <Ionicons name="logo-whatsapp" size={28} color="white" />
      </TouchableOpacity>
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
  legalContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  legalText: {
    textAlign: 'center',
    color: theme.colors.text.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  legalLink: {
    color: actionColors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  whatsappButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default SignupScreen; 