# 📚 Documentation - Système de Catégories et Rayons de Supermarché

## 🎯 Vue d'ensemble

Cette documentation décrit les modifications apportées au système de catégories de BoliBanaStock pour intégrer la classification des rayons de supermarché, tout en maintenant la flexibilité pour les catégories personnalisées.

## 🔧 Modifications du Modèle Category

### Nouveaux Champs Ajoutés

#### 1. `is_global` (BooleanField)
- **Description** : Indique si la catégorie est accessible à tous les sites
- **Valeurs** :
  - `True` : Catégorie globale (accessible à tous les sites)
  - `False` : Catégorie spécifique à un site
- **Défaut** : `False`

#### 2. `is_rayon` (BooleanField)
- **Description** : Indique si la catégorie représente un rayon de supermarché
- **Valeurs** :
  - `True` : Rayon de supermarché standardisé
  - `False` : Catégorie personnalisée
- **Défaut** : `False`

#### 3. `rayon_type` (CharField)
- **Description** : Type de rayon de supermarché (obligatoire si `is_rayon=True`)
- **Choix disponibles** :
  - `frais_libre_service` : Frais Libre Service
  - `rayons_traditionnels` : Rayons Traditionnels
  - `epicerie` : Épicerie
  - `petit_dejeuner` : Petit-déjeuner
  - `tout_pour_bebe` : Tout pour bébé
  - `liquides` : Liquides
  - `non_alimentaire` : Non Alimentaire
  - `dph` : DPH (Droguerie, Parfumerie, Hygiène)
  - `textile` : Textile
  - `bazar` : Bazar
- **Contraintes** : Obligatoire si `is_rayon=True`, NULL si `is_rayon=False`

## 📊 Types de Catégories

### 1. Rayons Globaux (`is_global=True`, `is_rayon=True`)
- **Description** : Rayons de supermarché accessibles à tous les sites
- **Exemple** : "Boucherie", "Épicerie", "Frais Libre Service"
- **`rayon_type`** : Obligatoire
- **`site_configuration`** : NULL

### 2. Catégories Globales Personnalisées (`is_global=True`, `is_rayon=False`)
- **Description** : Catégories globales qui ne sont pas des rayons
- **Exemple** : "Promotions", "Nouveautés", "Produits Bio"
- **`rayon_type`** : NULL
- **`site_configuration`** : NULL

### 3. Catégories Spécifiques au Site (`is_global=False`, `is_rayon=False`)
- **Description** : Catégories personnalisées pour un site spécifique
- **Exemple** : "Produits Locaux", "Saisonniers", "Favoris"
- **`rayon_type`** : NULL
- **`site_configuration`** : ID du site

### 4. Rayons Spécifiques au Site (`is_global=False`, `is_rayon=True`)
- **Description** : Rayons personnalisés pour un site spécifique
- **Exemple** : "Rayon Bio Local", "Rayon Halal", "Rayon Artisanal"
- **`rayon_type`** : Obligatoire (peut être personnalisé)
- **`site_configuration`** : ID du site

## 🔍 Méthodes de Récupération

### Méthodes de Classe Ajoutées

```python
# Récupérer toutes les catégories globales
Category.get_global_categories()

# Récupérer tous les rayons (globaux + spécifiques)
Category.get_rayons()

# Récupérer les rayons par type
Category.get_rayons_by_type('epicerie')

# Récupérer les catégories globales non-rayons
Category.get_global_non_rayons()

# Récupérer les catégories spécifiques à un site
Category.get_site_categories(site_configuration)

# Récupérer toutes les catégories disponibles (globales + spécifiques)
Category.get_all_available_categories(site_configuration)

# Récupérer rayons + catégories spécifiques au site
Category.get_rayons_and_site_categories(site_configuration)
```

## ✅ Règles de Validation

### 1. Validation `rayon_type`
```python
# Si is_rayon=True, rayon_type est obligatoire
if self.is_rayon and not self.rayon_type:
    raise ValidationError("Le champ 'rayon_type' est obligatoire quand 'is_rayon' est True")

# Si is_rayon=False, rayon_type est forcé à NULL
if not self.is_rayon and self.rayon_type:
    self.rayon_type = None
```

