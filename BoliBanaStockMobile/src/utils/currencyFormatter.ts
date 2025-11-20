import { getCachedCurrency } from '../hooks/useConfiguration';

/**
 * Formate un montant avec la devise configurée
 * @param amount - Le montant à formater
 * @param currency - Optionnel: devise spécifique (sinon utilise la devise de la configuration)
 * @returns Le montant formaté avec la devise (ex: "1 000 FCFA")
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

  // Arrondir le montant
  const rounded = Math.round(num);
  
  // Formater avec des espaces comme séparateurs de milliers (format français)
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  // Utiliser la devise fournie ou celle de la configuration
  const finalCurrency = currency || getCachedCurrency();
  
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
 * @returns Le montant formaté sans devise (ex: "1 000")
 */
export const formatAmount = (amount: number | string | null | undefined): string => {
  const num = typeof amount === 'number' ? amount : parseFloat((amount ?? 0).toString());
  
  if (!isFinite(num)) {
    return '0';
  }

  const rounded = Math.round(num);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

