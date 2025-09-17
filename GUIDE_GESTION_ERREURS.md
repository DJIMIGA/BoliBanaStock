# Guide de Gestion des Erreurs - BoliBanaStock

## 🎯 Objectif

Ce guide explique comment utiliser le système de gestion d'erreurs professionnel de BoliBanaStock pour éviter d'afficher des erreurs techniques brutes aux utilisateurs finaux.

## 🏗️ Architecture du Système

### 1. Exceptions Personnalisées (`apps/core/exceptions.py`)

```python
from apps.core.exceptions import StockError, ProductError, UserError

# Lever une exception métier
if stock_insufficient:
    raise StockError("Stock insuffisant", code="INSUFFICIENT_STOCK")
```

### 2. Gestionnaire d'Erreurs (`apps/core/error_handler.py`)

```python
from apps.core.error_handler import ErrorHandler

# Formater une réponse d'erreur
error_response = ErrorHandler.format_error_response(
    exception,
    include_details=False,  # False en production
    user_friendly=True      # Messages conviviaux
)
```

### 3. Décorateurs (`apps/core/decorators.py`)

```python
from apps.core.decorators import handle_errors, api_error_handler, safe_execute

# Vue avec gestion automatique des erreurs
@handle_errors
def ma_vue(request):
    # Votre code ici - les erreurs sont gérées automatiquement
    pass

# Vue API avec gestion d'erreurs
@api_error_handler
@api_view(['POST'])
def mon_api_view(request):
    # Votre code API ici
    pass
```

## 🚀 Utilisation Pratique

### 1. Dans les Vues Django

#### Vue Simple avec Gestion Automatique

```python
from apps.core.decorators import handle_errors
from apps.core.exceptions import ProductError

@handle_errors
def product_detail(request, product_id):
    try:
        product = Product.objects.get(id=product_id)
        if not product.is_active:
            raise ProductError("Produit non disponible", code="PRODUCT_INACTIVE")
        
        return JsonResponse({
            'success': True,
            'data': product.to_dict()
        })
    except Product.DoesNotExist:
        raise ProductError("Produit introuvable", code="PRODUCT_NOT_FOUND")
```

#### Vue API avec Gestion d'Erreurs

```python
from apps.core.decorators import api_error_handler
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_error_handler
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_product(request):
    data = request.data
    
    # Validation
    if not data.get('name'):
        raise ValidationError("Le nom du produit est requis")
    
    # Création
    product = Product.objects.create(**data)
    
    return Response({
        'success': True,
        'data': product.to_dict()
    })
```

### 2. Dans les Modèles

```python
from apps.core.exceptions import StockError

class Product(models.Model):
    # ... autres champs ...
    
    def update_stock(self, quantity_change):
        try:
            new_quantity = self.quantity + quantity_change
            if new_quantity < 0:
                raise StockError(
                    "Stock insuffisant pour cette opération",
                    code="INSUFFICIENT_STOCK",
                    details={'current_stock': self.quantity, 'requested_change': quantity_change}
                )
            
            self.quantity = new_quantity
            self.save()
            return True
            
        except Exception as e:
            raise StockError(f"Erreur lors de la mise à jour du stock: {e}")
```

### 3. Dans les Formulaires

```python
from django import forms
from apps.core.exceptions import ValidationError

class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ['name', 'price', 'category']
    
    def clean(self):
        cleaned_data = super().clean()
        
        # Validation personnalisée
        if cleaned_data.get('price', 0) <= 0:
            raise ValidationError(
                "Le prix doit être supérieur à 0",
                code="INVALID_PRICE"
            )
        
        return cleaned_data
    
    def save(self, commit=True):
        try:
            return super().save(commit=commit)
        except Exception as e:
            raise ProductError(f"Erreur lors de la sauvegarde: {e}")
```

### 4. Dans les Scripts de Test

```python
from apps.core.decorators import safe_execute, retry_on_error
from apps.core.exceptions import StockError

@safe_execute(default_return=False)
def test_stock_operation():
    """Test sécurisé d'une opération de stock"""
    # Votre code de test ici
    pass

@retry_on_error(max_attempts=3, delay=1.0)
def test_database_connection():
    """Test de connexion avec retry automatique"""
    # Votre code de test ici
    pass
```

## 📝 Messages d'Erreur Personnalisés

### 1. Messages Conviviaux

```python
from apps.core.error_config import USER_FRIENDLY_MESSAGES

# Les messages sont automatiquement traduits selon la langue
# Français, Anglais, Bambara supportés
```

### 2. Messages Techniques (Développement)

```python
# En mode DEBUG, les détails techniques sont inclus
error_response = ErrorHandler.format_error_response(
    exception,
    include_details=settings.DEBUG,  # True en développement
    user_friendly=False               # Messages techniques
)
```

## 🔧 Configuration

### 1. Middleware dans `settings.py`

```python
MIDDLEWARE = [
    # ... autres middlewares ...
    'apps.core.middleware.ErrorHandlingMiddleware',
    'apps.core.middleware.RequestLoggingMiddleware',
    'apps.core.middleware.PerformanceMonitoringMiddleware',
]
```

### 2. Gestionnaire d'Exceptions DRF

```python
# Dans settings.py
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'apps.core.error_handler.custom_exception_handler',
}
```

