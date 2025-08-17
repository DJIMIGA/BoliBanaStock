// Types pour l'authentification
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  telephone?: string;
  poste?: string;
  adresse?: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// Types pour les catégories
export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Types pour les marques
export interface Brand {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Types pour les produits
export interface Product {
  id: number;
  name: string;
  description?: string;
  cug: string;
  slug: string;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  alert_threshold: number;
  category: Category;
  brand: Brand;
  image?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Product[];
}

// Types pour les transactions
export interface Transaction {
  id: number;
  product: Product;
  transaction_type: 'IN' | 'OUT';
  quantity: number;
  transaction_date: string;
  notes?: string;
  created_at: string;
}

// Types pour les ventes
export interface SaleItem {
  id: number;
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Sale {
  id: number;
  sale_number: string;
  items: SaleItem[];
  total_amount: number;
  payment_method: 'CASH' | 'CARD' | 'MOBILE_MONEY';
  date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSaleRequest {
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
  }>;
  payment_method: 'CASH' | 'CARD' | 'MOBILE_MONEY';
}

// Types pour le dashboard
export interface DashboardStats {
  total_products: number;
  total_categories: number;
  total_brands: number;
  low_stock_products: number;
  total_sales_today: number;
  total_revenue_today: number;
  recent_sales: Sale[];
  low_stock_alerts: Product[];
}

// Types pour les erreurs API
export interface ApiError {
  message: string;
  status: number;
  details?: any;
}

// Types pour la navigation
export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  MainTabs: undefined;
  Dashboard: undefined;
  Products: undefined;
  ScanProduct: undefined;
  Sales: undefined;
  Configuration: undefined;
  Settings: undefined;
  ProductDetail: { productId: number };
  SaleDetail: { saleId: number };
  NewSale: undefined;
  UpdateStock: { productId: number };
  Profile: undefined;
  Reports: undefined;
  Inventory: undefined;
  LowStock: undefined;
  OutOfStock: undefined;
  StockValue: undefined;
  Transactions: undefined;
  AddProduct: { editId?: number; barcode?: string } | undefined;
  TestScanner: undefined;
  InventoryScanner: undefined;
  Labels: undefined;
  LabelPreview: {
    labels: Array<{
      product_id: number;
      name: string;
      cug: string;
      barcode_ean: string;
      category: string | null;
      brand: string | null;
      price?: number;
      stock?: number;
    }>;
    includePrices: boolean;
    includeStock: boolean;
  };
  BarcodeTest: undefined;
  Categories: undefined;
  Brands: undefined;
};

// Types pour les états de chargement
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

// Types pour les filtres et recherche
export interface ProductFilters {
  category?: number;
  brand?: number;
  search?: string;
  low_stock_only?: boolean;
  ordering?: string;
}

export interface SaleFilters {
  date_from?: string;
  date_to?: string;
  payment_method?: string;
  search?: string;
} 