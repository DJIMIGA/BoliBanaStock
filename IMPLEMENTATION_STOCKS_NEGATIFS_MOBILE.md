# 🚨 Implémentation des stocks négatifs (Backorders) dans l'application mobile

## 🎯 **Objectif**

Intégrer la gestion des **stocks négatifs (backorders)** dans la page de rupture de stock mobile avec une **section distincte** pour une meilleure visibilité et gestion.

## 🔧 **Modifications implémentées**

### **1. Backend API - Nouvelles actions**

**Fichier modifié :** `api/views.py`

```python
@action(detail=False, methods=['get'])
def out_of_stock(self, request):
    """Produits en rupture de stock (quantité = 0) ET en backorder (quantité < 0)"""
    products = self.get_queryset().filter(quantity__lte=0)
    serializer = ProductListSerializer(products, many=True)
    return Response(serializer.data)

@action(detail=False, methods=['get'])
def backorders(self, request):
    """Produits en backorder (stock négatif) uniquement"""
    products = self.get_queryset().filter(quantity__lt=0)
    serializer = ProductListSerializer(products, many=True)
    return Response(serializer.data)
```

**Avantages :**
- **Endpoint dédié** pour les backorders
- **Filtrage précis** : `quantity__lt=0` pour les stocks négatifs
- **Compatibilité** avec l'endpoint existant `out_of_stock`

### **2. Service API Mobile - Nouvelles méthodes**

**Fichier modifié :** `BoliBanaStockMobile/src/services/api.ts`

```typescript
// ✅ Méthode pour les produits en rupture ET backorder
getOutOfStockProducts: async () => {
  try {
    console.log('📡 Requête GET /products/out_of_stock/');
    const response = await api.get('/products/out_of_stock/');
    console.log('✅ Réponse produits rupture stock reçue:', response.status);
    return response.data;
  } catch (error: any) {
    console.error('❌ Erreur getOutOfStockProducts:', error);
    throw error;
  }
},

// ✅ NOUVELLE MÉTHODE : Produits en backorder uniquement
getBackorderProducts: async () => {
  try {
    console.log('📡 Requête GET /products/backorders/');
    const response = await api.get('/products/backorders/');
    console.log('✅ Réponse produits backorder reçue:', response.status);
    return response.data;
  } catch (error: any) {
    console.error('❌ Erreur getBackorderProducts:', error);
    throw error;
  }
},
```

### **3. Interface mobile - Sections séparées**

**Fichier modifié :** `BoliBanaStockMobile/src/screens/OutOfStockScreen.tsx`

#### **État séparé :**
```typescript
const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
const [backorderProducts, setBackorderProducts] = useState<Product[]>([]);
```

#### **Chargement séparé :**
```typescript
const loadProducts = async () => {
  try {
    setLoading(true);
    
    // ✅ Charger les produits en rupture de stock (quantité = 0)
    const outOfStockData = await productService.getOutOfStockProducts();
    const outOfStock = outOfStockData.filter((p: Product) => p.quantity === 0);
    setOutOfStockProducts(outOfStock || []);
    
    // ✅ Charger les produits en backorder (stock négatif)
    const backorderData = await productService.getBackorderProducts();
    setBackorderProducts(backorderData || []);
    
  } catch (error: any) {
    console.error('❌ Erreur chargement produits:', error);
  } finally {
    setLoading(false);
  }
};
```

#### **Affichage en sections :**
```typescript
{/* Section Backorders (Stock négatif) */}
{backorderProducts.length > 0 && (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Ionicons name="warning-outline" size={24} color={theme.colors.warning[500]} />
      <Text style={styles.sectionTitle}>Backorders (Stock négatif)</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{backorderProducts.length}</Text>
      </View>
    </View>
    {backorderProducts.map((item) => renderProduct({ item, isBackorder: true }))}
  </View>
)}

{/* Section Rupture de Stock (Quantité = 0) */}
{outOfStockProducts.length > 0 && (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Ionicons name="close-circle-outline" size={24} color={theme.colors.error[500]} />
      <Text style={styles.sectionTitle}>Rupture de Stock</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{outOfStockProducts.length}</Text>
      </View>
    </View>
    {outOfStockProducts.map((item) => renderProduct({ item, isBackorder: false }))}
  </View>
)}
```

