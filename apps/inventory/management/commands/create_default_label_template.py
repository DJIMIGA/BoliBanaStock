from django.core.management.base import BaseCommand
from django.db import transaction

from apps.core.models import Configuration
from apps.inventory.models import LabelTemplate, LabelSetting


class Command(BaseCommand):
    help = (
        "Crée un modèle global d'étiquette par défaut (40x30 barcode), et des paramètres par site. "
        "Si un site a déjà un modèle par défaut local, il est conservé (override)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--force', action='store_true', default=False,
            help="Remplacer le modèle par défaut existant si présent",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options['force']

        # 1) Créer/mettre à jour le modèle GLOBAL par défaut
        global_default = LabelTemplate.objects.filter(site_configuration__isnull=True, is_default=True).first()
        if global_default and force:
            # On désactive l'actuel par défaut global si --force, pour en créer un nouveau
            global_default.is_default = False
            global_default.save(update_fields=['is_default'])
            global_default = None

        if not global_default:
            global_default = LabelTemplate.objects.create(
                site_configuration=None,
                name="Standard 40x30",
                type='barcode',
                width_mm=40,
                height_mm=30,
                dpi=203,
                margins_mm='2,2,2,2',
                layout=None,
                is_default=True,
            )
            self.stdout.write(self.style.SUCCESS("✔ Modèle global par défaut créé: Standard 40x30"))
        else:
            self.stdout.write(self.style.SUCCESS(f"✔ Modèle global par défaut trouvé: {global_default.name}"))

        # 2) Pour chaque site: créer les settings si absents, et définir un default_template
        sites = Configuration.objects.all()
        created_settings = 0
        updated_settings = 0
        for site in sites:
            settings = LabelSetting.objects.filter(site_configuration=site).first()
            if not settings:
                settings = LabelSetting.objects.create(
                    site_configuration=site,
                    default_template=global_default,
                    default_copies=1,
                    include_logo=True,
                    include_price=True,
                    show_cug=True,
                    barcode_type='EAN13',
                    printer_prefs={
                        'paper_width': '58mm',
                        'density': 'normal',
                        'codepage': 'CP850',
                    },
                    currency='FCFA',
                )
                created_settings += 1
                self.stdout.write(self.style.SUCCESS(
                    f"✔ Paramètres créés pour '{site.site_name}' (par défaut: global)"
                ))
            else:
                # Si aucun template local par défaut n'est défini, on pointe sur le global
                if not settings.default_template or settings.default_template.site_configuration_id != site.id:
                    # On ne remplace pas un modèle local par défaut existant
                    # On n'écrase que si vide ou incohérent
                    settings.default_template = settings.default_template or global_default
                    if settings.default_template and settings.default_template.site_configuration_id not in (site.id, None):
                        settings.default_template = global_default
                    settings.save(update_fields=['default_template'])
                    updated_settings += 1
                self.stdout.write(self.style.SUCCESS(
                    f"✔ Site '{site.site_name}': template défaut = '{settings.default_template.name if settings.default_template else 'global'}'"
                ))

        self.stdout.write(self.style.MIGRATE_HEADING("Résumé"))
        self.stdout.write(f"Paramètres créés: {created_settings}")
        self.stdout.write(f"Paramètres mis à jour: {updated_settings}")
        self.stdout.write(self.style.SUCCESS("Terminé."))


