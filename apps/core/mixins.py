from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.messages.views import SuccessMessageMixin
from django.core.exceptions import PermissionDenied
from .utils import log_activity

class ActivityLogMixin:
    """
    Mixin pour enregistrer les activités des vues
    """
    def log_activity(self, action_type, description):
        if hasattr(self, 'request'):
            log_activity(
                user=self.request.user,
                action_type=action_type,
                description=description,
                ip_address=self.get_client_ip()
            )

    def get_client_ip(self):
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip

class StaffRequiredMixin(LoginRequiredMixin):
    """
    Mixin pour restreindre l'accès aux membres du staff
    """
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_staff:
            raise PermissionDenied
        return super().dispatch(request, *args, **kwargs)

class SuccessMessageWithActivityMixin(SuccessMessageMixin, ActivityLogMixin):
    """
    Mixin combinant SuccessMessageMixin et ActivityLogMixin
    """
    def form_valid(self, form):
        response = super().form_valid(form)
        self.log_activity('modification', self.success_message)
        return response

class CacheControlMixin:
    """
    Mixin pour le contrôle du cache
    """
    cache_timeout = 60 * 15  # 15 minutes par défaut

    def get_cache_timeout(self):
        return self.cache_timeout

    def dispatch(self, request, *args, **kwargs):
        response = super().dispatch(request, *args, **kwargs)
        response['Cache-Control'] = f'max-age={self.get_cache_timeout()}'
        return response 
