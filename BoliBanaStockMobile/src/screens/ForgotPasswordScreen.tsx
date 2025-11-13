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

type Step = 'email' | 'code' | 'password';

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRequestCode = async () => {
    if (!emailOrUsername.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email ou nom d\'utilisateur');
      return;
    }

    setLoading(true);
    try {
      await authService.requestPasswordReset(emailOrUsername.trim());
      Alert.alert(
        'Code envoyé',
        'Si un compte existe avec cet email ou nom d\'utilisateur, un code de réinitialisation a été envoyé. Vérifiez votre boîte mail.',
        [{ text: 'OK', onPress: () => setStep('code') }]
      );
    } catch (error: any) {
      // Gérer spécifiquement les erreurs réseau
      const errorMessage = error.isNetworkError 
        ? 'Erreur de connexion réseau. Vérifiez votre connexion internet et réessayez.'
        : error.response?.data?.error || error.message || 'Une erreur est survenue lors de l\'envoi du code';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim() || code.length !== 6) {
      Alert.alert('Erreur', 'Veuillez entrer le code à 6 chiffres reçu par email');
      return;
    }

    setStep('password');
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      await authService.confirmPasswordReset(emailOrUsername.trim(), code.trim(), newPassword);
      Alert.alert(
        'Succès',
        'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
        [
          {
            text: 'Se connecter',
            onPress: () => navigation.navigate('Login' as never),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error.response?.data?.error || 'Une erreur est survenue lors de la réinitialisation'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Mot de passe oublié</Text>
      <Text style={styles.stepDescription}>
        Entrez votre email ou nom d'utilisateur. Nous vous enverrons un code de réinitialisation.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email ou nom d'utilisateur</Text>
        <TextInput
          style={styles.input}
          value={emailOrUsername}
          onChangeText={setEmailOrUsername}
          placeholder="email@exemple.com ou nom.utilisateur"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
        onPress={handleRequestCode}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.buttonTextPrimary}>Envoyer le code</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderCodeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Vérification du code</Text>
      <Text style={styles.stepDescription}>
        Entrez le code à 6 chiffres que vous avez reçu par email.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Code de réinitialisation</Text>
        <TextInput
          style={[styles.input, styles.codeInput]}
          value={code}
          onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
          textAlign="center"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, styles.buttonSecondary]}
        onPress={() => setStep('email')}
        disabled={loading}
      >
        <Text style={styles.buttonTextSecondary}>Retour</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonTertiary, loading && styles.buttonDisabled]}
        onPress={handleRequestCode}
        disabled={loading}
      >
        <Text style={styles.buttonTextTertiary}>Renvoyer le code</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
        onPress={handleVerifyCode}
        disabled={loading || code.length !== 6}
      >
        <Text style={styles.buttonTextPrimary}>Vérifier le code</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Nouveau mot de passe</Text>
      <Text style={styles.stepDescription}>
        Choisissez un nouveau mot de passe sécurisé (minimum 8 caractères).
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Nouveau mot de passe</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            editable={!loading}
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

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirmer le mot de passe</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            secureTextEntry={!showConfirmPassword}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Text style={styles.eyeIcon}>
              {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.buttonSecondary]}
        onPress={() => setStep('code')}
        disabled={loading}
      >
        <Text style={styles.buttonTextSecondary}>Retour</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.buttonTextPrimary}>Réinitialiser le mot de passe</Text>
        )}
      </TouchableOpacity>
    </View>
  );

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
        <View style={styles.logoHeader}>
          <View style={styles.logoWrapper}>
            <Logo size={80} showBackground={true} />
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

        {step === 'email' && renderEmailStep()}
        {step === 'code' && renderCodeStep()}
        {step === 'password' && renderPasswordStep()}
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
  logoHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
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
  stepContainer: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
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
    color: theme.colors.text.primary,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
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
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonPrimary: {
    backgroundColor: actionColors.primary,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: actionColors.primary,
  },
  buttonTertiary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.neutral[400],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonTextPrimary: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: actionColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextTertiary: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen;

