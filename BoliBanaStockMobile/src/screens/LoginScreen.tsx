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
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { login, clearError } from '../store/slices/authSlice';
import { LoginCredentials } from '../types';
import theme from '../utils/theme';
import Logo from '../components/Logo';

const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  
  // Obtenir les dimensions de l'écran
  const screenHeight = Dimensions.get('window').height;
  const isSmallScreen = screenHeight < 700;
  const isVerySmallScreen = screenHeight < 600;

  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, errorType, errorDetails, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryButton, setShowRetryButton] = useState(false);

  useEffect(() => {
    if (error) {
      handleErrorDisplay();
    }
  }, [error, errorType, dispatch]);

  const handleErrorDisplay = () => {
    if (!error) return;

    let title = 'Erreur de connexion';
    let message = error;
    let showRetry = false;

    // Personnaliser le message selon le type d'erreur
    switch (errorType) {
      case 'INVALID_CREDENTIALS':
        title = 'Identifiants incorrects';
        message = 'Le nom d\'utilisateur ou le mot de passe est incorrect. Vérifiez vos informations et réessayez.';
        break;
      case 'ACCOUNT_DISABLED':
        title = 'Compte désactivé';
        message = 'Votre compte a été désactivé. Contactez l\'administrateur pour plus d\'informations.';
        break;
      case 'TOO_MANY_ATTEMPTS':
        title = 'Trop de tentatives';
        message = 'Vous avez effectué trop de tentatives de connexion. Veuillez patienter quelques minutes avant de réessayer.';
        showRetry = true;
        break;
      case 'NETWORK_ERROR':
        title = 'Problème de connexion';
        message = 'Vérifiez votre connexion internet et réessayez.';
        showRetry = true;
        break;
      case 'SERVER_ERROR':
        title = 'Erreur serveur';
        message = 'Le serveur rencontre des difficultés. Réessayez dans quelques instants.';
        showRetry = true;
        break;
      case 'SERVER_RESPONSE_ERROR':
        title = 'Réponse serveur incomplète';
        message = 'Le serveur a retourné une réponse incomplète. Réessayez.';
        showRetry = true;
        break;
      default:
        title = 'Erreur de connexion';
        message = error;
        showRetry = true;
    }

    setShowRetryButton(showRetry);

    Alert.alert(
      title,
      message,
      [
        {
          text: 'OK',
          onPress: () => dispatch(clearError()),
        },
        ...(showRetry ? [{
          text: 'Réessayer',
          onPress: () => handleRetry(),
        }] : []),
      ]
    );
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    dispatch(clearError());
    
    // Réessayer la connexion avec les mêmes identifiants
    dispatch(login(credentials));
  };

  const handleLogin = () => {
    if (!credentials.username || !credentials.password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    // Réinitialiser le compteur de retry et l'état d'erreur
    setRetryCount(0);
    setShowRetryButton(false);
    dispatch(clearError());
    
    dispatch(login(credentials));
  };

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer,
          isSmallScreen && styles.scrollContainerSmall,
          isVerySmallScreen && styles.scrollContainerVerySmall
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        alwaysBounceVertical={false}
      >
        <View style={[
          styles.logoContainer,
          isSmallScreen && styles.logoContainerSmall,
          isVerySmallScreen && styles.logoContainerVerySmall
        ]}>
          <View style={styles.logoWrapper}>
            <Logo 
              size={isVerySmallScreen ? 70 : isSmallScreen ? 80 : 90} 
              showBackground={true}
            />
          </View>
          <Text style={[
            styles.brandName,
            isSmallScreen && styles.brandNameSmall,
            isVerySmallScreen && styles.brandNameVerySmall
          ]}>BoliBana Stock</Text>
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

        <View style={styles.formContainer}>
          <Text style={[
            styles.formTitle,
            isSmallScreen && styles.formTitleSmall,
            isVerySmallScreen && styles.formTitleVerySmall
          ]}>Connexion</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom d'utilisateur</Text>
            <TextInput
              style={[styles.input, styles.textInput]}
              value={credentials.username}
              onChangeText={(value) => handleInputChange('username', value)}
              placeholder="Entrez votre nom d'utilisateur"
              placeholderTextColor={theme.colors.text.tertiary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              selectionColor={theme.colors.primary[500]}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, styles.textInput]}
                value={credentials.password}
                onChangeText={(value) => handleInputChange('password', value)}
                placeholder="Entrez votre mot de passe"
                placeholderTextColor={theme.colors.text.tertiary}
                secureTextEntry={!showPassword}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                autoComplete="password"
                selectionColor={theme.colors.primary[500]}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotPasswordLink}
            onPress={() => navigation.navigate('ForgotPassword' as never)}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Text>
          </TouchableOpacity>

          {/* Bouton d'inscription */}
          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => navigation.navigate('Signup' as never)}
            disabled={loading}
          >
            <Text style={styles.signupButtonText}>
              Créer un compte
            </Text>
          </TouchableOpacity>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary[500]} />
              <Text style={styles.loadingText}>
                {retryCount > 0 ? `Tentative ${retryCount + 1}...` : 'Vérification des identifiants...'}
              </Text>
            </View>
          )}

          {error && errorType === 'INVALID_CREDENTIALS' && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                💡 Vérifiez votre nom d'utilisateur et mot de passe
              </Text>
            </View>
          )}

          {error && errorType === 'NETWORK_ERROR' && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                📡 Vérifiez votre connexion internet
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 BoliBana Stock - Version Mobile
          </Text>
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
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  scrollContainerSmall: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  scrollContainerVerySmall: {
    paddingTop: 10,
    paddingBottom: 5,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 0,
  },
  logoContainerSmall: {
    marginBottom: 20,
    paddingTop: 5,
  },
  logoContainerVerySmall: {
    marginBottom: 15,
    paddingTop: 0,
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
  brandNameSmall: {
    fontSize: 20,
    marginBottom: 4,
  },
  brandNameVerySmall: {
    fontSize: 18,
    marginBottom: 4,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  formTitleSmall: {
    fontSize: 22,
    marginBottom: 18,
  },
  formTitleVerySmall: {
    fontSize: 20,
    marginBottom: 16,
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
  formContainer: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    ...theme.shadows.md,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: theme.colors.neutral[50],
  },
  textInput: {
    color: theme.colors.text.primary,
    includeFontPadding: false,
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
    top: 12,
    padding: 4,
  },
  eyeIcon: {
    fontSize: 20,
  },
  loginButton: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: theme.colors.neutral[400],
  },
  loginButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  signupButtonText: {
    color: theme.colors.primary[500],
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: theme.colors.primary[500],
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingText: {
    color: theme.colors.text.tertiary,
    fontSize: 14,
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: theme.colors.error[50],
    borderColor: theme.colors.error[200],
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    color: theme.colors.error[600],
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: 10,
  },
  footerText: {
    color: theme.colors.text.tertiary,
    fontSize: 12,
  },
});

export default LoginScreen; 
