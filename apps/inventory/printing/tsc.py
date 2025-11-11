from typing import Tuple
import unicodedata
import re

from apps.inventory.models import LabelBatch, LabelItem, LabelSetting


def _parse_margins(margins_mm: str) -> tuple[float, float, float, float]:
    try:
        top, right, bottom, left = [float(x.strip()) for x in (margins_mm or "").split(",")]
        return top, right, bottom, left
    except Exception:
        return 2.0, 2.0, 2.0, 2.0


def _mm_to_dots(mm_value: float, dpi: int) -> int:
    return int(round(float(mm_value) / 25.4 * dpi))


def _escape_text(value: str) -> str:
    return (value or "").replace('"', '\\"')


def _convert_french_chars(text: str) -> str:
    """
    Convertit les caractères français en équivalents ASCII pour l'impression TSC.
    Préserve les espaces et les caractères ASCII imprimables.
    """
    if not text:
        return ""
    
    # Remplacer les caractères spéciaux courants
    replacements = {
        'œ': 'oe',
        'æ': 'ae',
        '€': 'EUR',
    }
    
    result = text
    for old, new in replacements.items():
        result = result.replace(old, new)
    
    # Normaliser Unicode (NFD) pour décomposer les caractères avec diacritiques
    result = unicodedata.normalize('NFD', result)
    
    # Supprimer les diacritiques (accents)
    result = ''.join(c for c in result if unicodedata.category(c) != 'Mn')
    
    # Supprimer les espaces insécables et autres caractères invisibles
    result = result.replace('\u200B', '')  # Zero-width space
    result = result.replace('\u00A0', ' ')  # Non-breaking space -> espace normal
    
    # Nettoyer les espaces multiples
    result = re.sub(r' +', ' ', result)
    
    # S'assurer que seuls les caractères ASCII imprimables restent
    result = ''.join(c for c in result if ord(c) >= 32 and ord(c) <= 126 or c in [' ', '\n', '\r', '\t'])
    
    return result.strip()


def _barcode_command(x_dots: int, y_dots: int, settings: LabelSetting, value: str, bar_height_mm: float, dpi: int, readable: int = 0) -> str:
    """
    Génère une commande BARCODE TSPL.
    readable: 0 = pas de texte, 1 = texte visible
    """
    bar_height_dots = _mm_to_dots(bar_height_mm, dpi)
    rotation = 0
    narrow = 2
    wide = 4
    if settings and settings.barcode_type == 'EAN13' and value.isdigit() and len(value) >= 12:
        # TSPL EAN13
        return f"BARCODE {x_dots},{y_dots},\"EAN13\",{bar_height_dots},{readable},{rotation},{narrow},{wide},\"{value[:12]}\""
    if settings and settings.barcode_type == 'QR':
        # Simple QR: module size 6, ecc M
        return f"QRCODE {x_dots},{y_dots},H,6,A,0,\"{value}\""
    # Fallback CODE128
    return f"BARCODE {x_dots},{y_dots},\"128\",{bar_height_dots},{readable},{rotation},{narrow},{wide},\"{value}\""


