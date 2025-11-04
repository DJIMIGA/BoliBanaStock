from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Sale


@receiver(post_save, sender=Sale)
def generate_sale_reference(sender, instance, created, **kwargs):
    """
    Génère une référence unique pour la vente après sa création.
    Format: V{site_id}-{date}-{sequence}
    Exemple: V19-20251104-001
    """
    # Ne générer la référence que lors de la création et si elle n'existe pas déjà
    if created and not instance.reference:
        # Récupérer l'ID du site (ou utiliser 0 si pas de site)
        site_id = instance.site_configuration_id if instance.site_configuration_id else 0
        
        # Utiliser la date de la vente (sale_date) au format YYYYMMDD
        sale_date = instance.sale_date or timezone.now()
        date_str = sale_date.strftime('%Y%m%d')
        
        # Calculer la séquence pour ce site et cette date
        # Chercher toutes les ventes du même site et du même jour avec une référence
        day_start = sale_date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Filtrer les ventes du même site et du même jour
        if site_id:
            same_day_sales = Sale.objects.filter(
                site_configuration_id=site_id,
                sale_date__gte=day_start,
                sale_date__lte=day_end,
                reference__isnull=False
            ).exclude(id=instance.id)
        else:
            # Si pas de site, utiliser site_id=0 pour les ventes sans site
            same_day_sales = Sale.objects.filter(
                site_configuration_id__isnull=True,
                sale_date__gte=day_start,
                sale_date__lte=day_end,
                reference__isnull=False
            ).exclude(id=instance.id)
        
        # Extraire les séquences existantes pour trouver le prochain numéro
        max_sequence = 0
        for sale in same_day_sales:
            if sale.reference:
                # Extraire la séquence de la référence (format: V{site_id}-{date}-{sequence})
                parts = sale.reference.split('-')
                if len(parts) == 3 and parts[2].isdigit():
                    try:
                        seq = int(parts[2])
                        if seq > max_sequence:
                            max_sequence = seq
                    except ValueError:
                        pass
        
        # Incrémenter la séquence
        next_sequence = max_sequence + 1
        
        # Générer la référence au format V{site_id}-{date}-{sequence}
        reference = f"V{site_id}-{date_str}-{next_sequence:03d}"
        
        # Vérifier l'unicité (au cas où)
        while Sale.objects.filter(reference=reference).exists():
            next_sequence += 1
            reference = f"V{site_id}-{date_str}-{next_sequence:03d}"
        
        # Mettre à jour la référence dans l'instance et en base de données
        instance.reference = reference
        # Sauvegarder sans déclencher le signal à nouveau en utilisant update()
        Sale.objects.filter(pk=instance.pk).update(reference=reference)
        # S'assurer que l'instance est à jour en mémoire
        instance.refresh_from_db()

