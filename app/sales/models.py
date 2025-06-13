from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model
from inventory.models import Produit, Client

User = get_user_model()

class Vente(models.Model):
    client = models.ForeignKey(Client, on_delete=models.PROTECT)
    vendeur = models.ForeignKey(User, on_delete=models.PROTECT, blank=True, null=True)
    date_vente = models.DateTimeField(auto_now_add=True)
    montant_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    statut = models.CharField(max_length=20, choices=[
        ('brouillon', 'Brouillon'),
        ('confirmee', 'Confirmée'),
        ('annulee', 'Annulée'),
    ], default='brouillon')
    notes = models.TextField(blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Vente #{self.id} - {self.client}"

    def update_montant_total(self):
        self.montant_total = sum(ligne.montant for ligne in self.lignevente_set.all())
        self.save()

    class Meta:
        verbose_name = "Vente"
        verbose_name_plural = "Ventes"
        ordering = ['-date_vente']

class LigneVente(models.Model):
    vente = models.ForeignKey(Vente, on_delete=models.CASCADE)
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite = models.PositiveIntegerField()
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    montant = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.montant = self.quantite * self.prix_unitaire
        super().save(*args, **kwargs)
        self.vente.update_montant_total()

    def __str__(self):
        return f"{self.produit} x {self.quantite}"

    class Meta:
        verbose_name = "Ligne de vente"
        verbose_name_plural = "Lignes de vente"

class Paiement(models.Model):
    vente = models.ForeignKey(Vente, on_delete=models.PROTECT)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    date_paiement = models.DateTimeField(auto_now_add=True)
    mode_paiement = models.CharField(max_length=20, choices=[
        ('especes', 'Espèces'),
        ('carte', 'Carte bancaire'),
        ('cheque', 'Chèque'),
        ('virement', 'Virement'),
        ('autre', 'Autre'),
    ])
    reference = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Paiement #{self.id} - {self.vente}"

    class Meta:
        verbose_name = "Paiement"
        verbose_name_plural = "Paiements"
        ordering = ['-date_paiement'] 