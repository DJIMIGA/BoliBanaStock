# Test de la Déconnexion

## 🧪 **Comment tester la déconnexion**

### 1. **Déconnexion depuis le Dashboard**
- Se connecter avec `mobile` / `12345678`
- Cliquer sur l'icône de déconnexion (🔴) dans le header
- Confirmer la déconnexion
- Vérifier qu'on retourne à l'écran de connexion

### 2. **Déconnexion depuis le menu**
- Se connecter avec `mobile` / `12345678`
- Aller dans le menu principal
- Cliquer sur "Déconnexion" (en rouge)
- Confirmer la déconnexion
- Vérifier qu'on retourne à l'écran de connexion

## ✅ **Fonctionnalités implémentées**

### 🔧 **Côté Mobile**
- ✅ Bouton de déconnexion dans le header
- ✅ Bouton de déconnexion dans le menu principal
- ✅ Confirmation avant déconnexion
- ✅ Nettoyage du stockage local
- ✅ Redirection vers l'écran de connexion
- ✅ Composant LogoutButton réutilisable

### 🔧 **Côté Serveur**
- ✅ Endpoint `/api/v1/auth/logout/`
- ✅ Gestion des erreurs
- ✅ Nettoyage des tokens (optionnel)

## 🎯 **Comportement attendu**

1. **Clic sur déconnexion** → Alert de confirmation
2. **Confirmation** → Appel API de déconnexion
3. **Nettoyage local** → Suppression des tokens
4. **Redirection** → Retour à l'écran de connexion
5. **Nouvelle connexion** → Demande des identifiants

## 🔄 **Gestion des erreurs**

- Si l'API de déconnexion échoue → Déconnexion locale quand même
- Si le stockage local échoue → Affichage d'une erreur
- Si la redirection échoue → Reste sur l'écran actuel

## 📱 **Points de déconnexion**

1. **Header du Dashboard** - Icône rouge
2. **Menu principal** - Option "Déconnexion"
3. **Composant LogoutButton** - Réutilisable partout 