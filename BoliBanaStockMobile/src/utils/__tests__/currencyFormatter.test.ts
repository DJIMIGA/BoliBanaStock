/**
 * Tests unitaires pour currencyFormatter
 * 
 * Pour lancer les tests :
 * npm test -- currencyFormatter.test.ts
 * ou
 * npx jest currencyFormatter.test.ts
 */

import { formatCurrency, getCurrency, formatAmount } from '../currencyFormatter';
import { getCachedCurrency } from '../../hooks/useConfiguration';

// Mock du hook useConfiguration
jest.mock('../../hooks/useConfiguration', () => ({
  getCachedCurrency: jest.fn(() => 'FCFA'),
}));

describe('currencyFormatter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Réinitialiser le mock pour retourner FCFA par défaut
    (getCachedCurrency as jest.Mock).mockReturnValue('FCFA');
  });

  describe('formatCurrency', () => {
    it('devrait formater un montant avec la devise par défaut', () => {
      const result = formatCurrency(1000);
      expect(result).toBe('1 000 FCFA');
    });

    it('devrait formater un montant avec une devise spécifique', () => {
      const result = formatCurrency(1000, 'EUR');
      expect(result).toBe('1 000 EUR');
    });

    it('devrait utiliser la devise configurée si aucune devise n\'est fournie', () => {
      (getCachedCurrency as jest.Mock).mockReturnValue('USD');
      const result = formatCurrency(1500);
      expect(result).toBe('1 500 USD');
    });

    it('devrait formater avec des séparateurs de milliers', () => {
      const result = formatCurrency(1234567);
      expect(result).toBe('1 234 567 FCFA');
    });

    it('devrait gérer le montant zéro', () => {
      const result = formatCurrency(0);
      expect(result).toBe('0 FCFA');
    });

    it('devrait gérer null', () => {
      const result = formatCurrency(null);
      expect(result).toBe('0 FCFA');
    });

    it('devrait gérer undefined', () => {
      const result = formatCurrency(undefined);
      expect(result).toBe('0 FCFA');
    });

    it('devrait arrondir les décimales', () => {
      const result = formatCurrency(1234.56);
      expect(result).toBe('1 235 FCFA');
    });

    it('devrait gérer les montants négatifs', () => {
      const result = formatCurrency(-500);
      expect(result).toBe('-500 FCFA');
    });

    it('devrait gérer les chaînes de caractères numériques', () => {
      const result = formatCurrency('1000');
      expect(result).toBe('1 000 FCFA');
    });
  });

  describe('getCurrency', () => {
    it('devrait retourner la devise configurée', () => {
      (getCachedCurrency as jest.Mock).mockReturnValue('EUR');
      const result = getCurrency();
      expect(result).toBe('EUR');
    });

    it('devrait retourner FCFA par défaut si aucune configuration', () => {
      (getCachedCurrency as jest.Mock).mockReturnValue('FCFA');
      const result = getCurrency();
      expect(result).toBe('FCFA');
    });
  });

  describe('formatAmount', () => {
    it('devrait formater un montant sans devise', () => {
      const result = formatAmount(1000);
      expect(result).toBe('1 000');
    });

    it('devrait formater avec des séparateurs de milliers', () => {
      const result = formatAmount(1234567);
      expect(result).toBe('1 234 567');
    });

    it('devrait gérer le montant zéro', () => {
      const result = formatAmount(0);
      expect(result).toBe('0');
    });

    it('devrait arrondir les décimales', () => {
      const result = formatAmount(1234.56);
      expect(result).toBe('1 235');
    });
  });
});

