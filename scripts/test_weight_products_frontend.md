# Script de Test Frontend - Gestion des Produits au Poids

Ce document décrit les tests à effectuer manuellement sur l'interface mobile et web pour valider la fonctionnalité de gestion des produits au poids.

## 📱 Tests Interface Mobile (React Native)

### Test 1: Création d'un produit en quantité

1. **Navigation**
   - Ouvrir l'application mobile
   - Aller dans "Produits" → "Nouveau Produit"

2. **Saisie des données**
   - Nom: "Test Bouteille Eau"
   - Type de vente: Sélectionner "Quantité (unité)"
   - Prix d'achat: 500
   - Prix de vente: 750
   - Quantité en stock: 100
   - Seuil d'alerte: 10
   - Catégorie: Sélectionner une catégorie
   - Marque: Sélectionner une marque

3. **Vérifications**
   - ✅ Le champ "Unité de poids" ne doit PAS être visible
   - ✅ Les labels des prix affichent "Prix d'achat (FCFA)" et "Prix de vente (FCFA)"
   - ✅ Le label quantité affiche "Quantité en stock"
   - ✅ Le label seuil d'alerte affiche "Seuil d'alerte"

4. **Sauvegarde**
   - Cliquer sur "Enregistrer"
   - ✅ Le produit est créé avec succès
   - ✅ Vérifier dans la liste que le produit s'affiche correctement

---

### Test 2: Création d'un produit au poids (kg)

1. **Navigation**
   - Aller dans "Produits" → "Nouveau Produit"

2. **Saisie des données**
   - Nom: "Test Riz"
   - Type de vente: Sélectionner "Poids (kg/g)"
   - Unité de poids: Sélectionner "Kilogramme (kg)"
   - Prix d'achat: 500
   - Prix de vente: 750
   - Quantité en stock: 125.5
   - Seuil d'alerte: 10
   - Catégorie: Sélectionner une catégorie
   - Marque: Sélectionner une marque

3. **Vérifications**
   - ✅ Le champ "Unité de poids" est visible
   - ✅ Les labels des prix affichent "Prix d'achat / kg (FCFA)" et "Prix de vente / kg (FCFA)"
   - ✅ Le label quantité affiche "Stock en kg"
   - ✅ Le label seuil d'alerte affiche "Seuil d'alerte (kg)"
   - ✅ On peut saisir des décimales (125.5)

4. **Sauvegarde**
   - Cliquer sur "Enregistrer"
   - ✅ Le produit est créé avec succès
   - ✅ Vérifier dans la liste que le produit affiche "125.5 kg"

---

### Test 3: Création d'un produit au poids (g)

1. **Navigation**
   - Aller dans "Produits" → "Nouveau Produit"

2. **Saisie des données**
   - Nom: "Test Sucre"
   - Type de vente: Sélectionner "Poids (kg/g)"
   - Unité de poids: Sélectionner "Gramme (g)"
   - Prix d'achat: 0.5
   - Prix de vente: 0.75
   - Quantité en stock: 5000
   - Seuil d'alerte: 500
   - Catégorie: Sélectionner une catégorie
   - Marque: Sélectionner une marque

3. **Vérifications**
   - ✅ Les labels affichent "g" au lieu de "kg"
   - ✅ On peut saisir des valeurs décimales pour les prix (0.5, 0.75)

4. **Sauvegarde**
   - Cliquer sur "Enregistrer"
   - ✅ Le produit est créé avec succès

---

### Test 4: Validation des erreurs

1. **Test: weight_unit manquant**
   - Créer un produit avec Type de vente = "Poids (kg/g)"
   - Ne pas sélectionner d'unité de poids
   - Cliquer sur "Enregistrer"
   - ✅ Un message d'erreur s'affiche: "L'unité de poids (kg ou g) est obligatoire..."

2. **Test: weight_unit avec quantité**
   - Créer un produit avec Type de vente = "Quantité (unité)"
   - Sélectionner une unité de poids (ne devrait pas être possible)
   - ✅ Le champ unité de poids ne devrait pas être visible

---

### Test 5: Modification d'un produit

1. **Navigation**
   - Aller dans la liste des produits
   - Sélectionner un produit au poids (kg)
   - Cliquer sur "Modifier"

2. **Modifications**
   - Changer le stock de 125.5 à 200.75
   - Changer le type de vente de "Poids" à "Quantité"
   - ✅ Le champ "Unité de poids" disparaît
   - ✅ Les labels se mettent à jour automatiquement

3. **Sauvegarde**
   - Cliquer sur "Enregistrer"
   - ✅ Les modifications sont sauvegardées

---

### Test 6: Affichage dans la liste

