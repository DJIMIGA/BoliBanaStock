"""
URL configuration for bolibanastock project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from apps.core.views import PublicSignUpView
from . import views

# Import HomeView avec gestion d'erreur pour Railway
try:
    from theme.views import HomeView
    # Vérifier que HomeView peut être instancié
    home_view = HomeView.as_view()
except (ImportError, AttributeError, Exception) as e:
    # Fallback si l'import échoue (par exemple sur Railway si theme n'est pas disponible)
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Impossible d'importer HomeView: {e}. Utilisation de simple_home comme fallback.")
    # Utiliser simple_home qui essaiera d'utiliser HomeView si possible
    home_view = views.simple_home

urlpatterns = [
    path('admin/', admin.site.urls),
    # Health check en premier pour éviter les erreurs
    path('health/', views.health_check, name='health_check'),
    # Page d'accueil principale (remplace /home/)
    path('', home_view, name='home'),
    # Alias pour compatibilité avec les anciennes références
    path('home/', home_view, name='home_redirect'),
    path('inventory/', include('apps.inventory.urls')),
    path('sales/', include('apps.sales.urls')),
    path('core/', include('apps.core.urls')),
    path('accounts/', include('django.contrib.auth.urls')),
    path('signup/', PublicSignUpView.as_view(), name='signup'),
    path(
        'privacy-policy/',
        TemplateView.as_view(template_name='privacy_policy.html'),
        name='privacy_policy',
    ),
    path(
        'delete-account/',
        TemplateView.as_view(template_name='delete_account.html'),
        name='delete_account',
    ),
    # API Mobile
    path('api/v1/', include('api.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
