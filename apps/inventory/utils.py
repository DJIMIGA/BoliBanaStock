"""
Utilitaires pour l'inventaire
"""

def generate_ean13_from_cug(cug, prefix="200"):
    """
    Génère un code-barres EAN-13 valide en complétant le CUG
    
    Format: PREFIX + CUG_HASH + CHECKSUM
    Exemple: 200 + 12345 + 7 = 2001234500007
    
    Args:
        cug: Le CUG du produit (string ou int)
        prefix: Préfixe à utiliser (défaut: "200")
    
    Returns:
        str: Code EAN-13 valide de 13 chiffres
    """
    # Convertir le CUG en string
    cug_str = str(cug)
    
    # Créer un hash unique à partir du CUG complet pour éviter les conflits
    # Utiliser le hash du CUG complet pour créer un code unique
    hash_value = abs(hash(cug_str)) % 100000  # 5 chiffres max
    cug_digits = str(hash_value).zfill(5)
    
    # Construire le code sans la clé de contrôle
    code_without_checksum = prefix + cug_digits
    
    # Compléter avec des zéros pour avoir exactement 12 chiffres
    code_without_checksum = code_without_checksum.ljust(12, '0')
    
    # Calculer la clé de contrôle EAN-13
    checksum = calculate_ean13_checksum(code_without_checksum)
    
    # Retourner le code complet
    return code_without_checksum + str(checksum)


def calculate_ean13_checksum(code):
    """
    Calcule la clé de contrôle EAN-13
    
    Args:
        code: Code de 12 chiffres sans la clé de contrôle
    
    Returns:
        int: Chiffre de contrôle EAN-13
    """
    if len(code) != 12:
        raise ValueError("Le code doit avoir exactement 12 chiffres")
    
    total = 0
    for i, digit in enumerate(code):
        digit_int = int(digit)
        if i % 2 == 0:  # Position impaire (0-indexed)
            total += digit_int
        else:  # Position paire (0-indexed)
            total += digit_int * 3
    
    checksum = (10 - (total % 10)) % 10
    return checksum
