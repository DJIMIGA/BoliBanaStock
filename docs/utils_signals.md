# Documentation des Utilitaires et Signaux

## Utilitaires (app/core/utils.py)

### Cache
```python
@cache_result(timeout=300)  # Cache pour 5 minutes
def ma_fonction():
    # Votre code ici
    pass
```

### Archivage
```python
# Archiver les anciens enregistrements
archive_old_records(MonModele, 'date_field', days_threshold=365)
```

### Nettoyage
```python
# Nettoyer les fichiers temporaires
cleanup_temporary_files(settings.MEDIA_ROOT, max_age_days=7)
```

## Signaux (app/core/signals.py)

### Gestion des Fichiers
```python
@receiver(post_delete, sender=MonModele)
def supprimer_fichier(sender, instance, **kwargs):
    if instance.fichier:
        instance.fichier.delete(save=False)
```

### Historique des Modifications
```python
@receiver(post_save, sender=MonModele)
def enregistrer_historique(sender, instance, created, **kwargs):
    if created:
        # Action pour nouvelle instance
        pass
    else:
        # Action pour modification
        pass
```

### Nettoyage Automatique
```python
@receiver(post_save, sender=MonModele)
def nettoyer_anciens_fichiers(sender, instance, **kwargs):
    # Nettoyage automatique
    pass
```

## Utilisation Courante

### 1. Cache
- Mise en cache des requêtes fréquentes
- Optimisation des performances
- Réduction de la charge serveur

### 2. Archivage
- Gestion automatique des données anciennes
- Optimisation de l'espace
- Conservation de l'historique

### 3. Nettoyage
- Suppression des fichiers temporaires
- Gestion de l'espace disque
- Maintenance automatique

### 4. Signaux
- Réactions automatiques aux événements
- Gestion des fichiers
- Historique des modifications

## Bonnes Pratiques

1. **Cache**
   - Utiliser des timeouts appropriés
   - Invalider le cache au besoin
   - Éviter le cache pour les données sensibles

2. **Archivage**
   - Définir des seuils appropriés
   - Vérifier l'intégrité des archives
   - Maintenir un historique accessible

3. **Nettoyage**
   - Programmer aux heures creuses
   - Vérifier avant suppression
   - Logger les opérations

4. **Signaux**
   - Éviter les signaux trop lourds
   - Gérer les exceptions
   - Documenter les effets de bord

## Exemples d'Utilisation

### Cache avec Paramètres
```python
@cache_result(timeout=300)
def get_product_stats(product_id, date_range):
    # Statistiques du produit
    return stats
```

### Archivage avec Filtres
```python
def archive_specific_records(model, filters, days):
    # Archivage personnalisé
    pass
```

### Signal avec Validation
```python
@receiver(pre_save, sender=MonModele)
def valider_donnees(sender, instance, **kwargs):
    # Validation avant sauvegarde
    if not instance.is_valid():
        raise ValidationError("Données invalides")
```

## Dépannage

### Problèmes Courants

1. **Cache**
   - Données périmées
   - Cache trop volumineux
   - Invalidation incorrecte

2. **Archivage**
   - Données manquantes
   - Espace insuffisant
   - Erreurs de permission

3. **Nettoyage**
   - Fichiers non supprimés
   - Erreurs de permission
   - Espace toujours insuffisant

4. **Signaux**
   - Boucles infinies
   - Performances dégradées
   - Effets de bord non désirés

## Support

Pour toute question ou problème :
1. Consulter les logs
2. Vérifier la documentation
3. Contacter l'équipe de support 