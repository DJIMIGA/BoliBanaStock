from django.core.management.base import BaseCommand
from django.db import transaction

from apps.inventory.models import LabelTemplate, LabelSetting, LabelBatch


class Command(BaseCommand):
    help = (
        "Nettoie les modèles d'étiquettes dupliqués par site en gardant le modèle global par défaut. "
        "Réassigne les paramètres et lots au modèle global."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply', action='store_true', default=False,
            help="Appliquer réellement les changements (sinon dry-run)",
        )
        parser.add_argument(
            '--name', default='Standard 40x30',
            help="Nom des modèles à considérer comme dupliqués (défaut: Standard 40x30)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        do_apply = options['apply']
        name = options['name']

        global_default = LabelTemplate.objects.filter(site_configuration__isnull=True, is_default=True).first()
        if not global_default:
            self.stdout.write(self.style.ERROR("Aucun modèle global par défaut trouvé. Exécutez d'abord create_default_label_template."))
            return

        # Cible: modèles de ce nom, par site (non global)
        candidates = LabelTemplate.objects.filter(site_configuration__isnull=False, name=name)

        deleted = 0
        reassigned_settings = 0
        reassigned_batches = 0

        for tmpl in candidates:
            # Réassigner les settings de ce site si pointent vers ce template
            settings_qs = LabelSetting.objects.filter(site_configuration=tmpl.site_configuration, default_template=tmpl)
            count_settings = settings_qs.count()
            if do_apply and count_settings:
                settings_qs.update(default_template=global_default)
            reassigned_settings += count_settings

            # Réassigner les lots si pointent sur ce template
            batches_qs = LabelBatch.objects.filter(site_configuration=tmpl.site_configuration, template=tmpl)
            count_batches = batches_qs.count()
            if do_apply and count_batches:
                batches_qs.update(template=global_default)
            reassigned_batches += count_batches

            # Peut-on supprimer ? (après réassignation, il ne doit plus être référencé)
            in_use = LabelBatch.objects.filter(template=tmpl).exists() or \
                     LabelSetting.objects.filter(default_template=tmpl).exists()

            if in_use:
                self.stdout.write(self.style.WARNING(
                    f"⏭️ Non supprimé (encore référencé): {tmpl.name} (site={tmpl.site_configuration_id})"
                ))
                continue

            # On supprime seulement les templates standard de base (prudence: critères par défaut)
            is_standard_shape = (tmpl.width_mm == 40 and tmpl.height_mm == 30 and tmpl.dpi == 203 and tmpl.margins_mm == '2,2,2,2')
            is_default_name = (tmpl.name == name)

            if is_standard_shape and is_default_name:
                if do_apply:
                    tmpl.delete()
                deleted += 1
                self.stdout.write(self.style.SUCCESS(
                    f"🗑️ Supprimé: {name} (site={tmpl.site_configuration_id})"
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f"⏭️ Conservé (customisé): {tmpl.name} ({tmpl.width_mm}x{tmpl.height_mm}@{tmpl.dpi})"
                ))

        mode = 'APPLY' if do_apply else 'DRY-RUN'
        self.stdout.write(self.style.MIGRATE_HEADING(f"Résumé ({mode})"))
        self.stdout.write(f"Paramètres réassignés: {reassigned_settings}")
        self.stdout.write(f"Lots réassignés: {reassigned_batches}")
        self.stdout.write(f"Modèles supprimés: {deleted}")
        if not do_apply:
            self.stdout.write(self.style.WARNING("Aucun changement effectué. Relancez avec --apply pour appliquer."))


