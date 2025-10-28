# Tests des Endpoints de Gestion de Stock

Ce dossier contient des scripts pour tester les endpoints de gestion de stock de l'API Django.

## 📁 Fichiers

- `test_stock_endpoints.py` - Script de test complet avec tous les endpoints
- `quick_stock_test.py` - Script de test rapide et simple
- `test_stock_server.sh` - Script bash pour démarrer le serveur et exécuter les tests
- `test_stock_server.ps1` - Script PowerShell pour Windows

## 🚀 Utilisation

### Option 1 : Test rapide (recommandé)

```bash
# Démarrer le serveur Django
python manage.py runserver 8000

# Dans un autre terminal, exécuter le test rapide
python quick_stock_test.py
```

### Option 2 : Test complet

```bash
# Démarrer le serveur Django
python manage.py runserver 8000

# Dans un autre terminal, exécuter le test complet
python test_stock_endpoints.py
```

### Option 3 : Script automatique (Linux/Mac)

```bash
chmod +x test_stock_server.sh
./test_stock_server.sh
```

### Option 4 : Script automatique (Windows)

```powershell
.\test_stock_server.ps1
```

## 🧪 Tests effectués

### Test rapide (`quick_stock_test.py`)
- ✅ Authentification JWT
- ✅ `POST /products/{id}/add_stock/` - Ajouter du stock
- ✅ `POST /products/{id}/remove_stock/` - Retirer du stock
- ✅ Vérification des transactions créées

### Test complet (`test_stock_endpoints.py`)
- ✅ Configuration de l'environnement de test
- ✅ Authentification JWT
- ✅ `POST /products/{id}/add_stock/` - Ajouter du stock
- ✅ `POST /products/{id}/remove_stock/` - Retirer du stock
- ✅ `POST /products/{id}/adjust_stock/` - Ajuster le stock
- ✅ `POST /products/{id}/remove_stock/` avec `sale_id` - Retrait lié à une vente
- ✅ Vérification des transactions créées
- ✅ Vérification des liens avec les ventes

## 📊 Résultats attendus

### Succès
```
🧪 Test rapide des endpoints de stock
==================================================
✅ Utilisateur: admin
✅ Produit: Produit Test (Stock: 100)

🔐 Authentification...
✅ Authentification réussie

📦 Test add_stock...
Status: 200
✅ Succès: 5 unités ajoutées au stock
Stock: 100 -> 105

📤 Test remove_stock...
Status: 200
✅ Succès: 3 unités retirées du stock
Stock: 105 -> 102

📋 Vérification des transactions...
✅ 2 transactions trouvées:
  1. out - 3 unités - Test rapide - retrait
  2. in - 5 unités - Test rapide - ajout

🎉 Test rapide réussi !
```

### Échec
```
❌ Erreur d'authentification: 401
❌ Erreur: 404
❌ Le serveur Django ne répond pas
```

## 🔧 Prérequis

- Python 3.7+
- Django
- Serveur Django démarré sur `localhost:8000`
- Utilisateur avec permissions staff
- Au moins un produit dans la base de données

## 🐛 Dépannage

### Erreur d'authentification
- Vérifiez que l'utilisateur existe et a les bonnes permissions
- Vérifiez le mot de passe dans le script
- Vérifiez que l'endpoint `/auth/login/` fonctionne

### Erreur 404
- Vérifiez que les endpoints sont correctement configurés dans `urls.py`
- Vérifiez que le produit existe dans la base de données
- Vérifiez que le serveur Django est démarré

### Erreur de connexion
- Vérifiez que le serveur Django est démarré sur `localhost:8000`
- Vérifiez que le port 8000 n'est pas utilisé par un autre processus
- Vérifiez les paramètres de sécurité Django

## 📝 Notes

- Les scripts créent des données de test temporaires
- Les transactions sont créées en base de données
- Les tests modifient le stock des produits existants
- Utilisez un environnement de test séparé pour éviter les conflits
