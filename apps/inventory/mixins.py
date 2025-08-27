from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from apps.core.models import Configuration


class SiteFilterMixin(LoginRequiredMixin):
    """
    Mixin pour filtrer automatiquement les données par site de l'utilisateur
    """
    
    def get_queryset(self):
        """
        Filtre automatiquement le queryset par le site de l'utilisateur
        """
        queryset = super().get_queryset()
        
        # Si l'utilisateur est superuser, il voit tout
        if self.request.user.is_superuser:
            return queryset
        
        # Sinon, filtrer par le site de l'utilisateur
        user_site = self.request.user.site_configuration
        if user_site:
            return queryset.filter(site_configuration=user_site)
        
        # Si l'utilisateur n'a pas de site, retourner un queryset vide
        return queryset.none()
    
    def get_context_data(self, **kwargs):
        """
        Ajoute le site de l'utilisateur au contexte
        """
        context = super().get_context_data(**kwargs)
        context['user_site'] = self.request.user.site_configuration
        return context


class SiteRequiredMixin(LoginRequiredMixin):
    """
    Mixin pour s'assurer que l'utilisateur a un site configuré
    """
    
    def dispatch(self, request, *args, **kwargs):
        """
        Vérifie que l'utilisateur a un site configuré
        """
        if not request.user.is_superuser and not request.user.site_configuration:
            raise PermissionDenied("Vous devez être associé à un site pour accéder à cette page.")
        return super().dispatch(request, *args, **kwargs) 
