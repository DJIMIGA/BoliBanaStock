from io import BytesIO
from typing import Tuple

from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.graphics.barcode import code128, eanbc

from apps.inventory.models import LabelBatch, LabelItem, LabelSetting


DEFAULT_PRINTABLE_WIDTH_MM = 80  # Correspond au format TSC (80x40mm)
DEFAULT_MARGIN_MM = 2
DEFAULT_ITEM_HEIGHT_MM = 40  # Correspond au format TSC (80x40mm)


def mm_to_pt(value_mm: float) -> float:
    return value_mm * mm


def _draw_item(c: canvas.Canvas, x_pt: float, y_pt: float, width_pt: float, item: LabelItem, settings: LabelSetting, label_height_mm: float, site_configuration=None, include_price_override=None):
    """
    Dessine une étiquette individuelle en suivant le même layout que TSC :
    Ordre: Nom → Code-barres → Légende → CUG → Prix
    """
    # Utiliser les mêmes dimensions que TSC (80x40mm par défaut)
    # Si label_height_mm n'est pas fourni, utiliser 40mm comme TSC
    height_mm = float(label_height_mm) if label_height_mm else 40.0
    width_mm = width_pt / mm  # Convertir width_pt en mm
    
    # Marges comme dans TSC
    margin_top_mm = 1.0
    margin_bottom_mm = 1.5
    margin_left_mm = 0.5
    margin_right_mm = 2.0
    
    # Dimensions du code-barres (définies en premier car utilisées plus tard)
    barcode_drawing_width_mm = 6.0  # Largeur du Drawing pour EAN13
    barcode_drawing_height_mm = 2.0  # Hauteur du Drawing pour EAN13
    
    # Positions fixes en mm (identique à TSC)
    # Ajuster pour que tout tienne dans l'étiquette de 40mm de hauteur
    name_y_mm = margin_top_mm + 0.5  # Réduit de 1.0 à 0.5 pour gagner de l'espace
    name_height_mm = 2.5  # Réduit de 3.0 à 2.5
    spacing_after_name_mm = 1.5  # Réduit de 2.5 à 1.5 pour que le code-barres soit moins haut
    # Le code-barres EAN13 inclut déjà la légende, donc on laisse plus d'espace
    barcode_y_mm = name_y_mm + name_height_mm + spacing_after_name_mm
    barcode_height_mm = barcode_drawing_height_mm  # Utiliser la même hauteur que le Drawing
    spacing_after_barcode_mm = 0.8  # Réduit de 1.0 à 0.8
    cug_y_mm = barcode_y_mm + barcode_height_mm + spacing_after_barcode_mm
    cug_height_mm = 2.5
    spacing_after_cug_mm = 2.0
    price_y_mm = cug_y_mm + cug_height_mm + spacing_after_cug_mm
    
    # Convertir en points pour ReportLab
    # Note: y_pt est le point de référence en haut, on soustrait pour descendre
    name_y = y_pt - mm_to_pt(name_y_mm)
    # Position Y du code-barres : barcode_y_mm est la position du bas du code-barres
    # On soustrait aussi la hauteur du code-barres pour s'assurer qu'il ne dépasse pas
    barcode_y = y_pt - mm_to_pt(barcode_y_mm) - mm_to_pt(barcode_drawing_height_mm)
    # S'assurer que le code-barres ne dépasse pas la marge du bas
    min_barcode_y = y_pt - mm_to_pt(height_mm) + mm_to_pt(margin_bottom_mm)
    if barcode_y < min_barcode_y:
        barcode_y = min_barcode_y
    cug_y = y_pt - mm_to_pt(cug_y_mm)
    price_y = y_pt - mm_to_pt(price_y_mm)
    
    # 1. Nom du produit (en haut, à gauche)
    name = str(item.product.name)[:40]
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x_pt + mm_to_pt(margin_left_mm + 0.5), name_y, name)
    
    # 2. Code-barres (centré)
    # Récupérer la valeur du code-barres (même logique que TSC)
    barcode_value = None
    if item.barcode_value:
        barcode_value = str(item.barcode_value).strip()
    elif hasattr(item.product, 'get_primary_barcode'):
        try:
            primary_barcode = item.product.get_primary_barcode()
            if primary_barcode and primary_barcode.ean:
                barcode_value = str(primary_barcode.ean).strip()
        except Exception:
            pass
    
    if not barcode_value:
        try:
            if item.product.generated_ean:
                barcode_value = str(item.product.generated_ean).strip()
        except Exception:
            pass
    
    if not barcode_value:
        try:
            if item.product.cug:
                barcode_value = str(item.product.cug).strip()
        except Exception:
            pass
    
    if not barcode_value:
        barcode_value = str(item.product.id).zfill(13)
    
    # Créer le code-barres
    barcode = None
    barcode_drawing = None
    
    # Dimensions du code-barres (déjà définies plus haut, réutilisées ici)
    
    # Centrer le code-barres horizontalement sur toute la largeur (pas seulement la zone utilisable)
    # Cela compense la différence entre les marges gauche (0.5mm) et droite (2.0mm)
    barcode_drawing_width_pt = mm_to_pt(barcode_drawing_width_mm)
    barcode_x = x_pt + (width_pt - barcode_drawing_width_pt) / 2
    
    # S'assurer que le code-barres ne dépasse pas les marges (avec une petite marge de sécurité)
    min_x = x_pt + mm_to_pt(margin_left_mm)
    max_x = x_pt + width_pt - mm_to_pt(margin_right_mm) - barcode_drawing_width_pt
    if barcode_x < min_x:
        barcode_x = min_x
    elif barcode_x > max_x:
        barcode_x = max_x
    
    try:
        if barcode_value.isdigit() and len(barcode_value) >= 12:
            # EAN13 nécessite exactement 12 chiffres (sans la clé de contrôle)
            ean_value = barcode_value[:12]
            # Vérifier que c'est un EAN13 valide (12 chiffres)
            if len(ean_value) == 12 and ean_value.isdigit():
                # Ean13BarcodeWidget est un widget Graphics, il faut l'envelopper dans un Drawing
                from reportlab.graphics.shapes import Drawing
                barcode_widget = eanbc.Ean13BarcodeWidget(ean_value)
                # Créer un Drawing avec les dimensions souhaitées
                # Note: Le widget EAN13 peut avoir sa propre taille naturelle
                # On crée le Drawing avec les dimensions souhaitées et on laisse ReportLab gérer le redimensionnement
                drawing = Drawing(mm_to_pt(barcode_drawing_width_mm), mm_to_pt(barcode_drawing_height_mm))
                drawing.add(barcode_widget)
                # Forcer le Drawing à respecter les dimensions en utilisant preserveAspectRatio
                # Si le widget est trop grand, il sera automatiquement réduit
                barcode_drawing = drawing
            else:
                # Fallback vers CODE128 si l'EAN n'est pas valide
                barcode = code128.Code128(barcode_value, barHeight=mm_to_pt(barcode_height_mm), barWidth=0.4)
        else:
            barcode = code128.Code128(barcode_value, barHeight=mm_to_pt(barcode_height_mm), barWidth=0.4)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"⚠️ [PDF] Erreur génération code-barres EAN13 pour {barcode_value}, fallback CODE128: {str(e)}")
        # Fallback vers CODE128 en cas d'erreur
        try:
            fallback_value = str(item.product.cug) if item.product.cug else str(item.product.id)
            barcode = code128.Code128(fallback_value, barHeight=mm_to_pt(barcode_height_mm), barWidth=0.4)
        except Exception as e2:
            logger.error(f"❌ [PDF] Erreur génération code-barres CODE128: {str(e2)}")
            # Dernier recours : code-barres minimal
            barcode = code128.Code128(str(item.product.id), barHeight=mm_to_pt(barcode_height_mm), barWidth=0.4)
    
    # Dessiner le code-barres
    try:
        if barcode_drawing is not None:
            # Pour EAN13, utiliser drawOn sur le Drawing
            barcode_drawing.drawOn(c, barcode_x, barcode_y)
        elif barcode is not None:
            # Pour CODE128, utiliser drawOn directement
            # Calculer la largeur du code-barres CODE128 pour le centrer
            code128_width_pt = barcode.width if hasattr(barcode, 'width') else mm_to_pt(30)
            # Centrer sur toute la largeur (comme EAN13)
            code128_x = x_pt + (width_pt - code128_width_pt) / 2
            # S'assurer que le code-barres CODE128 ne dépasse pas les marges
            min_x = x_pt + mm_to_pt(margin_left_mm)
            max_x = x_pt + width_pt - mm_to_pt(margin_right_mm) - code128_width_pt
            if code128_x < min_x:
                code128_x = min_x
            elif code128_x > max_x:
                code128_x = max_x
            barcode.drawOn(c, code128_x, barcode_y)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"❌ [PDF] Erreur dessin code-barres: {str(e)}")
    
    # 3. Légende du code-barres : retirée car Ean13BarcodeWidget l'inclut déjà automatiquement
    # Pour CODE128, on pourrait ajouter une légende si nécessaire, mais pour l'instant on la retire
    
    # 4. CUG (si disponible)
    try:
        cug_value = getattr(item.product, 'cug', None)
        if cug_value:
            cug_text = f"CUG: {str(cug_value)}"
            c.setFont("Helvetica", 8)
            c.drawString(x_pt + mm_to_pt(margin_left_mm + 0.5), cug_y, cug_text)
    except Exception:
        pass
    
    # 5. Prix (en bas à droite, optionnel)
    # Utiliser include_price_override si fourni, sinon settings.include_price, sinon True par défaut (identique à TSC)
    should_include_price = True
    if include_price_override is not None:
        should_include_price = include_price_override
    elif settings and hasattr(settings, 'include_price'):
        should_include_price = settings.include_price
    
    if should_include_price:
        try:
            # Utiliser la devise des settings, sinon celle de la configuration du site, sinon FCFA par défaut
            currency = settings.currency if settings and settings.currency else (
                site_configuration.devise if site_configuration and site_configuration.devise else 'FCFA'
            )
            selling_price = getattr(item.product, 'selling_price', None)
            if selling_price is not None:
                from decimal import Decimal
                if isinstance(selling_price, Decimal):
                    price_value = int(selling_price)
                else:
                    price_value = int(float(selling_price))
                
                if price_value > 0:
                    # Formater avec espaces comme séparateurs de milliers (identique à TSC)
                    price_formatted = f"{price_value:,}".replace(",", " ")
                    price_text = f"{price_formatted} {currency}"
                    # Utiliser une police plus grande pour le prix (comme FONT_3 * MUL_2 dans TSC)
                    c.setFont("Helvetica-Bold", 12)
                    c.drawRightString(x_pt + width_pt - mm_to_pt(margin_right_mm), price_y, price_text)
        except Exception:
            pass
    
    # Cadre global autour de toute l'étiquette
    label_height_pt = mm_to_pt(height_mm)
    c.rect(x_pt, y_pt - label_height_pt, width_pt, label_height_pt)


