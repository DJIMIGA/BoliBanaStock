from django.db.models import Count
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from apps.core.models import Configuration
from apps.inventory.models import Product
from apps.subscription.models import Subscription


class SubscriptionService:
    """
    Service pour gérer les vérifications de limites d'abonnement
    """
    
    @staticmethod
    def get_site_plan(site_configuration):
        """
        Récupère le plan d'abonnement actif d'un site
        
        Priorité :
        1. Plan de l'abonnement actif (si subscription.is_active())
        2. Plan assigné au site (subscription_plan)
        3. Plan gratuit par défaut
        
        Args:
            site_configuration: Instance de Configuration
        
        Returns:
            Plan ou None
        """
        if not site_configuration:
            return None
        
        # Vérifier d'abord si l'abonnement est actif
        try:
            subscription = site_configuration.subscription
            if subscription and subscription.is_active():
                # Utiliser le plan de l'abonnement actif
                return subscription.plan
        except Subscription.DoesNotExist:
            pass
        
        # Sinon, utiliser le plan assigné au site (ou plan gratuit par défaut)
        return site_configuration.get_subscription_plan()
    
    @staticmethod
    def can_access_feature(site_configuration, feature_name, raise_exception=False):
        """
        Vérifie si un site peut accéder à une fonctionnalité spécifique
        
        Args:
            site_configuration: Instance de Configuration
            feature_name: Nom de la fonctionnalité ('loyalty_program', 'advanced_reports', 'api_access', 'priority_support')
            raise_exception: Si True, lève une exception au lieu de retourner False
        
        Returns:
            tuple: (can_access: bool, message: str)
        
        Raises:
            ValidationError: Si raise_exception=True et fonctionnalité non disponible
        """
        if not site_configuration:
            if raise_exception:
                raise ValidationError(_('Configuration de site requise'))
            return False, _('Configuration de site requise')
        
        # Récupérer le plan (priorité à l'abonnement actif, sinon plan assigné)
        plan = SubscriptionService.get_site_plan(site_configuration)
        
        # Vérifier si l'abonnement existe et est actif pour les fonctionnalités premium
        try:
            subscription = site_configuration.subscription
            if subscription and not subscription.is_active():
                # Pour les fonctionnalités premium, on vérifie si l'abonnement est actif
                # Si l'abonnement n'est pas actif, on applique les limites du plan assigné
                pass  # On continue avec les limites du plan assigné
        except Subscription.DoesNotExist:
            # Pas d'abonnement = on continue avec le plan assigné (plan gratuit par défaut)
            pass
        if not plan:
            # Pas de plan = toutes les fonctionnalités accessibles (pour compatibilité)
            return True, None
        
        # Mapping des fonctionnalités
        feature_map = {
            'loyalty_program': plan.has_loyalty_program,
            'advanced_reports': plan.has_advanced_reports,
            'api_access': plan.has_api_access,
            'priority_support': plan.has_priority_support,
        }
        
        has_feature = feature_map.get(feature_name, True)  # Par défaut accessible si non spécifié
        
        if not has_feature:
            feature_display = {
                'loyalty_program': _('Programme de fidélité'),
                'advanced_reports': _('Rapports avancés'),
                'api_access': _('Accès API'),
                'priority_support': _('Support prioritaire'),
            }.get(feature_name, feature_name)
            
            message = _(
                f'La fonctionnalité "{feature_display}" n\'est pas disponible avec le plan {plan.name}. '
                f'Veuillez mettre à niveau votre abonnement.'
            )
            if raise_exception:
                raise ValidationError(message)
            return False, message
        
        return True, None
    
    @staticmethod
    def get_site_product_count(site_configuration):
        """
        Compte le nombre de produits d'un site
        
        Args:
            site_configuration: Instance de Configuration
        
        Returns:
            int: Nombre de produits
        """
        if not site_configuration:
            return 0
        return Product.objects.filter(site_configuration=site_configuration).count()
    
    @staticmethod
    def can_add_product(site_configuration, raise_exception=False):
        """
        Vérifie si un site peut ajouter un nouveau produit
        
        Args:
            site_configuration: Instance de Configuration
            raise_exception: Si True, lève une exception au lieu de retourner False
        
        Returns:
            tuple: (can_add: bool, message: str)
        
        Raises:
            ValidationError: Si raise_exception=True et limite atteinte
        """
        if not site_configuration:
            if raise_exception:
                raise ValidationError(_('Configuration de site requise'))
            return False, _('Configuration de site requise')
        
        # Récupérer le plan (priorité à l'abonnement actif, sinon plan assigné)
        plan = SubscriptionService.get_site_plan(site_configuration)
        
        # Vérifier si l'abonnement existe et est actif
        try:
            subscription = site_configuration.subscription
            if subscription:
                if not subscription.is_active():
                    # Abonnement existe mais n'est pas actif
                    # On applique les limites du plan assigné (généralement plan gratuit)
                    # mais on pourrait aussi refuser complètement selon la politique
                    pass  # On continue avec les limites du plan assigné
        except Subscription.DoesNotExist:
            # Pas d'abonnement = on continue avec le plan assigné (plan gratuit par défaut)
            pass
        if not plan:
            # Pas de plan = pas de limite (pour compatibilité)
            return True, None
        
        # Vérifier la limite de produits
        if plan.max_products is not None:
            current_count = SubscriptionService.get_site_product_count(site_configuration)
            
            if current_count >= plan.max_products:
                message = _(
                    f'Limite de {plan.max_products} produits atteinte pour le plan {plan.name}. '
                    f'Veuillez mettre à niveau votre abonnement pour ajouter plus de produits.'
                )
                if raise_exception:
                    raise ValidationError(message)
                return False, message
        
        return True, None
    
    @staticmethod
    def check_product_limit(site_configuration):
        """
        Vérifie la limite de produits et retourne des informations détaillées
        
        Args:
            site_configuration: Instance de Configuration
        
        Returns:
            dict: {
                'can_add': bool,
                'current_count': int,
                'max_products': int or None,
                'remaining': int or None,
                'percentage_used': float or None,
                'message': str or None
            }
        """
        if not site_configuration:
            return {
                'can_add': True,
                'current_count': 0,
                'max_products': None,
                'remaining': None,
                'percentage_used': None,
                'message': None
            }
        
        plan = SubscriptionService.get_site_plan(site_configuration)
        current_count = SubscriptionService.get_site_product_count(site_configuration)
        
        if not plan or plan.max_products is None:
            return {
                'can_add': True,
                'current_count': current_count,
                'max_products': None,
                'remaining': None,
                'percentage_used': None,
                'message': None
            }
        
        remaining = plan.max_products - current_count
        percentage_used = (current_count / plan.max_products * 100) if plan.max_products > 0 else 0
        
        can_add = current_count < plan.max_products
        message = None
        if not can_add:
            message = _(
                f'Limite de {plan.max_products} produits atteinte. '
                f'Veuillez mettre à niveau votre abonnement.'
            )
        elif percentage_used >= 80:
            message = _(
                f'Attention: Vous avez utilisé {percentage_used:.0f}% de votre limite de produits '
                f'({current_count}/{plan.max_products}). Pensez à mettre à niveau votre abonnement.'
            )
        
        return {
            'can_add': can_add,
            'current_count': current_count,
            'max_products': plan.max_products,
            'remaining': max(0, remaining),
            'percentage_used': percentage_used,
            'message': message,
            'plan_name': plan.name
        }
    
    @staticmethod
    def get_plan_info(site_configuration):
        """
        Retourne les informations complètes du plan d'un site
        
        Args:
            site_configuration: Instance de Configuration
        
        Returns:
            dict: Informations du plan
        """
        if not site_configuration:
            return None
        
        plan = SubscriptionService.get_site_plan(site_configuration)
        if not plan:
            return None
        
        limits = site_configuration.get_plan_limits()
        product_info = SubscriptionService.check_product_limit(site_configuration)
        
        # Vérifier l'accès aux fonctionnalités
        features = {
            'loyalty_program': SubscriptionService.can_access_feature(site_configuration, 'loyalty_program')[0],
            'advanced_reports': SubscriptionService.can_access_feature(site_configuration, 'advanced_reports')[0],
            'api_access': SubscriptionService.can_access_feature(site_configuration, 'api_access')[0],
            'priority_support': SubscriptionService.can_access_feature(site_configuration, 'priority_support')[0],
        }
        
        return {
            'plan': {
                'id': plan.id,
                'name': plan.name,
                'slug': plan.slug,
            },
            'limits': limits,
            'product_info': product_info,
            'features': features,
            'prices': plan.get_all_prices(),
        }

