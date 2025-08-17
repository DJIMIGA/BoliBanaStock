/**
 * Utilitaires pour la gestion des couleurs de StatusBar
 * Évite les erreurs "Color [object Object] parsed to null or undefined"
 */

export const statusBarColors = {
  // Couleurs de fond pour StatusBar
  light: '#FFFFFF',      // Fond clair avec texte sombre
  dark: '#000000',       // Fond sombre avec texte clair
  primary: '#2B3A67',    // Couleur principale BoliBana
  secondary: '#FFD700',  // Couleur secondaire Or
  success: '#2E8B57',    // Couleur de succès Forêt
  warning: '#FFD700',    // Couleur d'avertissement Or
  error: '#EF4444',      // Couleur d'erreur Rouge
  neutral: '#F5F6F9',    // Couleur neutre
};

export const statusBarStyles = {
  light: 'dark-content' as const,    // Texte sombre sur fond clair
  dark: 'light-content' as const,    // Texte clair sur fond sombre
  auto: 'auto' as const,             // Style automatique
};

/**
 * Obtient la couleur de fond appropriée pour StatusBar
 * @param theme - Thème de l'écran ('light', 'dark', 'primary', etc.)
 * @returns Couleur hexadécimale valide pour StatusBar
 */
export function getStatusBarColor(theme: keyof typeof statusBarColors): string {
  return statusBarColors[theme] || statusBarColors.light;
}

/**
 * Obtient le style de texte approprié pour StatusBar
 * @param theme - Thème de l'écran ('light', 'dark', 'primary', etc.)
 * @returns Style de StatusBar ('light-content', 'dark-content', 'auto')
 */
export function getStatusBarStyle(theme: keyof typeof statusBarColors): 'light-content' | 'dark-content' | 'auto' {
  switch (theme) {
    case 'light':
    case 'success':
    case 'warning':
      return statusBarStyles.light;
    case 'dark':
    case 'primary':
    case 'error':
      return statusBarStyles.dark;
    default:
      return statusBarStyles.auto;
  }
}

/**
 * Configuration complète de StatusBar pour un écran
 * @param theme - Thème de l'écran
 * @returns Objet de configuration StatusBar
 */
export function getStatusBarConfig(theme: keyof typeof statusBarColors) {
  return {
    backgroundColor: getStatusBarColor(theme),
    barStyle: getStatusBarStyle(theme),
  };
}