### 3. Gestionnaires d'Erreurs 404/500

```python
# Dans urls.py principal
handler404 = 'apps.core.error_handler.handle_404_error'
handler500 = 'apps.core.error_handler.handle_500_error'
```

## 📊 Logging et Monitoring

### 1. Logs d'Erreur

```python
# Les erreurs sont automatiquement loggées avec contexte
logger.error("Erreur détectée", extra={
    'user': request.user.username,
    'view': 'product_detail',
    'error_code': 'PRODUCT_NOT_FOUND'
})
```

### 2. Surveillance des Performances

```python
# Le middleware surveille automatiquement les requêtes lentes
# Alertes si > 1 seconde
```

## 🌐 Gestion Multilingue

### 1. Messages en Français

```python
# Par défaut
"Une erreur inattendue s'est produite. Veuillez réessayer."
```

### 2. Messages en Anglais

```python
# Selon la langue de l'utilisateur
"An unexpected error occurred. Please try again."
```

### 3. Messages en Bambara

```python
# Support local
"Yɛrɛ yɛrɛ ma kɛra. Aw ye aw ye ka segin."
```

## 🚨 Bonnes Pratiques

### 1. Toujours Utiliser les Exceptions Métier

```python
# ❌ À éviter
return JsonResponse({'error': str(e)}, status=500)

# ✅ À utiliser
raise StockError("Erreur de stock", code="STOCK_UPDATE_FAILED")
```

### 2. Logging Approprié

```python
# ❌ À éviter
print(f"Erreur: {e}")

# ✅ À utiliser
logger.error(f"Erreur lors de la mise à jour du stock: {e}", exc_info=True)
```

### 3. Messages Utilisateur Conviviaux

```python
# ❌ À éviter
"Database connection failed: connection refused"

# ✅ À utiliser
"Le serveur rencontre des difficultés. Veuillez réessayer plus tard."
```

## 🔍 Débogage

### 1. Mode Développement

```python
# Les détails techniques sont visibles
error_response = ErrorHandler.format_error_response(
    exception,
    include_details=True,   # Détails techniques
    user_friendly=False      # Messages techniques
)
```

### 2. Mode Production

```python
# Seuls les messages conviviaux sont visibles
error_response = ErrorHandler.format_error_response(
    exception,
    include_details=False,   # Pas de détails techniques
    user_friendly=True       # Messages conviviaux
)
```

## 📱 Intégration Mobile

### 1. API Responses

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Stock insuffisant pour cette opération. Veuillez réessayer.",
    "timestamp": 1640995200
  }
}
```

### 2. Gestion Côté Client

```javascript
// Gestion des erreurs côté client
if (!response.success) {
    const errorMessage = response.error.message;
    // Afficher le message convivial à l'utilisateur
    showUserFriendlyError(errorMessage);
    
    // Logger l'erreur pour le débogage
    console.error('API Error:', response.error);
}
```

## 🎯 Exemples Complets

### 1. Vue de Gestion de Stock

```python
@handle_errors
@require_http_methods(["POST"])
def update_stock(request):
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        quantity_change = data.get('quantity_change')
        
        if not product_id or quantity_change is None:
            raise ValidationError("Données manquantes")
        
        product = Product.objects.get(id=product_id)
        product.update_stock(quantity_change)
        
        return JsonResponse({
            'success': True,
            'message': 'Stock mis à jour avec succès',
            'new_stock': product.quantity
        })
        
    except Product.DoesNotExist:
        raise ProductError("Produit introuvable")
    except ValueError as e:
        raise ValidationError(f"Données invalides: {e}")
```

### 2. API de Création de Produit

```python
@api_error_handler
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_product_api(request):
    try:
        serializer = ProductSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationError("Données invalides", details=serializer.errors)
        
        product = serializer.save()
        
        return Response({
            'success': True,
            'data': ProductSerializer(product).data
        })
        
    except Exception as e:
        # L'erreur sera automatiquement formatée par @api_error_handler
        raise
```

## 🔧 Maintenance et Évolution

### 1. Ajouter de Nouvelles Exceptions

```python
# Dans apps/core/exceptions.py
class PaymentError(BoliBanaStockException):
    """Erreur liée aux paiements"""
    pass

class InventoryError(BoliBanaStockException):
    """Erreur liée à l'inventaire"""
    pass
```

### 2. Ajouter de Nouveaux Messages

```python
# Dans apps/core/error_config.py
USER_FRIENDLY_MESSAGES.update({
    'PAYMENT_ERROR': 'Erreur lors du traitement du paiement. Veuillez réessayer.',
    'INVENTORY_ERROR': 'Erreur lors de la vérification de l\'inventaire. Veuillez réessayer.',
})
```

## 📚 Ressources Supplémentaires

- `apps/core/exceptions.py` - Définitions des exceptions
- `apps/core/error_handler.py` - Gestionnaire principal
- `apps/core/decorators.py` - Décorateurs utilitaires
- `apps/core/error_config.py` - Configuration des messages
- `apps/core/middleware.py` - Middleware de gestion d'erreurs

---

**Note**: Ce système garantit que les utilisateurs finaux ne voient jamais d'erreurs techniques brutes, tout en maintenant un logging détaillé pour les développeurs et administrateurs.

