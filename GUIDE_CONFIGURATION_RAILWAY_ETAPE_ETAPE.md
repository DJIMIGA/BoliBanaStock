# 🚀 Guide de Configuration Railway - Étape par Étape

## 🎯 Objectif
Résoudre l'erreur `ImproperlyConfigured: settings.DATABASES is improperly configured` sur Railway.

## ✅ Prérequis
- ✅ Base PostgreSQL créée sur Railway
- ✅ Code modifié et prêt
- ✅ Clé secrète Django générée

## 🔧 Configuration des Variables d'Environnement

### **Étape 1 : Accéder au Dashboard Railway**
1. Allez sur [railway.app](https://railway.app)
2. Connectez-vous à votre compte
3. Sélectionnez le projet **BoliBanaStock**

### **Étape 2 : Configurer DATABASE_URL**
1. **Variables d'environnement** > **New Variable**
2. **Name** : `DATABASE_URL`
3. **Value** : `${{Postgres.DATABASE_URL}}`
4. **Description** : `URL de connexion PostgreSQL automatique`

### **Étape 3 : Configurer DJANGO_SECRET_KEY**
1. **Variables d'environnement** > **New Variable**
2. **Name** : `DJANGO_SECRET_KEY`
3. **Value** : `d@3m7c!nb41b@5j_nl7glfr!0ug08t5wna(e65=ya$)^y0bsu%`
4. **Description** : `Clé secrète Django pour la production`

### **Étape 4 : Configurer RAILWAY_ENVIRONMENT**
1. **Variables d'environnement** > **New Variable**
2. **Name** : `RAILWAY_ENVIRONMENT`
3. **Value** : `production`
4. **Description** : `Environnement de production Railway`

### **Étape 5 : Configurer DJANGO_SETTINGS_MODULE**
1. **Variables d'environnement** > **New Variable**
2. **Name** : `DJANGO_SETTINGS_MODULE`
3. **Value** : `bolibanastock.settings_railway`
4. **Description** : `Module de paramètres Django Railway`

## 🚀 Déploiement

### **Étape 6 : Redéployer l'application**
1. **Deployments** > **Deploy Now**
2. Attendre la fin du déploiement
3. Vérifier les logs

### **Étape 7 : Vérifier les logs**
Dans les logs de déploiement, vérifier :
- ❌ Plus d'erreur `ImproperlyConfigured`
- ✅ Connexion à la base PostgreSQL réussie
- ✅ Application Django démarrée

## 🔍 Vérification Post-Déploiement

### **Test 1 : Vérifier l'API**
```bash
# Tester l'endpoint de connexion
curl -X POST https://your-app.railway.app/api/v1/auth/login/
```

### **Test 2 : Vérifier l'Admin**
```bash
# Accéder à l'interface admin
https://your-app.railway.app/admin/
```

### **Test 3 : Vérifier les logs**
- Dashboard Railway > Deployments > Logs
- Plus d'erreurs de base de données

## 📋 Checklist de Vérification

- [ ] `DATABASE_URL` configurée avec `${{Postgres.DATABASE_URL}}`
- [ ] `DJANGO_SECRET_KEY` configurée
- [ ] `RAILWAY_ENVIRONMENT` configuré à `production`
- [ ] `DJANGO_SETTINGS_MODULE` configuré à `bolibanastock.settings_railway`
- [ ] Redéploiement effectué
- [ ] Logs vérifiés (plus d'erreurs)
- [ ] API testée et fonctionnelle
- [ ] Admin Django accessible

## 🆘 En cas de problème

### **Erreur persistante**
1. Vérifier que toutes les variables sont configurées
2. Vérifier la syntaxe des variables
3. Redéployer après modification
4. Vérifier les logs de déploiement

### **Base de données non accessible**
1. Vérifier que la base PostgreSQL est active
2. Vérifier que `DATABASE_URL` est correcte
3. Vérifier les permissions de connexion

## 🎉 Résultat attendu

Après cette configuration :
- ✅ Plus d'erreur `ImproperlyConfigured`
- ✅ Connexion PostgreSQL active
- ✅ Application Django fonctionnelle
- ✅ API mobile accessible
- ✅ Interface admin opérationnelle
