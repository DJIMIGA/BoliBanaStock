from io import BytesIO
from typing import Tuple

from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.graphics.barcode import code128, eanbc

from apps.inventory.models import LabelBatch, LabelItem, LabelSetting


DEFAULT_PRINTABLE_WIDTH_MM = 48  # fallback pour 58mm si non défini dans le template
DEFAULT_MARGIN_MM = 2
DEFAULT_ITEM_HEIGHT_MM = 30  # fallback hauteur d'une étiquette (mm)


def mm_to_pt(value_mm: float) -> float:
    return value_mm * mm


def _draw_item(c: canvas.Canvas, x_pt: float, y_pt: float, width_pt: float, item: LabelItem, settings: LabelSetting, label_height_mm: float):
    text_y = y_pt - mm_to_pt(4)

    # Titre: nom produit (tronqué pour 1-2 lignes)
    name = str(item.product.name)[:40]
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x_pt, text_y, name)

    # Prix (optionnel)
    if settings and settings.include_price:
        try:
            price_text = f"{int(item.product.selling_price)} {settings.currency or 'FCFA'}"
            c.setFont("Helvetica", 8)
            c.drawRightString(x_pt + width_pt, text_y, price_text)
        except Exception:
            pass

    # Code-barres
    barcode_value = item.barcode_value or (item.product.get_primary_barcode().ean if item.product.get_primary_barcode() else item.product.cug)
    barcode = None
    try:
        if settings and settings.barcode_type == 'EAN13' and barcode_value and barcode_value.isdigit():
            # EAN13 exige 12 chiffres (le 13e est calculé), sinon fallback CODE128
            if len(barcode_value) >= 12:
                barcode = eanbc.Ean13BarcodeWidget(barcode_value[:12])
        if barcode is None:
            barcode = code128.Code128(barcode_value, barHeight=mm_to_pt(12), barWidth=0.4)
    except Exception:
        barcode = code128.Code128(str(item.product.cug), barHeight=mm_to_pt(12), barWidth=0.4)

    # Calcul position du code-barres: sous le texte, laisse ~40% de la hauteur pour le code
    # et une marge pour la légende
    barcode_top_offset_mm = 14 if label_height_mm is None else max(10, float(label_height_mm) * 0.45)
    barcode_y = y_pt - mm_to_pt(barcode_top_offset_mm)
    # Centrer le code-barres
    try:
        # Pour Code128, on utilise drawOn directement
        barcode.drawOn(c, x_pt + mm_to_pt(2), barcode_y)
    except Exception:
        # Certains widgets ont .drawOn avec size default
        barcode.drawOn(c, x_pt + mm_to_pt(2), barcode_y)

    # Légende (CUG / EAN)
    c.setFont("Helvetica", 8)
    c.drawCentredString(x_pt + width_pt / 2, barcode_y - mm_to_pt(4), str(barcode_value))


def render_label_batch_pdf(batch: LabelBatch) -> Tuple[bytes, str]:
    """
    Génère un PDF (largeur imprimable 48mm) pour un LabelBatch.
    Retourne (bytes_pdf, filename).
    """
    settings = LabelSetting.objects.filter(site_configuration=batch.site_configuration).first()

    template = batch.template
    # Largeur imprimable: priorité au template.printing_width_mm, sinon fallback
    printable_width_mm = float(getattr(template, 'printing_width_mm', None) or DEFAULT_PRINTABLE_WIDTH_MM)
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

    # Hauteur d'une étiquette: utiliser template.height_mm si dispo, sinon fallback
    item_height_mm = float(getattr(template, 'height_mm', None) or DEFAULT_ITEM_HEIGHT_MM)
    item_h_pt = mm_to_pt(item_height_mm)

    spacing_pt = mm_to_pt(2)

    total_items = sum(max(1, it.copies) for it in batch.items.all())
    height_pt = margin_top_pt + margin_bottom_pt + total_items * (item_h_pt + spacing_pt)
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
            _draw_item(c, x, y, usable_width_pt, item, settings, item_height_mm)
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


