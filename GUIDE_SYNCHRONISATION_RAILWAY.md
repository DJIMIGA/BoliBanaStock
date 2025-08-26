# 🚂 Guide de Synchronisation des Données Railway

## 🎯 Comment savoir si l'ajout de nouvelles données sera sur Railway directement ?

### 📋 Résumé Rapide

**Actuellement, vous travaillez en LOCAL** (SQLite). Les nouvelles données seront ajoutées à votre base locale, **PAS sur Railway**.

### 🔍 Méthodes de Vérification

#### 1. **Script Automatique (Recommandé)**
```bash
python check_environment.py
```

**Résultat actuel :**
- ✅ **ENVIRONNEMENT: LOCAL (SQLite)**
- 📝 Les nouvelles données vont dans `db.sqlite3` local
- 🌐 Accessible via: `http://localhost:8000`

#### 2. **Vérification Manuelle**

**A. Variables d'environnement :**
```bash
# Sur Railway (production)
echo $DATABASE_URL          # postgresql://...
echo $PGDATABASE           # railway
echo $RAILWAY_HOST         # web-production-e896b.up.railway.app

# En local (développement)
# Ces variables sont vides ou non définies
```

**B. Configuration Django :**
```python
# Vérifier dans Django shell
python manage.py shell

>>> from django.conf import settings
>>> settings.DATABASES['default']['ENGINE']
# Si résultat contient 'sqlite' → LOCAL
# Si résultat contient 'postgresql' → RAILWAY
```

#### 3. **Vérification Visuelle**

**Interface Django Admin :**
- **Local** : `http://localhost:8000/admin/`
- **Railway** : `https://web-production-e896b.up.railway.app/admin/`

### 🚀 Comment Basculer vers Railway

#### Option 1: Déploiement Complet (Recommandé)
```bash
# 1. Migrer les données vers Railway
python migrate_railway_database.py

# 2. Déployer sur Railway
git add .
git commit -m "🚀 Déploiement Railway"
git push origin main
```

#### Option 2: Configuration Locale pour Railway
```bash
# 1. Configurer les variables d'environnement
export DJANGO_SETTINGS_MODULE=bolibanastock.settings_railway
export DATABASE_URL=postgresql://...

# 2. Vérifier l'environnement
python check_environment.py
# Résultat attendu: 🚂 ENVIRONNEMENT: RAILWAY (PostgreSQL)
```

### 📊 Comparaison des Environnements

| Aspect | Local (SQLite) | Railway (PostgreSQL) |
|--------|----------------|---------------------|
| **Base de données** | `db.sqlite3` | PostgreSQL Railway |
| **URL** | `localhost:8000` | `web-production-e896b.up.railway.app` |
| **Performance** | Moyenne | Excellente |
| **Sauvegarde** | Manuelle | Automatique |
| **Accès mobile** | Réseau local | Internet |
| **Coût** | Gratuit | 5€/mois |

### 🔄 Synchronisation des Données

#### Vérifier la Synchronisation
```bash
python check_data_sync.py
```

**Résultat attendu :**
```
📈 Comparaison des données :
Modèle           Local      Railway    Statut    
---------------------------------------------
users            5          5          ✅ Synchro
products         150        150        ✅ Synchro
categories       10         10         ✅ Synchro
brands           25         25         ✅ Synchro
```

#### Migrer les Données
```bash
# Si les données ne sont pas synchronisées
python migrate_railway_database.py
```

### 📱 Impact sur l'Application Mobile

#### Configuration Mobile Actuelle
```typescript
// BoliBanaStockMobile/src/config/networkConfig.ts
export const NETWORK_CONFIG = {
  // URL Railway (production)
  RAILWAY_URL: 'https://web-production-e896b.up.railway.app',
  API_BASE_URL_RAILWAY: 'https://web-production-e896b.up.railway.app/api/v1',
};
```

#### Comportement selon l'Environnement

**En Local :**
- 📱 Mobile connecté au serveur local
- 🌐 Nécessite le même réseau WiFi
- 📊 Données dans SQLite local

**Sur Railway :**
- 📱 Mobile connecté à Railway
- 🌐 Accessible depuis n'importe où
- 📊 Données dans PostgreSQL Railway

### 🛠️ Scripts Utiles

#### 1. Vérification d'Environnement
```bash
python check_environment.py
```
**Utilisation :** Détermine automatiquement l'environnement actuel

#### 2. Vérification de Synchronisation
```bash
python check_data_sync.py
```
**Utilisation :** Compare les données locales et Railway

#### 3. Migration vers Railway
```bash
python migrate_railway_database.py
```
**Utilisation :** Migre toutes les données vers Railway

#### 4. Création Utilisateur Mobile
```bash
python manage.py create_mobile_user_railway
```
**Utilisation :** Crée l'utilisateur mobile sur Railway

### 🎯 Recommandations

#### Pour le Développement
1. **Travaillez en local** pour les tests rapides
2. **Utilisez Railway** pour les tests de production
3. **Synchronisez régulièrement** les données

#### Pour la Production
1. **Déployez sur Railway** pour l'accès mobile
2. **Configurez les sauvegardes** automatiques
3. **Surveillez les performances**

### 🚨 Points d'Attention

#### Variables d'Environnement Critiques
```bash
# Sur Railway, ces variables DOIVENT être définies :
DJANGO_SETTINGS_MODULE=bolibanastock.settings_railway
DATABASE_URL=postgresql://...
PGDATABASE=railway
PGHOST=...
```

#### Sécurité
- ✅ **Railway** : HTTPS automatique, base sécurisée
- ⚠️ **Local** : HTTP, base non sécurisée

#### Performance
- 🚀 **Railway** : PostgreSQL optimisé, cache
- 🐌 **Local** : SQLite, pas de cache

### 📞 Support

#### En Cas de Problème
1. **Vérifiez l'environnement** : `python check_environment.py`
2. **Vérifiez la synchronisation** : `python check_data_sync.py`
3. **Consultez les logs Railway** : Dashboard Railway
4. **Testez l'API** : `python test_railway_api.py`

#### URLs Importantes
- **Railway Dashboard** : https://railway.app/dashboard
- **Application Railway** : https://web-production-e896b.up.railway.app
- **API Railway** : https://web-production-e896b.up.railway.app/api/v1/

---

## 🎉 Conclusion

**Actuellement :** Vous travaillez en LOCAL (SQLite)
**Nouvelles données :** Ajoutées à la base locale
**Pour Railway :** Exécutez `python migrate_railway_database.py` puis `git push origin main`

**Après déploiement Railway :** Toutes les nouvelles données seront automatiquement sur Railway !