1. **Navigation**
   - Aller dans "Produits" → Liste

2. **Vérifications**
   - ✅ Les produits en quantité affichent "X unité(s)"
   - ✅ Les produits au poids affichent "X kg" ou "X g"
   - ✅ Les prix affichent l'unité pour les produits au poids (ex: "750 FCFA / kg")

---

### Test 7: Vente d'un produit au poids

1. **Navigation**
   - Aller dans "Ventes" → "Nouvelle Vente"

2. **Ajout d'un produit au poids**
   - Scanner ou rechercher un produit au poids (kg)
   - Saisir la quantité: 2.5 (kg)
   - ✅ Le prix unitaire est au kg
   - ✅ Le montant total = 2.5 × prix_au_kg

3. **Vérifications**
   - ✅ Le montant est calculé correctement
   - ✅ L'affichage montre "2.5 kg" dans le détail de la vente

---

## 🌐 Tests Interface Web (Django Templates)

### Test 1: Formulaire de création

1. **Navigation**
   - Ouvrir le navigateur
   - Aller sur `/inventory/products/create/`

2. **Test Type de vente = Quantité**
   - Sélectionner "Quantité" dans "Type de vente"
   - ✅ Le champ "Unité de poids" disparaît
   - ✅ Les labels des prix affichent "Prix d'achat (FCFA)"

3. **Test Type de vente = Poids**
   - Sélectionner "Poids" dans "Type de vente"
   - ✅ Le champ "Unité de poids" apparaît
   - Sélectionner "kg"
   - ✅ Les labels se mettent à jour: "Prix d'achat / kg (FCFA)"
   - ✅ Le label quantité devient "Stock en kg"

---

### Test 2: Liste des produits

1. **Navigation**
   - Aller sur `/inventory/products/`

2. **Vérifications**
   - ✅ Les produits au poids affichent l'unité (ex: "125.5 kg")
   - ✅ Les produits en quantité affichent "X unité(s)"
   - ✅ Les prix affichent l'unité pour les produits au poids

---

### Test 3: Détail d'un produit

1. **Navigation**
   - Cliquer sur un produit au poids dans la liste

2. **Vérifications**
   - ✅ Le stock affiche l'unité (ex: "125.5 kg")
   - ✅ Les prix affichent l'unité (ex: "750 FCFA / kg")
   - ✅ Le type de vente est affiché: "Poids (kg)" ou "Quantité"
   - ✅ Le seuil d'alerte affiche l'unité

---

### Test 4: Transactions

1. **Navigation**
   - Aller dans "Transactions" → "Nouvelle Transaction"

2. **Test avec produit au poids**
   - Sélectionner un produit au poids
   - Type: "Achat"
   - Quantité: 10.5 (kg)
   - ✅ La quantité accepte les décimales
   - ✅ Le montant est calculé correctement

---

## 📊 Checklist de Validation

### Backend
- [ ] Produits en quantité créés correctement
- [ ] Produits au poids (kg) créés correctement
- [ ] Produits au poids (g) créés correctement
- [ ] Validations fonctionnent (weight_unit requis si weight)
- [ ] Calculs de prix corrects
- [ ] Opérations de stock avec décimales fonctionnent

### Frontend Mobile
- [ ] Formulaire de création affiche les bons champs
- [ ] Labels se mettent à jour selon le type
- [ ] Validation des erreurs fonctionne
- [ ] Affichage dans la liste correct
- [ ] Modification de produit fonctionne
- [ ] Vente avec produits au poids fonctionne

### Frontend Web
- [ ] Formulaire de création avec JavaScript fonctionne
- [ ] Affichage conditionnel des champs
- [ ] Liste des produits affiche les unités
- [ ] Détail du produit affiche les unités
- [ ] Transactions avec décimales fonctionnent

---

## 🐛 Problèmes Potentiels à Vérifier

1. **Décimales**
   - Vérifier que les décimales sont acceptées partout (quantité, prix)
   - Vérifier l'affichage des décimales (pas de troncature)

2. **Calculs**
   - Vérifier que les calculs de montant sont corrects
   - Vérifier que les opérations de stock fonctionnent avec décimales

3. **Validation**
   - Vérifier que les validations empêchent les configurations invalides
   - Vérifier les messages d'erreur sont clairs

4. **Affichage**
   - Vérifier que les unités s'affichent partout où nécessaire
   - Vérifier que les labels sont cohérents

---

## 📝 Notes

- Les tests peuvent être exécutés dans n'importe quel ordre
- En cas d'erreur, noter le comportement observé et le comportement attendu
- Prendre des captures d'écran si nécessaire pour documenter les problèmes

