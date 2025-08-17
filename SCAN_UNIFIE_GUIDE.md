# 🔍 Guide du Système de Scan Unifié - BoliBana Stock

## 📋 Vue d'ensemble

Le système de scan unifié permet de rechercher et identifier les produits en utilisant un seul champ qui gère automatiquement :
- **CUG** (Code Unique de Gestion) - 5 chiffres
- **EAN** (Code-barres) - 8+ chiffres  
- **Nom du produit** - Texte libre

## 🎯 Avantages

✅ **Interface simplifiée** : Un seul champ pour tous les types de recherche  
✅ **Détection automatique** : Le système reconnaît automatiquement le type de valeur saisie  
✅ **Recherche intelligente** : Priorité donnée aux correspondances exactes  
✅ **Gestion des codes-barres** : Création automatique des codes EAN lors de la création de produits  
✅ **Multi-sites** : Respect de la séparation des données par site  

## 🚀 Utilisation

### **1. Scan Rapide (Page dédiée)**
- **URL** : `/inventory/scan/`
- **Accès** : Navigation principale → "Scan Rapide"
- **Fonctionnalités** :
  - Recherche instantanée par CUG, EAN ou nom
  - Redirection automatique vers le détail du produit
  - Suggestions de produits similaires si aucun résultat
  - Interface optimisée pour le scan mobile

### **2. Recherche dans la liste des produits**
- **URL** : `/inventory/`
- **Fonctionnalités** :
  - Barre de recherche unifiée
  - Filtrage par statut de stock
  - Lien direct vers le scan rapide

### **3. Création/Modification de produits**
- **Champ de scan** : Remplit automatiquement CUG ou nom selon la valeur saisie
- **Codes EAN** : Création automatique si un code-barres est scanné

## 🔧 Détection automatique des types

### **CUG (5 chiffres)**
```python
if scan_value.isdigit() and len(scan_value) == 5:
    # Remplit automatiquement le champ CUG
    self.cleaned_data['cug'] = scan_value
```

### **EAN (8+ chiffres)**
```python
elif scan_value.isdigit() and len(scan_value) >= 8:
    # Crée automatiquement un code-barres
    Barcode.objects.create(
        product=product,
        ean=scan_value,
        is_primary=True
    )
```

### **Nom de produit (texte)**
```python
else:
    # Remplit automatiquement le champ nom
    self.cleaned_data['name'] = scan_value
```

## 📱 Interface mobile

### **ScanProductScreen (React Native)**
- **Recherche unifiée** : Un seul champ pour tous les types
- **Détection automatique** : Même logique que côté web
- **Navigation intelligente** : Redirection vers le détail ou suggestions

### **API endpoints**
```python
# Recherche unifiée
POST /api/products/scan/
{
    "code": "12345"  # CUG, EAN ou nom
}

# Recherche par type spécifique
GET /api/products/?search=12345
```

## 🏗️ Architecture technique

### **Modèles Django**
```python
class Product(models.Model):
    name = models.CharField(max_length=100)
    cug = models.CharField(max_length=50, unique=True)
    # ... autres champs

class Barcode(models.Model):
    product = models.ForeignKey(Product, related_name='barcodes')
    ean = models.CharField(max_length=50, unique=True)
    is_primary = models.BooleanField(default=False)
```

### **Vues principales**
```python
class ProductQuickScanView(SiteRequiredMixin, View):
    """Vue de scan rapide avec recherche unifiée"""
    
class ProductListView(SiteRequiredMixin, ListView):
    """Liste avec recherche unifiée intégrée"""
```

### **Formulaires**
```python
class ProductForm(forms.ModelForm):
    scan_field = forms.CharField(
        help_text="Scannez un code-barres ou saisissez le CUG, EAN ou nom du produit"
    )
    
    def clean_scan_field(self):
        """Détection automatique et remplissage des champs"""
```

## 🔍 Logique de recherche

### **Priorité de recherche**
1. **CUG exact** (5 chiffres)
2. **Nom exact** (insensible à la casse)
3. **Nom partiel** (contient)
4. **EAN dans Barcode** (modèle lié)
5. **CUG partiel** (contient)
6. **Description partielle** (contient)

### **Filtrage par site**
```python
queryset = Product.objects.filter(
    site_configuration=self.request.user.site_configuration
)
```

