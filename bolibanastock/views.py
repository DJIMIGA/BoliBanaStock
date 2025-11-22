from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.utils import timezone

def health_check(request):
    """Vue ultra-simple pour le healthcheck Railway"""
    return HttpResponse("OK", status=200)

def simple_home(request):
    """Page d'accueil simplifiée pour Railway qui ne dépend pas des modèles"""
    # Essayer d'importer et utiliser HomeView si possible
    try:
        from theme.views import HomeView
        # Si l'utilisateur est authentifié, utiliser HomeView
        if request.user.is_authenticated:
            return HomeView.as_view()(request)
    except Exception as e:
        # Si l'import ou l'exécution échoue, retourner le JSON
        pass
    
    # Si l'utilisateur n'est pas authentifié ou si HomeView échoue, retourner le JSON
    return JsonResponse({
        'message': 'BoliBana Stock - API Mobile',
        'status': 'running',
        'timestamp': timezone.now().isoformat(),
        'endpoints': {
            'admin': '/admin/',
            'api': '/api/v1/',
            'health': '/health/',
            'home': '/',
            'login': '/accounts/login/',
        },
        'note': 'Cette page d\'accueil simplifiée évite les erreurs de modèles sur Railway. Connectez-vous pour accéder à l\'interface complète.'
    })

def custom_404(request, exception=None):
    """Vue personnalisée pour les erreurs 404"""
    if request.path.startswith('/api/'):
        # Pour les endpoints API, retourner une réponse JSON
        return JsonResponse({
            'error': 'Endpoint not found',
            'message': f'The requested endpoint {request.path} was not found',
            'status': 404
        }, status=404)
    else:
        # Pour les autres pages, retourner une page HTML simple
        return render(request, '404.html', status=404)
