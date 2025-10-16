# 🔧 Correction des Catégories Niveau 0 - Documentation

## 📋 Résumé

Cette documentation décrit la correction du problème de modification des catégories niveau 0 (catégories globales personnalisées) qui ne pouvaient pas être modifiées à cause d'une validation serveur incorrecte.

## 🐛 Problème Identifié

### Symptômes
- Erreur 400 lors de la modification des catégories niveau 0
- Message d'erreur : "Une sous-catégorie doit avoir une catégorie parente"
- Problème spécifique avec les catégories globales personnalisées (`is_global=True`, `is_rayon=False`)

### Cause Racine
1. **Validation serveur obsolète** : Le serveur Railway utilise encore l'ancienne validation qui exige un parent pour toutes les catégories non-rayons
2. **Logique métier incorrecte** : Les catégories globales personnalisées devraient pouvoir exister sans parent selon la documentation

## 📊 Types de Catégories et Niveaux

### Structure Hiérarchique

#### Niveau 0 - Rayons Principaux
- **Rayons globaux** (`is_global=True`, `is_rayon=True`) : "Boucherie", "Épicerie", "Frais Libre Service"
- **Catégories globales personnalisées** (`is_global=True`, `is_rayon=False`) : "Promotions", "Nouveautés", "Produits Bio"

#### Niveau 1 - Sous-catégories
- **Catégories spécifiques au site** (`is_global=False`, `is_rayon=False`) : Doivent avoir un parent (rayon)

### Règles de Validation Correctes

```python
# Si c'est un rayon principal, il ne peut pas avoir de parent
if is_rayon and parent:
    raise ValidationError("Un rayon principal ne peut pas avoir de catégorie parente.")

# Si ce n'est pas un rayon principal ET ce n'est pas une catégorie globale, il doit avoir un parent
# Les catégories globales personnalisées (is_global=True, is_rayon=False) peuvent exister sans parent
if not is_rayon and not is_global and not parent:
    raise ValidationError("Une sous-catégorie doit avoir une catégorie parente.")
```

## ✅ Solutions Implémentées

### 1. Correction Serveur (Déployée Localement)

#### Fichier : `api/serializers.py`
```python
def validate(self, data):
    """Validation personnalisée pour les catégories"""
    is_rayon = data.get('is_rayon', False)
    is_global = data.get('is_global', False)
    rayon_type = data.get('rayon_type')
    parent = data.get('parent')
    
    # Si c'est un rayon principal, le type de rayon est obligatoire
    if is_rayon and not rayon_type:
        raise serializers.ValidationError({
            'rayon_type': 'Le type de rayon est obligatoire pour un rayon principal.'
        })
    
    # Si c'est un rayon principal, il ne peut pas avoir de parent
    if is_rayon and parent:
        raise serializers.ValidationError({
            'parent': 'Un rayon principal ne peut pas avoir de catégorie parente.'
        })
    
    # Si ce n'est pas un rayon principal ET ce n'est pas une catégorie globale, il doit avoir un parent
    # Les catégories globales personnalisées (is_global=True, is_rayon=False) peuvent exister sans parent
    if not is_rayon and not is_global and not parent:
        raise serializers.ValidationError({
            'parent': 'Une sous-catégorie doit avoir une catégorie parente.'
        })
    
    return data
```

#### Fichier : `apps/inventory/forms.py`
Même correction appliquée au formulaire Django.

### 2. Solution Temporaire Client (Déployée)

#### Fichier : `BoliBanaStockMobile/src/components/CategoryEditModal.tsx`
```typescript
// Solution temporaire : si c'est une catégorie globale personnalisée, 
// s'assurer que le parent est null pour éviter l'erreur de validation serveur
if (isGlobal && !(category as any).is_rayon) {
  console.log('🔧 Solution temporaire: catégorie globale personnalisée, parent forcé à null');
  updateData.parent = null;
}
```

### 3. Récupération des Données Complètes

#### Fichier : `BoliBanaStockMobile/src/screens/CategoriesScreen.tsx`
```typescript
const handleEditCategory = async (category: Category) => {
  try {
    console.log('🔍 handleEditCategory - Récupération des données complètes pour:', category.id);
    
    // Récupérer les données complètes de la catégorie depuis l'API
    const fullCategoryData = await categoryService.getCategory(category.id);
    
    console.log('🔍 handleEditCategory - Données complètes récupérées:', fullCategoryData);
    
    setSelectedCategoryForEdit(fullCategoryData);
    setEditCategoryModalVisible(true);
  } catch (error) {
    console.error('❌ Erreur récupération données catégorie:', error);
    // En cas d'erreur, utiliser les données partielles
    setSelectedCategoryForEdit(category);
    setEditCategoryModalVisible(true);
  }
};
```

## 🚀 Déploiement

### État Actuel
- ✅ **Correction serveur** : Implémentée localement, prête pour déploiement
- ✅ **Solution temporaire client** : Déployée et fonctionnelle
- ✅ **Récupération données complètes** : Déployée et fonctionnelle

### Étapes de Déploiement
1. **Déployer les modifications serveur** sur Railway
2. **Tester la modification** des catégories niveau 0
3. **Supprimer la solution temporaire** côté client une fois le serveur déployé

### Tests de Validation

#### Test 1 : Catégorie Globale Personnalisée (doit réussir)
```json
{
  "name": "Promotions",
  "is_global": true,
  "is_rayon": false,
  "parent": null
}
```
**Résultat attendu** : ✅ Succès

#### Test 2 : Rayon Global (doit réussir)
```json
{
  "name": "Épicerie",
  "is_global": true,
  "is_rayon": true,
  "rayon_type": "epicerie",
  "parent": null
}
```
**Résultat attendu** : ✅ Succès

#### Test 3 : Sous-catégorie sans Parent (doit échouer)
```json
{
  "name": "Produits Locaux",
  "is_global": false,
  "is_rayon": false,
  "parent": null
}
```
**Résultat attendu** : ❌ Erreur - "Une sous-catégorie doit avoir une catégorie parente"

## 📝 Fichiers Modifiés

### Serveur
1. **`api/serializers.py`** - Validation du serializer API
2. **`apps/inventory/forms.py`** - Validation du formulaire Django
3. **`api/views.py`** - Logs de débogage

### Client
1. **`BoliBanaStockMobile/src/components/CategoryEditModal.tsx`** - Solution temporaire et logs
2. **`BoliBanaStockMobile/src/screens/CategoriesScreen.tsx`** - Récupération données complètes

## 🔍 Monitoring

### Logs à Surveiller
- **Côté client** : Logs de récupération des données complètes
- **Côté serveur** : Logs de validation et de récupération des catégories
- **Erreurs 400** : Vérifier que les catégories globales ne génèrent plus d'erreurs

### Métriques de Succès
- ✅ Modification des catégories niveau 0 sans erreur 400
- ✅ Présélection correcte du parent pour les sous-catégories
- ✅ Affichage correct des dates dans le modal

## 📚 Références

- [Documentation Catégories et Rayons](./DOCUMENTATION_CATEGORIES_RAYONS.md)
- [Correction de Validation des Catégories](./CATEGORY_VALIDATION_FIX.md)
- [API Documentation](./api/README.md)

---

**Date de la correction** : 2025-01-08  
**Version** : 1.0  
**Statut** : ✅ Solution temporaire déployée, correction serveur prête pour déploiement
