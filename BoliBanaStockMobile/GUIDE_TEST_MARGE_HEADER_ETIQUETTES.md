# Guide de Test - Marge en Haut du Header des Écrans d'Étiquettes et Catalogue PDF

## Modifications Apportées

### ✅ Écrans Modifiés
1. **`PrintModeSelectionScreen.tsx`** - Écran de sélection du mode d'impression
2. **`LabelPrintScreen.tsx`** - Écran d'impression des étiquettes individuelles  
3. **`LabelPreviewScreen.tsx`** - Écran de prévisualisation des étiquettes
4. **`CatalogPDFScreen.tsx`** - Écran de génération du catalogue PDF

### 🔧 Changements Effectués
Ajout de `paddingTop: 32` dans le style `header` de chaque écran :

```typescript
header: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 16,
  paddingTop: 32,  // ← NOUVELLE MARGE EN HAUT (augmentée)
  backgroundColor: 'white',
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
},
```

## Comment Tester

### Test 1: Écran de Sélection du Mode d'Impression
1. **Naviguez** vers l'onglet "Étiquettes" dans l'application
2. **Sélectionnez** quelques produits
3. **Cliquez** sur "Générer les Étiquettes"
4. **Vérifiez** que l'écran "Modes d'Impression" s'affiche
5. **Observez** le header :
   - ✅ Le titre "Modes d'Impression" doit avoir plus d'espace en haut
   - ✅ Le bouton retour et les actions doivent être mieux espacés du haut de l'écran

### Test 2: Écran d'Impression des Étiquettes
1. **Depuis** l'écran de sélection du mode
2. **Cliquez** sur "Étiquettes Individuelles"
3. **Vérifiez** que l'écran "Étiquettes Individuelles" s'affiche
4. **Observez** le header :
   - ✅ Le titre "Étiquettes Individuelles" doit avoir plus d'espace en haut
   - ✅ Le bouton retour et l'icône d'aide doivent être mieux espacés

### Test 3: Écran de Prévisualisation des Étiquettes
1. **Depuis** l'écran d'impression des étiquettes
2. **Sélectionnez** quelques produits
3. **Cliquez** sur "Générer les Étiquettes"
4. **Vérifiez** que l'écran "Prévisualisation des Étiquettes" s'affiche
5. **Observez** le header :
   - ✅ Le titre "Prévisualisation des Étiquettes" doit avoir plus d'espace en haut
   - ✅ Les boutons d'action doivent être mieux espacés du haut

### Test 4: Écran de Catalogue PDF
1. **Depuis** l'écran de sélection du mode d'impression
2. **Cliquez** sur "Catalogue PDF A4"
3. **Vérifiez** que l'écran "Catalogue PDF A4" s'affiche
4. **Observez** le header :
   - ✅ Le titre "Catalogue PDF A4" doit avoir plus d'espace en haut
   - ✅ Le bouton retour et l'icône d'aide doivent être mieux espacés du haut

## Résultat Attendu

### Avant
- Header collé en haut de l'écran
- Titre et boutons très proches du bord supérieur
- Apparence "serrée" et peu aérée

### Après
- Header avec marge de 32px en haut (augmentée)
- Titre et boutons mieux espacés du haut de l'écran
- Apparence plus aérée et professionnelle
- Meilleure lisibilité et ergonomie
- Cohérence visuelle entre tous les écrans d'impression

## Vérifications Visuelles

### Sur Mobile
- [ ] Header n'est plus collé au haut de l'écran
- [ ] Espacement uniforme entre le haut de l'écran et le contenu du header
- [ ] Titre centré verticalement dans l'espace disponible
- [ ] Boutons d'action (retour, aide) bien positionnés

### Sur Tablette
- [ ] Marge proportionnelle maintenue
- [ ] Header reste lisible et bien proportionné
- [ ] Espacement cohérent avec le reste de l'interface

## Tests de Régression

Après cette modification, vérifiez que :
- [ ] La navigation entre les écrans fonctionne toujours
- [ ] Les boutons du header restent cliquables
- [ ] Le contenu principal n'est pas affecté
- [ ] L'interface reste responsive sur différentes tailles d'écran
- [ ] Les autres écrans de l'application ne sont pas affectés

## Notes Techniques

- **Valeur ajoutée** : `paddingTop: 32` (32 pixels de marge en haut)
- **Cohérence** : Même valeur appliquée sur les 4 écrans d'impression
- **Compatibilité** : Compatible avec `SafeAreaView` et les différents appareils
- **Performance** : Modification purement CSS, aucun impact sur les performances
- **Écrans concernés** : Tous les écrans liés à l'impression (étiquettes + catalogue PDF)
