# BoliBana Stock

Application de gestion de stock pour BoliBana.

## Fonctionnalités

- Gestion des produits et du stock
- Suivi des ventes
- Notifications de stock bas
- Interface moderne avec Tailwind CSS

## Prérequis

- Python 3.8+
- Node.js 14+
- npm ou yarn

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

## Structure du projet

```
bolibana-stock/
├── app/
│   ├── core/          # Application principale
│   ├── inventory/     # Gestion des stocks
│   └── sales/         # Gestion des ventes
├── theme/             # Configuration Tailwind CSS
├── templates/         # Templates HTML
├── static/           # Fichiers statiques
└── bolibanastock/    # Configuration du projet
```

## Développement

- Utiliser `npm run dev` pour le développement avec Tailwind CSS
- Utiliser `npm run build` pour la production

## Licence

[Votre licence ici] 