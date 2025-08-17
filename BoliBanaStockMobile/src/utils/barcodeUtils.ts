/**
 * Utilitaires pour le traitement des codes-barres
 */

export interface BarcodeInfo {
  type: string;
  data: string;
  isValid: boolean;
  format?: string;
  country?: string;
}

/**
 * Valide un code-barres selon différents formats
 */
export const validateBarcode = (barcode: string): BarcodeInfo => {
  const trimmedBarcode = barcode.trim();
  
  if (!trimmedBarcode) {
    return {
      type: 'unknown',
      data: trimmedBarcode,
      isValid: false,
    };
  }

  // Détection du type de code-barres
  const barcodeInfo = detectBarcodeType(trimmedBarcode);
  
  return {
    type: barcodeInfo.type,
    data: trimmedBarcode,
    isValid: barcodeInfo.isValid,
    format: barcodeInfo.format,
    country: barcodeInfo.country,
  };
};

/**
 * Détecte le type de code-barres
 */
const detectBarcodeType = (barcode: string) => {
  const length = barcode.length;
  
  // EAN-13 (13 chiffres)
  if (length === 13 && /^\d{13}$/.test(barcode)) {
    return {
      type: 'EAN-13',
      isValid: validateEAN13(barcode),
      format: 'EAN-13',
    };
  }
  
  // EAN-8 (8 chiffres)
  if (length === 8 && /^\d{8}$/.test(barcode)) {
    return {
      type: 'EAN-8',
      isValid: validateEAN8(barcode),
      format: 'EAN-8',
    };
  }
  
  // UPC-A (12 chiffres)
  if (length === 12 && /^\d{12}$/.test(barcode)) {
    return {
      type: 'UPC-A',
      isValid: validateUPCA(barcode),
      format: 'UPC-A',
    };
  }
  
  // Code 128 (variable, commence souvent par des chiffres)
  if (/^\d+/.test(barcode)) {
    return {
      type: 'Code 128',
      isValid: true,
      format: 'Code 128',
    };
  }
  
  // Code 39 (peut contenir des lettres et des chiffres)
  if (/^[A-Z0-9\-\.\/\+\s]+$/i.test(barcode)) {
    return {
      type: 'Code 39',
      isValid: true,
      format: 'Code 39',
    };
  }
  
  // QR Code ou autre format
  return {
    type: 'QR/Other',
    isValid: true,
    format: 'QR/Other',
  };
};

/**
 * Valide un code EAN-13 avec la clé de contrôle
 */
const validateEAN13 = (barcode: string): boolean => {
  if (barcode.length !== 13) return false;
  
  const digits = barcode.split('').map(Number);
  const checkDigit = digits[12];
  
  // Calcul de la clé de contrôle
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return checkDigit === calculatedCheckDigit;
};

/**
 * Valide un code EAN-8 avec la clé de contrôle
 */
const validateEAN8 = (barcode: string): boolean => {
  if (barcode.length !== 8) return false;
  
  const digits = barcode.split('').map(Number);
  const checkDigit = digits[7];
  
  // Calcul de la clé de contrôle
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1);
  }
  
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return checkDigit === calculatedCheckDigit;
};

/**
 * Valide un code UPC-A avec la clé de contrôle
 */
const validateUPCA = (barcode: string): boolean => {
  if (barcode.length !== 12) return false;
  
  const digits = barcode.split('').map(Number);
  const checkDigit = digits[11];
  
  // Calcul de la clé de contrôle
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return checkDigit === calculatedCheckDigit;
};

/**
 * Extrait le pays d'origine d'un code EAN-13
 */
export const getCountryFromEAN13 = (barcode: string): string | undefined => {
  if (barcode.length !== 13) return undefined;
  
  const prefix = barcode.substring(0, 3);
  
  const countryCodes: { [key: string]: string } = {
    '300': 'France',
    '301': 'France',
    '302': 'France',
    '303': 'France',
    '304': 'France',
    '305': 'France',
    '306': 'France',
    '307': 'France',
    '308': 'France',
    '309': 'France',
    '400': 'Allemagne',
    '401': 'Allemagne',
    '402': 'Allemagne',
    '403': 'Allemagne',
    '404': 'Allemagne',
    '405': 'Allemagne',
    '406': 'Allemagne',
    '407': 'Allemagne',
    '408': 'Allemagne',
    '409': 'Allemagne',
    '500': 'Royaume-Uni',
    '501': 'Royaume-Uni',
    '502': 'Royaume-Uni',
    '503': 'Royaume-Uni',
    '504': 'Royaume-Uni',
    '505': 'Royaume-Uni',
    '506': 'Royaume-Uni',
    '507': 'Royaume-Uni',
    '508': 'Royaume-Uni',
    '509': 'Royaume-Uni',
    '600': 'Afrique du Sud',
    '601': 'Afrique du Sud',
    '602': 'Afrique du Sud',
    '603': 'Afrique du Sud',
    '604': 'Afrique du Sud',
    '605': 'Afrique du Sud',
    '606': 'Afrique du Sud',
    '607': 'Afrique du Sud',
    '608': 'Afrique du Sud',
    '609': 'Afrique du Sud',
    '690': 'Chine',
    '691': 'Chine',
    '692': 'Chine',
    '693': 'Chine',
    '694': 'Chine',
    '695': 'Chine',
    '696': 'Chine',
    '697': 'Chine',
    '698': 'Chine',
    '699': 'Chine',
  };
  
  return countryCodes[prefix];
};

/**
 * Formate un code-barres pour l'affichage
 */
export const formatBarcode = (barcode: string): string => {
  const trimmed = barcode.trim();
  
  if (trimmed.length === 13) {
    // EAN-13: 123-45678-90123
    return `${trimmed.substring(0, 3)}-${trimmed.substring(3, 8)}-${trimmed.substring(8)}`;
  }
  
  if (trimmed.length === 8) {
    // EAN-8: 123-45678
    return `${trimmed.substring(0, 3)}-${trimmed.substring(3)}`;
  }
  
  if (trimmed.length === 12) {
    // UPC-A: 123-45678-9012
    return `${trimmed.substring(0, 3)}-${trimmed.substring(3, 8)}-${trimmed.substring(8)}`;
  }
  
  return trimmed;
};

/**
 * Nettoie un code-barres des caractères non désirés
 */
export const cleanBarcode = (barcode: string): string => {
  return barcode
    .replace(/[^A-Za-z0-9\-\.\/\+\s]/g, '') // Garde seulement les caractères valides
    .trim();
};
