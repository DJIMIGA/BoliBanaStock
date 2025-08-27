from typing import Tuple

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


def _barcode_command(x_dots: int, y_dots: int, settings: LabelSetting, value: str, bar_height_mm: float, dpi: int) -> str:
    bar_height_dots = _mm_to_dots(bar_height_mm, dpi)
    # Defaults aligned with TSPL
    human_readable = 1  # show text
    rotation = 0
    narrow = 2
    wide = 4
    if settings and settings.barcode_type == 'EAN13' and value.isdigit() and len(value) >= 12:
        # TSPL EAN13
        return f"BARCODE {x_dots},{y_dots},\"EAN13\",{bar_height_dots},{human_readable},{rotation},{narrow},{wide},\"{value[:12]}\""
    if settings and settings.barcode_type == 'QR':
        # Simple QR: module size 6, ecc M
        return f"QRCODE {x_dots},{y_dots},H,6,A,0,\"{value}\""
    # Fallback CODE128
    return f"BARCODE {x_dots},{y_dots},\"128\",{bar_height_dots},{human_readable},{rotation},{narrow},{wide},\"{value}\""


def render_label_batch_tsc(batch: LabelBatch) -> Tuple[str, str]:
    """
    Génère des commandes TSPL/TSC (texte brut) pour un LabelBatch.
    Retourne (tsc_text, filename).
    """
    settings = LabelSetting.objects.filter(site_configuration=batch.site_configuration).first()
    template = batch.template

    width_mm = float(getattr(template, 'width_mm', 50) or 50)
    height_mm = float(getattr(template, 'height_mm', 30) or 30)
    dpi = int(getattr(template, 'dpi', 203) or 203)
    top_mm, right_mm, bottom_mm, left_mm = _parse_margins(getattr(template, 'margins_mm', '2,2,2,2'))

    header = [
        f"SIZE {width_mm} mm,{height_mm} mm",
        f"GAP {max(0.0, bottom_mm):.1f} mm,0",
        "DENSITY 8",
        "SPEED 4",
        "DIRECTION 1",
    ]

    commands: list[str] = header[:]

    # Positions en dots
    x_text = _mm_to_dots(left_mm + 2.0, dpi)
    y_text = _mm_to_dots(top_mm + 4.0, dpi)
    x_bar = _mm_to_dots(left_mm + 2.0, dpi)
    y_bar = _mm_to_dots(top_mm + 14.0, dpi)

    for item in batch.items.all().order_by('position', 'id'):
        name = _escape_text(str(item.product.name)[:40])
        price_text = None
        if settings and settings.include_price:
            try:
                price_text = f"{int(item.product.selling_price)} {settings.currency or 'FCFA'}"
            except Exception:
                price_text = None

        # Choisir la valeur de code-barres
        barcode_value = item.barcode_value or (
            item.product.get_primary_barcode().ean if item.product.get_primary_barcode() else item.product.cug
        )
        barcode_value = str(barcode_value)

        copies = max(1, item.copies)
        for _ in range(copies):
            commands.append("CLS")
            # Police "0" = ANK 8x12/12x24 selon firmware; on garde un scale 1,1
            commands.append(f"TEXT {x_text},{y_text},\"0\",0,1,1,\"{name}\"")
            # Code-barres
            commands.append(_barcode_command(x_bar, y_bar, settings, barcode_value, bar_height_mm=12.0, dpi=dpi))
            # Légende
            legend_y = y_bar + _mm_to_dots(12.0 + 4.0, dpi)
            commands.append(f"TEXT {x_text},{legend_y},\"0\",0,1,1,\"{_escape_text(barcode_value)}\"")
            # Prix (en bas)
            if price_text:
                price_y = legend_y + _mm_to_dots(6.0, dpi)
                commands.append(f"TEXT {x_text},{price_y},\"0\",0,1,1,\"{_escape_text(price_text)}\"")
            # Imprimer 1
            commands.append("PRINT 1")

    tsc_text = "\n".join(commands) + "\n"
    filename = f"label-batch-{batch.id}.tsc"
    return tsc_text, filename


