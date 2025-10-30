from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.inventory.models import Product, Transaction, Category, Brand
from apps.core.models import Configuration


class StockMovementsVisibilityTests(TestCase):
    def setUp(self):
        self.User = get_user_model()
        self.user = self.User.objects.create_user(username="admin", password="admin123", is_staff=True, is_superuser=True)
        self.site = Configuration.objects.create(
            site_name="Site Test",
            site_owner=self.user,
            nom_societe="Société Test",
            adresse="Adresse Test",
            telephone="000000000",
            email="test@example.com",
            devise="FCFA",
            tva=18,
        )
        self.category = Category.objects.create(name="Cat Test")
        self.brand = Brand.objects.create(name="Brand Test")

        self.product = Product.objects.create(
            name="Produit Test",
            slug="produit-test",
            cug="PTEST-001",
            quantity=10,
            purchase_price=1000,
            selling_price=1500,
            category=self.category,
            brand=self.brand,
            site_configuration=self.site,
        )

        # Associer le site à l'utilisateur si le champ existe
        if hasattr(self.user, "site_configuration"):
            setattr(self.user, "site_configuration", self.site)
            self.user.save()

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.base = "/api/v1/products"

    def _stock_movements(self, product_id):
        url = f"{self.base}/{product_id}/stock_movements/"
        return self.client.get(url)

    def _remove_stock(self, product_id, quantity, context="manual"):
        url = f"{self.base}/{product_id}/remove_stock/"
        return self.client.post(url, {"quantity": quantity, "context": context}, format="json")

    def test_remove_stock_creates_transaction_and_is_listed(self):
        # Act: retrait manuel de 3
        resp = self._remove_stock(self.product.id, 3, context="manual")
        self.assertEqual(resp.status_code, 200)

        # Assert: la transaction existe
        self.assertTrue(Transaction.objects.filter(product=self.product).exists())

        # Et elle remonte dans stock_movements
        resp_mv = self._stock_movements(self.product.id)
        self.assertEqual(resp_mv.status_code, 200)
        movements = resp_mv.json().get("movements", [])
        self.assertGreaterEqual(len(movements), 1)

        # Le dernier mouvement (ordre descendant côté API) doit être un retrait (out)
        types = [m.get("type") for m in movements]
        self.assertIn("out", types + [])  # présence d'au moins un 'out'

    def test_backorder_retrieval_visible(self):
        # Mettre le stock à 1 pour forcer un backorder avec retrait de 5
        self.product.quantity = 1
        self.product.save()

        resp = self._remove_stock(self.product.id, 5, context="manual")
        self.assertEqual(resp.status_code, 200)

        # Vérifier le type backorder dans les mouvements
        resp_mv = self._stock_movements(self.product.id)
        self.assertEqual(resp_mv.status_code, 200)
        movements = resp_mv.json().get("movements", [])
        self.assertGreaterEqual(len(movements), 1)

        types = [m.get("type") for m in movements]
        self.assertIn("backorder", types)


