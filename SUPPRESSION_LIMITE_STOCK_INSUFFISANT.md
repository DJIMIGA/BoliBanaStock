# 🚨 Suppression de la limite de stock insuffisant - Support des backorders

## 🎯 **Objectif**

Supprimer la vérification de **stock insuffisant** lors du retrait de stock pour permettre la création de **backorders** (stocks négatifs) et améliorer la gestion des commandes en attente.

## 🔧 **Modifications implémentées**

### **1. API - Méthode remove_stock**

**Fichier modifié :** `api/views.py` (ligne 576)

```python
@action(detail=True, methods=['post'])
def remove_stock(self, request, pk=None):
    """Retirer du stock d'un produit - Permet les stocks négatifs (backorder)"""
    product = self.get_object()
    quantity = request.data.get('quantity')
    notes = request.data.get('notes', 'Retrait de stock')
    
    if not quantity or quantity <= 0:
        return Response(
            {'error': 'La quantité doit être positive'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # ✅ NOUVELLE LOGIQUE: Permettre les stocks négatifs pour les backorders
    # Plus de vérification de stock insuffisant - on peut descendre en dessous de 0
    
    # Mettre à jour le stock
    old_quantity = product.quantity
    product.quantity -= quantity
    product.save()
    
    # Déterminer le type de transaction selon le stock final
    transaction_type = 'out'
    if product.quantity < 0:
        transaction_type = 'backorder'  # Nouveau type pour les backorders
    
    # Créer la transaction
    Transaction.objects.create(
        product=product,
        type=transaction_type,
        quantity=quantity,
        unit_price=product.purchase_price,
        notes=notes,
        user=request.user
    )
    
    # Message adaptatif selon le stock final
    if product.quantity < 0:
        message = f'{quantity} unités retirées - Stock en backorder ({abs(product.quantity)} unités en attente)'
    elif product.quantity == 0:
        message = f'{quantity} unités retirées - Stock épuisé'
    else:
        message = f'{quantity} unités retirées du stock'
    
    return Response({
        'success': True,
        'message': message,
        'old_quantity': old_quantity,
        'new_quantity': product.quantity,
        'stock_status': product.stock_status,
        'has_backorder': product.has_backorder,
        'backorder_quantity': product.backorder_quantity,
        'product': ProductSerializer(product).data
    })
```

**Changements clés :**
- ❌ **Supprimé** : Vérification `if product.quantity < quantity`
- ✅ **Ajouté** : Support du type de transaction `backorder`
- ✅ **Ajouté** : Messages adaptatifs selon le stock final
- ✅ **Ajouté** : Informations sur les backorders dans la réponse

### **2. API - Création des ventes**

**Fichier modifié :** `api/views.py` (ligne 1070)

```python
# ✅ NOUVELLE LOGIQUE: Permettre les stocks négatifs pour les backorders
# Plus de vérification de stock insuffisant - on peut descendre en dessous de 0

# Créer l'article de vente
SaleItem.objects.create(
    sale=sale,
    product=product,
    quantity=quantity,
    unit_price=unit_price,
    total_price=quantity * unit_price
)

# Mettre à jour le stock (peut devenir négatif)
old_quantity = product.quantity
product.quantity -= quantity
product.save()

# Déterminer le type de transaction selon le stock final
if product.quantity < 0:
    transaction_type = 'backorder'  # Nouveau type pour les backorders
    notes = f'Vente #{sale.id} - Stock en backorder ({abs(product.quantity)} unités en attente)'
else:
    transaction_type = 'out'
    notes = f'Vente #{sale.id}'

# Créer une transaction de sortie
Transaction.objects.create(
    product=product,
    type=transaction_type,
    quantity=quantity,
    unit_price=unit_price,
    notes=notes,
    user=self.request.user
)
```

**Changements clés :**
- ❌ **Supprimé** : Vérification `if product.quantity < quantity`
- ✅ **Ajouté** : Support des stocks négatifs dans les ventes
- ✅ **Ajouté** : Type de transaction `backorder` pour les ventes
- ✅ **Ajouté** : Notes détaillées pour les backorders

### **3. Modèle Transaction**

**Fichier modifié :** `apps/inventory/models.py` (ligne 547)

```python
elif self.type in ['out', 'loss', 'backorder']:
    # Retrait de stock (vente, casse, backorder)
    # ✅ NOUVELLE LOGIQUE: Permettre les stocks négatifs pour les backorders
    self.product.quantity -= self.quantity
    # Plus de vérification de stock insuffisant - on peut descendre en dessous de 0
```

