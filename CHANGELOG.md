# 📝 Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-08

### 🔧 Corrections
- **Correction majeure de la validation des catégories** : Résolution du problème d'erreur 400 lors de la mise à jour des rayons via l'application mobile
  - Correction de la validation serveur pour permettre aux catégories globales personnalisées d'exister sans parent
  - Ajout du champ `is_rayon` dans les données envoyées par le client mobile
  - Amélioration de la logique de validation côté client pour être cohérente avec le serveur

### 📚 Documentation
- Ajout de la documentation complète de la correction : `CATEGORY_VALIDATION_FIX.md`
- Mise à jour de la documentation des catégories avec les nouvelles règles de validation
- Ajout d'une section documentation dans le README principal

### 🧪 Tests
- Validation des 4 types de catégories (rayons globaux, catégories globales, catégories site, rayons site)
- Tests de régression pour s'assurer de la cohérence entre client et serveur

### 📁 Fichiers Modifiés
- `api/serializers.py` - Validation du serializer API
- `apps/inventory/forms.py` - Validation du formulaire Django  
- `BoliBanaStockMobile/src/components/CategoryEditModal.tsx` - Logique client mobile
- `DOCUMENTATION_CATEGORIES_RAYONS.md` - Mise à jour des règles de validation
- `README.md` - Ajout de la section documentation

## [1.0.0] - 2025-01-05

### 🎉 Version Initiale
- Système de gestion de stock complet
- Application mobile React Native
- API REST Django
- Système de catégories et rayons de supermarché
- Gestion multi-sites
- Interface web moderne avec Tailwind CSS

---

## Types de Changements

- **Ajouté** pour les nouvelles fonctionnalités
- **Modifié** pour les changements de fonctionnalités existantes
- **Déprécié** pour les fonctionnalités qui seront supprimées dans une version future
- **Supprimé** pour les fonctionnalités supprimées dans cette version
- **Corrigé** pour les corrections de bugs
- **Sécurité** pour les vulnérabilités corrigées
