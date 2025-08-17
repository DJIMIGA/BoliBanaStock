# 🧪 Guide de Test - Déconnexion Forcée Tous Appareils

## 🎯 **Objectif du test**

Vérifier que la déconnexion forcée fonctionne correctement et déconnecte l'utilisateur sur **tous les appareils** connectés.

## 📋 **Prérequis**

### ✅ **Environnement de test**
- [ ] Django server démarré (`python manage.py runserver 0.0.0.0:8000`)
- [ ] Application mobile connectée au réseau
- [ ] Au moins 2 appareils connectés (mobile + desktop)
- [ ] Utilisateur connecté sur les deux appareils

### 🔑 **Identifiants de test**
- **Username** : `mobile`
- **Password** : `12345678`

## 🧪 **Méthodes de test**

### 📱 **1. Test via l'application mobile**

#### **Étapes :**
1. **Se connecter** sur mobile ET desktop
2. **Ouvrir l'app mobile** → Dashboard
3. **Appuyer sur le bouton déconnexion** (icône logout)
4. **Choisir "Déconnexion tous appareils"**
5. **Confirmer** la déconnexion forcée

#### **Résultat attendu :**
- ✅ Mobile déconnecté et redirigé vers login
- ✅ Desktop déconnecté (session invalide)
- ✅ Logs Django : `🚫 Force déconnexion tous appareils pour: mobile`

### 🌐 **2. Test via cURL (API directe)**

#### **Étape 1 : Se connecter et récupérer un token**
```bash
# Connexion
curl -X POST http://192.168.1.7:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "mobile", "password": "12345678"}'

# Réponse attendue :
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {...}
}
```

#### **Étape 2 : Tester une API protégée (vérifier connexion)**
```bash
# Test dashboard (doit fonctionner)
curl -X GET http://192.168.1.7:8000/api/v1/dashboard/ \
  -H "Authorization: Bearer <access_token>"

# Réponse attendue : 200 OK avec données
```

#### **Étape 3 : Déconnexion forcée**
```bash
# Déconnexion forcée
curl -X POST http://192.168.1.7:8000/api/v1/auth/logout-all/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json"

# Réponse attendue :
{
  "message": "Déconnexion forcée sur tous les appareils",
  "user": "mobile",
  "tokens_invalidated": 3,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### **Étape 4 : Vérifier que le token est invalidé**
```bash
# Test dashboard (doit échouer)
curl -X GET http://192.168.1.7:8000/api/v1/dashboard/ \
  -H "Authorization: Bearer <access_token>"

# Réponse attendue : 401 Unauthorized
```

### 🖥️ **3. Test côté desktop**

#### **Étapes :**
1. **Ouvrir le navigateur** → `http://192.168.1.7:8000`
2. **Se connecter** avec les identifiants
3. **Naviguer** sur quelques pages (vérifier connexion)
4. **Exécuter la déconnexion forcée** depuis mobile
5. **Rafraîchir la page** desktop

#### **Résultat attendu :**
- ❌ Desktop redirigé vers page de connexion
- ❌ Session Django invalide
- ❌ Impossible d'accéder aux pages protégées

## 🔍 **Vérifications côté serveur**

### 📊 **Logs Django attendus**
```bash
# Dans la console Django
🔐 Déconnexion de l'utilisateur: mobile
🚫 Force déconnexion tous appareils pour: mobile
✅ 3 tokens invalidés pour: mobile
```

### 🗄️ **Vérification base de données**
```sql
-- Vérifier les tokens blacklistés
SELECT * FROM rest_framework_simplejwt_outstandingtoken 
WHERE user_id = (SELECT id FROM app_core_user WHERE username = 'mobile')
AND blacklisted = 1;
```

## 🚨 **Scénarios de test avancés**

### 🔄 **Test multi-appareils simultanés**
1. **Connecter** 3 appareils différents
2. **Exécuter** déconnexion forcée depuis l'un
3. **Vérifier** que les 3 sont déconnectés

### ⏰ **Test de timing**
1. **Créer** plusieurs sessions rapidement
2. **Attendre** quelques minutes
3. **Exécuter** déconnexion forcée
4. **Vérifier** que tous les tokens sont invalidés

### 🔐 **Test de sécurité**
1. **Copier** un token valide
2. **Exécuter** déconnexion forcée
3. **Essayer** d'utiliser le token copié
4. **Vérifier** qu'il est rejeté

## 📝 **Checklist de validation**

### ✅ **Fonctionnalité mobile**
- [ ] Interface propose 2 options de déconnexion
- [ ] Déconnexion simple : mobile uniquement
- [ ] Déconnexion forcée : tous appareils
- [ ] Confirmation avant déconnexion forcée
- [ ] Redirection vers login après déconnexion

### ✅ **API backend**
- [ ] Endpoint `/auth/logout-all/` accessible
- [ ] Authentification requise
- [ ] Tous les tokens invalidés
- [ ] Logs appropriés générés
- [ ] Réponse JSON correcte

### ✅ **Sécurité**
- [ ] Tokens blacklistés en base
- [ ] Sessions desktop invalidées
- [ ] Impossible de réutiliser les tokens
- [ ] Pas de fuite d'informations sensibles

### ✅ **Expérience utilisateur**
- [ ] Messages d'erreur clairs
- [ ] Feedback visuel approprié
- [ ] Pas de crash de l'application
- [ ] Redirection fluide

## 🐛 **Dépannage**

### ❌ **Problème : Déconnexion forcée ne fonctionne pas**
**Solutions :**
1. Vérifier que le serveur Django est démarré
2. Contrôler les logs Django pour erreurs
3. Vérifier la configuration JWT
4. Tester l'endpoint directement avec cURL

### ❌ **Problème : Desktop reste connecté**
**Solutions :**
1. Vérifier que les tokens sont bien blacklistés
2. Contrôler la configuration des sessions Django
3. Vider le cache du navigateur
4. Vérifier les cookies de session

### ❌ **Problème : Erreur 500 sur l'endpoint**
**Solutions :**
1. Vérifier les imports dans `api/views.py`
2. Contrôler la configuration JWT dans `settings.py`
3. Vérifier les migrations de base de données
4. Consulter les logs Django détaillés

## 🎯 **Résultat attendu final**

**✅ Déconnexion forcée réussie si :**
- Mobile déconnecté et redirigé
- Desktop déconnecté et redirigé
- Tous les tokens invalidés en base
- Logs Django appropriés
- Aucune erreur dans l'application

**L'utilisateur a maintenant un contrôle total sur ses sessions !** 🔐 