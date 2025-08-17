## Gestion des Templates
- Les templates doivent être placés dans le dossier `templates` à la racine du projet
- La structure des templates doit suivre la structure des applications :
  ```
  templates/
  ├── inventory/
  │   ├── product_list.html
  │   ├── product_detail.html
  │   └── ...
  ├── sales/
  │   ├── sale_list.html
  │   └── ...
  └── base.html
  ```
- Ne pas créer de dossiers `templates` dans les applications individuelles
- Utiliser l'héritage de templates avec `{% extends "base.html" %}` pour maintenir une cohérence visuelle
- Les templates partiels (composants réutilisables) doivent être placés dans un dossier `partials` à la racine des templates
- Toujours utiliser les balises de template Django pour les URLs : `{% url 'app_name:view_name' %}`
- Utiliser les filtres de template Django pour le formatage des données (dates, nombres, etc.)
- Éviter la logique complexe dans les templates, la déplacer dans les vues ou les modèles 