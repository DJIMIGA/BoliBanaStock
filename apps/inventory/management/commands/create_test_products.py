from django.core.management.base import BaseCommand
from apps.inventory.models import Product, Category, Brand
from django.utils.text import slugify
import random
from decimal import Decimal

def format_fcfa(amount):
    """
    Formate un montant en FCFA avec séparateurs de milliers
    Exemple: 150000 -> 150 000 FCFA
    """
    return f"{amount:,}".replace(",", " ") + " FCFA"

class Command(BaseCommand):
    help = 'Crée des produits de test avec des données aléatoires'

    def handle(self, *args, **kwargs):
        # Créer quelques catégories de test si elles n'existent pas
        categories = [
            ('Électronique', 'Équipements électroniques et gadgets'),
            ('Vêtements', 'Vêtements et accessoires'),
            ('Alimentation', 'Produits alimentaires et boissons'),
            ('Maison', 'Articles pour la maison'),
            ('Sport', 'Équipements sportifs'),
            ('Beauté', 'Produits de beauté et cosmétiques'),
            ('Jardinage', 'Articles de jardinage et plantes'),
            ('Bureau', 'Fournitures de bureau'),
            ('Santé', 'Produits de santé et bien-être'),
            ('Jouets', 'Jouets et jeux')
        ]

        for cat_name, cat_desc in categories:
            Category.objects.get_or_create(
                name=cat_name,
                defaults={
                    'description': cat_desc,
                    'slug': slugify(cat_name)
                }
            )

        # Créer quelques marques de test si elles n'existent pas
        brands = [
            'BoliTech',
            'MaliStyle',
            'AfriFood',
            'HomePlus',
            'SportPro',
            'BeautyMali',
            'GardenPro',
            'OfficePlus',
            'HealthCare',
            'ToyLand'
        ]

        for brand_name in brands:
            Brand.objects.get_or_create(
                name=brand_name,
                defaults={
                    'description': f'Marque {brand_name}'
                }
            )

        # Liste de noms de produits de test
        products = [
            # Électronique
            {
                'name': 'Smartphone BoliTech X1',
                'description': 'Smartphone dernière génération',
                'purchase_price': 120000,
                'selling_price': 150000,
                'category': 'Électronique',
                'brand': 'BoliTech'
            },
            {
                'name': 'Tablette BoliTech Pro',
                'description': 'Tablette 10 pouces',
                'purchase_price': 95000,
                'selling_price': 120000,
                'category': 'Électronique',
                'brand': 'BoliTech'
            },
            # Vêtements
            {
                'name': 'T-shirt MaliStyle Premium',
                'description': 'T-shirt en coton de qualité',
                'purchase_price': 20000,
                'selling_price': 25000,
                'category': 'Vêtements',
                'brand': 'MaliStyle'
            },
            {
                'name': 'Jean MaliStyle Classic',
                'description': 'Jean coupe droite',
                'purchase_price': 35000,
                'selling_price': 45000,
                'category': 'Vêtements',
                'brand': 'MaliStyle'
            },
            # Alimentation
            {
                'name': 'Riz Basmati AfriFood',
                'description': 'Riz basmati de qualité supérieure',
                'purchase_price': 12000,
                'selling_price': 15000,
                'category': 'Alimentation',
                'brand': 'AfriFood'
            },
            {
                'name': 'Huile d\'Arachide AfriFood',
                'description': 'Huile d\'arachide pure',
                'purchase_price': 9500,
                'selling_price': 12000,
                'category': 'Alimentation',
                'brand': 'AfriFood'
            },
            # Maison
            {
                'name': 'Casserole HomePlus',
                'description': 'Casserole antiadhésive',
                'purchase_price': 28000,
                'selling_price': 35000,
                'category': 'Maison',
                'brand': 'HomePlus'
            },
            {
                'name': 'Set de Couteaux HomePlus',
                'description': 'Set de 6 couteaux',
                'purchase_price': 22000,
                'selling_price': 28000,
                'category': 'Maison',
                'brand': 'HomePlus'
            },
            # Sport
            {
                'name': 'Ballon de Football SportPro',
                'description': 'Ballon professionnel',
                'purchase_price': 15000,
                'selling_price': 20000,
                'category': 'Sport',
                'brand': 'SportPro'
            },
            {
                'name': 'Raquette de Tennis SportPro',
                'description': 'Raquette professionnelle',
                'purchase_price': 60000,
                'selling_price': 75000,
                'category': 'Sport',
                'brand': 'SportPro'
            },
            # Beauté
            {
                'name': 'Crème Hydratante BeautyMali',
                'description': 'Crème hydratante naturelle',
                'purchase_price': 8500,
                'selling_price': 12000,
                'category': 'Beauté',
                'brand': 'BeautyMali'
            },
            {
                'name': 'Shampoing BeautyMali',
                'description': 'Shampoing aux extraits naturels',
                'purchase_price': 7500,
                'selling_price': 10000,
                'category': 'Beauté',
                'brand': 'BeautyMali'
            },
            # Jardinage
            {
                'name': 'Kit Jardinage GardenPro',
                'description': 'Kit complet de jardinage',
                'purchase_price': 45000,
                'selling_price': 60000,
                'category': 'Jardinage',
                'brand': 'GardenPro'
            },
            {
                'name': 'Arrosoir GardenPro',
                'description': 'Arrosoir 5L',
                'purchase_price': 12000,
                'selling_price': 15000,
                'category': 'Jardinage',
                'brand': 'GardenPro'
            },
            # Bureau
            {
                'name': 'Set Bureau OfficePlus',
                'description': 'Set complet de fournitures de bureau',
                'purchase_price': 25000,
                'selling_price': 35000,
                'category': 'Bureau',
                'brand': 'OfficePlus'
            },
            {
                'name': 'Classeur OfficePlus',
                'description': 'Classeur 4 anneaux',
                'purchase_price': 8000,
                'selling_price': 12000,
                'category': 'Bureau',
                'brand': 'OfficePlus'
            },
            # Santé
            {
                'name': 'Vitamines HealthCare',
                'description': 'Complexe de vitamines',
                'purchase_price': 15000,
                'selling_price': 20000,
                'category': 'Santé',
                'brand': 'HealthCare'
            },
            {
                'name': 'Tensiomètre HealthCare',
                'description': 'Tensiomètre digital',
                'purchase_price': 35000,
                'selling_price': 45000,
                'category': 'Santé',
                'brand': 'HealthCare'
            },
            # Jouets
            {
                'name': 'Jeu de Construction ToyLand',
                'description': 'Set de construction 100 pièces',
                'purchase_price': 28000,
                'selling_price': 35000,
                'category': 'Jouets',
                'brand': 'ToyLand'
            },
            {
                'name': 'Poupée ToyLand',
                'description': 'Poupée traditionnelle',
                'purchase_price': 15000,
                'selling_price': 20000,
                'category': 'Jouets',
                'brand': 'ToyLand'
            }
        ]

        products_created = 0
        for product_data in products:
            category = Category.objects.get(name=product_data['category'])
            brand = Brand.objects.get(name=product_data['brand'])
            
            # Générer un CUG unique
            cug = Product.generate_unique_cug()
            
            product, created = Product.objects.get_or_create(
                name=product_data['name'],
                defaults={
                    'description': product_data['description'],
                    'purchase_price': product_data['purchase_price'],
                    'selling_price': product_data['selling_price'],
                    'quantity': random.randint(5, 50),
                    'alert_threshold': 10,
                    'category': category,
                    'brand': brand,
                    'slug': slugify(product_data['name']),
                    'cug': cug,
                    'is_active': True
                }
            )
            
            if created:
                products_created += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Produit créé : {product.name}\n"
                        f"  CUG : {product.cug}\n"
                        f"  Prix d'achat : {format_fcfa(product.purchase_price)}\n"
                        f"  Prix de vente : {format_fcfa(product.selling_price)}\n"
                        f"  Quantité : {product.quantity}\n"
                        f"  Catégorie : {product.category.name}\n"
                        f"  Marque : {product.brand.name}\n"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n{products_created} produits de test ont été créés avec succès !'
            )
        ) 
