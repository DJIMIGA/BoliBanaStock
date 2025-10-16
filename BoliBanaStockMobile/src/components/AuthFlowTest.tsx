import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { checkAuthStatus, logout } from '../store/slices/authSlice';
import LoadingScreen from './LoadingScreen';

/**
 * Composant de test pour vérifier le flux d'authentification
 * Affiche l'état actuel et permet de tester les transitions
 */
const AuthFlowTest: React.FC = () => {
  const { isAuthenticated, loading, user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [testMode, setTestMode] = useState(false);

  const handleTestAuthCheck = () => {
    dispatch(checkAuthStatus());
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  if (!testMode) {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.testButton} 
          onPress={() => setTestMode(true)}
        >
          <Text style={styles.testButtonText}>Tester le flux d'authentification</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Simuler l'écran de chargement
  if (loading) {
    return <LoadingScreen message="Test: Vérification de la session..." />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test du flux d'authentification</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          État: {loading ? 'Chargement...' : isAuthenticated ? 'Connecté' : 'Non connecté'}
        </Text>
        {user && (
          <Text style={styles.userText}>
            Utilisateur: {user.username}
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleTestAuthCheck}
        >
          <Text style={styles.buttonText}>Vérifier la session</Text>
        </TouchableOpacity>

        {isAuthenticated && (
          <TouchableOpacity 
            style={[styles.button, styles.logoutButton]} 
            onPress={handleLogout}
          >
            <Text style={styles.buttonText}>Déconnexion</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => setTestMode(false)}
      >
        <Text style={styles.backButtonText}>Retour</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  userText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  logoutButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#2196F3',
    padding: 20,
    borderRadius: 10,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#666',
    padding: 10,
    borderRadius: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
  },
});

export default AuthFlowTest;
