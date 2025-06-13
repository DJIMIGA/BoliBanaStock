from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone

class Categorie(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nom

    class Meta:
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"

class Marque(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nom

    class Meta:
        verbose_name = "Marque"
        verbose_name_plural = "Marques"

class Produit(models.Model):
    nom = models.CharField(max_length=100)
    reference = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    prix_achat = models.DecimalField(max_digits=10, decimal_places=2)
    prix_vente = models.DecimalField(max_digits=10, decimal_places=2)
    categorie = models.ForeignKey(Categorie, on_delete=models.PROTECT)
    marque = models.ForeignKey(Marque, on_delete=models.PROTECT)
    image = models.ImageField(upload_to='produits/', blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nom} ({self.reference})"

    class Meta:
        verbose_name = "Produit"
        verbose_name_plural = "Produits"

class Client(models.Model):
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100, blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    adresse = models.TextField(blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nom} {self.prenom}" if self.prenom else self.nom

    class Meta:
        verbose_name = "Client"
        verbose_name_plural = "Clients"

class Fournisseur(models.Model):
    nom = models.CharField(max_length=100)
    contact = models.CharField(max_length=100, blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    adresse = models.TextField(blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nom

    class Meta:
        verbose_name = "Fournisseur"
        verbose_name_plural = "Fournisseurs"

class Stock(models.Model):
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite = models.PositiveIntegerField(default=0)
    seuil_alerte = models.PositiveIntegerField(default=5)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.produit} - Stock: {self.quantite}"

    class Meta:
        verbose_name = "Stock"
        verbose_name_plural = "Stocks"

class Commande(models.Model):
    STATUS_CHOICES = [
        ('attente', 'En attente'),
        ('validee', 'Validée'),
        ('annulee', 'Annulée'),
    ]

    client = models.ForeignKey(Client, on_delete=models.PROTECT)
    date_commande = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=10, choices=STATUS_CHOICES, default='attente')
    montant_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"Commande #{self.id} - {self.client}"

    class Meta:
        verbose_name = "Commande"
        verbose_name_plural = "Commandes"

class LigneCommande(models.Model):
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, related_name='lignes')
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite = models.PositiveIntegerField()
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    montant = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.montant = self.quantite * self.prix_unitaire
        super().save(*args, **kwargs)
        # Mise à jour du montant total de la commande
        self.commande.montant_total = sum(ligne.montant for ligne in self.commande.lignes.all())
        self.commande.save()

    def __str__(self):
        return f"{self.produit} x {self.quantite}"

    class Meta:
        verbose_name = "Ligne de commande"
        verbose_name_plural = "Lignes de commande"

class Transaction(models.Model):
    TYPE_CHOICES = [
        ('entree', 'Entrée'),
        ('sortie', 'Sortie'),
        ('transfert', 'Transfert'),
    ]

    type_transaction = models.CharField(max_length=10, choices=TYPE_CHOICES)
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite = models.PositiveIntegerField()
    date_transaction = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Mise à jour du stock
        stock = Stock.objects.get(produit=self.produit)
        if self.type_transaction == 'entree':
            stock.quantite += self.quantite
        elif self.type_transaction == 'sortie':
            stock.quantite -= self.quantite
        stock.save()

    def __str__(self):
        return f"{self.type_transaction} - {self.produit} x {self.quantite}"

    class Meta:
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions" 