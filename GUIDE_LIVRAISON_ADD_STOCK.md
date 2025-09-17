# Guide d'Utilisation - Endpoint add_stock pour les Livraisons 🚚

## ✅ **Réponse : OUI, l'endpoint `add_stock` est parfait pour les livraisons !**

L'endpoint `POST /api/v1/products/{id}/add_stock/` est **parfaitement adapté** pour enregistrer les livraisons de produits existants et mettre à jour les stocks.

## 🔧 **Fonctionnalités de l'endpoint add_stock :**

### **1. API Backend**
```python
@action(detail=True, methods=['post'])
def add_stock(self, request, pk=None):
    """Ajouter du stock à un produit"""
    product = self.get_object()
    quantity = request.data.get('quantity')
    notes = request.data.get('notes', 'Ajout de stock')
    
    # Validation
    if not quantity or quantity <= 0:
        return Response({'error': 'La quantité doit être positive'})
    
    # Mise à jour du stock
    old_quantity = product.quantity
    product.quantity += quantity  # ✅ Augmentation du stock
    product.save()
    
    # Création de transaction d'entrée
    Transaction.objects.create(
        product=product,
        type='in',  # ✅ Type "entrée" pour livraison
        quantity=quantity,
        unit_price=product.purchase_price,
        notes=notes,
        user=request.user
    )
```

### **2. Méthode Mobile**
```typescript
// BoliBanaStockMobile/src/services/api.ts
addStock: async (productId: number, quantity: number, notes?: string) => {
  const response = await api.post(`/products/${productId}/add_stock/`, {
    quantity,
    notes: notes || 'Ajout de stock via mobile'
  });
  return response.data;
}
```

## 🚚 **Utilisation pour les Livraisons :**

### **1. Livraison Manuelle**
```typescript
// Exemple d'utilisation pour une livraison
const result = await productService.addStock(
  productId,                    // ID du produit livré
  50,                          // Quantité livrée
  'Livraison #LIV-2024-001'    // Notes de livraison
);

// Résultat :
// - Stock augmenté de 50 unités
// - Transaction créée avec type 'in'
// - Traçabilité complète
```

### **2. Livraison par Scanner**
```typescript
// Scanner de codes-barres pour livraison
const handleDeliveryScan = async (barcode: string) => {
  const product = await productService.scanProduct(barcode);
  if (product) {
    // Ajouter au stock via add_stock
    await productService.addStock(
      product.id,
      deliveryQuantity,
      `Livraison scannée - ${barcode}`
    );
  }
};
```

## 📱 **Écran de Réception de Livraison**

J'ai créé un écran complet `DeliveryScreen.tsx` avec :

### **Fonctionnalités :**
- ✅ **Livraison manuelle** avec recherche de produit
- ✅ **Scanner continu** pour les livraisons
- ✅ **Validation des quantités** livrées
- ✅ **Numéro de livraison** et fournisseur
- ✅ **Notes personnalisables** pour chaque livraison
- ✅ **Interface utilisateur intuitive**

### **Champs de livraison :**
- **ID du produit** (avec recherche)
- **Quantité livrée** (validation positive)
- **Numéro de livraison** (ex: LIV-2024-001)
- **Fournisseur** (optionnel)
- **Notes** (optionnel)

## 🎯 **Avantages pour les Livraisons :**

### **1. Traçabilité Complète**
- **Transaction d'entrée** créée automatiquement
- **Type 'in'** pour identifier les livraisons
- **Notes personnalisables** pour chaque livraison
- **Utilisateur responsable** enregistré

### **2. Gestion des Stocks**
- **Augmentation automatique** du stock
- **Validation des quantités** positives
- **Mise à jour en temps réel** des stocks
- **Historique complet** des mouvements

### **3. Interface Mobile**
- **Scanner de codes-barres** pour rapidité
- **Saisie manuelle** pour précision
- **Validation en temps réel** des données
- **Gestion d'erreurs** utilisateur-friendly

## 🔍 **Exemples d'Utilisation :**

### **Livraison Simple**
```typescript
// Livraison de 100 unités de Coca-Cola
await productService.addStock(
  123,  // ID du produit Coca-Cola
  100,  // 100 unités livrées
  'Livraison fournisseur ABC - 15/01/2024'
);
```

### **Livraison avec Scanner**
```typescript
// Scanner un code-barres et ajouter au stock
const product = await productService.scanProduct('1234567890123');
if (product) {
  await productService.addStock(
    product.id,
    25,
    `Livraison scannée - ${new Date().toLocaleDateString()}`
  );
}
```

### **Livraison Multiple**
```typescript
// Livraison de plusieurs produits
const deliveries = [
  { productId: 123, quantity: 50, notes: 'Livraison #001' },
  { productId: 124, quantity: 30, notes: 'Livraison #001' },
  { productId: 125, quantity: 20, notes: 'Livraison #001' }
];

for (const delivery of deliveries) {
  await productService.addStock(
    delivery.productId,
    delivery.quantity,
    delivery.notes
  );
}
```

## 📊 **Résultat des Livraisons :**

### **Avant Livraison :**
- Stock : 50 unités
- Dernière transaction : Vente

### **Après Livraison (100 unités) :**
- Stock : 150 unités ✅
- Nouvelle transaction : Type 'in', Quantité 100
- Notes : "Livraison #LIV-2024-001"

## 🎉 **Conclusion**

L'endpoint `add_stock` est **parfaitement adapté** pour les livraisons car il :

1. **Augmente le stock** des produits existants
2. **Crée des transactions d'entrée** (type 'in')
3. **Assure la traçabilité** complète des livraisons
4. **Valide les données** (quantités positives)
5. **Supporte l'interface mobile** avec scanner

## 📁 **Fichiers Créés/Modifiés**

- `BoliBanaStockMobile/src/screens/DeliveryScreen.tsx` - Écran de réception
- `GUIDE_LIVRAISON_ADD_STOCK.md` - Guide d'utilisation

## 🔗 **Endpoints Utilisés**

- **API**: `POST /api/v1/products/{id}/add_stock/`
- **Mobile**: `productService.addStock(productId, quantity, notes)`

L'endpoint `add_stock` est donc **la solution idéale** pour gérer les livraisons de produits existants ! 🚚✅
