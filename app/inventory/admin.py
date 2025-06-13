from django.contrib import admin
from .models import (
    Fournisseur, Produit, Stock, Client,
    Commande, LigneCommande, Transaction
)

@admin.register(Fournisseur)
class FournisseurAdmin(admin.ModelAdmin):
    list_display = ('nom', 'contact', 'telephone', 'email')
    search_fields = ('nom', 'contact', 'telephone', 'email')
    list_filter = ('date_creation',)

@admin.register(Produit)
class ProduitAdmin(admin.ModelAdmin):
    list_display = ('code', 'nom', 'prix_achat', 'prix_vente', 'unite', 'fournisseur')
    search_fields = ('code', 'nom', 'description')
    list_filter = ('unite', 'fournisseur')
    readonly_fields = ('date_creation', 'date_modification')

@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ('produit', 'quantite', 'date_modification')
    search_fields = ('produit__nom', 'produit__code')
    readonly_fields = ('date_modification',)

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('nom', 'contact', 'telephone', 'email')
    search_fields = ('nom', 'contact', 'telephone', 'email')
    list_filter = ('date_creation',)

class LigneCommandeInline(admin.TabularInline):
    model = LigneCommande
    extra = 1

@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    list_display = ('numero', 'client', 'date_commande', 'statut', 'montant_total')
    search_fields = ('numero', 'client__nom')
    list_filter = ('statut', 'date_commande')
    inlines = [LigneCommandeInline]
    readonly_fields = ('date_creation', 'date_modification')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('produit', 'type_transaction', 'quantite', 'date_transaction')
    search_fields = ('produit__nom', 'produit__code')
    list_filter = ('type_transaction', 'date_transaction')
    readonly_fields = ('date_creation',) 