### 2. Validation `parent`
```python
# Si c'est un rayon principal, il ne peut pas avoir de parent
if is_rayon and parent:
    raise ValidationError("Un rayon principal ne peut pas avoir de catégorie parente.")

# Si ce n'est pas un rayon principal ET ce n'est pas une catégorie globale, il doit avoir un parent
# Les catégories globales personnalisées (is_global=True, is_rayon=False) peuvent exister sans parent
if not is_rayon and not is_global and not parent:
    raise ValidationError("Une sous-catégorie doit avoir une catégorie parente.")
```

### 3. Contraintes de Cohérence
- **Rayons globaux** : `is_global=True`, `is_rayon=True`, `rayon_type` obligatoire, `parent=NULL`, `site_configuration=NULL`
- **Catégories globales** : `is_global=True`, `is_rayon=False`, `rayon_type=NULL`, `parent=NULL`, `site_configuration=NULL`
- **Catégories site** : `is_global=False`, `is_rayon=False`, `rayon_type=NULL`, `parent` obligatoire, `site_configuration` obligatoire
- **Rayons site** : `is_global=False`, `is_rayon=True`, `rayon_type` obligatoire, `parent=NULL`, `site_configuration` obligatoire

### 4. Règles de Parent
- **Rayons** (`is_rayon=True`) : Ne peuvent jamais avoir de parent
- **Catégories globales** (`is_global=True`) : Peuvent exister sans parent
- **Catégories spécifiques au site** (`is_global=False`, `is_rayon=False`) : Doivent avoir un parent (rayon)

> 📋 **Note** : Pour plus de détails sur la correction de validation implémentée, voir [CATEGORY_VALIDATION_FIX.md](./CATEGORY_VALIDATION_FIX.md)

## 🏪 Classification des Rayons de Supermarché

### Structure Hiérarchique

#### 1. Frais Libre Service
- Boucherie
- Charcuterie Libre Service
- Traiteur et Plats Préparés
- Poisson Frais Emballé
- Produits Laitiers et Desserts Frais
- Fromagerie
- Crémerie
- Fruits et Légumes
- Fraîche Découpe
- Jus de Fruits Frais
- Vrac Conventionnel ou Bio
- Pain et Viennoiseries Industriels
- Produits Surgelés

#### 2. Rayons Traditionnels
- Boucherie Traditionnelle
- Charcuterie-Traiteur
- Poissonnerie
- Fromagerie Traditionnelle
- Boulangerie-Pâtisserie

#### 3. Épicerie
- Conserves
- Plats Préparés
- Vinaigre, Huiles et Condiments
- Sauces
- Soupes
- Produits Secs
- Pâtes
- Riz
- Céréales Salées
- Gâteaux Salés et Apéritifs
- Farines
- Sucre
- Fruits Secs Conditionnés
- Aide à la Pâtisserie
- Confiserie
- Produits Diététiques et Biologiques
- Produits de Terroir

#### 4. Petit-déjeuner
- Thé et Café
- Céréales Sucrées
- Confiture, Miel et Pâte à Tartiner
- Biscottes et Tartines

#### 5. Tout pour bébé
- Petits Pots, Compotes et Desserts Lactés
- Couches
- Produits d'Hygiène Bébé
- Articles de Puériculture

#### 6. Liquides
- Eau
- Sodas
- Jus de Fruits
- Boissons Chaudes
- Boissons Énergisantes

#### 7. Non Alimentaire
- Alimentation Animale

#### 8. DPH (Droguerie, Parfumerie, Hygiène)
- Droguerie
- Parfumerie
- Hygiène

#### 9. Textile
- Vêtements, Chaussures et Chaussons
- Lingerie
- Linge de Maison

#### 10. Bazar
- Quincaillerie
- Bricolage
- Accessoires Automobiles
- Petit Électroménager
- Gros Électroménager
- Jouets
- Papeterie
- Librairie
- Décoration
- Vaisselle Jetable
- Jardinage et Loisirs
- Bagagerie

## 🚀 Script de Création

### Fichier : `create_global_supermarket_categories.py`

Ce script crée automatiquement toutes les catégories de rayons de supermarché dans la base de données.

#### Utilisation
```bash
python create_global_supermarket_categories.py
```

#### Fonctionnalités
- Création automatique de tous les rayons
- Gestion des doublons (mise à jour si existe déjà)
- Transaction sécurisée (tout ou rien)
- Rapport détaillé de création
- Vérification des données créées

