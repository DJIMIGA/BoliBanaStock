# 📱 Guide - Sélection Hiérarchisée Mobile

## 🎯 Vue d'ensemble

L'interface mobile utilise maintenant une sélection hiérarchisée en 2 étapes :
1. **Sélection du rayon** (niveau 0)
2. **Sélection de la sous-catégorie** (niveau 1)

## 🔌 Nouvelles API Endpoints

### 1. **Récupérer tous les rayons**
```http
GET /api/rayons/
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "success": true,
  "rayons": [
    {
      "id": 1,
      "name": "Frais Libre Service",
      "description": "Produits frais en libre service",
      "rayon_type": "frais_libre_service",
      "rayon_type_display": "Frais Libre Service",
      "order": 1,
      "subcategories_count": 13
    }
  ],
  "total": 16
}
```

### 2. **Récupérer les sous-catégories d'un rayon**
```http
GET /api/subcategories/?rayon_id=1
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "success": true,
  "rayon": {
    "id": 1,
    "name": "Frais Libre Service",
    "rayon_type": "frais_libre_service"
  },
  "subcategories": [
    {
      "id": 10,
      "name": "Boucherie",
      "description": "Viande de veau, bœuf, agneau, etc.",
      "rayon_type": "frais_libre_service",
      "parent_id": 1,
      "parent_name": "Frais Libre Service",
      "order": 1
    }
  ],
  "total": 13
}
```

## 📱 Implémentation Mobile

### 1. **Écran de Sélection des Rayons**

```typescript
interface Rayon {
  id: number;
  name: string;
  description: string;
  rayon_type: string;
  rayon_type_display: string;
  order: number;
  subcategories_count: number;
}

// Récupérer les rayons
const fetchRayons = async () => {
  try {
    const response = await fetch('/api/rayons/', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (data.success) {
      setRayons(data.rayons);
    }
  } catch (error) {
    console.error('Erreur récupération rayons:', error);
  }
};
```

### 2. **Écran de Sélection des Sous-Catégories**

```typescript
interface Subcategory {
  id: number;
  name: string;
  description: string;
  rayon_type: string;
  parent_id: number;
  parent_name: string;
  order: number;
}

// Récupérer les sous-catégories
const fetchSubcategories = async (rayonId: number) => {
  try {
    const response = await fetch(`/api/subcategories/?rayon_id=${rayonId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (data.success) {
      setSubcategories(data.subcategories);
      setSelectedRayon(data.rayon);
    }
  } catch (error) {
    console.error('Erreur récupération sous-catégories:', error);
  }
};
```

### 3. **Interface Utilisateur**

```tsx
// Composant de sélection hiérarchisée
const HierarchicalCategorySelector = () => {
  const [rayons, setRayons] = useState<Rayon[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedRayon, setSelectedRayon] = useState<Rayon | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);

  // Charger les rayons au montage
  useEffect(() => {
    fetchRayons();
  }, []);

  // Charger les sous-catégories quand un rayon est sélectionné
  const handleRayonSelect = (rayon: Rayon) => {
    setSelectedRayon(rayon);
    setSelectedSubcategory(null);
    fetchSubcategories(rayon.id);
  };

  return (
    <View>
      {/* Sélection du rayon */}
      <Text>1. Sélectionnez un rayon :</Text>
      <FlatList
        data={rayons}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleRayonSelect(item)}>
            <Text>{item.name} ({item.subcategories_count} sous-catégories)</Text>
          </TouchableOpacity>
        )}
      />

      {/* Sélection de la sous-catégorie */}
      {selectedRayon && (
        <View>
          <Text>2. Sélectionnez une sous-catégorie :</Text>
          <FlatList
            data={subcategories}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setSelectedSubcategory(item)}>
                <Text>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Affichage de la sélection finale */}
      {selectedSubcategory && (
        <View>
          <Text>Catégorie sélectionnée :</Text>
          <Text>{selectedRayon?.name} > {selectedSubcategory.name}</Text>
        </View>
      )}
    </View>
  );
};
```

## 🔄 Migration depuis l'Ancienne API

### Ancienne API (dépréciée)
```http
GET /api/categories/
```

### Nouvelle API (recommandée)
```http
GET /api/rayons/          # Pour les rayons
GET /api/subcategories/   # Pour les sous-catégories
```

## ✨ Avantages

1. **Interface Plus Intuitive** : Sélection guidée en 2 étapes
2. **Performance Améliorée** : Chargement dynamique des sous-catégories
3. **Organisation Claire** : Classification logique des produits
4. **Expérience Utilisateur** : Navigation fluide et moderne
5. **Compatibilité** : Fonctionne avec l'ancien système

## 🚀 Mise en Production

1. **Déployer les nouvelles API** sur le serveur
2. **Mettre à jour l'application mobile** avec les nouveaux endpoints
3. **Tester la sélection hiérarchisée** sur tous les écrans
4. **Former les utilisateurs** à la nouvelle interface

## 📊 Statistiques

- **16 rayons principaux** disponibles
- **Jusqu'à 17 sous-catégories** par rayon
- **API optimisées** pour les performances mobiles
- **Interface responsive** pour tous les écrans