**Changements clés :**
- ✅ **Ajouté** : Support du type `backorder` dans les types de retrait
- ✅ **Supprimé** : Vérification de stock insuffisant
- ✅ **Permis** : Stocks négatifs

## 🔄 **Workflow de fonctionnement**

### **Avant (avec limite) :**
1. **Tentative de retrait** de 10 unités
2. **Vérification** : Stock disponible = 5 unités
3. **Erreur** : "Stock insuffisant - Disponible: 5, demandé: 10"
4. **Transaction bloquée** - Impossible de créer un backorder

### **Après (sans limite) :**
1. **Tentative de retrait** de 10 unités
2. **Pas de vérification** de stock insuffisant
3. **Mise à jour** : Stock passe de 5 à -5
4. **Transaction créée** avec type `backorder`
5. **Message** : "10 unités retirées - Stock en backorder (5 unités en attente)"

## 📊 **Types de transactions supportés**

### **Type 'out' (Sortie normale) :**
- Stock final ≥ 0
- Exemple : Vente de 3 unités sur un stock de 10 → Stock final = 7

### **Type 'backorder' (Stock négatif) :**
- Stock final < 0
- Exemple : Vente de 15 unités sur un stock de 10 → Stock final = -5

### **Type 'loss' (Perte) :**
- Stock final ≥ 0 (généralement)
- Exemple : Casse de 2 unités sur un stock de 10 → Stock final = 8

## 🎨 **Interface utilisateur**

### **Messages de confirmation :**
- **Stock suffisant** : "5 unités retirées du stock"
- **Stock épuisé** : "5 unités retirées - Stock épuisé"
- **Stock négatif** : "5 unités retirées - Stock en backorder (3 unités en attente)"

### **Statuts de stock :**
- **En stock** : Quantité > seuil d'alerte
- **Stock faible** : 0 < quantité ≤ seuil d'alerte
- **Rupture** : Quantité = 0
- **Backorder** : Quantité < 0 (nouveau statut)

## 🚀 **Avantages de cette approche**

1. **✅ Gestion des commandes** en attente de réapprovisionnement
2. **✅ Traçabilité complète** des mouvements de stock
3. **✅ Flexibilité commerciale** pour les ventes urgentes
4. **✅ Planification des achats** basée sur les backorders
5. **✅ Satisfaction client** pour les commandes importantes
6. **✅ Analyse des tendances** de consommation

## ⚠️ **Considérations importantes**

### **Gestion des backorders :**
- **Surveillance active** des produits en backorder
- **Réapprovisionnement prioritaire** pour ces produits
- **Communication client** sur les délais de livraison
- **Gestion des priorités** selon l'importance des commandes

### **Contrôles recommandés :**
- **Limites de backorder** par produit (optionnel)
- **Alertes automatiques** pour les nouveaux backorders
- **Rapports réguliers** sur l'état des backorders
- **Intégration** avec le système de commandes fournisseurs

## 🧪 **Tests de validation**

### **Script de test :** `test_backorder_stock_removal.py`

```bash
# Exécuter le test
python test_backorder_stock_removal.py
```

**Tests inclus :**
1. **Retrait normal** (stock suffisant)
2. **Retrait jusqu'à 0** (stock épuisé)
3. **Retrait en backorder** (stock négatif)
4. **Vérification API** backorders

## 🔮 **Évolutions futures possibles**

1. **Limites configurables** par produit ou catégorie
2. **Alertes automatiques** pour les nouveaux backorders
3. **Gestion des priorités** des commandes en backorder
4. **Intégration** avec le système de commandes fournisseurs
5. **Rapports avancés** sur l'état des backorders
6. **Notifications push** pour les équipes concernées

## 📋 **Checklist de déploiement**

- [x] Suppression de la vérification de stock insuffisant dans `remove_stock`
- [x] Suppression de la vérification de stock insuffisant dans les ventes
- [x] Support du type de transaction `backorder`
- [x] Messages adaptatifs selon le stock final
- [x] Tests de validation
- [x] Documentation complète

## 🚀 **Déploiement**

### **Fichiers modifiés :**
- `api/views.py` - Méthodes `remove_stock` et création des ventes
- `apps/inventory/models.py` - Modèle Transaction

### **Redémarrage requis :**
- **Backend** : Oui (modifications de l'API)
- **Base de données** : Non (pas de migrations)

### **Impact :**
- **Positif** : Support des backorders, flexibilité commerciale
- **Surveillance** : Nouveaux produits en stock négatif
- **Formation** : Équipes à former sur la gestion des backorders

