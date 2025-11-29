import { getCachedCurrency } from '../hooks/useConfiguration';

/**
 * Détermine le nombre de décimales selon la devise
 * @param currencyCode - Code de la devise (ex: 'FCFA', 'EUR', 'USD')
 * @returns Nombre de décimales (0 ou 2)
 */
const getDecimalPlacesForCurrency = (currencyCode: string): number => {
  // Devises sans centimes (pas de décimales)
  const NO_DECIMAL_CURRENCIES = ['FCFA', 'XOF', 'XAF', 'JPY', 'KRW', 'MGA', 'XPF'];
  
  if (NO_DECIMAL_CURRENCIES.includes(currencyCode)) {
    return 0;
  }
  // Par défaut, 2 décimales pour les autres devises (EUR, USD, GBP, etc.)
  return 2;
};

/**
 * Formate un montant avec la devise configurée
 * @param amount - Le montant à formater
 * @param currency - Optionnel: devise spécifique (sinon utilise la devise de la configuration)
 * @returns Le montant formaté avec la devise (ex: "1 000 FCFA" ou "15,50 EUR")
 */
export const formatCurrency = (
  amount: number | string | null | undefined,
  currency?: string
): string => {
  const num = typeof amount === 'number' ? amount : parseFloat((amount ?? 0).toString());
  
  if (!isFinite(num)) {
    const defaultCurrency = currency || getCachedCurrency();
    return `0 ${defaultCurrency}`;
  }

  // Utiliser la devise fournie ou celle de la configuration
  const finalCurrency = currency || getCachedCurrency();
  
  // Déterminer le nombre de décimales selon la devise
  const decimalPlaces = getDecimalPlacesForCurrency(finalCurrency);
  
  // Arrondir selon le nombre de décimales
  let rounded: number;
  if (decimalPlaces === 0) {
    rounded = Math.round(num);
  } else {
    rounded = Math.round(num * 100) / 100; // Arrondir à 2 décimales
  }
  
  // Formater avec des espaces comme séparateurs de milliers
  let formatted: string;
  if (decimalPlaces === 0) {
    formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  } else {
    // Formater avec 2 décimales et virgule comme séparateur décimal (format français)
    const parts = rounded.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    formatted = `${integerPart},${parts[1]}`;
  }
  
  return `${formatted} ${finalCurrency}`;
};

/**
 * Récupère la devise actuelle depuis la configuration
 * @returns La devise configurée ou 'FCFA' par défaut
 */
export const getCurrency = (): string => {
  return getCachedCurrency();
};

/**
 * Formate un montant sans la devise (juste le nombre formaté)
 * @param amount - Le montant à formater
 * @param currency - Optionnel: devise pour déterminer le nombre de décimales
 * @returns Le montant formaté sans devise (ex: "1 000" ou "15,50")
 */
export const formatAmount = (
  amount: number | string | null | undefined,
  currency?: string
): string => {
  const num = typeof amount === 'number' ? amount : parseFloat((amount ?? 0).toString());
  
  if (!isFinite(num)) {
    return '0';
  }

  // Utiliser la devise fournie ou celle de la configuration pour déterminer les décimales
  const finalCurrency = currency || getCachedCurrency();
  const decimalPlaces = getDecimalPlacesForCurrency(finalCurrency);
  
  // Arrondir selon le nombre de décimales
  let rounded: number;
  if (decimalPlaces === 0) {
    rounded = Math.round(num);
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  } else {
    rounded = Math.round(num * 100) / 100; // Arrondir à 2 décimales
    const parts = rounded.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${integerPart},${parts[1]}`;
  }
};

/**
 * Formate une valeur de prix pendant la saisie (pour les champs de saisie)
 * @param value - La valeur à formater (string)
 * @param currency - Optionnel: devise pour déterminer le format
 * @returns La valeur formatée avec séparateurs de milliers (ex: "1 500" pour FCFA)
 */
export const formatPriceInput = (
  value: string,
  currency?: string
): string => {
  if (!value) return '';
  
  // Gérer les valeurs négatives
  const isNegative = value.startsWith('-');
  let numValue = value.replace(/\s/g, '').replace(/,/g, '').replace(/^-/, '');
  
  // Si ce n'est pas un nombre valide, retourner la valeur originale
  if (numValue === '' || numValue === '.') return isNegative ? '-' + numValue : numValue;
  
  // Pour FCFA (pas de décimales), formater avec espaces comme séparateurs de milliers
  const finalCurrency = currency || getCachedCurrency();
  const decimalPlaces = getDecimalPlacesForCurrency(finalCurrency);
  
  if (decimalPlaces === 0) {
    // Pas de décimales pour FCFA - arrondir et supprimer les décimales
    const num = parseFloat(numValue);
    if (!isNaN(num)) {
      const rounded = Math.round(num).toString();
      const formatted = rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      return isNegative ? '-' + formatted : formatted;
    }
    // Si ce n'est pas un nombre valide, retourner la valeur nettoyée sans décimales
    const cleaned = numValue.split('.')[0]; // Prendre seulement la partie entière
    const formatted = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return isNegative ? '-' + formatted : formatted;
  } else {
    // Pour les devises avec décimales, permettre les décimales
    const parts = numValue.split('.');
    if (parts.length > 2) {
      numValue = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts.length === 2 && parts[1].length > 2) {
      // Limiter à 2 décimales
      numValue = parts[0] + '.' + parts[1].substring(0, 2);
    }
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const formatted = parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
    return isNegative ? '-' + formatted : formatted;
  }
};

/**
 * Formate une valeur de poids/quantité pendant la saisie
 * @param value - La valeur à formater (string)
 * @returns La valeur formatée avec max 3 décimales, zéros inutiles supprimés
 */
export const formatWeightInput = (value: string): string => {
  if (!value && value !== '0') return '';
  
  // Gérer les valeurs négatives
  const isNegative = value.startsWith('-');
  // Permettre les virgules et les points comme séparateurs décimaux
  let cleaned = value.replace(/,/g, '.').replace(/^-/, '');
  // Enlever tout sauf les chiffres et un point
  cleaned = cleaned.replace(/[^0-9.]/g, '');
  // S'assurer qu'il n'y a qu'un seul point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  if (cleaned === '' || cleaned === '.') return isNegative ? '-' + cleaned : cleaned;
  
  const numValue = parseFloat(cleaned);
  if (isNaN(numValue)) return value; // Retourner la valeur originale si ce n'est pas un nombre
  
  // Si c'est un entier, pas de décimales
  if (numValue % 1 === 0) {
    return isNegative ? '-' + numValue.toString() : numValue.toString();
  }
  
  // Sinon, limiter à 3 décimales max et enlever les zéros inutiles
  const formatted = numValue.toFixed(3).replace(/\.?0+$/, '');
  return isNegative ? '-' + formatted : formatted;
};

/**
 * Nettoie une valeur formatée avant l'envoi (enlève les espaces et formate correctement)
 * @param value - La valeur à nettoyer
 * @returns La valeur nettoyée (sans espaces, prête pour parseFloat)
 */
export const cleanFormattedValue = (value: string): string => {
  if (!value) return '';
  // Enlever les espaces et remplacer les virgules par des points
  return value.replace(/\s/g, '').replace(/,/g, '');
};

