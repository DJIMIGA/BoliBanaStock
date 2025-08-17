# Guide des Contraintes de Codes-Barres

## Vue d'ensemble

Ce document décrit les contraintes mises en place pour éviter les doublons de codes-barres dans le système BoliBana Stock. Ces contraintes garantissent l'intégrité des données et évitent les conflits lors de la recherche de produits.

## Problème résolu

Avant cette implémentation, il était possible d'avoir :
- Des codes-barres identiques dans différents produits
- Des codes-barres dupliqués dans le même produit
- Des conflits entre le champ `barcode` du produit et les modèles `Barcode`

## Contraintes implémentées

### 1. Unicité globale des codes-barres

**Modèle :** `Barcode`
**Contrainte :** Le champ `ean` est unique au niveau de la base de données
**Avantage :** Empêche la création de codes-barres identiques dans différents produits

```python
class Barcode(models.Model):
    ean = models.CharField(max_length=50, unique=True, verbose_name="Code-barres")
    # ... autres champs
```

### 2. Validation au niveau des modèles

**Modèle :** `Barcode`
**Validation :** Vérification que le code-barres n'existe pas déjà dans un autre produit

```python
def clean(self):
    # Vérifier que le code-barres n'existe pas déjà dans un autre produit
    if self.pk:  # Si c'est une modification
        existing_barcode = Barcode.objects.filter(ean=self.ean).exclude(pk=self.pk).first()
    else:  # Si c'est une création
        existing_barcode = Barcode.objects.filter(ean=self.ean).first()
    
    if existing_barcode:
        raise ValidationError({
            'ean': f'Ce code-barres "{self.ean}" est déjà utilisé par le produit "{existing_barcode.product.name}" (ID: {existing_barcode.product.id})'
        })
```

### 3. Validation croisée avec le champ produit

**Modèle :** `Barcode`
**Validation :** Vérification que le code-barres n'est pas déjà utilisé dans le champ `barcode` d'un autre produit

```python
# Vérifier que le code-barres n'est pas déjà utilisé dans le champ barcode du produit
if self.ean:
    existing_product = Product.objects.filter(barcode=self.ean).exclude(pk=self.product.pk).first()
    if existing_product:
        raise ValidationError({
            'ean': f'Ce code-barres "{self.ean}" est déjà utilisé comme code-barres principal du produit "{existing_product.name}" (ID: {existing_product.id})'
        })
```

### 4. Validation dans le modèle Product

**Modèle :** `Product`
**Validation :** Vérification que le champ `barcode` n'est pas déjà utilisé

```python
def clean(self):
    # Vérifier que le code-barres principal n'est pas déjà utilisé par un autre produit
    if self.barcode:
        existing_product = Product.objects.filter(barcode=self.barcode).exclude(pk=self.pk).first()
        if existing_product:
            raise ValidationError({
                'barcode': f'Ce code-barres "{self.barcode}" est déjà utilisé par le produit "{existing_product.name}" (ID: {existing_product.id})'
            })
        
        # Vérifier que le code-barres n'est pas déjà utilisé dans les modèles Barcode
        existing_barcode = Barcode.objects.filter(ean=self.barcode).exclude(product=self).first()
        if existing_barcode:
            raise ValidationError({
                'barcode': f'Ce code-barres "{self.barcode}" est déjà utilisé par le produit "{existing_barcode.product.name}" (ID: {existing_barcode.product.id})'
            })
```

### 5. Validation dans l'API

**Vues API :** Toutes les méthodes de gestion des codes-barres incluent des vérifications supplémentaires

```python
# Vérifier que le code-barres n'est pas déjà utilisé par un autre produit
existing_barcode = Barcode.objects.filter(ean=ean).exclude(product=product).first()
if existing_barcode:
    return Response({
        'error': f'Ce code-barres "{ean}" est déjà utilisé par le produit "{existing_barcode.product.name}" (ID: {existing_barcode.product.id})'
    }, status=status.HTTP_400_BAD_REQUEST)

# Vérifier que le code-barres n'est pas déjà utilisé dans le champ barcode d'un autre produit
existing_product = Product.objects.filter(barcode=ean).exclude(pk=product.pk).first()
if existing_product:
    return Response({
        'error': f'Ce code-barres "{ean}" est déjà utilisé comme code-barres principal du produit "{existing_product.name}" (ID: {existing_product.id})'
    }, status=status.HTTP_400_BAD_REQUEST)
```

## Cas d'usage couverts

### ✅ Cas autorisés
- Créer un code-barres unique pour un produit
- Modifier un code-barres existant (même produit)
- Supprimer un code-barres
- Changer le code-barres principal d'un produit

### ❌ Cas bloqués
- Créer un code-barres avec un EAN déjà existant
- Utiliser le même code-barres dans différents produits
- Avoir des codes-barres dupliqués dans le même produit
- Conflit entre le champ `barcode` du produit et les modèles `Barcode`

## Messages d'erreur

### Erreur de doublon global
```
Ce code-barres "1234567890123" est déjà utilisé par le produit "Nom du produit" (ID: 123)
```

### Erreur de doublon dans le champ produit
```
Ce code-barres "1234567890123" est déjà utilisé comme code-barres principal du produit "Nom du produit" (ID: 123)
```

### Erreur de code-barres principal multiple
```
Un code-barres principal existe déjà pour ce produit.
```

## Migration appliquée

**Fichier :** `0018_alter_barcode_unique_together_alter_barcode_ean.py`
**Changements :**
- Suppression de `unique_together = ('product', 'ean')`
- Ajout de `unique=True` sur le champ `ean`

## Tests

Un script de test complet est disponible : `test_barcode_constraints.py`

Ce script teste :
1. ✅ Création de codes-barres uniques
2. ✅ Prévention des doublons dans le même produit
3. ✅ Prévention des doublons globaux
4. ✅ Prévention des conflits avec le champ `barcode` du produit
5. ✅ Prévention des codes-barres principaux multiples
6. ✅ Vérification de l'unicité globale

## Avantages

1. **Intégrité des données** : Garantit qu'aucun code-barres n'est dupliqué
2. **Recherche fiable** : Évite les ambiguïtés lors de la recherche par code-barres
3. **Gestion des erreurs** : Messages d'erreur clairs et informatifs
4. **Validation multi-niveaux** : Contraintes au niveau base de données + validation Django + validation API
5. **Compatibilité** : Fonctionne avec l'ancien système (champ `barcode` du produit) et le nouveau (modèles `Barcode`)

## Maintenance

### Ajout de nouveaux codes-barres
- Utiliser l'API `/api/v1/products/{id}/add_barcode/`
- Les contraintes sont automatiquement vérifiées

### Modification de codes-barres
- Utiliser l'API `/api/v1/products/{id}/update_barcode/`
- Les contraintes sont vérifiées avant la modification

### Suppression de codes-barres
- Utiliser l'API `/api/v1/products/{id}/remove_barcode/`
- Aucune contrainte à vérifier

## Dépannage

### Erreur de contrainte unique
Si vous obtenez une erreur de contrainte unique lors de la migration :
1. Vérifiez qu'il n'y a pas de codes-barres dupliqués dans la base
2. Nettoyez les doublons existants
3. Relancez la migration

### Erreur de validation
Si vous obtenez des erreurs de validation :
1. Vérifiez que le code-barres n'existe pas déjà
2. Consultez les messages d'erreur pour identifier le conflit
3. Utilisez un code-barres unique

## Conclusion

Ces contraintes garantissent l'intégrité des données de codes-barres dans le système BoliBana Stock. Elles empêchent les doublons et les conflits, assurant une recherche fiable et une gestion cohérente des produits.
