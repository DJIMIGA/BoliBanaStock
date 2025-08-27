# 🔧 Configuration des Variables d'Environnement Railway

## 🚨 Variables critiques à configurer

### 1. **DATABASE_URL** (PostgreSQL)
- **Où la trouver** : Dashboard Railway > Base de données > Connect
- **Format** : `postgresql://username:password@host:port/database`
- **Exemple** : `postgresql://postgres:password123@containers-us-west-1.railway.app:5432/railway`

### 2. **DJANGO_SECRET_KEY**
- **Génération** : Utiliser le script `generate_secret_key.py`
- **Format** : Clé aléatoire de 50 caractères
- **Exemple** : `django-insecure-abc123...xyz789`

### 3. **RAILWAY_ENVIRONMENT**
- **Valeur** : `production`
- **Objectif** : Forcer l'utilisation des paramètres Railway

### 4. **DJANGO_SETTINGS_MODULE**
- **Valeur** : `bolibanastock.settings_railway`
- **Objectif** : Utiliser la configuration Railway

## 🚀 Étapes de configuration

### Étape 1 : Générer la clé secrète
```bash
python generate_secret_key.py
```

### Étape 2 : Accéder au dashboard Railway
1. Allez sur [railway.app](https://railway.app)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet BoliBanaStock

### Étape 3 : Configurer les variables
1. **Variables d'environnement** > **New Variable**
2. Ajoutez chaque variable une par une :

| Variable | Valeur | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | URL de votre base PostgreSQL |
| `DJANGO_SECRET_KEY` | `django-insecure-...` | Clé secrète générée |
| `RAILWAY_ENVIRONMENT` | `production` | Environnement de production |
| `DJANGO_SETTINGS_MODULE` | `bolibanastock.settings_railway` | Module de paramètres |

### Étape 4 : Redéployer
1. **Deployments** > **Deploy Now**
2. Attendre la fin du déploiement
3. Vérifier les logs

## 🔍 Vérification de la configuration

### 1. **Vérifier les variables dans Railway**
- Dashboard > Variables d'environnement
- Toutes les variables critiques doivent être présentes

### 2. **Vérifier les logs de déploiement**
- Plus d'erreur `ImproperlyConfigured`
- Connexion à la base de données réussie

### 3. **Tester l'application**
- API de connexion : `/api/v1/auth/login/`
- Interface admin : `/admin/`

## 📋 Checklist de configuration

- [ ] Clé secrète Django générée
- [ ] `DATABASE_URL` configurée sur Railway
- [ ] `DJANGO_SECRET_KEY` configurée sur Railway
- [ ] `RAILWAY_ENVIRONMENT=production` configuré
- [ ] `DJANGO_SETTINGS_MODULE` configuré
- [ ] Redéploiement effectué
- [ ] Logs vérifiés (plus d'erreurs)
- [ ] Application testée et fonctionnelle

## 🆘 Problèmes courants

### **Base de données non accessible**
- Vérifier que `DATABASE_URL` est correcte
- Vérifier que la base PostgreSQL est active
- Vérifier les permissions de connexion

### **Clé secrète invalide**
- Régénérer une nouvelle clé avec `generate_secret_key.py`
- Mettre à jour la variable sur Railway
- Redéployer l'application

### **Paramètres non pris en compte**
- Vérifier `RAILWAY_ENVIRONMENT=production`
- Vérifier `DJANGO_SETTINGS_MODULE`
- Redéployer après modification des variables

## 📚 Ressources utiles

- [Documentation Railway Variables](https://docs.railway.app/deploy/environments/environment-variables)
- [Configuration PostgreSQL Railway](https://docs.railway.app/databases/postgresql)
- [Déploiement Django Railway](https://docs.railway.app/deploy/deployments/python-django)
