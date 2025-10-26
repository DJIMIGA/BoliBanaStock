# Ajout des champs pour le retrait de background dans le modèle Product

# Dans apps/inventory/models.py, ajouter ces champs au modèle Product :

class Product(models.Model):
    # ... champs existants ...
    
    # Champs pour le retrait de background
    image_no_bg = models.ImageField(
        upload_to='products/no_bg/',
        blank=True,
        null=True,
        help_text="Image du produit sans background"
    )
    
    image_processed = models.BooleanField(
        default=False,
        help_text="Indique si l'image a été traitée pour retirer le background"
    )
    
    # ... autres champs existants ...
