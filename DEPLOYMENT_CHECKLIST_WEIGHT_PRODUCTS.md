# Checklist de Déploiement - Produits au Poids

## 📋 Étapes avant le déploiement

### 1. ✅ Vérifications locales (Backend)

- [x] Modèles modifiés (Product, SaleItem, Transaction, OrderItem)
- [x] Migrations créées et testées
- [x] Formulaires adaptés (ProductForm, SaleItemForm)
- [x] Serializers adaptés (ProductSerializer)
- [x] Script de test backend créé

**Action :** Exécuter les migrations localement
```bash
python manage.py migrate
```

**Action :** Tester le backend localement
```bash
python scripts/test_weight_products_backend.py
```

### 2. ✅ Vérifications locales (Frontend)

- [x] Interface mobile adaptée (AddProductScreen.tsx)
- [x] Templates web adaptés (product_form.html, product_list.html, product_detail.html)
- [x] Guide de test frontend créé

**Action :** Tester l'interface web localement
- Démarrer le serveur Django : `python manage.py runserver`
- Aller sur `/inventory/products/create/`
- Tester la création d'un produit au poids

**Action :** Tester l'interface mobile localement (si possible)
- Lancer l'app mobile
- Tester la création d'un produit au poids

### 3. 🚀 Déploiement sur le serveur

**Étape 1 : Pousser le code**
```bash
git add .
git commit -m "feat: Ajout support produits au poids (kg/g) avec prix au kg et stock en décimales"
git push origin main
```

**Étape 2 : Vérifier le déploiement sur Railway**
- Les migrations seront appliquées automatiquement
- Vérifier les logs de déploiement

**Étape 3 : Appliquer les migrations sur le serveur (si nécessaire)**
```bash
# Via Railway CLI ou interface web
railway run python manage.py migrate
```

### 4. 🧪 Tests sur le serveur (Production)

#### Tests Backend (API)
- [ ] Tester la création d'un produit en quantité via l'API
- [ ] Tester la création d'un produit au poids (kg) via l'API
- [ ] Tester la création d'un produit au poids (g) via l'API
- [ ] Vérifier les validations (weight_unit requis si weight)
- [ ] Tester les calculs de vente avec produits au poids

#### Tests Frontend Web
- [ ] Accéder à l'interface web sur Railway
- [ ] Créer un produit en quantité
- [ ] Créer un produit au poids (kg)
- [ ] Créer un produit au poids (g)
- [ ] Vérifier l'affichage dans la liste
- [ ] Vérifier l'affichage dans le détail
- [ ] Tester la modification d'un produit

#### Tests Frontend Mobile
- [ ] Se connecter à l'API Railway depuis l'app mobile
- [ ] Créer un produit en quantité
- [ ] Créer un produit au poids (kg)
- [ ] Créer un produit au poids (g)
- [ ] Vérifier l'affichage dans la liste
- [ ] Tester une vente avec produit au poids

### 5. 🔍 Points de vigilance

#### Migrations
- ✅ Les migrations sont créées
- ⚠️ Vérifier qu'elles s'appliquent correctement sur le serveur
- ⚠️ Les données existantes (produits en quantité) doivent rester valides

#### Compatibilité
- ✅ Les produits existants auront `sale_unit_type='quantity'` par défaut
- ✅ Les calculs avec DecimalField sont rétrocompatibles
- ⚠️ Vérifier que les produits existants s'affichent correctement

#### Performance
- ⚠️ Les requêtes avec DecimalField peuvent être légèrement plus lentes
- ⚠️ Vérifier les performances sur le serveur

### 6. 📝 Documentation

- [x] Guide de test backend créé
- [x] Guide de test frontend créé
- [ ] Documenter les changements pour les utilisateurs (si nécessaire)

## 🎯 Ordre recommandé

1. **Tester localement** (backend + frontend web)
2. **Pousser le code** sur le serveur
3. **Vérifier le déploiement** (migrations appliquées)
4. **Tester sur le serveur** (API + Web + Mobile)

## ⚠️ En cas de problème

### Si les migrations échouent
```bash
# Vérifier l'état des migrations
python manage.py showmigrations

# Appliquer manuellement
python manage.py migrate inventory
python manage.py migrate sales
```

### Si les produits existants ont des problèmes
- Les produits existants devraient fonctionner normalement
- Ils auront automatiquement `sale_unit_type='quantity'`
- Le stock sera converti en DecimalField (ex: 50 → 50.000)

### Rollback (si nécessaire)
```bash
# Revenir à la migration précédente
python manage.py migrate inventory 0039
python manage.py migrate sales 0007
```

## ✅ Validation finale

Une fois tous les tests passés :
- [ ] Backend fonctionne (API)
- [ ] Frontend web fonctionne
- [ ] Frontend mobile fonctionne
- [ ] Les produits existants fonctionnent toujours
- [ ] Les nouveaux produits au poids fonctionnent
- [ ] Les calculs sont corrects
- [ ] Les validations fonctionnent

