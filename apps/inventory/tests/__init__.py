# Ce fichier est intentionnellement vide pour marquer le répertoire comme un package Python 

from .test_models import ProductModelTest, CategoryModelTest
from .test_views import ProductViewsTest
from .test_forms import ProductFormTest

__all__ = [
    'ProductModelTest',
    'CategoryModelTest',
    'ProductViewsTest',
    'ProductFormTest',
] 
