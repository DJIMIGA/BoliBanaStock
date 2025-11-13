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


def render_label_batch_tsc(batch: LabelBatch, include_price_override: bool = None) -> Tuple[str, str]:
    """
    Génère des commandes TSPL/TSC (texte brut) pour un LabelBatch avec layout optimisé.
    Layout: 80x40mm (par défaut), positions fixes optimisées.
    Retourne (tsc_text, filename).
    
    Args:
        batch: Le lot d'étiquettes à imprimer
        include_price_override: Si fourni, surcharge settings.include_price (True/False)
    """
    import logging
    logger = logging.getLogger(__name__)
    
    from apps.inventory.models import LabelTemplate
    
    settings = LabelSetting.objects.filter(site_configuration=batch.site_configuration).first()
    template = batch.template
    
    # Récupérer include_price depuis data_snapshot du premier item si disponible
    if include_price_override is None:
        first_item = batch.items.order_by('position', 'id').first()
        if first_item and first_item.data_snapshot and 'include_price' in first_item.data_snapshot:
            include_price_override = first_item.data_snapshot.get('include_price')
            logger.info(f"🔍 [TSC] include_price récupéré depuis data_snapshot: {include_price_override}")
    
    logger.info(f"🔍 [TSC] include_price_override final: {include_price_override}")
    logger.info(f"🔍 [TSC] settings: {settings}, settings.include_price: {settings.include_price if settings else 'None'}")
    
    # Vérifier que le template existe, sinon utiliser un template par défaut
    if not template:
        if batch.site_configuration:
            template = LabelTemplate.get_default_for_site(batch.site_configuration)
        if not template:
            # Créer un template par défaut minimal si aucun n'existe
            template = LabelTemplate.objects.filter(is_default=True).first()
        if not template:
            raise ValueError(f"Template manquant pour le lot d'étiquettes {batch.id}")

    # Dimensions par défaut optimisées (80x40mm)
    width_mm = float(getattr(template, 'width_mm', None) or 80)
    height_mm = float(getattr(template, 'height_mm', None) or 40)
    dpi = int(getattr(template, 'dpi', None) or 203)
    margins_str = getattr(template, 'margins_mm', None) or '1,2,0.5,2'
    top_mm, right_mm, bottom_mm, left_mm = _parse_margins(margins_str)

    # Paramètres d'impression (peuvent être surchargés par thermal_settings du batch)
    # DENSITY: 0-15 (0=clair, 15=foncé), 8 = équilibré pour Arealer JK-58PL
    density = 8
    # SPEED: 0-15 (0=lent, 15=rapide), 4 = équilibré (imprimante supporte max 85mm/s)
    speed = 4
    # Direction: 0 = FORWARD (normal), 1 = BACKWARD (inversé)
    direction = 0  # FORWARD pour orientation normale (nom en haut, prix en bas)

    header = [
        f"SIZE {width_mm} mm,{height_mm} mm",
        f"GAP {max(0.0, bottom_mm):.1f} mm,0",
        f"DENSITY {density}",
        f"SPEED {speed}",
        f"DIRECTION {direction}",
    ]

    commands: list[str] = header[:]

    # Layout optimisé (positions fixes en mm)
    # Marges ajustées pour une meilleure répartition
    margin_top = 1.0  # Marge supérieure
    margin_bottom = 1.5  # Marge inférieure pour le prix
    margin_left = 0.5  # Marge gauche réduite pour le nom
    margin_right = 2.0
    
    # Espace disponible verticalement
    available_height = height_mm - margin_top - margin_bottom  # 40 - 1.0 - 1.5 = 37.5mm
    
    # Positions fixes en mm (ordre: Nom -> Code-barres -> Légende -> CUG -> Prix)
    name_y_mm = margin_top + 1.0  # Nom en haut
    name_height_mm = 3.0  # Hauteur du nom
    spacing_after_name = 1.5  # Espace réduit après le nom pour rapprocher le code-barres
    barcode_y_mm = name_y_mm + name_height_mm + spacing_after_name  # Code-barres après le nom
    barcode_height_mm = 5.5  # Hauteur du code-barres réduite (était 8.0mm, maintenant 5.5mm)
    # Légende formatée sous le code-barres EAN-13
    spacing_after_barcode = 0.5  # Petit espace après le code-barres pour la légende
    legend_y_mm = barcode_y_mm + barcode_height_mm + spacing_after_barcode  # Légende sous le code-barres
    legend_height_mm = 2.0  # Hauteur de la légende
    spacing_after_legend = 2.5  # Espace après la légende pour séparer du CUG
    cug_y_mm = legend_y_mm + legend_height_mm + spacing_after_legend  # CUG après la légende
    cug_height_mm = 2.5  # Hauteur du CUG
    spacing_after_cug = 2.0  # Espace augmenté après le CUG pour séparer du prix
    # Prix sous le CUG, à droite
    price_y_mm = cug_y_mm + cug_height_mm + spacing_after_cug  # Prix sous le CUG
    
    # Vérifier que le prix reste dans les limites
    price_height_mm = 4.5  # Hauteur estimée du prix (FONT_3 * MUL_2 = plus grand)
    # Le prix est sous le CUG
    final_y = price_y_mm + price_height_mm
    
    # Si on dépasse, ajuster en remontant tout proportionnellement
    if final_y > height_mm - margin_bottom:
        overflow = final_y - (height_mm - margin_bottom)
        # Réduire les espacements proportionnellement
        reduction_factor = 0.8  # Réduire de 20%
        spacing_after_name = spacing_after_name * reduction_factor
        spacing_after_barcode = spacing_after_barcode * reduction_factor
        spacing_after_legend = spacing_after_legend * reduction_factor
        spacing_after_cug = spacing_after_cug * reduction_factor  # Espace entre CUG et prix
        # Recalculer les positions (avec légende séparée)
        barcode_y_mm = name_y_mm + name_height_mm + spacing_after_name
        legend_y_mm = barcode_y_mm + barcode_height_mm + spacing_after_barcode
        cug_y_mm = legend_y_mm + legend_height_mm + spacing_after_legend
        price_y_mm = cug_y_mm + cug_height_mm + spacing_after_cug  # Prix sous le CUG
    
    # Positions X fixes
    name_x = _mm_to_dots(margin_left + 0.5, dpi)  # Nom à gauche avec marge réduite
    
    # Code-barres: centré horizontalement
    center_x = _mm_to_dots(width_mm / 2, dpi)
    offset_left_mm = 0  # Pas d'offset, centré
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

    items = batch.items.select_related('product').order_by('position', 'id')
    if not items.exists():
        raise ValueError(f"Le lot d'étiquettes {batch.id} ne contient aucun produit")

    for item in items:
        # Vérifier que le produit existe
        if not item.product:
            continue  # Ignorer les items sans produit
        
        # Nom du produit (converti pour caractères français)
        name = _convert_french_chars(str(item.product.name)[:40])
        name_escaped = _escape_text(name)
        
        # Prix - respecter le paramètre include_price
        price_text = None
        # Utiliser include_price_override si fourni, sinon settings.include_price, sinon True par défaut
        if include_price_override is not None:
            should_include_price = include_price_override
            logger.info(f"✅ [TSC] Utilisation include_price_override: {should_include_price}")
        elif settings and hasattr(settings, 'include_price'):
            should_include_price = settings.include_price
            logger.info(f"✅ [TSC] Utilisation settings.include_price: {should_include_price}")
        else:
            should_include_price = True
            logger.info(f"✅ [TSC] Utilisation valeur par défaut: {should_include_price}")
        
        if should_include_price:
            try:
                selling_price = getattr(item.product, 'selling_price', None)
                # Gérer les DecimalField et les valeurs None/0
                if selling_price is not None:
                    # Convertir Decimal en float puis en int
                    from decimal import Decimal
                    if isinstance(selling_price, Decimal):
                        price_value = int(selling_price)
                    else:
                        price_value = int(float(selling_price))
                    
                    if price_value > 0:
                        currency = (settings.currency if settings else None) or 'FCFA'
                        # Formater avec espaces comme séparateurs de milliers
                        price_formatted = f"{price_value:,}".replace(",", " ")
                        price_text = f"{price_formatted} {currency}"
                    else:
                        price_text = None
                else:
                    price_text = None
            except (ValueError, TypeError, AttributeError) as e:
                logger.warning(f"⚠️ [TSC] Erreur calcul prix pour produit {item.product.id}: {e}")
                price_text = None

        # Choisir la valeur de code-barres
        # Logique de priorité :
        # 1. barcode_value stocké dans LabelItem (déjà déterminé lors de la création)
        # 2. Code-barres principal du tableau barcodes
        # 3. generated_ean si pas de barcodes dans le tableau
        # 4. CUG en dernier recours
        barcode_value = None
        barcode_source = None
        
        if item.barcode_value:
            barcode_value = str(item.barcode_value).strip()
            barcode_source = 'stored_value'
        
        if not barcode_value:
            try:
                primary_barcode = item.product.get_primary_barcode()
                if primary_barcode and primary_barcode.ean:
                    barcode_value = str(primary_barcode.ean).strip()
                    barcode_source = 'primary_barcode'
            except Exception:
                pass
        
        if not barcode_value:
            try:
                if item.product.generated_ean:
                    barcode_value = str(item.product.generated_ean).strip()
                    barcode_source = 'generated_ean'
            except Exception:
                pass
        
        if not barcode_value:
            try:
                if item.product.cug:
                    barcode_value = str(item.product.cug).strip()
                    barcode_source = 'cug_fallback'
            except Exception:
                pass
        
        # Si toujours pas de code-barres, utiliser un code par défaut
        if not barcode_value:
            barcode_value = str(item.product.id).zfill(13)  # Utiliser l'ID du produit comme fallback
            barcode_source = 'product_id_fallback'
        
        # Debug (optionnel, peut être commenté en production)
        # print(f"🔍 [TSC] Produit {item.product.name} (ID: {item.product.id})")
        # print(f"   CUG: {item.product.cug}")
        # print(f"   generated_ean: {item.product.generated_ean}")
        # print(f"   primary_barcode: {primary_barcode.ean if primary_barcode else 'None'}")
        # print(f"   item.barcode_value: {item.barcode_value}")
        # print(f"   barcode_value final: {barcode_value} (source: {barcode_source})")
        
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
        # Décaler un peu à droite (ajouter directement à la position X)
        offset_right_adjustment_mm = 1.5  # Décalage à droite de 1.5mm
        barcode_x_final = center_x - actual_barcode_width_dots // 2 - _mm_to_dots(offset_left_mm, dpi) + _mm_to_dots(offset_right_adjustment_mm, dpi)
        barcode_x_final = max(min_barcode_x, min(barcode_x_final, max_barcode_x))
        
        # Légende supprimée - elle est intégrée dans le code-barres EAN-13 avec readable=1

        copies = max(1, item.copies)
        for _ in range(copies):
            commands.append("CLS")
            
            # 1. Nom du produit (FONT_3, MUL_1)
            name_y = _mm_to_dots(name_y_mm, dpi)
            commands.append(f"TEXT {name_x},{name_y},\"3\",0,1,1,\"{name_escaped}\"")
            
            # 2. Code-barres EAN-13 (sans légende intégrée, readable=0)
            # Forcer EAN-13 si le code-barres est un EAN-13 valide (12+ chiffres)
            barcode_y = _mm_to_dots(barcode_y_mm, dpi)
            bar_height_dots = _mm_to_dots(barcode_height_mm, dpi)
            if barcode_value.isdigit() and len(barcode_value) >= 12:
                # Utiliser EAN-13 pour les codes numériques de 12+ chiffres
                # EAN-13: prendre les 12 premiers chiffres (le 13ème est la clé de contrôle)
                # readable=0 pour ne pas afficher de texte intégré (on ajoute la légende séparément)
                ean13_value = barcode_value[:12] if len(barcode_value) >= 12 else barcode_value.zfill(12)
                barcode_cmd = f"BARCODE {barcode_x_final},{barcode_y},\"EAN13\",{bar_height_dots},0,0,2,4,\"{ean13_value}\""
                commands.append(barcode_cmd)
                logger.info(f"🔍 [TSC] Code-barres EAN-13: {barcode_cmd} (valeur: {ean13_value}, barcode_value original: {barcode_value})")
            else:
                # Utiliser la fonction existante pour les autres types
                commands.append(_barcode_command(
                    barcode_x_final, barcode_y, settings, barcode_value,
                    bar_height_mm=barcode_height_mm, dpi=dpi, readable=0
                ))
            
            # 3. Légende du code-barres EAN-13 formatée (X XXXXXX XXXXXX)
            if barcode_value.isdigit() and len(barcode_value) >= 12:
                # Formater comme EAN-13: premier chiffre séparé, puis groupes de 6
                # Format: X XXXXXX XXXXXX (ex: 5 901234 123457)
                ean13_formatted = f"{barcode_value[0]} {barcode_value[1:7]} {barcode_value[7:13]}"
                legend_text = _convert_french_chars(ean13_formatted)
                legend_escaped = _escape_text(legend_text)
                
                # Position Y: sous le code-barres
                legend_y = _mm_to_dots(legend_y_mm, dpi)
                
                # Position X: centrée sous le code-barres
                # Le centre du code-barres est à : barcode_x_final + actual_barcode_width_dots / 2
                # Estimation de la largeur de la légende (9 points par caractère pour FONT_2, très conservateur)
                # Les espaces prennent aussi de la place, donc on compte chaque caractère + espaces
                estimated_legend_width_dots = len(legend_text) * 9
                barcode_center_x = barcode_x_final + actual_barcode_width_dots // 2
                legend_x = barcode_center_x - estimated_legend_width_dots // 2
                
                # Limites de l'étiquette
                min_legend_x = _mm_to_dots(margin_left, dpi)
                max_legend_x_right = _mm_to_dots(width_mm - margin_right, dpi)
                
                # Vérifier et corriger si la légende dépasse à droite
                if legend_x + estimated_legend_width_dots > max_legend_x_right:
                    # Repositionner pour que la fin de la légende soit exactement à la limite droite
                    legend_x = max_legend_x_right - estimated_legend_width_dots
                
                # Vérifier et corriger si la légende dépasse à gauche
                if legend_x < min_legend_x:
                    legend_x = min_legend_x
                
                # Vérification finale : s'assurer que la légende ne dépasse toujours pas
                if legend_x + estimated_legend_width_dots > max_legend_x_right:
                    # Si elle dépasse encore, réduire légèrement la position
                    legend_x = max_legend_x_right - estimated_legend_width_dots - 2  # 2 points de marge supplémentaire
                
                # S'assurer que la légende reste dans les limites finales
                legend_x = max(min_legend_x, min(legend_x, max_legend_x_right - estimated_legend_width_dots))
                
                # FONT_2 pour la légende (taille moyenne)
                commands.append(f"TEXT {int(legend_x)},{legend_y},\"2\",0,1,1,\"{legend_escaped}\"")
            
            # 4. CUG (si disponible)
            try:
                cug_value = getattr(item.product, 'cug', None)
                if cug_value:
                    cug_text = f"CUG: {_convert_french_chars(str(cug_value))}"
                    cug_escaped = _escape_text(cug_text)
                    cug_y = _mm_to_dots(cug_y_mm, dpi)
                    commands.append(f"TEXT {name_x},{cug_y},\"2\",0,1,1,\"{cug_escaped}\"")
            except Exception:
                pass  # Ignorer si le CUG n'est pas disponible
            
            # 5. Prix (sous le CUG, à droite, en gros)
            # Debug: vérifier si le prix est généré
            logger.info(f"🔍 [TSC] Produit {item.product.name} - Prix calculé: {price_text}, selling_price: {getattr(item.product, 'selling_price', None)}, should_include_price: {should_include_price}")
            
            if price_text:
                price_converted = _convert_french_chars(price_text)
                price_escaped = _escape_text(price_converted)
                
                # Position Y: sous le CUG
                price_y = _mm_to_dots(price_y_mm, dpi)
                
                # Position X: à droite de l'étiquette
                # Pour FONT_3 avec MUL_2, estimation largeur: ~28 points par caractère
                estimated_price_width_dots = len(price_converted) * 28
                right_edge_x = _mm_to_dots(width_mm - margin_right, dpi)
                price_x = right_edge_x - estimated_price_width_dots
                
                # S'assurer que le prix reste dans les limites horizontales
                min_price_x_limit = _mm_to_dots(margin_left, dpi)
                max_price_x_limit = _mm_to_dots(width_mm - margin_right, dpi) - estimated_price_width_dots
                price_x = max(min_price_x_limit, min(price_x, max_price_x_limit))
                
                # Vérification finale : s'assurer que le prix reste dans les limites verticales
                price_height_dots = _mm_to_dots(price_height_mm, dpi)
                max_y_allowed = _mm_to_dots(height_mm - margin_bottom, dpi)
                if price_y + price_height_dots > max_y_allowed:
                    price_y = max_y_allowed - price_height_dots - _mm_to_dots(0.5, dpi)
                if price_y < _mm_to_dots(margin_top, dpi):
                    price_y = _mm_to_dots(margin_top + 0.5, dpi)
                
                # FONT_3 = police grande, MUL_2 = double taille pour rendre très visible
                # Format: TEXT x,y,"font",rotation,mul_x,mul_y,"text"
                price_command = f"TEXT {price_x},{price_y},\"3\",0,2,2,\"{price_escaped}\""
                commands.append(price_command)
                logger.info(f"✅ [TSC] Prix ajouté: {price_command}")
            else:
                logger.warning(f"⚠️ [TSC] Prix non ajouté - price_text est None ou vide")
            
            # Imprimer 1
            commands.append("PRINT 1")

    tsc_text = "\n".join(commands) + "\n"
    filename = f"label-batch-{batch.id}.tsc"
    return tsc_text, filename


