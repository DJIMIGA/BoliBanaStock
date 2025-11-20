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

