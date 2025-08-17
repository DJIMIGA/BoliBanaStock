# Guide d'Installation du Système de Sauvegarde

## Prérequis

- Python 3.8 ou supérieur
- Django 4.2 ou supérieur
- Espace disque suffisant (minimum recommandé : 20 GB)
- Accès root/sudo pour les tâches planifiées

## Installation Rapide

1. **Installation des dépendances**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configuration initiale**
   ```bash
   # Créer les dossiers nécessaires
   mkdir -p backups/logs
   chmod 700 backups
   ```

3. **Génération de la clé de chiffrement**
   ```python
   from cryptography.fernet import Fernet
   key = Fernet.generate_key()
   print(f"Clé de chiffrement : {key.decode()}")
   ```

4. **Configuration dans settings.py**
   ```python
   # Configuration des sauvegardes
   BACKUP_ENCRYPTION_KEY = 'votre-clé-générée'
   BACKUP_RETENTION_DAYS = 30
   BACKUP_DIR = os.path.join(BASE_DIR, 'backups')
   ```

5. **Configuration de Celery**
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

## Test de l'Installation

1. **Test de sauvegarde manuelle**
   ```python
   from app.core.backup import BackupManager

   backup_manager = BackupManager()
   success = backup_manager.create_backup()
   print(f"Sauvegarde créée : {success}")
   ```

2. **Vérification de la sauvegarde**
   ```bash
   ls -la backups/
   ```

3. **Test de restauration**
   ```python
   # Restaurer la dernière sauvegarde
   backup_manager.restore_backup('backups/latest')
   ```

## Configuration des Tâches Planifiées

### Sur Linux (crontab)
```bash
# Éditer le crontab
crontab -e

# Ajouter la ligne suivante
0 0 * * * /chemin/vers/python /chemin/vers/manage.py backup
```

### Sur Windows (Task Scheduler)
1. Ouvrir le Planificateur de tâches
2. Créer une tâche basique
3. Définir le déclencheur quotidien à minuit
4. Action : Démarrer un programme
   - Programme : python
   - Arguments : manage.py backup

## Vérification

1. **Vérifier les logs**
   ```bash
   tail -f backups/logs/backup.log
   ```

2. **Vérifier l'espace disque**
   ```bash
   df -h
   ```

3. **Vérifier les permissions**
   ```bash
   ls -la backups/
   ```

## Dépannage

### Problèmes Courants

1. **Erreur de permissions**
   ```bash
   sudo chown -R $USER:$USER backups/
   chmod -R 700 backups/
   ```

2. **Erreur de clé de chiffrement**
   - Vérifier que la clé est correctement configurée
   - Régénérer une nouvelle clé si nécessaire

3. **Erreur d'espace disque**
   - Nettoyer les anciennes sauvegardes
   - Augmenter l'espace disponible

## Sécurité

1. **Protection des clés**
   - Stocker la clé de chiffrement de manière sécurisée
   - Ne pas la commiter dans le code
   - Utiliser des variables d'environnement

2. **Protection des sauvegardes**
   - Limiter l'accès au dossier de sauvegardes
   - Chiffrer les sauvegardes
   - Stocker des copies externes

## Support

Pour toute question ou problème :
1. Consulter la documentation complète dans `docs/backup.md`
2. Vérifier les logs dans `backups/logs/backup.log`
3. Contacter l'équipe de support 