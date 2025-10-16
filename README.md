# BoliBana Stock

Application de gestion de stock pour BoliBana.

## Fonctionnalités

- Gestion des produits et du stock
- Suivi des ventes
- Notifications de stock bas
- Interface moderne avec Tailwind CSS

## 📚 Documentation

### Documentation Technique
- [**Système de Catégories et Rayons**](./DOCUMENTATION_CATEGORIES_RAYONS.md) - Architecture complète du système de catégories
- [**Correction de Validation des Catégories**](./CATEGORY_VALIDATION_FIX.md) - Documentation de la correction du bug de validation
- [**Correction des Catégories Niveau 0**](./LEVEL_0_CATEGORIES_FIX.md) - Documentation de la correction des catégories globales personnalisées
- [**Guide de Création Mobile**](./MOBILE_CATEGORY_CREATION_GUIDE.md) - Guide pour la création de catégories via mobile

### Documentation API
- [**API Documentation**](./api/README.md) - Documentation complète de l'API REST

## Architecture et Organisation

### Structure du Projet
```
bolibana-stock/
├── app/
│   ├── core/          # Application principale (utilisateurs, logs, notifications)
│   ├── inventory/     # Gestion des stocks
│   └── sales/         # Gestion des ventes
├── theme/             # Configuration Tailwind CSS
├── templates/         # Templates HTML
├── static/           # Fichiers statiques
└── bolibanastock/    # Configuration du projet
```

### Bonnes Pratiques
- Une application par fonctionnalité
- Séparation claire des responsabilités (MVC)
- Tests automatisés avec pytest
- Documentation du code et des API
- Versionnage avec Git
- Optimisation des requêtes (select_related, prefetch_related)
- Indexation des modèles
- Gestion sécurisée des fichiers statiques et médias
- Cache pour les données fréquemment consultées

## Dépendances

### Base Essentielle
- **Django** : Framework web principal
- **django-tailwind** : Intégration de Tailwind CSS
- **django-crispy-forms** : Pour des formulaires stylés et ergonomiques
- **crispy-tailwind** : Support Tailwind pour crispy-forms
- **python-dotenv** : Gestion des variables d'environnement
- **Pillow** : Traitement des images
- **openpyxl** : Import/Export Excel
- **django-import-export** : Import/Export de données (CSV, Excel)

### Packages Utiles
- **django-widget-tweaks** : Personnalisation des champs de formulaire
- **django-simple-history** : Suivi des modifications
- **django-extensions** : Commandes de développement supplémentaires
- **whitenoise** : Gestion des fichiers statiques
- **django-filter** : Filtrage des listes
- **django-debug-toolbar** : Analyse des requêtes SQL et performances
- **django-rest-framework** : API REST pour synchronisation
- **celery** : Tâches asynchrones (emails, rapports)

### Développement et Tests
- **coverage** : Analyse de couverture des tests
- **pytest-django** : Framework de tests modernes

## Prérequis

- Python 3.8+
- Node.js 14+
- npm ou yarn
- Redis (pour Celery)

## Installation

1. Cloner le dépôt :
```bash
git clone [URL_DU_REPO]
cd bolibana-stock
```

2. Créer et activer l'environnement virtuel :
```bash
python -m venv venv
source venv/Scripts/activate  # Windows (Git Bash)
```

3. Installer les dépendances Python :
```bash
pip install -r requirements.txt
```

4. Installer les dépendances Node.js :
```bash
cd theme
npm install
```

5. Configurer les variables d'environnement :
```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

6. Appliquer les migrations :
```bash
python manage.py migrate
```

7. Créer un superutilisateur :
```bash
python manage.py createsuperuser
```

8. Lancer le serveur de développement :
```bash
python manage.py runserver
```

9. Dans un autre terminal, lancer Tailwind CSS :
```bash
cd theme
npm run dev
```

10. Lancer Celery (si nécessaire) :
```bash
celery -A bolibanastock worker -l info
```

## Développement

### Commandes Utiles
```bash
# Lancer les tests
pytest

# Vérifier la couverture
pytest --cov

# Créer une migration
python manage.py makemigrations

# Appliquer les migrations
python manage.py migrate

# Créer un superutilisateur
python manage.py createsuperuser

# Collecter les fichiers statiques
python manage.py collectstatic

# Lancer Celery
celery -A bolibanastock worker -l info
```

### Structure des Tests
```
tests/
├── conftest.py           # Configuration pytest
├── factories/            # Factories pour les tests
├── unit/                 # Tests unitaires
└── integration/          # Tests d'intégration
```

## Déploiement

### Production
- Serveur web (Nginx/Apache)
- Base de données PostgreSQL
- Gestion des fichiers statiques avec Whitenoise
- Configuration SSL/TLS
- Variables d'environnement sécurisées
- Redis pour Celery
- Gunicorn comme serveur WSGI

### Support
- Documentation utilisateur
- Guide d'installation
- Support technique

## Sécurité

- Authentification sécurisée
- Chiffrement des données sensibles
- Audits de sécurité réguliers
- Protection CSRF
- Validation des entrées
- Gestion sécurisée des fichiers uploadés

## Licence

[Votre licence ici] 