## 📊 Exemples d'utilisation

### **Exemple 1 : Scan d'un CUG**
```
Saisie : 12345
Résultat : Remplit automatiquement le champ CUG
Action : Création du produit avec CUG = 12345
```

### **Exemple 2 : Scan d'un code EAN**
```
Saisie : 3017620422003
Résultat : Crée automatiquement un code-barres EAN
Action : Produit créé avec code-barres principal
```

### **Exemple 3 : Saisie d'un nom**
```
Saisie : "Pomme Golden"
Résultat : Remplit automatiquement le champ nom
Action : Produit créé avec nom = "Pomme Golden"
```

## 🚨 Gestion des erreurs

### **Produit non trouvé**
- Affichage d'un message d'erreur explicite
- Suggestions de produits similaires
- Possibilité d'ajouter le produit

### **Conflits de codes**
- Vérification de l'unicité des CUG
- Vérification de l'unicité des codes EAN
- Messages d'erreur détaillés

### **Validation des données**
- Vérification du format des codes
- Validation des prix et quantités
- Gestion des images et fichiers

## 🔄 Workflow complet

### **1. Création d'un produit**
```
1. Saisie dans le champ de scan
2. Détection automatique du type
3. Remplissage des champs appropriés
4. Sauvegarde du produit
5. Création automatique du code-barres si EAN
```

### **2. Recherche d'un produit**
```
1. Saisie dans le champ de recherche
2. Recherche unifiée par CUG, EAN ou nom
3. Affichage des résultats
4. Navigation vers le détail
```

### **3. Modification d'un produit**
```
1. Saisie dans le champ de scan
2. Détection et application des modifications
3. Mise à jour des codes-barres si nécessaire
4. Sauvegarde des changements
```

## 📈 Performance et optimisation

### **Index de base de données**
```python
class Meta:
    indexes = [
        models.Index(fields=['slug']),
        models.Index(fields=['cug']),
        models.Index(fields=['name']),
    ]
```

### **Requêtes optimisées**
```python
queryset = Product.objects.select_related('category', 'brand').filter(
    site_configuration=self.request.user.site_configuration
)
```

### **Cache et mise en cache**
- Mise en cache des résultats de recherche fréquents
- Optimisation des requêtes de base de données
- Chargement différé des images

## 🔧 Configuration et personnalisation

### **Variables d'environnement**
```bash
# Configuration du scanner
BARCODE_SCANNER_ENABLED=true
SCAN_TIMEOUT=5000
AUTO_FOCUS=true
```

### **Paramètres de recherche**
```python
# Délai de recherche automatique (ms)
SEARCH_DELAY = 500

# Longueur minimale pour la recherche
MIN_SEARCH_LENGTH = 3

# Nombre maximum de suggestions
MAX_SUGGESTIONS = 5
```

## 🧪 Tests et validation

### **Tests unitaires**
```python
def test_scan_field_detection(self):
    """Test la détection automatique des types de scan"""
    
def test_unified_search(self):
    """Test la recherche unifiée par CUG, EAN et nom"""
    
def test_barcode_creation(self):
    """Test la création automatique des codes-barres"""
```

### **Tests d'intégration**
```python
def test_complete_workflow(self):
    """Test le workflow complet de création et recherche"""
    
def test_multi_site_isolation(self):
    """Test l'isolation des données par site"""
```

## 📚 Ressources et références

### **Documentation technique**
- [Guide des modèles Django](https://docs.djangoproject.com/)
- [API REST Django](https://www.django-rest-framework.org/)
- [React Native documentation](https://reactnative.dev/)

### **Bibliothèques utilisées**
- **Django** : Framework web principal
- **Django REST Framework** : API REST
- **React Native** : Application mobile
- **QuaggaJS** : Scanner de codes-barres (optionnel)

## 🆘 Support et dépannage

### **Problèmes courants**
1. **Scanner ne fonctionne pas** : Vérifier les permissions caméra
2. **Recherche lente** : Vérifier les index de base de données
3. **Codes dupliqués** : Vérifier la logique de validation

### **Contact support**
- **Email** : support@bolibana.com
- **Documentation** : docs.bolibana.com
- **GitHub** : github.com/bolibana/stock

---

*Dernière mise à jour : {{ date }}*  
*Version : 1.0.0*