#### Exemple de Sortie
```
🏪 BoliBanaStock - Création des Catégories Globales de Supermarché
======================================================================

📦 Création du rayon: Frais Libre Service
  ✅ Créée: Frais Libre Service
    ✅ Créée: Boucherie
    ✅ Créée: Charcuterie Libre Service
    ...

🎉 Création terminée!
   📊 Catégories créées: 45
   🔄 Catégories mises à jour: 0
   📈 Total traité: 45
```

## 📱 Impact sur l'Interface Mobile

### Structure d'Affichage Proposée

```
📦 RAYONS DE SUPERMARCHÉ
├── 🥩 Frais Libre Service
│   ├── Boucherie
│   ├── Charcuterie
│   └── Traiteur
├── 🛒 Épicerie
│   ├── Conserves
│   ├── Pâtes
│   └── Riz
└── 🥤 Liquides
    ├── Eau
    ├── Sodas
    └── Jus

🌐 CATÉGORIES GLOBALES
├── Promotions
├── ✨ Nouveautés
└── Produits Bio

🏢 MES CATÉGORIES
├── Produits Locaux
├── Saisonniers
└── Favoris
```

### API Endpoints

#### Récupérer les Rayons
```http
GET /api/categories/?is_rayon=true
```

#### Récupérer les Rayons par Type
```http
GET /api/categories/?is_rayon=true&rayon_type=epicerie
```

#### Récupérer les Catégories Globales
```http
GET /api/categories/?is_global=true
```

#### Récupérer Toutes les Catégories Disponibles
```http
GET /api/categories/?site_configuration=1
```

## 🔄 Migration de Base de Données

### Nouvelle Migration
```bash
python manage.py makemigrations inventory --name add_global_categories
python manage.py migrate
```

### Nouveaux Champs dans la Table
```sql
ALTER TABLE inventory_category ADD COLUMN is_global BOOLEAN DEFAULT FALSE;
ALTER TABLE inventory_category ADD COLUMN is_rayon BOOLEAN DEFAULT FALSE;
ALTER TABLE inventory_category ADD COLUMN rayon_type VARCHAR(50) NULL;
```

## 🧪 Tests et Validation

### Script de Test : `exemple_categories_avec_ou_sans_rayon.py`

Ce script démontre l'utilisation des différents types de catégories et valide les règles de validation.

#### Exécution
```bash
python exemple_categories_avec_ou_sans_rayon.py
```

#### Tests Inclus
- Création de catégories sans rayon
- Création de rayons avec type
- Validation des erreurs
- Récupération des catégories

## 📈 Avantages de cette Approche

### 1. Flexibilité Maximale
- Rayons standardisés pour tous les sites
- Catégories personnalisées par site
- Catégories globales partagées
- Rayons spécifiques par site

### 2. Rétrocompatibilité
- Les catégories existantes continuent de fonctionner
- Migration progressive possible
- Aucun impact sur les données actuelles

### 3. Standardisation
- Classification uniforme basée sur les supermarchés
- Facilite la gestion des stocks
- Améliore l'expérience utilisateur

### 4. Évolutivité
- Facile d'ajouter de nouveaux types de rayons
- Support des sous-catégories infinies
- API prête pour l'interface mobile

## 🔧 Maintenance et Évolution

### Ajout de Nouveaux Types de Rayons
1. Modifier `RAYON_TYPE_CHOICES` dans le modèle
2. Créer une migration
3. Mettre à jour le script de création si nécessaire

### Ajout de Catégories Globales
```python
Category.objects.create(
    name="Nouvelle Catégorie Globale",
    is_global=True,
    is_rayon=False,
    rayon_type=None,
    site_configuration=None
)
```

### Ajout de Rayons Spécifiques
```python
Category.objects.create(
    name="Nouveau Rayon Local",
    is_global=False,
    is_rayon=True,
    rayon_type="nouveau_type",
    site_configuration=user_site
)
```

## 📞 Support et Questions

Pour toute question ou problème lié à cette implémentation :

1. Vérifier les logs de validation
2. Consulter les exemples dans `exemple_categories_avec_ou_sans_rayon.py`
3. Tester avec le script de création
4. Vérifier la cohérence des données en base

---

**Version** : 1.0  
**Date** : Janvier 2024  
**Auteur** : BoliBanaStock Team
