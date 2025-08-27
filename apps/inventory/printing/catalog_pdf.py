import os
from typing import Tuple, List
from reportlab.lib.pagesizes import A4, A5, A6
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.barcode import code128, code39, ean13, ean8, upca
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from django.conf import settings
from apps.inventory.catalog_models import CatalogGeneration, CatalogItem
from apps.inventory.models import Product


def mm_to_pt(mm_value):
    """Convertit des millimètres en points"""
    return float(mm_value) * 2.83465


def get_barcode_drawing(barcode_data: str, barcode_type: str, height_mm: float = 15.0):
    """Génère un code-barre selon le type spécifié"""
    height_pt = mm_to_pt(height_mm)
    
    if barcode_type == 'code128':
        barcode = code128.Code128(barcode_data, barHeight=height_pt)
    elif barcode_type == 'code39':
        barcode = code39.Code39(barcode_data, barHeight=height_pt)
    elif barcode_type == 'ean13':
        barcode = ean13.Ean13(barcode_data, barHeight=height_pt)
    elif barcode_type == 'ean8':
        barcode = ean8.Ean8(barcode_data, barHeight=height_pt)
    elif barcode_type == 'upca':
        barcode = upca.Upca(barcode_data, barHeight=height_pt)
    else:
        # Fallback vers Code 128
        barcode = code128.Code128(barcode_data, barHeight=height_pt)
    
    drawing = Drawing()
    drawing.add(barcode)
    return drawing
