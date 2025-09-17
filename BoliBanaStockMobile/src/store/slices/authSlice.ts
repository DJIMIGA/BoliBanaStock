import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../services/api';
import { User, LoginCredentials, AuthTokens } from '../../types';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  errorType: string | null;
  errorDetails: any | null;
  showSessionExpiredNotification: boolean;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  errorType: null,
  errorDetails: null,
  showSessionExpiredNotification: false,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials.username, credentials.password);
      
      // Sauvegarder les tokens
      await AsyncStorage.setItem('access_token', response.access);
      await AsyncStorage.setItem('refresh_token', response.refresh);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));
      
      return response;
    } catch (error: any) {
      // Gestion spécifique des erreurs d'authentification
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      let errorMessage = 'Erreur de connexion';
      let errorType = 'GENERIC_ERROR';
      
      if (status === 401) {
        // Identifiants incorrects
        errorMessage = 'Nom d\'utilisateur ou mot de passe incorrect';
        errorType = 'INVALID_CREDENTIALS';
      } else if (error.message?.includes('Réponse vide du serveur') || 
                 error.message?.includes('Token d\'accès manquant') ||
                 error.message?.includes('Données utilisateur manquantes')) {
        // Problème de réponse serveur
        errorMessage = 'Le serveur a retourné une réponse incomplète. Réessayez.';
        errorType = 'SERVER_RESPONSE_ERROR';
      } else if (status === 403) {
        // Compte désactivé ou bloqué
        errorMessage = 'Votre compte est désactivé ou bloqué';
        errorType = 'ACCOUNT_DISABLED';
      } else if (status === 429) {
        // Trop de tentatives
        errorMessage = 'Trop de tentatives de connexion. Veuillez patienter avant de réessayer';
        errorType = 'TOO_MANY_ATTEMPTS';
      } else if (status >= 500) {
        // Erreur serveur
        errorMessage = 'Le serveur rencontre des difficultés. Réessayez plus tard';
        errorType = 'SERVER_ERROR';
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        // Erreur réseau
        errorMessage = 'Vérifiez votre connexion internet et réessayez';
        errorType = 'NETWORK_ERROR';
      } else if (errorData?.message) {
        // Message spécifique du serveur
        errorMessage = errorData.message;
        errorType = 'API_ERROR';
      }
      
      
      return rejectWithValue({
        message: errorMessage,
        type: errorType,
        status,
        originalError: errorData,
      });
    }
  }
);

export const signup = createAsyncThunk(
  'auth/signup',
  async (userData: {
    username: string;
    password1: string;
    password2: string;
    first_name: string;
    last_name: string;
    email: string;
  }, { rejectWithValue }) => {
    try {
      const response = await authService.signup(userData);
      
      // Si l'inscription retourne des tokens, l'utilisateur est automatiquement connecté
      if (response.access && response.refresh) {
        // Sauvegarder les tokens
        await AsyncStorage.setItem('access_token', response.access);
        await AsyncStorage.setItem('refresh_token', response.refresh);
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
        
        return response;
      }
      
      // Si pas de tokens, retourner juste les données d'inscription
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erreur d\'inscription');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      return null;
    } catch (error: any) {
      return rejectWithValue('Erreur lors de la déconnexion');
    }
  }
);

export const logoutAllDevices = createAsyncThunk(
  'auth/logoutAllDevices',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logoutAllDevices();
      return null;
    } catch (error: any) {
      return rejectWithValue('Erreur lors de la déconnexion forcée');
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      const [accessToken, refreshToken, userData] = await Promise.all([
        AsyncStorage.getItem('access_token'),
        AsyncStorage.getItem('refresh_token'),
        AsyncStorage.getItem('user'),
      ]);

      if (accessToken && refreshToken && userData) {
        return {
          tokens: { access: accessToken, refresh: refreshToken },
          user: JSON.parse(userData),
        };
      }
      
      return null;
    } catch (error: any) {
      return rejectWithValue('Erreur lors de la vérification de l\'authentification');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.errorType = null;
      state.errorDetails = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    showSessionExpiredNotification: (state, action: PayloadAction<boolean>) => {
      state.showSessionExpiredNotification = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorType = null;
        state.errorDetails = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tokens = {
          access: action.payload.access,
          refresh: action.payload.refresh,
        };
        state.showSessionExpiredNotification = false; // Masquer la notification lors de la connexion
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as any;
        if (payload && typeof payload === 'object') {
          state.error = payload.message;
          state.errorType = payload.type;
          state.errorDetails = payload.originalError;
        } else {
          state.error = payload as string;
          state.errorType = 'GENERIC_ERROR';
          state.errorDetails = null;
        }
      })
      
      // Signup
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorType = null;
        state.errorDetails = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tokens = {
          access: action.payload.access,
          refresh: action.payload.refresh,
        };
        state.showSessionExpiredNotification = false; // Masquer la notification lors de l'inscription
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload as any;
        if (payload && typeof payload === 'object') {
          state.error = payload.message;
          state.errorType = payload.type;
          state.errorDetails = payload.originalError;
        } else {
          state.error = payload as string;
          state.errorType = 'GENERIC_ERROR';
          state.errorDetails = null;
        }
      })
      
      // Logout
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.showSessionExpiredNotification = false; // Masquer la notification lors de la déconnexion
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Logout all devices
      .addCase(logoutAllDevices.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutAllDevices.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
      })
      .addCase(logoutAllDevices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Check auth status
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.tokens = action.payload.tokens;
          state.showSessionExpiredNotification = false; // Masquer la notification si l'utilisateur est connecté
        } else {
          state.isAuthenticated = false;
          state.user = null;
          state.tokens = null;
          state.showSessionExpiredNotification = false;
        }
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
      });
  },
});

export const { clearError, setLoading, updateUser, showSessionExpiredNotification } = authSlice.actions;
export default authSlice.reducer; 