from django import template
from apps.core.utils import get_configuration, format_currency_amount, get_decimal_places_for_currency
from decimal import Decimal, ROUND_HALF_UP

register = template.Library()

@register.filter
def divisibleby(value, arg):
    """Divise la valeur par l'argument fourni"""
    try:
        return int(value) // int(arg)
    except (ValueError, ZeroDivisionError):
        return value

@register.filter
def format_currency(value, currency=None):
    """
    Formate un montant selon la devise configurée avec le bon nombre de décimales
    Si currency est fourni, l'utilise directement
    Sinon, utilise get_configuration() qui récupère la config de l'utilisateur depuis le cache
    
    Gère les décimales selon la devise :
    - FCFA, XOF, XAF, JPY, KRW, MGA, XPF : pas de décimales (arrondi à l'entier)
    - EUR, USD, GBP, etc. : 2 décimales avec virgule comme séparateur (format français)
    """
    try:
        # Convertir en Decimal pour les calculs précis
        if not isinstance(value, Decimal):
            amount = Decimal(str(value))
        else:
            amount = value
        
        # Si une devise est fournie en paramètre, l'utiliser
        if currency:
            devise = currency
        else:
            # Essayer de récupérer depuis le cache global mis à jour par le context processor
            # Le context processor met à jour le cache avec la bonne config utilisateur à chaque requête
            from django.core.cache import cache
            config = cache.get('global_config')
            
            # Si pas dans le cache, récupérer depuis get_configuration()
            if not config:
                config = get_configuration()
            
            if config and config.devise:
                devise = config.devise
            else:
                # Fallback : utiliser FCFA
                devise = 'FCFA'
        
        # Déterminer le nombre de décimales selon la devise
        decimal_places = get_decimal_places_for_currency(devise)
        
        # Arrondir selon le nombre de décimales
        if decimal_places == 0:
            # Arrondir à l'entier le plus proche
            rounded_amount = int(amount.quantize(Decimal('1'), rounding=ROUND_HALF_UP))
            formatted = f"{rounded_amount:,}".replace(",", " ")
        else:
            # Arrondir à 2 décimales
            rounded_amount = amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            # Formater avec séparateur de milliers et virgule pour les décimales (format français)
            formatted = f"{rounded_amount:,.2f}".replace(",", " ").replace(".", ",")
        
        return f"{formatted} {devise}"
    except Exception as e:
        # Dernier recours : utiliser FCFA sans décimales
        try:
            if not isinstance(value, Decimal):
                amount = Decimal(str(value))
            else:
                amount = value
            rounded_amount = int(amount.quantize(Decimal('1'), rounding=ROUND_HALF_UP))
            formatted_value = f"{rounded_amount:,}".replace(",", " ")
        except:
            formatted_value = str(value)
        return f"{formatted_value} FCFA"

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

@register.filter
def to_string(value):
    """Convertit une valeur (Decimal, int, float) en string pour les inputs HTML"""
    if value is None:
        return ''
    if isinstance(value, Decimal):
        # Convertir Decimal en string en supprimant les zéros inutiles
        return str(value).rstrip('0').rstrip('.') if '.' in str(value) else str(value)
    return str(value) 

@register.simple_tag(takes_context=True)
def get_currency(context):
    """Récupère la devise depuis la configuration du contexte"""
    try:
        # Utiliser la devise du context processor si disponible
        if 'site_currency' in context:
            return context['site_currency']
        
        # Sinon, récupérer depuis la configuration
        if 'site_config' in context and context['site_config']:
            return context['site_config'].devise
        
        # Fallback
        config = get_configuration()
        if config and config.devise:
            return config.devise
        return 'FCFA'
    except:
        return 'FCFA'

@register.simple_tag(takes_context=True)
def format_currency_tag(context, value):
    """
    Template tag pour formater un montant avec la devise depuis le contexte
    Utilise la configuration de l'utilisateur connecté
    """
    try:
        # Récupérer la devise depuis le contexte
        if 'site_currency' in context:
            devise = context['site_currency']
        elif 'site_config' in context and context['site_config']:
            devise = context['site_config'].devise if context['site_config'].devise else 'FCFA'
        else:
            devise = 'FCFA'
        
        # Formater le montant
        formatted_value = f"{value:,}".replace(",", " ")
        return f"{formatted_value} {devise}"
    except:
        try:
            formatted_value = f"{value:,}".replace(",", " ")
        except:
            formatted_value = str(value)
        return f"{formatted_value} FCFA"

@register.filter
def smart_quantity(value):
    """
    Formate intelligemment une quantité :
    - Si entier (ex: 100.000) -> 100
    - Si décimal (ex: 1.500) -> 1.5
    - Si décimal précis (ex: 0.125) -> 0.125
    """
    try:
        val = Decimal(str(value))
        # Si c'est un entier (partie décimale nulle)
        if val % 1 == 0:
            return str(int(val))
        else:
            # Sinon, afficher avec 3 décimales max, sans zéros de fin
            return f"{val:.3f}".rstrip('0').rstrip('.')
    except:
        return value
