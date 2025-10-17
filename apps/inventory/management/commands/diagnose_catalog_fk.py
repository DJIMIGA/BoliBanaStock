from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings
from django.db import connection

from apps.inventory.catalog_models import CatalogGeneration


class Command(BaseCommand):
    help = "Diagnostiquer la FK CatalogGeneration.user et la présence de l'utilisateur dans la base"

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            type=str,
            help="Nom d'utilisateur à vérifier (ex: djimiga)",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== Diagnostic CatalogGeneration.user ==="))

        # 1) Modèle utilisateur configuré
        auth_user_model = settings.AUTH_USER_MODEL
        self.stdout.write(f"AUTH_USER_MODEL = {auth_user_model}")

        # 2) Modèle référencé par la FK
        user_field = CatalogGeneration._meta.get_field("user")
        remote_model = user_field.remote_field.model
        remote_table = remote_model._meta.db_table
        self.stdout.write(f"CatalogGeneration.user -> model = {remote_model}")
        self.stdout.write(f"CatalogGeneration.user -> table = {remote_table}")

        # 3) Compter les utilisateurs dans la table du modèle courant
        User = get_user_model()
        total_users = User.objects.count()
        sample_user = User.objects.order_by("id").first()
        self.stdout.write(f"Core users count = {total_users}")
        if sample_user:
            self.stdout.write(f"First core user: id={sample_user.id}, username={getattr(sample_user, 'username', None)}")

        # 4) Vérifier la présence de l'utilisateur fourni
        username = options.get("username")
        if username:
            self.stdout.write(self.style.NOTICE(f"— Vérification de l'utilisateur: {username}"))
            user_obj = User.objects.filter(username=username).only("id", "username").first()
            if not user_obj:
                self.stdout.write(self.style.ERROR("Utilisateur introuvable dans le modèle utilisateur (core)."))
            else:
                self.stdout.write(self.style.SUCCESS(f"Trouvé dans core: id={user_obj.id}, username={user_obj.username}"))

                # Vérifier présence brute en SQL dans auth_user et dans la table core
                core_table = User._meta.db_table
                with connection.cursor() as cursor:
                    # auth_user
                    try:
                        cursor.execute("SELECT 1 FROM auth_user WHERE id = %s LIMIT 1", [user_obj.id])
                        in_auth = cursor.fetchone() is not None
                    except Exception as e:
                        in_auth = False
                        self.stdout.write(self.style.WARNING(f"auth_user check error: {e}"))

                    # core table
                    try:
                        cursor.execute(f"SELECT 1 FROM {core_table} WHERE id = %s LIMIT 1", [user_obj.id])
                        in_core = cursor.fetchone() is not None
                    except Exception as e:
                        in_core = False
                        self.stdout.write(self.style.WARNING(f"{core_table} check error: {e}"))

                self.stdout.write(f"Present in auth_user: {in_auth}")
                self.stdout.write(f"Present in {core_table}: {in_core}")

        # 5) Vérifier la contrainte FK au niveau schéma (table cible)
        self.stdout.write(self.style.NOTICE("— Vérification de la table cible de la FK"))
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT confrelid::regclass::text FROM pg_constraint WHERE conrelid = %s::regclass AND contype = 'f' AND conname LIKE '%%user_id%%'",
                    [CatalogGeneration._meta.db_table],
                )
                row = cursor.fetchone()
                if row:
                    self.stdout.write(f"FK cible réelle (pg_constraint) = {row[0]}")
                else:
                    self.stdout.write("Impossible de déterminer la FK cible via pg_constraint (SGBD non-PostgreSQL ou pas de droits)")
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Inspection contrainte FK échouée: {e}"))

        self.stdout.write(self.style.SUCCESS("Diagnostic terminé."))


