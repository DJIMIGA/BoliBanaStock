// Script de test pour vérifier l'état de l'authentification
import AsyncStorage from '@react-native-async-storage/async-storage';

export const checkAuthStatus = async () => {
  try {
    console.log('🔍 Vérification de l\'état de l\'authentification...');
    
    // Vérifier les tokens stockés
    const accessToken = await AsyncStorage.getItem('access_token');
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    const user = await AsyncStorage.getItem('user');
    
    console.log('📱 Access Token:', accessToken ? '✅ Présent' : '❌ Absent');
    console.log('🔄 Refresh Token:', refreshToken ? '✅ Présent' : '❌ Absent');
    console.log('👤 User:', user ? '✅ Présent' : '❌ Absent');
    
    if (accessToken) {
      console.log('🔑 Access Token (premiers caractères):', accessToken.substring(0, 20) + '...');
    }
    
    if (refreshToken) {
      console.log('🔄 Refresh Token (premiers caractères):', refreshToken.substring(0, 20) + '...');
    }
    
    return {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasUser: !!user,
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: user
    };
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    return null;
  }
};

export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    console.log('🧹 Données d\'authentification supprimées');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
    return false;
  }
};
