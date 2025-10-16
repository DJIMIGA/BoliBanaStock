import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { store } from './src/store';
import { checkAuthStatus, logout } from './src/store/slices/authSlice';
import { RootState } from './src/store';
import { AuthWrapper, ErrorBoundary, GlobalSessionNotification, LoadingScreen } from './src/components';
// import { SessionProvider } from './src/contexts/SessionContext'; // Supprimé - approche Redux simplifiée
import {
  LoginScreen,
  SignupScreen,
  DashboardScreen,
  ProductsScreen,
  ProductDetailScreen,
  ScanProductScreen,
  CashRegisterScreen,
  SaleDetailScreen,
  ConfigurationScreen,
  SettingsScreen,
  ProfileScreen,
  LowStockScreen,
  OutOfStockScreen,
  StockValueScreen,
  NewSaleScreen,
  InventoryScreen,
  DeliveryScreen,
  ReportsScreen,
  TransactionsScreen,
  AddProductScreen,
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
} from './src/screens';
import { RootStackParamList } from './src/types';
import theme, { actionColors } from './src/utils/theme';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const MainTabs = () => (
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
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="calculator-outline" size={size} color={color} />
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
  </Tab.Navigator>
);

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Vérifier l'état d'authentification au démarrage
    store.dispatch(checkAuthStatus());
  }, []);

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
        </>
      ) : (
        // Application principale avec menu bas fixe (onglets)
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          {/* Écrans secondaires accessibles depuis les onglets */}
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="ScanProduct" component={ScanProductScreen} />
          <Stack.Screen name="SaleDetail" component={SaleDetailScreen} />
          <Stack.Screen name="Configuration" component={ConfigurationScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="LowStock" component={LowStockScreen} />
          <Stack.Screen name="OutOfStock" component={OutOfStockScreen} />
          <Stack.Screen name="StockValue" component={StockValueScreen} />
          <Stack.Screen name="NewSale" component={NewSaleScreen} />
          <Stack.Screen name="Inventory" component={InventoryScreen} />
          <Stack.Screen name="Delivery" component={DeliveryScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
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
