// Thème BoliBana Stock Mobile - Couleurs cohérentes avec le desktop
export const theme = {
  colors: {
    // Couleurs principales BoliBana
    primary: {
      50: '#F5F6F9',
      100: '#E6E9F0',
      200: '#C5CCD9',
      300: '#9BA6BC',
      400: '#6B7A99',
      500: '#2B3A67', // Couleur principale
      600: '#25305A',
      700: '#1F274D',
      800: '#191E40',
      900: '#131533',
      950: '#0D0F26',
    },
    // Couleur secondaire - Or
    secondary: {
      50: '#FFF9E6',
      100: '#FFF2CC',
      200: '#FFE699',
      300: '#FFD966',
      400: '#FFCD33',
      500: '#FFD700', // Couleur secondaire
      600: '#E6C200',
      700: '#CCAD00',
      800: '#B39900',
      900: '#998500',
      950: '#806B00',
    },
    // Couleur tertiaire - Forêt
    success: {
      50: '#F0F7F3',
      100: '#E1EFE7',
      200: '#C3DFCF',
      300: '#A5CFB7',
      400: '#87BF9F',
      500: '#2E8B57', // Couleur tertiaire
      600: '#297D4E',
      700: '#246F45',
      800: '#1F613C',
      900: '#1A5333',
      950: '#15452A',
    },
    // Couleurs d'état
    warning: {
      50: '#FFF9E6',
      100: '#FFF2CC',
      200: '#FFE699',
      300: '#FFD966',
      400: '#FFCD33',
      500: '#FFD700',
      600: '#E6C200',
      700: '#CCAD00',
      800: '#B39900',
      900: '#998500',
    },
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
    },
    info: {
      50: '#F5F6F9',
      100: '#E6E9F0',
      200: '#C5CCD9',
      300: '#9BA6BC',
      400: '#6B7A99',
      500: '#2B3A67',
      600: '#25305A',
      700: '#1F274D',
      800: '#191E40',
      900: '#131533',
    },
    // Couleurs neutres
    neutral: {
      50: '#FFFFFF',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0A0A0A',
    },
    // Couleurs de fond
    background: {
      primary: '#FFFFFF',
      secondary: '#F5F6F9',
      tertiary: '#F5F5F5',
    },
    // Couleurs de texte
    text: {
      primary: '#171717',
      secondary: '#404040',
      tertiary: '#737373',
      inverse: '#FFFFFF',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

// Couleurs d'état pour les indicateurs de stock
export const stockColors = {
  inStock: theme.colors.success[500],      // Vert forêt
  lowStock: theme.colors.warning[500],     // Or
  outOfStock: theme.colors.error[500],     // Rouge
  default: theme.colors.neutral[400],      // Gris
};

export default theme;

// Couleurs pour les actions
export const actionColors = {
  primary: theme.colors.primary[500],      // Bleu BoliBana
  secondary: theme.colors.secondary[500],  // Or
  success: theme.colors.success[500],      // Vert forêt
  warning: theme.colors.warning[500],      // Or
  error: theme.colors.error[500],          // Rouge
  info: theme.colors.info[500],            // Bleu BoliBana
}; 