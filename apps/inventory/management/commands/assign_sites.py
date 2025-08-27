from django.core.management.base import BaseCommand
from apps.inventory.models import Product, Category, Brand, Customer, Supplier, Order, Transaction
from apps.core.models import Configuration, User


class Command(BaseCommand):
    help = 'Assigne les données existantes aux sites des utilisateurs'

    def handle(self, *args, **options):
        self.stdout.write('Début de l\'assignation des données aux sites...')
        
        # Récupérer tous les sites
        sites = Configuration.objects.all()
        
        if not sites.exists():
            self.stdout.write(self.style.ERROR('Aucun site trouvé. Créez d\'abord des sites.'))
            return
        
        # Assigner les données au premier site par défaut
        default_site = sites.first()
        self.stdout.write(f'Utilisation du site par défaut: {default_site.site_name}')
        
        # Compter les données à assigner
        products_count = Product.objects.filter(site_configuration__isnull=True).count()
        categories_count = Category.objects.filter(site_configuration__isnull=True).count()
        brands_count = Brand.objects.filter(site_configuration__isnull=True).count()
        customers_count = Customer.objects.filter(site_configuration__isnull=True).count()
        suppliers_count = Supplier.objects.filter(site_configuration__isnull=True).count()
        orders_count = Order.objects.filter(site_configuration__isnull=True).count()
        transactions_count = Transaction.objects.filter(site_configuration__isnull=True).count()
        
        self.stdout.write(f'Données à assigner:')
        self.stdout.write(f'  - Produits: {products_count}')
        self.stdout.write(f'  - Catégories: {categories_count}')
        self.stdout.write(f'  - Marques: {brands_count}')
        self.stdout.write(f'  - Clients: {customers_count}')
        self.stdout.write(f'  - Fournisseurs: {suppliers_count}')
        self.stdout.write(f'  - Commandes: {orders_count}')
        self.stdout.write(f'  - Transactions: {transactions_count}')
        
        # Assigner les données
        updated_products = Product.objects.filter(site_configuration__isnull=True).update(site_configuration=default_site)
        updated_categories = Category.objects.filter(site_configuration__isnull=True).update(site_configuration=default_site)
        updated_brands = Brand.objects.filter(site_configuration__isnull=True).update(site_configuration=default_site)
        updated_customers = Customer.objects.filter(site_configuration__isnull=True).update(site_configuration=default_site)
        updated_suppliers = Supplier.objects.filter(site_configuration__isnull=True).update(site_configuration=default_site)
        updated_orders = Order.objects.filter(site_configuration__isnull=True).update(site_configuration=default_site)
        updated_transactions = Transaction.objects.filter(site_configuration__isnull=True).update(site_configuration=default_site)
        
        self.stdout.write(self.style.SUCCESS('Assignation terminée:'))
        self.stdout.write(f'  - Produits assignés: {updated_products}')
        self.stdout.write(f'  - Catégories assignées: {updated_categories}')
        self.stdout.write(f'  - Marques assignées: {updated_brands}')
        self.stdout.write(f'  - Clients assignés: {updated_customers}')
        self.stdout.write(f'  - Fournisseurs assignés: {updated_suppliers}')
        self.stdout.write(f'  - Commandes assignées: {updated_orders}')
        self.stdout.write(f'  - Transactions assignées: {updated_transactions}')
        
        self.stdout.write(self.style.SUCCESS('Toutes les données ont été assignées au site par défaut.')) 
