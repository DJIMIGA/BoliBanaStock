import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { View, Animated, AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from './src/store';
import { checkAuthStatus, logout } from './src/store/slices/authSlice';
import { RootState } from './src/store';
import { AuthWrapper, ErrorBoundary, GlobalSessionNotification, LoadingScreen } from './src/components';
import { useGlobalKeepAwake } from './src/hooks/useKeepAwake';
import { initializeConfigurationCache } from './src/hooks';
// import { SessionProvider } from './src/contexts/SessionContext'; // Supprimé - approche Redux simplifiée
import {
  LoginScreen,
  SignupScreen,
  ForgotPasswordScreen,
  DashboardScreen,
  ProductsScreen,
  ProductDetailScreen,
  ScanProductScreen,
  CashRegisterScreen,
  SalesScreen,
  SaleDetailScreen,
  ConfigurationScreen,
  SettingsScreen,
  ProfileScreen,
  NewSaleScreen,
  InventoryScreen,
  ReceptionScreen,
  LossScreen,
  DeliveryScreen,
  ReportsScreen,
  SalesReportScreen,
  ShrinkageReportScreen,
  StockReportScreen,
  FinancialReportScreen,
  TransactionsScreen,
  AddProductScreen,
  AddEmployeeScreen,
  EmployeeListScreen,
  TestScannerScreen,
  LabelGeneratorScreen,
  LabelPreviewScreen,
  PrintModeSelectionScreen,
  CatalogPDFScreen,
  LabelPrintScreen,
  BarcodeTestScreen,
  CategoriesScreen,
  BrandsScreen,
  BrandsByRayonScreen,
  ProductCopyScreen,
  ProductCopyManagementScreen,
  CustomerListScreen,
  CustomerDetailScreen,
  AboutScreen,
  ExportScreen,
  NotificationScreen,
} from './src/screens';
import { RootStackParamList } from './src/types';
import theme, { actionColors } from './src/utils/theme';
import { useDraftStatus } from './src/hooks/useDraftStatus';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Composant pour l'icône Caisse avec effet de pulsation
const PulsingCashIcon = ({ color, size, hasDraft }: { color: string; size: number; hasDraft: boolean }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, []);

  return (
    <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          transform: [{ scale: pulseAnim }],
        }}
      >
        <Ionicons name="calculator-outline" size={size} color={color} />
      </Animated.View>
      {hasDraft && (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: theme.colors.warning[500],
            borderWidth: 2,
            borderColor: 'white',
            justifyContent: 'center',
            alignItems: 'center',
            ...theme.shadows.sm,
          }}
        >
          <Ionicons name="ellipse" size={8} color="white" />
        </View>
      )}
    </View>
  );
};