def render_label_batch_tsc(batch: LabelBatch) -> Tuple[str, str]:
    """
    Génère des commandes TSPL/TSC (texte brut) pour un LabelBatch avec layout optimisé.
    Layout: 80x40mm (par défaut), positions fixes optimisées.
    Retourne (tsc_text, filename).
    """
    settings = LabelSetting.objects.filter(site_configuration=batch.site_configuration).first()
    template = batch.template

    # Dimensions par défaut optimisées (80x40mm)
    width_mm = float(getattr(template, 'width_mm', 80) or 80)
    height_mm = float(getattr(template, 'height_mm', 40) or 40)
    dpi = int(getattr(template, 'dpi', 203) or 203)
    top_mm, right_mm, bottom_mm, left_mm = _parse_margins(getattr(template, 'margins_mm', '1,2,0.5,2'))

    # Paramètres d'impression (peuvent être surchargés par thermal_settings du batch)
    density = 8
    speed = 4
    # Direction: 0 = FORWARD, 1 = BACKWARD (inversé pour corriger l'orientation)
    direction = 1  # BACKWARD pour corriger l'orientation inversée

    header = [
        f"SIZE {width_mm} mm,{height_mm} mm",
        f"GAP {max(0.0, bottom_mm):.1f} mm,0",
        f"DENSITY {density}",
        f"SPEED {speed}",
        f"DIRECTION {direction}",
    ]

    commands: list[str] = header[:]

    # Layout optimisé (positions fixes en mm)
    # Réduire les marges pour mieux utiliser l'espace vertical
    margin_top = 0.5  # Réduit de 1.0 à 0.5mm
    margin_bottom = 1.0  # Augmenté pour laisser de la place au prix
    margin_left = 2.0
    margin_right = 2.0
    
    # Espace disponible verticalement
    available_height = height_mm - margin_top - margin_bottom  # 40 - 0.5 - 1.0 = 38.5mm
    
    # Positions fixes en mm (optimisées pour mieux utiliser l'espace)
    name_y_mm = margin_top + 0.5  # Nom à 1mm du haut (réduit)
    name_height_mm = 2.5  # Réduit
    spacing_after_name = 1.5  # Réduit de 2.0 à 1.5mm
    barcode_y_mm = name_y_mm + name_height_mm + spacing_after_name  # Code-barres après le nom
    barcode_height_mm = 7.0  # Réduit de 8.0 à 7.0mm
    spacing_after_barcode = -1.5  # Légende très proche (superposée)
    legend_y_mm = barcode_y_mm + barcode_height_mm + spacing_after_barcode
    legend_height_mm = 2.0  # Réduit
    spacing_after_legend = 0.5  # Espace positif au lieu de négatif
    cug_y_mm = legend_y_mm + legend_height_mm + spacing_after_legend
    spacing_after_cug = 2.5  # Réduit de 3.5 à 2.5mm
    price_y_mm = cug_y_mm + spacing_after_cug
    
    # Vérifier que le prix reste dans les limites
    price_height_mm = 2.5  # Hauteur estimée du prix
    final_y = price_y_mm + price_height_mm
    
    # Si on dépasse, ajuster en remontant tout
    if final_y > height_mm - margin_bottom:
        overflow = final_y - (height_mm - margin_bottom)
        # Remonter tous les éléments
        name_y_mm = max(margin_top + 0.3, name_y_mm - overflow / 2)
        barcode_y_mm = name_y_mm + name_height_mm + spacing_after_name
        legend_y_mm = barcode_y_mm + barcode_height_mm + spacing_after_barcode
        cug_y_mm = legend_y_mm + legend_height_mm + spacing_after_legend
        price_y_mm = cug_y_mm + spacing_after_cug
    
    # Positions X fixes
    name_x = _mm_to_dots(margin_left + 2.0, dpi)  # Nom à gauche
    
    # Code-barres: positionné à droite (8mm à gauche du centre)
    center_x = _mm_to_dots(width_mm / 2, dpi)
    offset_left_mm = 8
    # Estimation de la largeur du code-barres (190 points pour EAN13, variable pour CODE128)
    # On utilisera une estimation conservatrice de 200 points
    estimated_barcode_width_dots = 200
    barcode_x = center_x - estimated_barcode_width_dots // 2 - _mm_to_dots(offset_left_mm, dpi)
    # S'assurer que le code-barres ne dépasse pas à gauche
    min_barcode_x = _mm_to_dots(margin_left, dpi)
    max_barcode_x = _mm_to_dots(width_mm - margin_right, dpi) - estimated_barcode_width_dots
    barcode_x = max(min_barcode_x, min(barcode_x, max_barcode_x))
    
    # Légende: centrée sous le code-barres
    legend_x = barcode_x  # Alignée avec le code-barres (sera ajustée si nécessaire)
    
    # Prix: à droite (justify-between avec CUG)
    # Estimation de la largeur du prix (8 points par caractère)
    # On calculera dynamiquement pour chaque produit

    for item in batch.items.all().order_by('position', 'id'):
        # Nom du produit (converti pour caractères français)
        name = _convert_french_chars(str(item.product.name)[:40])
        name_escaped = _escape_text(name)
        
        # Prix
        price_text = None
        if settings and settings.include_price:
            try:
                price_value = int(item.product.selling_price)
                currency = settings.currency or 'FCFA'
                # Formater avec espaces comme séparateurs de milliers
                price_formatted = f"{price_value:,}".replace(",", " ")
                price_text = f"{price_formatted} {currency}"
            except Exception:
                price_text = None

        # Choisir la valeur de code-barres
        barcode_value = item.barcode_value or (
            item.product.get_primary_barcode().ean if item.product.get_primary_barcode() else item.product.cug
        )
        barcode_value = str(barcode_value)
        
        # Déterminer le type de code-barres et ajuster la position
        if barcode_value.isdigit() and len(barcode_value) >= 12:
            # EAN13: largeur fixe d'environ 190 points
            actual_barcode_width_dots = 190
        else:
            # CODE128: largeur variable (estimation: 11 modules par caractère + zones de garde)
            modules_per_char = 11
            guard_zones = 20
            actual_barcode_width_dots = (len(barcode_value) * modules_per_char + guard_zones) * 2
        
        # Recalculer la position X du code-barres avec la largeur réelle
        barcode_x_final = center_x - actual_barcode_width_dots // 2 - _mm_to_dots(offset_left_mm, dpi)
        barcode_x_final = max(min_barcode_x, min(barcode_x_final, max_barcode_x))
        
        # Légende: centrée sous le code-barres
        legend_text = _convert_french_chars(barcode_value)
        legend_escaped = _escape_text(legend_text)
        # Estimation de la largeur de la légende (10 points par caractère)
        estimated_legend_width_dots = len(legend_text) * 10
        legend_x_final = barcode_x_final + actual_barcode_width_dots // 2 - estimated_legend_width_dots // 2
        # S'assurer que la légende ne dépasse pas
        legend_x_final = max(min_barcode_x, min(legend_x_final, _mm_to_dots(width_mm - margin_right, dpi) - estimated_legend_width_dots))

        copies = max(1, item.copies)
        for _ in range(copies):
            commands.append("CLS")
            
            # 1. Nom du produit (FONT_3, MUL_1)
            name_y = _mm_to_dots(name_y_mm, dpi)
            commands.append(f"TEXT {name_x},{name_y},\"3\",0,1,1,\"{name_escaped}\"")
            
            # 2. Code-barres (sans texte lisible, readable=0)
            barcode_y = _mm_to_dots(barcode_y_mm, dpi)
            commands.append(_barcode_command(
                barcode_x_final, barcode_y, settings, barcode_value,
                bar_height_mm=barcode_height_mm, dpi=dpi, readable=0
            ))
            
            # 3. Légende du code-barres (FONT_2, MUL_1, rotation 0)
            legend_y = _mm_to_dots(legend_y_mm, dpi)
            commands.append(f"TEXT {legend_x_final},{legend_y},\"2\",0,1,1,\"{legend_escaped}\"")
            
            # 4. CUG (si disponible)
            if item.product.cug:
                cug_text = f"CUG: {_convert_french_chars(str(item.product.cug))}"
                cug_escaped = _escape_text(cug_text)
                cug_y = _mm_to_dots(cug_y_mm, dpi)
                commands.append(f"TEXT {name_x},{cug_y},\"2\",0,1,1,\"{cug_escaped}\"")
            
            # 5. Prix (à droite, justify-between avec CUG)
            if price_text:
                price_converted = _convert_french_chars(price_text)
                price_escaped = _escape_text(price_converted)
                # Estimation de la largeur du prix (8 points par caractère)
                estimated_price_width_dots = len(price_converted) * 8
                # Position à droite avec marge
                max_price_x = _mm_to_dots(width_mm - margin_right, dpi) - estimated_price_width_dots
                min_price_x = name_x + _mm_to_dots(2.0, dpi)  # Au moins 2mm après le CUG
                price_x = max(min_price_x, min(max_price_x, max_price_x))
                # Vérification finale pour éviter le débordement
                if price_x + estimated_price_width_dots > _mm_to_dots(width_mm - margin_right, dpi):
                    price_x = _mm_to_dots(width_mm - margin_right, dpi) - estimated_price_width_dots - _mm_to_dots(1.0, dpi)
                    price_x = max(_mm_to_dots(margin_left, dpi), price_x)
                
                price_y = _mm_to_dots(price_y_mm, dpi)
                
                # Vérification finale : s'assurer que le prix reste dans les limites verticales
                price_height_dots = _mm_to_dots(price_height_mm, dpi)
                max_y_allowed = _mm_to_dots(height_mm - margin_bottom, dpi)
                if price_y + price_height_dots > max_y_allowed:
                    # Remonter le prix si nécessaire
                    price_y = max_y_allowed - price_height_dots - _mm_to_dots(0.5, dpi)  # Marge de sécurité
                    price_y = max(_mm_to_dots(margin_top, dpi), price_y)  # Ne pas dépasser en haut
                
                commands.append(f"TEXT {price_x},{price_y},\"2\",0,1,1,\"{price_escaped}\"")
            
            # Imprimer 1
            commands.append("PRINT 1")

    tsc_text = "\n".join(commands) + "\n"
    filename = f"label-batch-{batch.id}.tsc"
    return tsc_text, filename


