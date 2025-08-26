# 🚀 Création de Superuser sur Railway

Ce guide explique comment créer un superuser sur votre application Django déployée sur Railway.

## 📋 Prérequis

- ✅ Application Django déployée sur Railway
- ✅ Accès à la base de données (direct ou via Railway CLI)
- ✅ Python 3.8+ installé localement

## 🛠️ Méthodes de création

### 1. 🐍 Commande Django personnalisée (Recommandée)

Utilisez la commande Django personnalisée que nous avons créée :

```bash
# Via Railway CLI (recommandé pour Railway)
railway run python manage.py create_superuser_railway

# Ou avec des paramètres
railway run python manage.py create_superuser_railway --username admin --email admin@example.com
```

**Options disponibles :**
- `--username` : Nom d'utilisateur
- `--email` : Email
- `--password` : Mot de passe (non recommandé en production)
- `--first-name` : Prénom
- `--last-name` : Nom de famille
- `--force` : Forcer la création même si l'utilisateur existe

### 2. 🔧 Script Python avancé

Utilisez le script `create_superuser_railway.py` :

```bash
# Création via Django (accès direct à la base)
python create_superuser_railway.py --create

# Création via l'API Django
python create_superuser_railway.py --api

# Test de connexion
python create_superuser_railway.py --test
```

### 3. 🚀 Script Python simplifié

Utilisez le script `create_superuser_railway_simple.py` :

```bash
# Via Railway CLI
python create_superuser_railway_simple.py --railway-cli

# Via Django management
python create_superuser_railway_simple.py --django

# Test d'accès
python create_superuser_railway_simple.py --test
```

### 4. 🎯 Commande Django standard

Utilisez la commande Django standard :

```bash
# Via Railway CLI
railway run python manage.py createsuperuser

# Ou en local si vous avez accès à la base
python manage.py createsuperuser
```

## 📱 Installation de Railway CLI

Si vous n'avez pas Railway CLI installé :

```bash
# Installation via npm
npm install -g @railway/cli

# Ou via yarn
yarn global add @railway/cli

# Vérification
railway --version
```

## 🔐 Connexion à Railway

```bash
# Se connecter à votre projet
railway login
railway link

# Vérifier le statut
railway status
```

## 🧪 Test de la création

Après avoir créé le superuser, testez l'accès :

```bash
# Test de connexion
python create_superuser_railway_simple.py --test

# Ou accédez directement à l'admin
# https://votre-app.up.railway.app/admin/
```

## 🚨 Sécurité

- ✅ Utilisez des mots de passe forts (minimum 8 caractères)
- ✅ Évitez de passer le mot de passe en ligne de commande
- ✅ Changez le mot de passe par défaut après la première connexion
- ✅ Utilisez des comptes superuser uniquement pour l'administration

## 🔍 Dépannage

### Erreur de connexion à Railway
```bash
# Vérifier le statut
python create_superuser_railway_simple.py

# Vérifier les variables d'environnement
railway variables
```

### Erreur de base de données
```bash
# Vérifier les migrations
railway run python manage.py showmigrations

# Appliquer les migrations si nécessaire
railway run python manage.py migrate
```

### Erreur de permissions
```bash
# Vérifier les permissions de l'utilisateur
railway run python manage.py shell
>>> from django.contrib.auth.models import User
>>> user = User.objects.get(username='votre_username')
>>> print(f"Superuser: {user.is_superuser}, Staff: {user.is_staff}")
```

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs Railway : `railway logs`
2. Vérifiez le statut de l'application : `railway status`
3. Consultez la documentation Django sur les superusers
4. Vérifiez les variables d'environnement Railway

## 🎯 Exemple complet

```bash
# 1. Se connecter à Railway
railway login
railway link

# 2. Créer le superuser
railway run python manage.py create_superuser_railway

# 3. Tester l'accès
python create_superuser_railway_simple.py --test

# 4. Accéder à l'admin
# Ouvrez https://votre-app.up.railway.app/admin/
```

---

**Note :** Ces scripts sont conçus pour fonctionner avec votre application BoliBanaStock sur Railway. Adaptez les URLs et configurations selon votre déploiement spécifique.
