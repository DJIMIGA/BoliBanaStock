from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connection
from django.conf import settings


class Command(BaseCommand):
    help = 'Vérifie et crée les tables auth manquantes (auth_group, auth_permission, etc.)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== Vérification des tables auth ==='))
        
        try:
            with connection.cursor() as cursor:
                # Vérifier si auth_group existe
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'auth_group'
                    );
                """)
                auth_group_exists = cursor.fetchone()[0]
                
                # Vérifier si auth_permission existe
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'auth_permission'
                    );
                """)
                auth_permission_exists = cursor.fetchone()[0]
                
                # Vérifier si auth_user existe (ne devrait pas si on utilise core.User)
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'auth_user'
                    );
                """)
                auth_user_exists = cursor.fetchone()[0]
                
                self.stdout.write(f"auth_group existe: {auth_group_exists}")
                self.stdout.write(f"auth_permission existe: {auth_permission_exists}")
                self.stdout.write(f"auth_user existe: {auth_user_exists}")
                
                # Si des tables manquent, réappliquer les migrations auth
                if not auth_group_exists or not auth_permission_exists:
                    self.stdout.write(self.style.WARNING('\n⚠️ Tables auth manquantes détectées'))
                    self.stdout.write('Réapplication des migrations auth...')
                    
                    # Supprimer les entrées de django_migrations pour auth uniquement
                    cursor.execute("""
                        DELETE FROM django_migrations 
                        WHERE app = 'auth';
                    """)
                    
                    # Réappliquer les migrations auth
                    call_command('migrate', 'auth', '--noinput', verbosity=1)
                    
                    self.stdout.write(self.style.SUCCESS('✅ Migrations auth réappliquées'))
                else:
                    self.stdout.write(self.style.SUCCESS('\n✅ Toutes les tables auth existent'))
                
                # Vérifier que les tables sont maintenant présentes
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'auth_group'
                    );
                """)
                auth_group_exists_after = cursor.fetchone()[0]
                
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'auth_permission'
                    );
                """)
                auth_permission_exists_after = cursor.fetchone()[0]
                
                if auth_group_exists_after and auth_permission_exists_after:
                    self.stdout.write(self.style.SUCCESS('\n✅ Vérification finale: Toutes les tables auth sont présentes'))
                else:
                    self.stdout.write(self.style.ERROR('\n❌ Erreur: Certaines tables auth sont toujours manquantes'))
                    if not auth_group_exists_after:
                        self.stdout.write(self.style.ERROR('  - auth_group manquante'))
                    if not auth_permission_exists_after:
                        self.stdout.write(self.style.ERROR('  - auth_permission manquante'))
                        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Erreur: {str(e)}'))
            # En cas d'erreur, essayer de réappliquer toutes les migrations
            self.stdout.write('Tentative de réapplication complète des migrations...')
            try:
                call_command('migrate', '--noinput', verbosity=1)
                self.stdout.write(self.style.SUCCESS('✅ Migrations réappliquées'))
            except Exception as migrate_error:
                self.stdout.write(self.style.ERROR(f'❌ Erreur lors de la réapplication: {str(migrate_error)}'))

