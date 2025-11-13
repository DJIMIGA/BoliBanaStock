# Logos BoliBana Stock

Ce dossier contient les différentes versions du logo de l'application BoliBana Stock.

## Versions disponibles

### 1. `logo.svg` (64x64)
**Usage principal** : Logo icône pour la navigation et les en-têtes
- Format : SVG vectoriel
- Dimensions : 64x64 pixels
- Couleurs : Bleu BoliBana (#2B3A67), Or (#FFD700), Vert forêt (#2E8B57)
- Design : Boîtes empilées représentant le stock avec graphique de croissance

### 2. `logo-full.svg` (200x64)
**Usage** : Logo complet avec texte pour les pages d'accueil et documents
- Format : SVG vectoriel
- Dimensions : 200x64 pixels
- Contient : Icône + texte "BoliBana Stock"
- Idéal pour : En-têtes de page, documents officiels, présentations

### 3. `logo-white.svg` (64x64)
**Usage** : Version avec fond transparent pour fonds sombres
- Format : SVG vectoriel
- Dimensions : 64x64 pixels
- Fond : Transparent
- Idéal pour : Fond sombre, mode sombre, overlays

### 4. `favicon.svg` (32x32)
**Usage** : Favicon du navigateur
- Format : SVG vectoriel
- Dimensions : 32x32 pixels
- Version simplifiée du logo principal
- Compatible avec tous les navigateurs modernes

## Design

Le logo représente :
- **Boîtes empilées** : Symbolisent la gestion de stock et l'inventaire
- **Graphique de croissance** : Représente la croissance et le suivi des stocks
- **Couleurs de la marque** :
  - Bleu BoliBana (#2B3A67) : Professionnalisme et confiance
  - Or (#FFD700) : Excellence et valeur
  - Vert forêt (#2E8B57) : Croissance et succès

## Utilisation dans l'application

### Templates Django
Le logo est utilisé dans :
- `templates/base.html` : Navigation principale
- `templates/partials/mobile_menu.html` : Menu mobile

### Intégration
```html
<!-- Logo standard -->
<img src="{% static 'img/logo.svg' %}" alt="BoliBana Stock">

<!-- Logo complet -->
<img src="{% static 'img/logo-full.svg' %}" alt="BoliBana Stock">

<!-- Logo pour fond sombre -->
<img src="{% static 'img/logo-white.svg' %}" alt="BoliBana Stock">
```

## Formats recommandés

- **Web** : SVG (recommandé pour la qualité et la scalabilité)
- **Print** : SVG ou PNG haute résolution (300 DPI minimum)
- **Mobile** : SVG ou PNG @2x/@3x selon les besoins

## Notes techniques

- Tous les logos sont optimisés pour le web
- Les fichiers SVG sont compatibles avec tous les navigateurs modernes
- Les couleurs respectent la charte graphique de BoliBana Stock
- Les logos sont responsives et s'adaptent à toutes les tailles d'écran