def render_label_batch_pdf(batch: LabelBatch, include_price_override: bool = None) -> Tuple[bytes, str]:
    """
    Génère un PDF pour un LabelBatch avec le même layout que TSC (80x40mm par défaut).
    Layout: Nom → Code-barres → Légende → CUG → Prix
    Retourne (bytes_pdf, filename).
    
    Args:
        batch: Le lot d'étiquettes à imprimer
        include_price_override: Si fourni, surcharge settings.include_price (True/False)
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Vérifier que le batch a un template
        if not batch.template:
            raise ValueError(f"Le lot {batch.id} n'a pas de template")
        
        settings = LabelSetting.objects.filter(site_configuration=batch.site_configuration).first() if batch.site_configuration else None
        
        # Récupérer include_price depuis data_snapshot du premier item si disponible (identique à TSC)
        if include_price_override is None:
            first_item = batch.items.order_by('position', 'id').first()
            if first_item and first_item.data_snapshot and 'include_price' in first_item.data_snapshot:
                include_price_override = first_item.data_snapshot.get('include_price')
                logger.info(f"🔍 [PDF] include_price récupéré depuis data_snapshot: {include_price_override}")

        template = batch.template
        # Largeur imprimable: pour les PDF d'étiquettes individuelles, utiliser toujours 80mm
        # IMPORTANT: La largeur de la page PDF doit correspondre exactement à la largeur de l'étiquette
        # (80mm par défaut pour une étiquette individuelle, pas la largeur A4 ou du template)
        # On ignore la largeur du template pour les PDF car elle peut être configurée pour d'autres usages
        printable_width_mm = DEFAULT_PRINTABLE_WIDTH_MM  # Toujours 80mm pour les étiquettes individuelles PDF
        width_pt = mm_to_pt(printable_width_mm)

        # Marges: parser "top,right,bottom,left" en mm, fallback 2mm de tous côtés
        margin_values = str(getattr(template, 'margins_mm', '') or '').split(',')
        try:
            top_mm, right_mm, bottom_mm, left_mm = [float(x.strip()) for x in margin_values]
        except Exception:
            top_mm = right_mm = bottom_mm = left_mm = float(DEFAULT_MARGIN_MM)
        margin_top_pt = mm_to_pt(top_mm)
        margin_bottom_pt = mm_to_pt(bottom_mm)
        margin_left_pt = mm_to_pt(left_mm)
        margin_right_pt = mm_to_pt(right_mm)

        # Hauteur d'une étiquette: pour les PDF d'étiquettes individuelles, utiliser toujours 40mm
        # IMPORTANT: La hauteur de la page PDF doit correspondre exactement à la hauteur de l'étiquette
        # (40mm par défaut pour une étiquette individuelle, pas toute la hauteur d'une page A4)
        item_height_mm = DEFAULT_ITEM_HEIGHT_MM  # Toujours 40mm pour les étiquettes individuelles PDF
        item_h_pt = mm_to_pt(item_height_mm)

        spacing_pt = mm_to_pt(2)

        total_items = sum(max(1, it.copies) for it in batch.items.all())
        # Calculer la hauteur totale en fonction du nombre d'étiquettes
        # Pour une seule étiquette, la hauteur doit être exactement celle de l'étiquette + marges
        height_pt = margin_top_pt + margin_bottom_pt + total_items * (item_h_pt + spacing_pt)
        # Pour une seule étiquette, limiter à la hauteur de l'étiquette + marges minimales
        if total_items == 1:
            height_pt = margin_top_pt + margin_bottom_pt + item_h_pt
        # Garde une hauteur minimale pour éviter les artefacts de rendu
        if height_pt < mm_to_pt(40):
            height_pt = mm_to_pt(40)

        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=(width_pt, height_pt))

        x = margin_left_pt
        y = height_pt - margin_top_pt

        for item in batch.items.all().order_by('position', 'id'):
            for _ in range(max(1, item.copies)):
                usable_width_pt = width_pt - (margin_left_pt + margin_right_pt)
                _draw_item(c, x, y, usable_width_pt, item, settings, item_height_mm, batch.site_configuration, include_price_override)
                y -= item_h_pt + spacing_pt
                if y < margin_bottom_pt:
                    c.showPage()
                    y = height_pt - margin_top_pt

        c.showPage()
        c.save()
        pdf = buffer.getvalue()
        buffer.close()
        filename = f"label-batch-{batch.id}.pdf"
        return pdf, filename
    except Exception as e:
        logger.error(f"❌ [PDF] Erreur dans render_label_batch_pdf pour le lot {batch.id}: {str(e)}", exc_info=True)
        raise


