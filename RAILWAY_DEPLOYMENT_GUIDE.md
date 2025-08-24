# 🚂 Guide de Déploiement BoliBanaStock sur Railway

## 🎯 Avantages de Railway vs Heroku

- **Prix** : 5€/mois vs 10€/mois sur Heroku
- **Simplicité** : Configuration automatique de la base de données
- **Performance** : Déploiement plus rapide
- **Base de données** : PostgreSQL incluse dans le prix

## 📋 Prérequis

1. **Compte GitHub** connecté à Railway
2. **Projet Django** prêt (✅ déjà fait)
3. **Base de données** SQLite à migrer vers PostgreSQL

## 🚀 Étapes de Déploiement

### 1. Créer un compte Railway

```bash
# Aller sur https://railway.app
# Se connecter avec GitHub
# Créer un nouveau projet
```

### 2. Connecter le Repository

```bash
# Dans Railway Dashboard
# "Deploy from GitHub repo"
# Sélectionner: BoliBanaStock
# Branche: main
```

### 3. Configuration Automatique

Railway détecte automatiquement :
- ✅ `requirements.txt` → Python
- ✅ `Procfile` → Gunicorn
- ✅ `runtime.txt` → Python 3.11

### 4. Variables d'Environnement

Dans Railway Dashboard → Variables :

```bash
DJANGO_SECRET_KEY=your-super-secret-key-here
DJANGO_DEBUG=False
DJANGO_SETTINGS_MODULE=bolibanastock.settings_railway
```

### 5. Base de Données PostgreSQL

```bash
# Railway crée automatiquement :
# - Base PostgreSQL
# - Variables PG* configurées
# - Connexion sécurisée
```

## 🔧 Configuration Django

### Fichier Settings Railway

Le fichier `bolibanastock/settings_railway.py` est configuré pour :
- ✅ PostgreSQL automatique
- ✅ Variables d'environnement Railway
- ✅ Sécurité production
- ✅ CORS pour l'API mobile
- ✅ Fichiers statiques avec WhiteNoise

### Migration des Données

```bash
# Localement, avant déploiement
python manage.py dumpdata > data_backup.json

# Sur Railway, après déploiement
python manage.py migrate
python manage.py loaddata data_backup.json
```

## 📱 Configuration Mobile

### CORS et API

```python
# CORS_ALLOWED_ORIGINS dans settings_railway.py
CORS_ALLOWED_ORIGINS = [
    "https://your-app.railway.app",
    "http://localhost:3000",
]
```

### JWT Authentication

```python
# Configuration automatique dans settings_railway.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}
```

## 🚀 Déploiement

### 1. Push sur GitHub

```bash
git add .
git commit -m "🚀 Configuration Railway pour déploiement"
git push origin main
```

### 2. Déploiement Automatique

Railway déploie automatiquement à chaque push sur `main`

### 3. Vérification

```bash
# Vérifier les logs dans Railway Dashboard
# Tester l'URL : https://your-app.railway.app
# Vérifier l'API mobile
```

## 🔍 Monitoring et Logs

### Logs en Temps Réel

```bash
# Dans Railway Dashboard
# Logs → Voir les logs Django en temps réel
# Métriques → CPU, RAM, requêtes
```

### Health Check

```bash
# URL de santé : https://your-app.railway.app/
# Vérification automatique toutes les 5 minutes
```

## 💰 Coûts

- **Plan de base** : 5€/mois
- **Inclus** :
  - Déploiement illimité
  - Base PostgreSQL
  - 500 heures gratuites/mois
  - SSL automatique

## 🆘 Dépannage

### Erreur de Migration

```bash
# Vérifier les variables PostgreSQL dans Railway
# Relancer le déploiement
# Vérifier les logs d'erreur
```

### Erreur de Fichiers Statiques

```bash
# Vérifier WhiteNoise dans MIDDLEWARE
# Vérifier STATIC_ROOT et STATICFILES_STORAGE
```

### Erreur CORS

```bash
# Vérifier CORS_ALLOWED_ORIGINS
# Ajouter l'URL de votre app mobile
```

## 📞 Support

- **Railway Docs** : https://docs.railway.app
- **Discord Railway** : Communauté active
- **GitHub Issues** : Pour les problèmes spécifiques

## 🎉 Résultat Final

Après déploiement :
- ✅ URL stable : `https://your-app.railway.app`
- ✅ Base PostgreSQL performante
- ✅ API mobile fonctionnelle
- ✅ Plus de changements d'IP
- ✅ Coût réduit de 50% vs Heroku

---

**Prochaine étape** : Déployer et tester l'API mobile ! 🚀
