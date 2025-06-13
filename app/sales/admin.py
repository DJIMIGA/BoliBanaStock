from django.contrib import admin
from .models import Vente, LigneVente, Paiement

class LigneVenteInline(admin.TabularInline):
    model = LigneVente
    extra = 1

class PaiementInline(admin.TabularInline):
    model = Paiement
    extra = 1

@admin.register(Vente)
class VenteAdmin(admin.ModelAdmin):
    list_display = ('id', 'client', 'vendeur', 'date_vente', 'statut', 'montant_total')
    search_fields = ('client__nom', 'client__prenom', 'vendeur__username')
    list_filter = ('statut', 'date_vente', 'vendeur')
    inlines = [LigneVenteInline, PaiementInline]
    readonly_fields = ('date_creation', 'date_modification')
    date_hierarchy = 'date_vente'

@admin.register(LigneVente)
class LigneVenteAdmin(admin.ModelAdmin):
    list_display = ('vente', 'produit', 'quantite', 'prix_unitaire', 'montant')
    search_fields = ('vente__id', 'produit__nom', 'produit__reference')
    list_filter = ('vente__date_vente',)

@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = ('id', 'vente', 'montant', 'mode_paiement', 'date_paiement', 'reference')
    search_fields = ('vente__id', 'reference')
    list_filter = ('mode_paiement', 'date_paiement')
    date_hierarchy = 'date_paiement' 