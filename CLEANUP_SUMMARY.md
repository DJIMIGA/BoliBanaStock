# Résumé du Nettoyage - Modes d'inscription non utilisés

## Éléments retirés

### 1. `CustomSignUpView` (doublon)
- **Fichier**: `apps/core/views.py`
- **Raison**: Doublon de `UserCreateView` qui fait la même chose mais de manière plus complète
- **URL retirée**: `/core/register/` dans `apps/core/urls.py`
- **Remplacement**: Utiliser `/core/users/new/` (`UserCreateView`) qui assigne correctement le `site_configuration`

### 2. `debug_signup` (endpoint de debug)
- **Fichier**: `apps/core/views.py`
- **Raison**: Endpoint de debug non nécessaire en production
- **URL retirée**: `/core/debug-signup/` dans `apps/core/urls.py`
- **Template retiré**: `templates/core/debug_signup.html`

### 3. Import inutilisé
- **Fichier**: `api/views.py`
- **Import retiré**: `from apps.core.views import PublicSignUpView`
- **Raison**: Non utilisé dans le fichier

## Éléments conservés

### `test_auth` (endpoint de test)
- **Fichier**: `apps/core/views.py`
- **URL**: `/core/test-auth/`
- **Raison**: Peut être utile pour le debug, conservé avec commentaire

## Modes d'inscription actifs

### Web (Django)
1. **`PublicSignUpView`** - `/signup/`
   - Inscription publique (créer un nouveau site)
   - Accessible publiquement

2. **`UserCreateView`** - `/core/users/new/`
   - Création d'employé par admin de site
   - Nécessite authentification

### API Mobile
1. **`PublicSignUpAPIView`** - `/api/v1/auth/signup/` et `/api/v1/auth/register/`
   - Inscription publique (créer un nouveau site)
   - Accessible publiquement
   - Retourne des tokens JWT

2. **`SimpleSignUpAPIView`** - `/api/v1/auth/signup-simple/`
   - Création d'employé par admin de site
   - Nécessite authentification
   - Ne retourne pas de tokens

## Vérifications effectuées

- ✅ `python manage.py check` - Aucune erreur
- ✅ Compilation Python - Aucune erreur de syntaxe
- ✅ Linter - Aucune erreur
- ✅ Aucune référence à `CustomSignUpView` trouvée dans les templates
- ✅ Aucune référence à `debug_signup` trouvée

## Statut

✅ **Nettoyage terminé** - Le code est prêt à être poussé.

