from django.core.management.base import BaseCommand
from django.db import connection
from django.core.management import call_command


class Command(BaseCommand):
    help = "Supprimer les tables auth_* obsolètes de la base de données"

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Forcer la suppression sans confirmation',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== Nettoyage des tables auth_* obsolètes ==="))
        
        # 1. Vérifier d'abord l'utilisation
        self.stdout.write("1. Vérification de l'utilisation des tables auth_*...")
        call_command('check_auth_tables_usage')
        
        # 2. Demander confirmation
        if not options['force']:
            confirm = input("\n⚠️  Voulez-vous vraiment supprimer les tables auth_* ? (oui/non): ")
            if confirm.lower() not in ['oui', 'o', 'yes', 'y']:
                self.stdout.write("❌ Suppression annulée")
                return
        
        try:
            with connection.cursor() as cursor:
                # 3. Lister les tables auth_* à supprimer
                self.stdout.write("\n2. Tables auth_* à supprimer:")
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name LIKE 'auth_%'
                    ORDER BY table_name;
                """)
                auth_tables = cursor.fetchall()
                
                if not auth_tables:
                    self.stdout.write("   Aucune table auth_* trouvée")
                    return
                
                for table in auth_tables:
                    self.stdout.write(f"   - {table[0]}")
                
                # 4. Supprimer les tables dans l'ordre inverse des dépendances
                self.stdout.write("\n3. Suppression des tables...")
                
                # Ordre de suppression (les tables avec FK en premier)
                tables_to_drop = [
                    'auth_user_groups',
                    'auth_user_user_permissions', 
                    'auth_group_permissions',
                    'auth_permission',
                    'auth_group',
                    'auth_user',
                ]
                
                for table_name in tables_to_drop:
                    # Vérifier si la table existe
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = %s
                        );
                    """, [table_name])
                    
                    if cursor.fetchone()[0]:
                        self.stdout.write(f"   Suppression de {table_name}...")
                        cursor.execute(f'DROP TABLE IF EXISTS {table_name} CASCADE;')
                        self.stdout.write(f"   ✅ {table_name} supprimée")
                    else:
                        self.stdout.write(f"   ⏭️  {table_name} n'existe pas")
                
                # 5. Vérifier qu'il ne reste plus de tables auth_*
                self.stdout.write("\n4. Vérification finale...")
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name LIKE 'auth_%';
                """)
                remaining_tables = cursor.fetchall()
                
                if remaining_tables:
                    self.stdout.write(self.style.WARNING("⚠️  Tables auth_* restantes:"))
                    for table in remaining_tables:
                        self.stdout.write(f"   - {table[0]}")
                else:
                    self.stdout.write(self.style.SUCCESS("✅ Toutes les tables auth_* ont été supprimées"))
                
                self.stdout.write(self.style.SUCCESS("\n🎉 Nettoyage terminé avec succès !"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Erreur lors du nettoyage: {e}"))
            raise
