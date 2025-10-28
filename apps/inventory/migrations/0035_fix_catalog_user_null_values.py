# Generated manually to fix NULL user_id values in CatalogGeneration

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


def fix_null_user_values(apps, schema_editor):
    """
    Corriger les valeurs NULL dans user_id en les supprimant ou en assignant un utilisateur par défaut
    """
    CatalogGeneration = apps.get_model('inventory', 'CatalogGeneration')
    
    # Compter les enregistrements avec user_id NULL
    null_count = CatalogGeneration.objects.filter(user_id__isnull=True).count()
    
    if null_count > 0:
        print(f"🧹 Suppression de {null_count} générations avec user_id NULL...")
        # Supprimer les générations avec user_id NULL
        CatalogGeneration.objects.filter(user_id__isnull=True).delete()
        print(f"✅ {null_count} générations supprimées")
    
    print("✅ Valeurs NULL corrigées pour CatalogGeneration.user_id")


def reverse_fix_null(apps, schema_editor):
    """
    Opération inverse - ne peut pas être annulée
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0034_fix_catalog_user_null_values'),
    ]

    operations = [
        migrations.RunPython(
            fix_null_user_values,
            reverse_fix_null,
        ),
    ]
