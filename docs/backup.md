# Documentation du Système de Sauvegarde

## Vue d'ensemble

Le système de sauvegarde de BoliBana Stock est conçu pour assurer la sécurité et la disponibilité des données. Il offre une solution complète de sauvegarde locale avec chiffrement et rotation automatique.

## Fonctionnalités Principales

### 1. Sauvegarde Automatique
- Sauvegarde quotidienne de la base de données
- Sauvegarde des fichiers médias
- Chiffrement des sauvegardes
- Rotation automatique des sauvegardes

### 2. Sécurité
- Chiffrement AES-256 des sauvegardes
- Gestion sécurisée des clés de chiffrement
- Vérification d'intégrité des sauvegardes
- Journalisation des opérations

### 3. Gestion des Sauvegardes
- Conservation configurable (par défaut : 30 jours)
- Compression des sauvegardes
- Organisation par date
- Nettoyage automatique

## Structure des Sauvegardes

```
backups/
├── YYYYMMDD_HHMMSS/
│   ├── db_backup.json    # Sauvegarde de la base de données
│   ├── media/           # Fichiers médias
│   └── metadata.json    # Métadonnées de la sauvegarde
└── logs/
    └── backup.log       # Journal des sauvegardes
```

## Configuration

### Dans settings.py
```python
# Configuration des sauvegardes
BACKUP_ENCRYPTION_KEY = 'votre-clé-secrète'  # À stocker de manière sécurisée
BACKUP_RETENTION_DAYS = 30
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')
BACKUP_SCHEDULE = {
    'daily': '00:00',    # Heure de sauvegarde quotidienne
    'weekly': '00:00',   # Heure de sauvegarde hebdomadaire
    'monthly': '00:00'   # Heure de sauvegarde mensuelle
}
```

## Utilisation

### Sauvegarde Manuelle
```python
from app.core.backup import BackupManager

# Créer une sauvegarde
backup_manager = BackupManager()
success = backup_manager.create_backup()

# Restaurer une sauvegarde
backup_path = 'backups/20240315_120000'
success = backup_manager.restore_backup(backup_path)
```

### Sauvegarde Automatique
```python
# Dans celery.py
from celery import Celery
from celery.schedules import crontab

app = Celery('bolibana_stock')
app.conf.beat_schedule = {
    'daily-backup': {
        'task': 'app.core.backup.create_backup',
        'schedule': crontab(hour=0, minute=0),
    }
}
```

## Maintenance

### Vérification des Sauvegardes
1. **Vérification Quotidienne**
   - Contrôle des logs de sauvegarde
   - Vérification de l'espace disque
   - Test de restauration aléatoire

2. **Vérification Hebdomadaire**
   - Test complet de restauration
   - Vérification de l'intégrité
   - Nettoyage des anciennes sauvegardes

3. **Vérification Mensuelle**
   - Test de restauration complet
   - Vérification des métadonnées
   - Mise à jour de la documentation

### Procédure de Restauration

1. **Restauration Complète**
   ```bash
   # Arrêter le serveur
   python manage.py runserver --stop

   # Restaurer la sauvegarde
   python manage.py restore_backup backups/YYYYMMDD_HHMMSS

   # Redémarrer le serveur
   python manage.py runserver
   ```

2. **Restauration Partielle**
   ```python
   from app.core.backup import BackupManager

   backup_manager = BackupManager()
   # Restaurer uniquement la base de données
   backup_manager.restore_database('backups/YYYYMMDD_HHMMSS/db_backup.json')
   # Restaurer uniquement les médias
   backup_manager.restore_media('backups/YYYYMMDD_HHMMSS/media')
   ```

## Sécurité

### Gestion des Clés
- Stockage sécurisé des clés de chiffrement
- Rotation régulière des clés
- Sauvegarde des clés de récupération

### Bonnes Pratiques
1. **Stockage des Sauvegardes**
   - Sauvegardes sur disque externe
   - Copies multiples
   - Emplacements différents

2. **Sécurité des Données**
   - Chiffrement systématique
   - Vérification d'intégrité
   - Journalisation des accès

3. **Gestion des Accès**
   - Accès restreint aux sauvegardes
   - Authentification requise
   - Journalisation des opérations

## Dépannage

### Problèmes Courants

1. **Erreur de Chiffrement**
   - Vérifier la clé de chiffrement
   - Vérifier les permissions
   - Vérifier l'espace disque

2. **Erreur de Restauration**
   - Vérifier l'intégrité de la sauvegarde
   - Vérifier l'espace disque
   - Vérifier les permissions

3. **Erreur d'Espace Disque**
   - Nettoyer les anciennes sauvegardes
   - Augmenter l'espace disponible
   - Ajuster la rétention

## Monitoring

### Métriques à Surveiller
- Taille des sauvegardes
- Durée des sauvegardes
- Taux de réussite
- Espace disque utilisé

### Alertes
- Échec de sauvegarde
- Espace disque faible
- Erreurs de chiffrement
- Tentatives d'accès non autorisées

## Support

Pour toute question ou problème :
1. Consulter les logs dans `backups/logs/backup.log`
2. Vérifier la documentation
3. Contacter l'équipe de support

## Procédures d'Urgence

### En Cas de Perte de Données
1. Arrêter immédiatement le serveur
2. Identifier la dernière sauvegarde valide
3. Restaurer la sauvegarde
4. Vérifier l'intégrité des données
5. Redémarrer le serveur

### En Cas de Corruption
1. Arrêter le serveur
2. Restaurer la sauvegarde précédente
3. Vérifier les logs d'erreur
4. Analyser la cause de la corruption
5. Mettre en place des mesures préventives 