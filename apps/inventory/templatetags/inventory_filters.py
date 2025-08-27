from django import template
from apps.core.utils import get_configuration

register = template.Library()

@register.filter
def divisibleby(value, arg):
    """Divise la valeur par l'argument fourni"""
    try:
        return int(value) // int(arg)
    except (ValueError, ZeroDivisionError):
        return value

@register.filter
def format_currency(value):
    """Formate un montant selon la devise configurée"""
    try:
        config = get_configuration()
        if config and config.devise:
            return f"{value:,}".replace(",", " ") + f" {config.devise}"
        else:
            return f"{value:,}".replace(",", " ") + " FCFA"
    except:
        return f"{value} FCFA"

@register.filter
def multiply(value, arg):
    """Multiplie la valeur par l'argument fourni"""
    try:
        return float(value) * float(arg)
    except (ValueError, TypeError):
        return 0

@register.filter
def sub(value, arg):
    """Soustrait l'argument de la valeur"""
    try:
        return float(value) - float(arg)
    except (ValueError, TypeError):
        return value 
