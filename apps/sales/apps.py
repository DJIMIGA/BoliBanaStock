from django.apps import AppConfig


class SalesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.sales'
    verbose_name = 'Ventes'
    
    def ready(self):
        """Import les signals lors du chargement de l'application"""
        import apps.sales.signals  # noqa 
