import { Alert } from 'react-native';
import { API_CONFIG, NETWORK_CONFIG } from '../config/api';

/**
 * Utilitaires pour la gestion réseau de l'application mobile
 */

// Test de connectivité réseau
export const testNetworkConnectivity = async (): Promise<boolean> => {
  try {
    // Test simple de connectivité
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      // timeout: 5000, // timeout not supported in fetch
    });
    return response.ok;
  } catch (error) {
    console.log('❌ Pas de connectivité internet:', error);
    return false;
  }
};

// Test de connectivité à l'API locale
export const testLocalAPIConnectivity = async (): Promise<{
  isConnected: boolean;
  url: string;
  responseTime: number;
  error?: string;
}> => {
  const startTime = Date.now();
  
  for (const ip of NETWORK_CONFIG.ALTERNATIVE_IPS) {
    for (const port of NETWORK_CONFIG.PORTS) {
      const testUrl = `http://${ip}:${port}/api/v1/dashboard/`;
      
      try {
        console.log(`🔍 Test de connexion à: ${testUrl}`);
        
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(NETWORK_CONFIG.DISCOVERY_TIMEOUT),
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response.status === 401) {
          // 401 = OK, l'API répond mais demande une authentification
          return {
            isConnected: true,
            url: testUrl,
            responseTime,
          };
        }
        
        if (response.ok) {
          return {
            isConnected: true,
            url: testUrl,
            responseTime,
          };
        }
        
      } catch (error: any) {
        console.log(`❌ Échec de connexion à ${testUrl}:`, error.message);
        continue;
      }
    }
  }
  
  return {
    isConnected: false,
    url: '',
    responseTime: Date.now() - startTime,
    error: 'Aucune connexion API trouvée',
  };
};

// Diagnostic réseau complet
export const runNetworkDiagnostic = async (): Promise<void> => {
  console.log('🔍 Démarrage du diagnostic réseau...');
  
  // Test de connectivité internet
  const hasInternet = await testNetworkConnectivity();
  console.log(`🌐 Connectivité internet: ${hasInternet ? '✅' : '❌'}`);
  
  // Test de connectivité API locale
  const apiStatus = await testLocalAPIConnectivity();
  console.log(`🔌 Connectivité API locale: ${apiStatus.isConnected ? '✅' : '❌'}`);
  
  if (apiStatus.isConnected) {
    console.log(`📡 API accessible sur: ${apiStatus.url}`);
    console.log(`⏱️ Temps de réponse: ${apiStatus.responseTime}ms`);
  }
  
  // Affichage des informations de diagnostic
  let diagnosticMessage = '🔍 Diagnostic Réseau:\n\n';
  diagnosticMessage += `🌐 Internet: ${hasInternet ? 'Connecté' : 'Non connecté'}\n`;
  diagnosticMessage += `🔌 API Locale: ${apiStatus.isConnected ? 'Accessible' : 'Non accessible'}\n`;
  
  if (apiStatus.isConnected) {
    diagnosticMessage += `📡 URL: ${apiStatus.url}\n`;
    diagnosticMessage += `⏱️ Réponse: ${apiStatus.responseTime}ms\n`;
  } else {
    diagnosticMessage += `❌ Erreur: ${apiStatus.error}\n`;
    diagnosticMessage += `💡 Vérifiez que le serveur Django tourne sur 192.168.1.7:8000\n`;
  }
  
  Alert.alert('Diagnostic Réseau', diagnosticMessage);
};

// Vérification de la configuration réseau
export const checkNetworkConfiguration = (): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Vérifier que l'IP locale est configurée
  if (!API_CONFIG.BASE_URL.includes('192.168.1.7')) {
    issues.push('IP locale non configurée');
    recommendations.push('Mettre à jour la configuration API avec 192.168.1.7:8000');
  }
  
  // Vérifier le timeout
  if (API_CONFIG.TIMEOUT < 10000) {
    issues.push('Timeout trop court');
    recommendations.push('Augmenter le timeout à au moins 10000ms');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations,
  };
};

// Fonction pour obtenir l'URL API optimale
export const getOptimalAPIUrl = async (): Promise<string> => {
  const apiStatus = await testLocalAPIConnectivity();
  
  if (apiStatus.isConnected) {
    return apiStatus.url.replace('/api/v1/dashboard/', '/api/v1');
  }
  
  // Fallback vers la configuration par défaut
  return API_CONFIG.BASE_URL;
};

// Fonction pour afficher les informations de débogage réseau
export const showNetworkDebugInfo = (): void => {
  const config = checkNetworkConfiguration();
  
  let debugInfo = '🔧 Configuration Réseau:\n\n';
  debugInfo += `📡 URL de base: ${API_CONFIG.BASE_URL}\n`;
  debugInfo += `⏱️ Timeout: ${API_CONFIG.TIMEOUT}ms\n`;
  debugInfo += `🌍 Environnement: ${__DEV__ ? 'Développement' : 'Production'}\n\n`;
  
  if (config.isValid) {
    debugInfo += '✅ Configuration valide';
  } else {
    debugInfo += '❌ Problèmes détectés:\n';
    config.issues.forEach(issue => {
      debugInfo += `• ${issue}\n`;
    });
    debugInfo += '\n💡 Recommandations:\n';
    config.recommendations.forEach(rec => {
      debugInfo += `• ${rec}\n`;
    });
  }
  
  Alert.alert('Debug Réseau', debugInfo);
};
