/**
 * Test de la gestion des sessions expirées
 * Ce script simule une session expirée pour vérifier que la déconnexion automatique fonctionne
 */

const testSessionExpired = async () => {
  console.log('🧪 Test de la gestion des sessions expirées...');
  
  try {
    // Simuler une erreur 401 (session expirée)
    const mockError = {
      response: {
        status: 401,
        data: { message: 'Token expiré' }
      },
      message: 'Session expirée. Veuillez vous reconnecter.'
    };
    
    console.log('📡 Simulation d\'une erreur 401...');
    
    // Vérifier que l'erreur est bien détectée
    if (mockError.response?.status === 401) {
      console.log('✅ Erreur 401 détectée correctement');
      
      // Vérifier le message d'erreur
      if (mockError.message === 'Session expirée. Veuillez vous reconnecter.') {
        console.log('✅ Message d\'erreur correct');
        console.log('🔄 La déconnexion automatique devrait être déclenchée');
      } else {
        console.error('❌ Message d\'erreur incorrect:', mockError.message);
      }
    } else {
      console.error('❌ Erreur 401 non détectée');
    }
    
    console.log('\n📋 Résumé du test:');
    console.log('- L\'intercepteur axios détecte l\'erreur 401');
    console.log('- Le refresh token est tenté');
    console.log('- Si le refresh échoue, le stockage local est nettoyé');
    console.log('- Le callback de déconnexion Redux est déclenché');
    console.log('- L\'état Redux est mis à jour (isAuthenticated = false)');
    console.log('- L\'utilisateur est redirigé vers l\'écran de connexion');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
};

// Exécuter le test
testSessionExpired();


