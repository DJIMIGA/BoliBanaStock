# 🚀 Nouvelle Structure S3 pour BoliBana Stock

## 📋 Vue d'ensemble

La structure S3 de BoliBana Stock a été entièrement réorganisée pour une meilleure organisation, maintenance et scalabilité.

### 🔄 Changements principaux

**Ancienne structure (à éviter) :**
```
bolibana-stock/
├── media/
│   └── sites/
│       ├── 17/
│       │   └── products/
│       └── default/
│           └── products/
```

**Nouvelle structure (recommandée) :**
```
bolibana-stock/
├── assets/                    # Tous les assets organisés par type
│   ├── products/             # Images des produits
│   │   ├── site-17/          # Par site avec préfixe clair
│   │   ├── site-18/
│   │   └── site-default/
│   ├── logos/                # Logos des sites
│   │   ├── site-17/
│   │   ├── site-18/
│   │   └── site-default/
│   ├── documents/            # Documents divers
│   │   ├── invoices/         # Factures
│   │   ├── reports/          # Rapports
│   │   └── general/          # Documents généraux
│   └── backups/              # Sauvegardes
│       ├── daily/            # Sauvegardes quotidiennes
│       ├── weekly/           # Sauvegardes hebdomadaires
│       └── monthly/          # Sauvegardes mensuelles
├── static/                    # Fichiers statiques
└── temp/                      # Fichiers temporaires par site
    ├── site-17/
    ├── site-18/
    └── site-default/
```

## 🏗️ Architecture des Classes de Stockage

### 1. Classe de Base : `BaseS3Storage`
```python
class BaseS3Storage(S3Boto3Storage):
    """Classe de base pour tous les stockages S3 avec configuration commune"""
    # Configuration S3 commune à tous les stockages
```

### 2. Stockage Spécialisé : `ProductImageStorage`
```python
# Pour les images de produits
storage = ProductImageStorage(site_id='17')
# Résultat: assets/products/site-17/
```

### 3. Stockage Spécialisé : `SiteLogoStorage`
```python
# Pour les logos de sites
storage = SiteLogoStorage(site_id='17')
# Résultat: assets/logos/site-17/
```

### 4. Stockage pour Documents : `DocumentStorage`
```python
# Pour les documents généraux
storage = DocumentStorage(document_type='invoices')
# Résultat: assets/documents/invoices/

# Pour les factures (spécialisé)
storage = InvoiceStorage()
# Résultat: assets/documents/invoices/

# Pour les rapports (spécialisé)
storage = ReportStorage()
# Résultat: assets/documents/reports/
```

### 5. Stockage pour Sauvegardes : `BackupStorage`
```python
# Pour les sauvegardes
storage = BackupStorage(backup_type='daily')
# Résultat: assets/backups/daily/
```

### 6. Stockage Temporaire : `TempStorage`
```python
# Pour les fichiers temporaires
storage = TempStorage(site_id='17')
# Résultat: temp/site-17/
```

## 🔧 Utilisation Pratique

### 1. Utilisation Directe des Classes
```python
from bolibanastock.storage_backends import ProductImageStorage

# Créer un stockage pour un site spécifique
storage = ProductImageStorage(site_id='17')

# Upload d'une image
with open('product_image.jpg', 'rb') as f:
    storage.save('product_image.jpg', f)
```

### 2. Utilisation via Factory Functions
```python
from bolibanastock.storage_backends import get_site_storage

# Stockage automatique selon le type
product_storage = get_site_storage('17', 'product')
logo_storage = get_site_storage('17', 'logo')
temp_storage = get_site_storage('17', 'temp')
invoice_storage = get_site_storage('17', 'invoice')
```

### 3. Stockage Dynamique selon le Contexte
```python
from bolibanastock.storage_backends import get_current_site_storage

# Dans une vue Django
def upload_product_image(request):
    storage = get_current_site_storage(request, 'product')
    # Le stockage sera automatiquement configuré pour le site de l'utilisateur
```

## 🛠️ Utilitaires Disponibles

### 1. Génération de Préfixes de Chemins
```python
from bolibanastock.storage_backends import get_s3_path_prefix

# Générer le préfixe pour les produits d'un site
prefix = get_s3_path_prefix('17', 'products')
# Résultat: 'assets/products/site-17/'

# Générer le préfixe pour les logos d'un site
prefix = get_s3_path_prefix('17', 'logos')
# Résultat: 'assets/logos/site-17/'
```