### **4. Rendu adaptatif des produits**

#### **Logique conditionnelle :**
```typescript
const renderProduct = ({ item, isBackorder = false }: { item: Product; isBackorder?: boolean }) => {
  const isNegativeStock = item.quantity < 0;
  const stockColor = isNegativeStock ? theme.colors.warning[500] : theme.colors.error[500];
  const stockText = isNegativeStock ? 'Backorder' : 'Rupture';
  const stockIcon = isNegativeStock ? 'warning-outline' : 'close-circle-outline';
  
  return (
    <TouchableOpacity
      style={[
        styles.productCard,
        isNegativeStock && styles.backorderCard
      ]}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      {/* ... contenu adaptatif ... */}
    </TouchableOpacity>
  );
};
```

#### **Affichage de la quantité :**
```typescript
<Text style={[styles.quantityText, { color: stockColor }]}>
  {isNegativeStock 
    ? `${Math.abs(item.quantity)} unités en backorder` 
    : `${item.quantity || 0} unités en stock`
  }
</Text>
```

### **5. Styles visuels distincts**

#### **Styles des sections :**
```typescript
section: {
  marginBottom: 24,
},
sectionHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 16,
  paddingHorizontal: 20,
},
sectionTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: theme.colors.text.primary,
  marginLeft: 12,
  flex: 1,
},
badge: {
  backgroundColor: theme.colors.primary[500],
  borderRadius: 12,
  paddingHorizontal: 8,
  paddingVertical: 4,
  minWidth: 24,
  alignItems: 'center',
},
```

#### **Style des cartes de backorder :**
```typescript
backorderCard: {
  borderLeftWidth: 4,
  borderLeftColor: theme.colors.warning[500],
  backgroundColor: theme.colors.warning[50],
},
```

## 🎨 **Interface utilisateur**

### **Section Backorders :**
- **Icône** : ⚠️ Warning (orange)
- **Couleur** : Orange/Warning
- **Badge** : Nombre de produits en backorder
- **Style** : Bordure gauche orange, fond légèrement teinté

### **Section Rupture de Stock :**
- **Icône** : ❌ Close circle (rouge)
- **Couleur** : Rouge/Error
- **Badge** : Nombre de produits en rupture
- **Style** : Standard (pas de bordure spéciale)

### **Affichage des quantités :**
- **Backorder** : "3 unités en backorder" (quantité absolue)
- **Rupture** : "0 unités en stock" (quantité réelle)

## 🔄 **Workflow de fonctionnement**

1. **Chargement initial** : Récupération des deux types de produits
2. **Filtrage côté client** : Séparation rupture (qty=0) et backorder (qty<0)
3. **Affichage conditionnel** : Sections affichées seulement si des produits existent
4. **Rendu adaptatif** : Chaque produit affiché selon son type
5. **Actualisation** : Pull-to-refresh pour les deux sections

## 📱 **Avantages de cette approche**

1. **✅ Séparation claire** entre rupture et backorder
2. **✅ Visibilité immédiate** des situations critiques
3. **✅ Gestion différenciée** selon le type de problème
4. **✅ Interface intuitive** avec codes couleur distincts
5. **✅ Performance optimisée** avec endpoints dédiés
6. **✅ Extensibilité** pour d'autres types de stock

## 🚀 **Déploiement**

### **Fichiers modifiés :**
- `api/views.py` - Nouvelles actions API
- `BoliBanaStockMobile/src/services/api.ts` - Nouvelles méthodes
- `BoliBanaStockMobile/src/screens/OutOfStockScreen.tsx` - Interface adaptée

### **Redémarrage requis :**
- **Backend** : Oui (nouvelles actions API)
- **Mobile** : Non (modifications côté client uniquement)

### **Tests recommandés :**
1. **Créer des produits** avec stock négatif
2. **Vérifier l'affichage** des deux sections
3. **Tester la navigation** vers les détails des produits
4. **Valider le pull-to-refresh** pour les deux sections

## 🔮 **Évolutions futures possibles**

1. **Notifications push** pour les nouveaux backorders
2. **Historique des backorders** avec dates de création
3. **Actions rapides** (commander, notifier fournisseur)
4. **Statistiques** des backorders par période
5. **Intégration** avec le système de commandes fournisseurs

