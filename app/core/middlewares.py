from django.utils import timezone
from .utils import log_activity

class ActivityLogMiddleware:
    """
    Middleware pour enregistrer automatiquement les activités
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        if request.user.is_authenticated:
            # Enregistre la connexion
            if request.path == '/login/':
                log_activity(
                    user=request.user,
                    action_type='connexion',
                    description=f'Connexion de {request.user.username}',
                    ip_address=self.get_client_ip(request)
                )
            # Enregistre la déconnexion
            elif request.path == '/logout/':
                log_activity(
                    user=request.user,
                    action_type='deconnexion',
                    description=f'Déconnexion de {request.user.username}',
                    ip_address=self.get_client_ip(request)
                )

        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class TimezoneMiddleware:
    """
    Middleware pour gérer le fuseau horaire de l'utilisateur
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            # Utilise le fuseau horaire de l'utilisateur s'il est défini
            timezone.activate(request.user.timezone)
        else:
            timezone.deactivate()
        
        response = self.get_response(request)
        return response

class NotificationMiddleware:
    """
    Middleware pour ajouter les notifications non lues au contexte
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            request.unread_notifications = request.user.notification_set.filter(lu=False)
        else:
            request.unread_notifications = []

        response = self.get_response(request)
        return response 