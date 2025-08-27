from django.test.runner import DiscoverRunner

class CustomTestRunner(DiscoverRunner):
    def setup_test_environment(self, **kwargs):
        super().setup_test_environment(**kwargs)
        # Configuration supplémentaire si nécessaire

    def teardown_test_environment(self, **kwargs):
        super().teardown_test_environment(**kwargs)
        # Nettoyage supplémentaire si nécessaire 
