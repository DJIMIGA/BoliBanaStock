/**
 * Décomposition d'un montant en pièces et billets
 * Coupures disponibles selon la Banque Centrale des États d'Afrique de l'Ouest (pour FCFA)
 */

import { getCachedCurrency } from '../hooks/useConfiguration';

export interface CurrencyBreakdown {
  denomination: number;
  count: number;
  label: string;
}

// Coupures FCFA classées du plus grand au plus petit (valeurs uniquement)
export const CFA_DENOMINATIONS_VALUES = [
  10000, 5000, 2500, 2000, 1000, 500, 250, 100, 50, 25, 10, 5
] as const;

// Fonction pour obtenir les dénominations avec la devise configurée
export const getDenominations = (currency?: string) => {
  const currentCurrency = currency || getCachedCurrency();
  return CFA_DENOMINATIONS_VALUES.map(value => ({
    value,
    label: `${value.toLocaleString('fr-FR').replace(/\s/g, ' ')} ${currentCurrency}`,
  }));
};

// Coupures FCFA classées du plus grand au plus petit (pour compatibilité)
export const CFA_DENOMINATIONS = getDenominations();

/**
 * Décompose un montant en billets et pièces
 * Utilise l'algorithme glouton pour minimiser le nombre de billets/pièces
 * @param amount - Le montant à décomposer
 * @param currency - Optionnel: devise spécifique (sinon utilise la devise de la configuration)
 */
export const breakdownCFAAmount = (amount: number, currency?: string): CurrencyBreakdown[] => {
  if (amount <= 0 || !Number.isInteger(amount)) {
    return [];
  }

  const currentCurrency = currency || getCachedCurrency();
  const denominations = getDenominations(currentCurrency);
  const breakdown: CurrencyBreakdown[] = [];
  let remaining = amount;

  for (const { value, label } of denominations) {
    const count = Math.floor(remaining / value);
    if (count > 0) {
      breakdown.push({
        denomination: value,
        count,
        label,
      });
      remaining = remaining % value;
    }
  }

  // Si il reste un montant (< 5), on l'ajoute en tant que "restant"
  if (remaining > 0) {
    breakdown.push({
      denomination: remaining,
      count: 1,
      label: `${remaining} ${currentCurrency} (restant)`,
    });
  }

  return breakdown;
};

/**
 * Formate la décomposition pour l'affichage
 */
export const formatBreakdown = (breakdown: CurrencyBreakdown[]): string => {
  if (breakdown.length === 0) {
    return 'Aucune décomposition';
  }

  return breakdown
    .filter(item => item.count > 0)
    .map(item => {
      if (item.count === 1) {
        return `1 × ${item.label}`;
      }
      return `${item.count} × ${item.label}`;
    })
    .join('\n');
};

/**
 * Calcule le nombre total de billets et pièces
 */
export const getTotalPieces = (breakdown: CurrencyBreakdown[]): number => {
  return breakdown.reduce((total, item) => total + item.count, 0);
};

/**
 * Arrondit un montant à la prochaine coupure valide supérieure
 */
export const roundToNextDenomination = (amount: number): number => {
  if (amount <= 0) return 0;
  
  // Trier les coupures par ordre croissant
  const denominations = [...CFA_DENOMINATIONS_VALUES].sort((a, b) => a - b);
  
  // Trouver la plus petite coupure qui est supérieure ou égale au montant
  for (const denomination of denominations) {
    if (amount <= denomination) {
      return denomination;
    }
  }
  
  // Si le montant dépasse toutes les coupures, arrondir au multiple de 10000 supérieur
  return Math.ceil(amount / 10000) * 10000;
};

/**
 * Génère des montants rapides basés sur le total, arrondis aux coupures valides
 */
export const generateQuickAmounts = (totalAmount: number): number[] => {
  if (totalAmount <= 0) {
    // Si pas de total, proposer des coupures courantes
    return [1000, 2000, 5000, 10000];
  }
  
  // Arrondir le total à la prochaine coupure
  const roundedTotal = roundToNextDenomination(totalAmount);
  
  // Générer des montants rapides avec des incréments de coupures communes
  const quickAmounts: Set<number> = new Set();
  
  // 1. Le montant arrondi au supérieur
  quickAmounts.add(roundedTotal);
  
  // 2. Ajouter des montants avec des incréments selon la taille du total
  if (totalAmount < 1000) {
    // Pour petits montants, proposer des coupures pièces communes
    quickAmounts.add(roundToNextDenomination(totalAmount + 25));
    quickAmounts.add(roundToNextDenomination(totalAmount + 50));
    quickAmounts.add(roundToNextDenomination(totalAmount + 100));
  } else if (totalAmount < 5000) {
    // Pour montants moyens, proposer des incréments de 500, 1000, 2500
    quickAmounts.add(roundToNextDenomination(totalAmount + 500));
    quickAmounts.add(roundToNextDenomination(totalAmount + 1000));
    quickAmounts.add(roundToNextDenomination(totalAmount + 2500));
  } else {
    // Pour gros montants, proposer des incréments de 2000, 2500, 5000
    quickAmounts.add(roundToNextDenomination(totalAmount + 2000));
    quickAmounts.add(roundToNextDenomination(totalAmount + 2500));
    quickAmounts.add(roundToNextDenomination(totalAmount + 5000));
  }
  
  // Convertir en tableau, trier et prendre les 4 premiers
  const sortedAmounts = Array.from(quickAmounts).sort((a, b) => a - b);
  
  // S'assurer qu'on a au moins le montant arrondi
  if (sortedAmounts.length < 4) {
    // Ajouter quelques coupures supplémentaires si nécessaire
    const commonDenominations = [1000, 2000, 5000, 10000];
    for (const denom of commonDenominations) {
      if (denom >= roundedTotal && sortedAmounts.length < 4) {
        if (!sortedAmounts.includes(denom)) {
          sortedAmounts.push(denom);
        }
      }
    }
    sortedAmounts.sort((a, b) => a - b);
  }
  
  return sortedAmounts.slice(0, 4);
};