const MainTabs = () => {
  const draftStatus = useDraftStatus();

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: actionColors.primary,
        tabBarInactiveTintColor: theme.colors.neutral[400],
        tabBarStyle: { backgroundColor: theme.colors.background.primary },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Accueil',
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          title: 'Produits',
          tabBarLabel: 'Produits',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CashRegister"
        component={CashRegisterScreen}
        options={{
          title: 'Caisse',
          tabBarLabel: 'Caisse',
          tabBarBadge: undefined,
          tabBarIcon: ({ color, size }) => (
            <PulsingCashIcon color={color} size={size} hasDraft={draftStatus.hasSalesCartDraft} />
          ),
        }}
      />
      <Tab.Screen
        name="CustomerList"
        component={CustomerListScreen}
        options={{
          title: 'Clients',
          tabBarLabel: 'Clients',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ScanProduct"
        component={ScanProductScreen}
        options={{
          title: 'Scanner',
          tabBarLabel: 'Scanner',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);
  const appState = useRef(AppState.currentState);
  
  // Gérer le mode veille globalement - permettre à l'écran de s'éteindre normalement
  useGlobalKeepAwake();

  useEffect(() => {
    // Vérifier l'état d'authentification au démarrage
    store.dispatch(checkAuthStatus());
  }, []);

  // Logs détaillés pour le suivi de l'état de l'application
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const previousState = appState.current;
      const timestamp = new Date().toISOString();
      
      console.log(`📱 [APP STATE] ${timestamp}`);
      console.log(`   État précédent: ${previousState}`);
      console.log(`   État suivant: ${nextAppState}`);
      console.log(`   Utilisateur authentifié: ${isAuthenticated}`);
      
      // Quand l'app passe en arrière-plan
      if (
        previousState.match(/active|foreground/) &&
        nextAppState.match(/inactive|background/)
      ) {
        console.log('🔄 [APP] Application passe en arrière-plan');
        console.log(`   Raison possible: ${nextAppState === 'inactive' ? 'Verrouillage ou notification' : 'Fermeture ou autre app'}`);
        
        if (isAuthenticated) {
          // Récupérer les infos de session pour les logs
          (async () => {
            try {
              const loginTimestamp = await AsyncStorage.getItem('login_timestamp');
              const accessToken = await AsyncStorage.getItem('access_token');
              
              if (loginTimestamp) {
                const loginTime = parseInt(loginTimestamp, 10);
                const now = Date.now();
                const elapsed = now - loginTime;
                const elapsedHours = (elapsed / (60 * 60 * 1000)).toFixed(2);
                
                console.log(`   Session active depuis: ${elapsedHours} heures`);
                console.log(`   Token présent: ${accessToken ? 'Oui' : 'Non'}`);
                console.log(`   Timestamp connexion: ${new Date(loginTime).toISOString()}`);
              } else {
                console.log('   ⚠️ Pas de timestamp de connexion trouvé');
              }
            } catch (error) {
              console.error('   ❌ Erreur lecture session:', error);
            }
          })();
          
          // Ne pas déconnecter - la session reste active en arrière-plan
          console.log('ℹ️ [APP] Application en arrière-plan - Session maintenue active');
          console.log('   → La session restera active jusqu\'à expiration (12h) ou fermeture de l\'app');
        } else {
          console.log('   ℹ️ Utilisateur non authentifié');
        }
      }
      
      // Quand l'app revient au premier plan
      if (
        previousState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('🔄 [APP] Application revenue au premier plan');
        console.log(`   Était en: ${previousState}`);
        
        // Vérifier silencieusement si la session a expiré (12h) sans afficher le loading
        if (isAuthenticated) {
          (async () => {
            try {
              const loginTimestamp = await AsyncStorage.getItem('login_timestamp');
              const accessToken = await AsyncStorage.getItem('access_token');
              const refreshToken = await AsyncStorage.getItem('refresh_token');
              
              console.log(`   Token d'accès présent: ${accessToken ? 'Oui' : 'Non'}`);
              console.log(`   Refresh token présent: ${refreshToken ? 'Oui' : 'Non'}`);
              
              if (loginTimestamp) {
                const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 heures
                const loginTime = parseInt(loginTimestamp, 10);
                const now = Date.now();
                const elapsed = now - loginTime;
                const elapsedHours = (elapsed / (60 * 60 * 1000)).toFixed(2);
                const remainingHours = ((SESSION_DURATION - elapsed) / (60 * 60 * 1000)).toFixed(2);
                
                console.log(`   Session active depuis: ${elapsedHours} heures`);
                console.log(`   Temps restant avant expiration: ${remainingHours} heures`);
                
                if (elapsed > SESSION_DURATION) {
                  console.log('⏰ [APP] ⚠️ Session expirée après 12 heures');
                  console.log(`   Temps écoulé: ${elapsedHours} heures (limite: 12h)`);
                  console.log('   → Déconnexion automatique');
                  store.dispatch(logout());
                } else {
                  console.log('✅ [APP] Session toujours valide');
                }
              } else {
                console.log('   ⚠️ Pas de timestamp de connexion trouvé');
              }
            } catch (error) {
              console.error('   ❌ Erreur vérification expiration session:', error);
            }
          })();
        } else {
          console.log('   ℹ️ Utilisateur non authentifié');
        }
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  // Initialiser le cache de configuration dès que l'utilisateur est authentifié
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🚀 [APP] Initialisation du cache de configuration...');
      initializeConfigurationCache();
    }
  }, [isAuthenticated]);

  // Afficher l'écran de chargement pendant la vérification de la session
  if (loading) {
    return <LoadingScreen message="Vérification de la session..." />;
  }

  return (
    <NavigationContainer>
      {/* Notification globale de session expirée - maintenant à l'intérieur du NavigationContainer */}
      <GlobalSessionNotification />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
      {!isAuthenticated ? (
        // Écrans d'authentification
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : (
        // Application principale avec menu bas fixe (onglets)
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          {/* Écrans secondaires accessibles depuis les onglets */}
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="ScanProduct" component={ScanProductScreen} />
          <Stack.Screen name="Sales" component={SalesScreen} />
          <Stack.Screen name="SaleDetail" component={SaleDetailScreen} />
          <Stack.Screen name="Configuration" component={ConfigurationScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="Export" component={ExportScreen} />
          <Stack.Screen name="Notifications" component={NotificationScreen} />
          <Stack.Screen name="NewSale" component={NewSaleScreen} />
          <Stack.Screen name="Inventory" component={InventoryScreen} />
          <Stack.Screen name="Reception" component={ReceptionScreen} />
          <Stack.Screen name="Loss" component={LossScreen} />
          <Stack.Screen name="Delivery" component={DeliveryScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="SalesReport" component={SalesReportScreen} />
          <Stack.Screen name="ShrinkageReport" component={ShrinkageReportScreen} />
          <Stack.Screen name="StockReport" component={StockReportScreen} />
          <Stack.Screen name="FinancialReport" component={FinancialReportScreen} />
          <Stack.Screen name="AddProduct" component={AddProductScreen} />
          <Stack.Screen name="TestScanner" component={TestScannerScreen} />
          <Stack.Screen name="LabelPreview" component={LabelPreviewScreen} />
          <Stack.Screen name="PrintModeSelection" component={PrintModeSelectionScreen} />
          <Stack.Screen name="CatalogPDF" component={CatalogPDFScreen} />
          <Stack.Screen name="LabelPrint" component={LabelPrintScreen} />
          <Stack.Screen name="BarcodeTest" component={BarcodeTestScreen} />
          <Stack.Screen name="Categories" component={CategoriesScreen} />
          <Stack.Screen name="Brands" component={BrandsScreen} />
          <Stack.Screen name="BrandsByRayon" component={BrandsByRayonScreen} />
          <Stack.Screen name="ProductCopy" component={ProductCopyScreen} />
          <Stack.Screen name="ProductCopyManagement" component={ProductCopyManagementScreen} />
          <Stack.Screen name="CustomerList" component={CustomerListScreen} />
          <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
          <Stack.Screen name="Transactions" component={TransactionsScreen} />
          <Stack.Screen name="Labels" component={LabelGeneratorScreen} />
          <Stack.Screen name="AddEmployee" component={AddEmployeeScreen} />
          <Stack.Screen name="EmployeeList" component={EmployeeListScreen} />
        </>
      )}
    </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <StatusBar style="auto" />
      <ErrorBoundary>
        <AuthWrapper>
          <AppContent />
        </AuthWrapper>
      </ErrorBoundary>
    </Provider>
  );
}
