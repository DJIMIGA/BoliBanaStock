# Tests de Formatage des Devises

Ce document explique comment tester le formatage des devises avant de pousser le code.

## Scripts de Test

### Backend (Python)

**Fichier:** `test_currency_formatting_backend.py`

**Usage:**
```bash
python test_currency_formatting_backend.py
```

**Ce qui est testé:**
- ✅ Détermination du nombre de décimales selon la devise
- ✅ Formatage des montants avec différentes devises
- ✅ Formatage dans le modèle Product

**Exemples de résultats attendus:**
- FCFA: `1 500 FCFA` (pas de décimales)
- EUR: `15,50 EUR` (2 décimales avec virgule)
- USD: `1 234,56 USD` (2 décimales avec virgule)

### Frontend Mobile (JavaScript/Node.js)

**Fichier:** `BoliBanaStockMobile/test-currency-formatting-frontend.js`

**Usage:**
```bash
cd BoliBanaStockMobile
node test-currency-formatting-frontend.js
```

**Ce qui est testé:**
- ✅ Détermination du nombre de décimales selon la devise
- ✅ Formatage des montants avec `formatCurrency()`
- ✅ Formatage sans devise avec `formatAmount()`

**Exemples de résultats attendus:**
- FCFA: `1 500 FCFA` (arrondi à l'entier)
- EUR: `15,50 EUR` (2 décimales)
- USD: `1 234,56 USD` (2 décimales)

## Devises Supportées

### Devises sans décimales (0 décimales)
- FCFA, XOF, XAF, JPY, KRW, MGA, XPF

### Devises avec décimales (2 décimales)
- EUR, USD, GBP, CNY, INR, BRL, ZAR, NGN, GHS, KES, EGP, MAD, TND, DZD

## Vérification Rapide

Avant de pousser le code, exécutez les deux scripts :

```bash
# Test backend
python test_currency_formatting_backend.py

# Test frontend
cd BoliBanaStockMobile
node test-currency-formatting-frontend.js
```

Les deux doivent afficher `✅ TOUS LES TESTS SONT PASSÉS` avant de pousser.

