# Documentation du Système de Stockage

## Vue d'ensemble

Le système de stockage optimisé est conçu pour gérer efficacement les fichiers dans l'application BoliBana Stock. Il offre une solution locale robuste avec des fonctionnalités d'optimisation et de gestion d'espace.

## Structure des Dossiers

```
media/
├── products/     # Images des produits
├── documents/    # Documents (PDF, Excel, etc.)
├── backups/      # Sauvegardes
└── temp/         # Fichiers temporaires
```

## Fonctionnalités Principales

### 1. Optimisation des Images
- Compression automatique
- Redimensionnement des images trop grandes (max 800x800)
- Conversion des images PNG en JPEG pour réduire la taille
- Qualité d'image optimisée (85%)

### 2. Gestion des Fichiers
- Organisation automatique par type de fichier
- Noms de fichiers uniques
- Nettoyage automatique des fichiers temporaires
- Quotas par utilisateur

### 3. Types de Fichiers Supportés

#### Images
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

#### Documents
- PDF (.pdf)
- Word (.doc, .docx)
- Excel (.xls, .xlsx)

## Configuration

### Dans settings.py
```python
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'
DEFAULT_FILE_STORAGE = 'app.core.storage.OptimizedFileStorage'

# Limites de taille
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB

# Types de fichiers autorisés
ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif'
]

ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
```

## Utilisation

### Dans les modèles
```python
from django.db import models
from app.core.storage import storage

class Product(models.Model):
    image = models.ImageField(
        upload_to='products/',
        storage=storage,
        max_length=255
    )
```

### Dans les vues
```python
from django.core.files.storage import default_storage

def upload_file(request):
    if request.method == 'POST':
        file = request.FILES['file']
        filename = default_storage.save(file.name, file)
        return filename
```

## Maintenance

### Nettoyage Automatique
Le système effectue automatiquement :
- Nettoyage des fichiers temporaires
- Optimisation des images
- Gestion des quotas

### Surveillance
- Vérification de l'espace disque
- Alertes en cas de dépassement de quota
- Logs des opérations importantes

## Bonnes Pratiques

1. **Gestion des Images**
   - Utiliser des formats optimisés (JPEG pour les photos, PNG pour les graphiques)
   - Compresser les images avant l'upload
   - Respecter les dimensions recommandées

2. **Gestion des Documents**
   - Préférer les formats PDF pour les documents
   - Compresser les documents volumineux
   - Nommer les fichiers de manière descriptive

3. **Sécurité**
   - Valider les types de fichiers
   - Vérifier les tailles de fichiers
   - Utiliser des noms de fichiers sécurisés

## Dépannage

### Problèmes Courants

1. **Erreur de quota dépassé**
   - Vérifier l'espace utilisé par l'utilisateur
   - Nettoyer les fichiers inutiles
   - Augmenter le quota si nécessaire

2. **Erreur de type de fichier**
   - Vérifier le type MIME du fichier
   - S'assurer que le format est supporté
   - Convertir le fichier si nécessaire

3. **Erreur d'espace disque**
   - Vérifier l'espace disponible
   - Nettoyer les fichiers temporaires
   - Archiver les anciens fichiers

## Maintenance Préventive

1. **Surveillance Quotidienne**
   - Vérifier les logs d'erreurs
   - Surveiller l'espace disque
   - Vérifier les quotas utilisateurs

2. **Maintenance Hebdomadaire**
   - Nettoyage des fichiers temporaires
   - Vérification des sauvegardes
   - Optimisation de la base de données

3. **Maintenance Mensuelle**
   - Archivage des anciens fichiers
   - Révision des quotas
   - Mise à jour de la documentation

## Contact et Support

Pour toute question ou problème concernant le système de stockage, contactez :
- L'administrateur système
- L'équipe de développement
- Le support technique 