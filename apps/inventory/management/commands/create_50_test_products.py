"""
Commande Django pour créer 50 produits de test et vérifier les modèles
Run with: python manage.py create_50_test_products
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from apps.inventory.models import Product, Category, Brand
from apps.core.models import Configuration
from apps.subscription.services import SubscriptionService
import random


class Command(BaseCommand):
    help = 'Crée 50 produits de test et vérifie les modèles'

    def handle(self, *args, **options):
        self.stdout.write("=" * 60)
        self.stdout.write(self.style.SUCCESS("  CREATION DE 50 PRODUITS DE TEST"))
        self.stdout.write("=" * 60)

        # Récupérer ou créer un site de test
        try:
            site = Configuration.objects.first()
            if not site:
                self.stdout.write(self.style.ERROR("[ERREUR] Aucun site trouvé. Créez d'abord un site."))
                return
            self.stdout.write(self.style.SUCCESS(f"[OK] Site trouvé: {site.nom_societe or site.site_name}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[ERREUR] Impossible de récupérer le site: {e}"))
            return

        # Vérifier le plan du site
        plan = SubscriptionService.get_site_plan(site)
        if plan:
            self.stdout.write(f"[INFO] Plan actuel: {plan.name} (limite: {plan.max_products or 'illimité'} produits)")
        else:
            self.stdout.write(self.style.WARNING("[WARN] Aucun plan trouvé pour ce site"))

        # Récupérer ou créer des catégories et marques
        categories = Category.objects.filter(site_configuration=site)
        if not categories.exists():
            self.stdout.write("[INFO] Creation de categories de test...")
            categories = [
                Category.objects.create(name="Electronique", site_configuration=site),
                Category.objects.create(name="Alimentaire", site_configuration=site),
                Category.objects.create(name="Vetements", site_configuration=site),
                Category.objects.create(name="Maison et Jardin", site_configuration=site),
                Category.objects.create(name="Sport", site_configuration=site),
            ]
        else:
            categories = list(categories)
        self.stdout.write(self.style.SUCCESS(f"[OK] {len(categories)} categorie(s) disponible(s)"))

        brands = Brand.objects.filter(site_configuration=site)
        if not brands.exists():
            self.stdout.write("[INFO] Création de marques de test...")
            brands = [
                Brand.objects.create(name="Marque A", site_configuration=site),
                Brand.objects.create(name="Marque B", site_configuration=site),
                Brand.objects.create(name="Marque C", site_configuration=site),
                Brand.objects.create(name="Marque D", site_configuration=site),
                Brand.objects.create(name="Marque E", site_configuration=site),
            ]
        else:
            brands = list(brands)
        self.stdout.write(self.style.SUCCESS(f"[OK] {len(brands)} marque(s) disponible(s)"))

        # Vérifier la limite actuelle
        current_count = SubscriptionService.get_site_product_count(site)
        self.stdout.write(f"\n[INFO] Nombre actuel de produits: {current_count}")

        if plan and plan.max_products is not None:
            remaining = plan.max_products - current_count
            self.stdout.write(f"[INFO] Produits restants avant limite: {remaining}")
            
            if remaining < 50:
                self.stdout.write(self.style.WARNING(f"[WARN] Attention: Vous ne pouvez ajouter que {remaining} produits avant d'atteindre la limite"))
                self.stdout.write(f"[INFO] Création de {remaining} produits au lieu de 50...")
                num_products = max(0, remaining)
            else:
                num_products = 50
        else:
            num_products = 50
            self.stdout.write("[INFO] Pas de limite de produits (plan illimité)")

        # Noms de produits de test (sans caracteres speciaux pour eviter les problemes d'encodage)
        product_names = [
            "Produit Test Alpha", "Produit Test Beta", "Produit Test Gamma", "Produit Test Delta",
            "Produit Test Epsilon", "Produit Test Zeta", "Produit Test Eta", "Produit Test Theta",
            "Produit Test Iota", "Produit Test Kappa", "Produit Test Lambda", "Produit Test Mu",
            "Produit Test Nu", "Produit Test Xi", "Produit Test Omicron", "Produit Test Pi",
            "Produit Test Rho", "Produit Test Sigma", "Produit Test Tau", "Produit Test Upsilon",
            "Produit Test Phi", "Produit Test Chi", "Produit Test Psi", "Produit Test Omega",
            "Article Premium 1", "Article Premium 2", "Article Premium 3", "Article Premium 4",
            "Article Premium 5", "Article Standard 1", "Article Standard 2", "Article Standard 3",
            "Article Standard 4", "Article Standard 5", "Article Economique 1", "Article Economique 2",
            "Article Economique 3", "Article Economique 4", "Article Economique 5", "Article Special 1",
            "Article Special 2", "Article Special 3", "Article Special 4", "Article Special 5",
            "Produit Nouveau 1", "Produit Nouveau 2", "Produit Nouveau 3", "Produit Nouveau 4",
            "Produit Nouveau 5", "Produit Test Final 1", "Produit Test Final 2", "Produit Test Final 3"
        ]

        # Créer les produits
        self.stdout.write(f"\n[INFO] Création de {num_products} produits...")
        created_products = []
        errors = []

        for i in range(num_products):
            try:
                # Générer un CUG unique (5 chiffres)
                cug = f"{10000 + current_count + i:05d}"
                
                # Vérifier que le CUG n'existe pas déjà
                while Product.objects.filter(cug=cug).exists():
                    cug = f"{10000 + current_count + i + 1000:05d}"
                
                # Prix aléatoires
                purchase_price = Decimal(str(random.uniform(100, 5000))).quantize(Decimal('0.01'))
                selling_price = purchase_price * Decimal('1.5')  # Marge de 50%
                
                # Quantité aléatoire
                quantity = Decimal(str(random.randint(0, 100)))
                
                # Créer le produit
                product = Product.objects.create(
                    name=product_names[i % len(product_names)] + f" #{i+1}",
                    cug=cug,
                    description=f"Description du produit de test #{i+1}. Produit cree automatiquement pour les tests.",
                    purchase_price=purchase_price,
                    selling_price=selling_price,
                    quantity=quantity,
                    alert_threshold=Decimal('10'),
                    category=random.choice(categories),
                    brand=random.choice(brands),
                    site_configuration=site,
                    is_active=True,
                    sale_unit_type='quantity',
                )
                created_products.append(product)
                
                if (i + 1) % 10 == 0:
                    self.stdout.write(f"  [{i+1}/{num_products}] Produits créés...")
                    
            except Exception as e:
                error_msg = f"Produit #{i+1}: {str(e)}"
                errors.append(error_msg)
                try:
                    self.stdout.write(self.style.ERROR(f"[ERREUR] Produit #{i+1}: {str(e)}"))
                except UnicodeEncodeError:
                    self.stdout.write(self.style.ERROR(f"[ERREUR] Produit #{i+1}: Erreur d'encodage"))

        self.stdout.write(self.style.SUCCESS(f"\n[OK] {len(created_products)} produit(s) créé(s) avec succès"))

        if errors:
            self.stdout.write(self.style.ERROR(f"\n[ERREUR] {len(errors)} erreur(s) lors de la création:"))
            for error in errors[:5]:  # Afficher seulement les 5 premières
                self.stdout.write(f"  - {error}")

        # Vérifier le nouveau nombre de produits
        new_count = SubscriptionService.get_site_product_count(site)
        self.stdout.write(f"\n[INFO] Nouveau nombre de produits: {new_count}")

        # Vérifier les limites
        if plan and plan.max_products is not None:
            limit_info = SubscriptionService.check_product_limit(site)
            self.stdout.write(f"\n[INFO] Informations sur les limites:")
            self.stdout.write(f"  - Plan: {limit_info['plan_name']}")
            self.stdout.write(f"  - Produits actuels: {limit_info['current_count']}")
            self.stdout.write(f"  - Limite max: {limit_info['max_products']}")
            self.stdout.write(f"  - Restants: {limit_info['remaining']}")
            self.stdout.write(f"  - Pourcentage utilisé: {limit_info['percentage_used']:.1f}%")
            
            if limit_info['can_add']:
                self.stdout.write(self.style.SUCCESS(f"  - Statut: ✅ Peut encore ajouter des produits"))
            else:
                self.stdout.write(self.style.WARNING(f"  - Statut: ⚠️ Limite atteinte!"))
                
            # Vérifier les produits excédentaires
            excess_ids = SubscriptionService.get_excess_product_ids(site)
            if excess_ids:
                self.stdout.write(f"\n[INFO] Produits excédentaires (lecture seule): {len(excess_ids)}")
                self.stdout.write(f"  - IDs: {excess_ids[:10]}{'...' if len(excess_ids) > 10 else ''}")

        # Vérifier les modèles
        self.stdout.write(f"\n[INFO] Vérification des modèles...")
        self.stdout.write(f"  - Produits avec site_configuration: {Product.objects.filter(site_configuration=site).count()}")
        self.stdout.write(f"  - Produits actifs: {Product.objects.filter(site_configuration=site, is_active=True).count()}")
        self.stdout.write(f"  - Produits avec catégorie: {Product.objects.filter(site_configuration=site, category__isnull=False).count()}")
        self.stdout.write(f"  - Produits avec marque: {Product.objects.filter(site_configuration=site, brand__isnull=False).count()}")

        # Vérifier les relations
        sample_product = created_products[0] if created_products else None
        if sample_product:
            self.stdout.write(f"\n[INFO] Exemple de produit créé:")
            self.stdout.write(f"  - ID: {sample_product.id}")
            self.stdout.write(f"  - Nom: {sample_product.name}")
            self.stdout.write(f"  - CUG: {sample_product.cug}")
            self.stdout.write(f"  - Site: {sample_product.site_configuration.nom_societe or sample_product.site_configuration.site_name}")
            self.stdout.write(f"  - Catégorie: {sample_product.category.name}")
            self.stdout.write(f"  - Marque: {sample_product.brand.name}")
            self.stdout.write(f"  - Prix d'achat: {sample_product.purchase_price}")
            self.stdout.write(f"  - Prix de vente: {sample_product.selling_price}")
            self.stdout.write(f"  - Quantité: {sample_product.quantity}")

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("[OK] TERMINE"))
        self.stdout.write("=" * 60)

