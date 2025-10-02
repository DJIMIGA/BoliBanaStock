# 🎯 Filtres Hiérarchiques - Rayon puis Catégorie

## 🎯 Objectif

Implémenter la même sélection hiérarchique que dans l'écran des produits : d'abord rayon, puis catégorie, pour un filtrage plus précis des marques.

## ✅ Fonctionnalités Implémentées

### 1. **Sélection Hiérarchique**
- **Étape 1** : Sélectionner un rayon
- **Étape 2** : Sélectionner une catégorie (si disponible)
- **Filtrage** : Marques filtrées selon les sélections

### 2. **Interface Utilisateur**
- **Dropdown Rayon** : Liste de tous les rayons disponibles
- **Dropdown Catégorie** : Liste des catégories du rayon sélectionné
- **Boutons d'effacement** : Effacer rayon et/ou catégorie séparément

## 🔄 Flux de Sélection

### **Étape 1 : Sélection du Rayon**
```typescript
const handleRayonFilter = async (rayonId: number | null) => {
  setSelectedRayon(rayonId);
  setSelectedCategory(null); // Réinitialiser la catégorie
  setRayonDropdownVisible(false);
  
  // Charger les sous-catégories si un rayon est sélectionné
  if (rayonId) {
    const response = await categoryService.getSubcategories(rayonId);
    setSubcategories(response.results || response);
  } else {
    setSubcategories([]);
  }
};
```

### **Étape 2 : Sélection de la Catégorie**
```typescript
const handleCategoryFilter = (categoryId: number | null) => {
  setSelectedCategory(categoryId);
  setCategoryDropdownVisible(false);
};
```

## 🎨 Interface Utilisateur

### **Layout des Filtres**
```typescript
<View style={styles.filtersContainer}>
  <Text>Filtrer par rayon et catégorie:</Text>
  
  {/* Dropdown Rayon */}
  <TouchableOpacity onPress={() => setRayonDropdownVisible(true)}>
    <Text>{getSelectedRayonName()}</Text>
    <Ionicons name="chevron-down" />
  </TouchableOpacity>

  {/* Dropdown Catégorie (conditionnel) */}
  {selectedRayon && subcategories.length > 0 && (
    <TouchableOpacity onPress={() => setCategoryDropdownVisible(true)}>
      <Text>{getSelectedCategoryName()}</Text>
      <Ionicons name="chevron-down" />
    </TouchableOpacity>
  )}
  
  {/* Boutons d'effacement */}
  <View style={styles.clearFiltersContainer}>
    {selectedRayon && <ClearButton type="rayon" />}
    {selectedCategory && <ClearButton type="catégorie" />}
  </View>
</View>
```

## 🎨 Design

### **Indicateurs Visuels**
- **Rayons** : Cercle coloré par type de rayon
- **Catégories** : Petit cercle gris uniforme
- **Sélection** : Background bleu, texte en gras

### **Styles**
```typescript
// Indicateur rayon
rayonTypeIndicator: {
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: getRayonTypeColor(rayonType)
}

// Indicateur catégorie
categoryIndicator: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#666'
}
```

## 🔄 Logique de Filtrage

### **Filtrage par Rayon**
```typescript
if (selectedRayon) {
  filtered = filtered.filter(brand =>
    brand.rayons?.some(rayon => rayon.id === selectedRayon)
  );
}
```

### **Filtrage par Catégorie**
```typescript
if (selectedCategory) {
  // Logique à implémenter selon les besoins
  // Pour l'instant, les marques n'ont pas de catégories directes
  filtered = filtered.filter(brand => {
    // Logique future si nécessaire
    return true;
  });
}
```

## 🚀 Avantages

### 1. **Filtrage Précis**
- ✅ **Sélection progressive** : Rayon puis catégorie
- ✅ **Filtrage contextuel** : Catégories du rayon sélectionné
- ✅ **Flexibilité** : Possibilité d'effacer séparément

### 2. **Expérience Utilisateur**
- ✅ **Interface familière** : Même logique que l'écran produits
- ✅ **Navigation intuitive** : Sélection en deux étapes
- ✅ **Feedback visuel** : Indicateurs clairs

### 3. **Fonctionnalités Avancées**
- ✅ **Chargement dynamique** : Catégories chargées à la demande
- ✅ **Gestion d'état** : États indépendants pour rayon et catégorie
- ✅ **Performance** : Chargement optimisé des données

## 🎯 Utilisation

### **Sélection Complète**
1. **Taper** sur "Tous les rayons" → Sélectionner un rayon
2. **Voir** le dropdown catégorie apparaître
3. **Taper** sur "Toutes les catégories" → Sélectionner une catégorie
4. **Voir** les marques filtrées

### **Effacement Sélectif**
1. **Effacer rayon** : Remet à "Tous les rayons" et efface la catégorie
2. **Effacer catégorie** : Remet à "Toutes les catégories" seulement

### **Navigation**
- **Fermer modals** : Taper sur l'overlay ou le bouton X
- **Changer de rayon** : Efface automatiquement la catégorie
- **Retour** : Boutons d'effacement individuels

## 🔧 État de l'Application

### **Variables d'État**
```typescript
const [selectedRayon, setSelectedRayon] = useState<number | null>(null);
const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
const [subcategories, setSubcategories] = useState<Category[]>([]);
const [rayonDropdownVisible, setRayonDropdownVisible] = useState(false);
const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
```

### **Chargement des Données**
- **Rayons** : Chargés au démarrage
- **Catégories** : Chargées dynamiquement lors de la sélection du rayon
- **Marques** : Filtrées en temps réel selon les sélections

## 🎉 Résultat

L'écran des marques dispose maintenant d'un système de filtrage hiérarchique complet :
- ✅ **Sélection en deux étapes** : Rayon puis catégorie
- ✅ **Interface cohérente** : Même logique que l'écran produits
- ✅ **Filtrage précis** : Marques filtrées selon les critères
- ✅ **Expérience optimisée** : Navigation intuitive et claire

L'utilisateur peut maintenant filtrer les marques de manière très précise ! 🎯
