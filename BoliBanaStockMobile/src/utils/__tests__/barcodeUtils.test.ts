import { sanitizeBarcode } from '../barcodeUtils';

describe('sanitizeBarcode (caisse)', () => {
  test('retire espaces et caractères non numériques', () => {
    const { sanitized, isNumeric, length } = sanitizeBarcode('  12 3A-45_67*89  ');
    expect(sanitized).toBe('123456789');
    expect(isNumeric).toBe(true);
    expect(length).toBe(9);
  });

  test('retourne vide et isNumeric=false pour chaîne vide', () => {
    const { sanitized, isNumeric, length } = sanitizeBarcode('   ');
    expect(sanitized).toBe('');
    expect(isNumeric).toBe(false);
    expect(length).toBe(0);
  });

  test('préserve uniquement les chiffres sur EAN-13', () => {
    const code = '  7930 1360 8755 8 ';
    const { sanitized, isNumeric, length } = sanitizeBarcode(code);
    expect(sanitized).toBe('7930136087558');
    expect(isNumeric).toBe(true);
    expect(length).toBe(13);
  });
});

