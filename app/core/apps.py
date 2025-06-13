from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app.core'
    verbose_name = 'Core'

    def ready(self):
        """
        Configuration initiale de l'application
        """
        # Importer les signaux
        import app.core.signals 