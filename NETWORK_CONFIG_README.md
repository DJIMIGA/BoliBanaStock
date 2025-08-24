# 🔧 Configuration Réseau Centralisée - BoliBanaStock

## 📋 Vue d'ensemble

Ce document décrit la nouvelle architecture de configuration réseau centralisée pour le projet BoliBanaStock, qui harmonise les configurations d'IP entre le backend Django et l'application mobile.

## 🎯 Objectifs

- ✅ **Centraliser** toutes les configurations d'IP
- ✅ **Harmoniser** les configurations entre backend et mobile
- ✅ **Faciliter** la maintenance et les modifications
- ✅ **Éviter** les incohérences de configuration
- ✅ **Supporter** différents environnements (dev, staging, prod)

## 🏗️ Architecture

### Structure des fichiers

```
config/
├── network_config.py          # Configuration Python partagée
└── __init__.py

BoliBanaStockMobile/src/config/
├── networkConfig.ts           # Configuration TypeScript mobile
├── api.ts                     # Configuration API principale
└── __init__.py

bolibanastock/
├── settings.py                # Configuration Django (utilise config centralisée)
└── __init__.py
```

### Configuration des IPs

| Environnement | IP | Usage | Port |
|---------------|----|-------|------|
| **Développement Local** | `192.168.1.7` | Réseau WiFi, développement web | 8000 |
| **Développement Mobile** | `172.20.10.2` | Réseau mobile, app mobile | 8000 |
| **Production** | `37.65.65.126` | Serveur public | 8000 |

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```bash
# IPs de développement
DEV_HOST_IP=192.168.1.7
MOBILE_DEV_IP=172.20.10.2
PUBLIC_SERVER_IP=37.65.65.126

# Ports
DJANGO_PORT=8000
EXPO_PORT=8081

# URLs API
API_BASE_URL_DEV=http://192.168.1.7:8000/api/v1
API_BASE_URL_MOBILE=http://172.20.10.2:8000/api/v1
API_BASE_URL_PUBLIC=http://37.65.65.126:8000/api/v1
```

### Configuration Python (Backend)

```python
# config/network_config.py
from config.network_config import get_allowed_hosts, get_cors_origins

# Dans settings.py Django
ALLOWED_HOSTS = get_allowed_hosts()
CORS_ALLOWED_ORIGINS = get_cors_origins()
```

### Configuration TypeScript (Mobile)

```typescript
// BoliBanaStockMobile/src/config/networkConfig.ts
import { getCurrentApiUrl, getMobileApiUrl } from './networkConfig';

const API_URL = getCurrentApiUrl();
```

## 🚀 Utilisation

### 1. Modification d'une IP

Pour modifier une IP, mettez à jour le fichier `config/network_config.py` :

```python
NETWORK_CONFIG = {
    'DEV_HOST_IP': '192.168.1.100',  # Nouvelle IP
    # ... autres configurations
}
```

### 2. Ajout d'un nouvel environnement

```python
# Ajouter dans NETWORK_CONFIG
'NEW_ENV_IP': '10.0.0.100',

# Ajouter dans CORS_CONFIG
'ALLOWED_ORIGINS': [
    # ... existant
    f"http://{NETWORK_CONFIG['NEW_ENV_IP']}:8000",
]
```

### 3. Configuration mobile

```typescript
// Ajouter dans NETWORK_CONFIG
NEW_ENV_IP: '10.0.0.100',

// Ajouter dans MOBILE_CONFIG.FALLBACK_IPS
'10.0.0.100',
```

## 🧪 Tests

### Script de test automatique

```bash
python test_network_config.py
```

Ce script teste :
- ✅ Import de la configuration
- ✅ Cohérence des IPs
- ✅ Configuration Django
- ✅ Connectivité API

### Tests manuels

1. **Test Django** : Démarrer le serveur et vérifier les hôtes autorisés
2. **Test Mobile** : Vérifier la connectivité depuis l'app mobile
3. **Test CORS** : Vérifier les requêtes cross-origin

## 🔍 Dépannage

### Problèmes courants

#### 1. IP non accessible

```bash
# Vérifier la connectivité
ping 192.168.1.7
telnet 192.168.1.7 8000

# Vérifier le serveur Django
python manage.py runserver 192.168.1.7:8000
```

#### 2. Erreur CORS

```python
# Vérifier dans settings.py
print(CORS_ALLOWED_ORIGINS)
print(ALLOWED_HOSTS)
```

#### 3. Configuration mobile non synchronisée

```typescript
// Vérifier dans networkConfig.ts
console.log('Current API URL:', getCurrentApiUrl());
console.log('Mobile API URL:', getMobileApiUrl());
```

### Logs de débogage

```python
# Activer les logs de configuration
import logging
logging.basicConfig(level=logging.DEBUG)

# Dans network_config.py
logging.debug(f"Configuration chargée: {NETWORK_CONFIG}")
```

## 📚 Références

### Fichiers de configuration

- `config/network_config.py` - Configuration Python principale
- `BoliBanaStockMobile/src/config/networkConfig.ts` - Configuration mobile
- `bolibanastock/settings.py` - Configuration Django

### Scripts utilitaires

- `test_network_config.py` - Tests de configuration
- `find_server_ip.py` - Découverte automatique d'IP

### Documentation

- `SOLUTION_NETWORK_ERROR_MOBILE.md` - Résolution des erreurs réseau
- `API_CONFIGURATION_TEST.md` - Tests de configuration API

## 🔄 Maintenance

### Mise à jour régulière

1. **Vérifier** la cohérence des IPs tous les mois
2. **Tester** la configuration après chaque modification
3. **Documenter** les changements dans ce README
4. **Sauvegarder** les configurations de production

### Versioning

- **Version actuelle** : 1.0.0
- **Dernière mise à jour** : $(date)
- **Prochaine révision** : Tous les 3 mois

---

## 📞 Support

Pour toute question ou problème de configuration :

1. Consultez ce README
2. Exécutez le script de test
3. Vérifiez les logs Django
4. Contactez l'équipe de développement

**🎯 Objectif : Configuration réseau robuste et maintenable pour BoliBanaStock**