### 2. Nettoyage des Chemins
```python
from bolibanastock.storage_backends import clean_s3_path

# Nettoyer un chemin S3
clean_path = clean_s3_path('//assets//products//site-17//image.jpg')
# Résultat: 'assets/products/site-17/image.jpg'
```

## 📊 Migration depuis l'Ancienne Structure

### 1. Script de Migration Automatique
```bash
# Exécuter le script de migration
python migrate_s3_structure.py
```

Ce script va :
- Créer la nouvelle structure de dossiers
- Migrer tous les fichiers existants
- Mettre à jour la base de données
- Nettoyer l'ancienne structure

### 2. Migration Manuelle (si nécessaire)
```python
# 1. Créer la nouvelle structure
# 2. Copier les fichiers
# 3. Mettre à jour la base de données
# 4. Supprimer l'ancienne structure
```

## 🧪 Tests et Validation

### 1. Test de la Structure
```bash
# Exécuter les tests de validation
python test_new_s3_structure.py
```

### 2. Vérifications Manuelles
- ✅ Structure des dossiers créée
- ✅ Fichiers migrés correctement
- ✅ Base de données mise à jour
- ✅ Nouveaux uploads fonctionnent

## 🔒 Sécurité et Permissions

### 1. Permissions S3
- **Produits** : Accès authentifié (querystring_auth=True)
- **Logos** : Accès authentifié (querystring_auth=True)
- **Documents** : Accès authentifié (querystring_auth=True)
- **Statiques** : Accès public (querystring_auth=False)

### 2. Isolation par Site
- Chaque site a ses propres dossiers
- Pas de mélange entre les données des sites
- Séparation claire des responsabilités

## 📈 Avantages de la Nouvelle Structure

### 1. **Organisation Claire**
- Séparation logique par type de contenu
- Préfixes explicites pour chaque site
- Structure facile à comprendre et maintenir

### 2. **Scalabilité**
- Facile d'ajouter de nouveaux types de contenu
- Structure extensible pour de futurs besoins
- Gestion efficace des gros volumes

### 3. **Maintenance**
- Logs et sauvegardes organisés
- Fichiers temporaires isolés
- Nettoyage automatique possible

### 4. **Performance**
- Optimisation des requêtes S3
- Cache plus efficace
- Meilleure organisation des objets

## 🚨 Points d'Attention

### 1. **Migration**
- Toujours faire une sauvegarde avant migration
- Tester en environnement de développement
- Vérifier que tous les fichiers sont migrés

### 2. **Compatibilité**
- Les anciens chemins ne fonctionneront plus
- Mettre à jour tous les liens existants
- Vérifier les applications mobiles

### 3. **Monitoring**
- Surveiller l'espace utilisé
- Vérifier les permissions
- Monitorer les performances

## 🔄 Mise à Jour du Code

### 1. Dans les Modèles Django
```python
# Avant (ancienne structure)
image.name = f'sites/{site_id}/products/{filename}'

# Après (nouvelle structure)
image.name = f'assets/products/site-{site_id}/{filename}'
```

### 2. Dans les Vues
```python
# Utiliser les nouvelles classes de stockage
storage = get_site_storage(site_id, 'product')
```

### 3. Dans les Templates
```python
# Les URLs seront automatiquement mises à jour
# Pas de changement nécessaire dans les templates
```

## 📞 Support et Assistance

### 1. **En cas de Problème**
- Vérifier les logs de migration
- Contrôler la configuration S3
- Tester la connectivité

### 2. **Questions Fréquentes**
- **Q** : Puis-je revenir à l'ancienne structure ?
- **R** : Oui, mais il faudra migrer à nouveau tous les fichiers

- **Q** : Les anciens liens continuent-ils de fonctionner ?
- **R** : Non, ils doivent être mis à jour ou redirigés

- **Q** : Combien de temps dure la migration ?
- **R** : Cela dépend du nombre de fichiers, généralement quelques minutes

## 🎯 Prochaines Étapes

1. **Tester la migration** en environnement de développement
2. **Valider la nouvelle structure** avec les tests
3. **Planifier la migration** en production
4. **Former l'équipe** aux nouvelles pratiques
5. **Monitorer** l'utilisation et les performances

---

*Cette documentation sera mise à jour au fur et à mesure de l'évolution de la structure S3.*
