from django.core.management.base import BaseCommand
from django.db import transaction

from app.core.models import Configuration
from app.inventory.models import LabelTemplate, LabelSetting


class Command(BaseCommand):
    help = (
        "Crée ou met à jour le modèle GLOBAL 'Standard 50x30 (58mm)' (203dpi, papier 57.5mm, zone 48mm) "
        "et associe les paramètres des sites qui n'ont pas de modèle local spécifique."
    )

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', default=False, help='Forcer la mise à jour du modèle global')

    @transaction.atomic
    def handle(self, *args, **options):
        force = options['force']

        target_name = "Standard 50x30 (58mm)"

        # 1) Créer ou mettre à jour le modèle GLOBAL par défaut
        global_default = LabelTemplate.objects.filter(site_configuration__isnull=True, is_default=True).first()
        if global_default is None:
            global_default = LabelTemplate.objects.create(
                site_configuration=None,
                name=target_name,
                type='barcode',
                width_mm=50,
                height_mm=30,
                dpi=203,
                margins_mm='2,2,2,2',
                layout=None,
                is_default=True,
                paper_width_mm=57.5,
                printing_width_mm=48.0,
            )
            self.stdout.write(self.style.SUCCESS(f"✔ Modèle global créé: {target_name}"))
        else:
            if force or global_default.name != target_name:
                global_default.name = target_name
                global_default.type = 'barcode'
                global_default.width_mm = 50
                global_default.height_mm = 30
                global_default.dpi = 203
                global_default.margins_mm = '2,2,2,2'
                global_default.paper_width_mm = 57.5
                global_default.printing_width_mm = 48.0
                global_default.is_default = True
                global_default.save()
                self.stdout.write(self.style.SUCCESS(f"✔ Modèle global mis à jour: {target_name}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"✔ Modèle global déjà en place: {target_name}"))

        # 2) Rattacher les settings des sites au global si pas de modèle local dédié
        sites = Configuration.objects.all()
        created_settings = 0
        updated_settings = 0
        for site in sites:
            settings = LabelSetting.objects.filter(site_configuration=site).first()
            if not settings:
                LabelSetting.objects.create(
                    site_configuration=site,
                    default_template=global_default,
                    default_copies=1,
                    include_logo=True,
                    include_price=True,
                    show_cug=True,
                    barcode_type='EAN13',
                    printer_prefs={'paper_width': '58mm', 'density': 'normal', 'codepage': 'CP850'},
                    currency='FCFA',
                )
                created_settings += 1
            else:
                if not settings.default_template or settings.default_template.site_configuration_id not in (site.id,):
                    # Si aucun modèle local spécifique: pointer sur le global
                    settings.default_template = global_default
                    settings.save(update_fields=['default_template'])
                    updated_settings += 1

        self.stdout.write(self.style.MIGRATE_HEADING("Résumé"))
        self.stdout.write(f"Paramètres créés: {created_settings}")
        self.stdout.write(f"Paramètres mis à jour: {updated_settings}")
        self.stdout.write(self.style.SUCCESS("Terminé."))


