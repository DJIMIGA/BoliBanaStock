import os
import psutil
import logging
from django.conf import settings
from django.core.cache import cache
from django.db import models
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

class StorageMonitor:
    def __init__(self):
        self.warning_threshold = 80  # Pourcentage
        self.critical_threshold = 90  # Pourcentage

    def check_disk_usage(self):
        """Vérifie l'utilisation du disque"""
        usage = psutil.disk_usage(settings.MEDIA_ROOT)
        return {
            'total': usage.total,
            'used': usage.used,
            'free': usage.free,
            'percent': usage.percent
        }

    def check_user_quotas(self):
        """Vérifie les quotas des utilisateurs"""
        User = get_user_model()
        quota_status = {}
        
        for user in User.objects.all():
            user_storage = self._calculate_user_storage(user)
            quota_status[user.id] = {
                'used': user_storage,
                'quota': user.storage_quota,
                'percent': (user_storage / user.storage_quota) * 100
            }
        
        return quota_status

    def _calculate_user_storage(self, user):
        """Calcule l'espace utilisé par un utilisateur"""
        total_size = 0
        for model in models.Model.__subclasses__():
            if hasattr(model, 'user'):
                user_files = model.objects.filter(user=user)
                for file_obj in user_files:
                    if hasattr(file_obj, 'file') and file_obj.file:
                        try:
                            total_size += file_obj.file.size
                        except:
                            continue
        return total_size

    def send_alert(self, message, level='warning'):
        """Envoie une alerte"""
        logger.warning(f"ALERTE {level.upper()}: {message}")
        # Ici, vous pouvez ajouter l'envoi d'emails ou d'autres notifications

class QuotaMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            # Vérification du quota avant chaque requête
            monitor = StorageMonitor()
            user_storage = monitor._calculate_user_storage(request.user)
            
            if user_storage >= request.user.storage_quota:
                request.quota_exceeded = True
            else:
                request.quota_exceeded = False
                
        return self.get_response(request)

def get_storage_stats():
    """Récupère les statistiques de stockage"""
    cache_key = 'storage_stats'
    stats = cache.get(cache_key)
    
    if not stats:
        monitor = StorageMonitor()
        stats = {
            'disk_usage': monitor.check_disk_usage(),
            'user_quotas': monitor.check_user_quotas()
        }
        cache.set(cache_key, stats, 300)  # Cache pour 5 minutes
    
    return stats 
