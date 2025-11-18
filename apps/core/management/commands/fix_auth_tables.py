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
                
                # Si des tables manquent, créer directement les tables manquantes
                if not auth_group_exists or not auth_permission_exists:
                    self.stdout.write(self.style.WARNING('\n⚠️ Tables auth manquantes détectées'))
                    self.stdout.write('Création des tables manquantes...')
                    
                    # Vérifier si django_content_type existe (requis pour auth_permission)
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = 'django_content_type'
                        );
                    """)
                    django_content_type_exists = cursor.fetchone()[0]
                    
                    # Créer auth_permission si elle n'existe pas
                    if not auth_permission_exists:
                        if not django_content_type_exists:
                            self.stdout.write(self.style.ERROR('❌ django_content_type n\'existe pas. Exécutez d\'abord: python manage.py migrate contenttypes'))
                        else:
                            self.stdout.write('Création de auth_permission...')
                            try:
                                cursor.execute("""
                                    CREATE TABLE auth_permission (
                                        id SERIAL PRIMARY KEY,
                                        name VARCHAR(255) NOT NULL,
                                        content_type_id INTEGER NOT NULL,
                                        codename VARCHAR(100) NOT NULL,
                                        CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq 
                                            UNIQUE (content_type_id, codename),
                                        CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co 
                                            FOREIGN KEY (content_type_id) 
                                            REFERENCES django_content_type(id) 
                                            DEFERRABLE INITIALLY DEFERRED
                                    );
                                    CREATE INDEX auth_permission_content_type_id_2f476e4b 
                                        ON auth_permission(content_type_id);
                                """)
                                self.stdout.write(self.style.SUCCESS('✅ Table auth_permission créée'))
                            except Exception as e:
                                self.stdout.write(self.style.ERROR(f'❌ Erreur lors de la création de auth_permission: {e}'))
                    
                    # Créer auth_group si elle n'existe pas
                    if not auth_group_exists:
                        self.stdout.write('Création de auth_group...')
                        cursor.execute("""
                            CREATE TABLE auth_group (
                                id SERIAL PRIMARY KEY,
                                name VARCHAR(150) NOT NULL UNIQUE
                            );
                        """)
                        self.stdout.write(self.style.SUCCESS('✅ Table auth_group créée'))
                    
                    # Vérifier à nouveau l'existence après création
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = 'auth_group'
                        );
                    """)
                    auth_group_exists_after_create = cursor.fetchone()[0]
                    
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = 'auth_permission'
                        );
                    """)
                    auth_permission_exists_after_create = cursor.fetchone()[0]
                    
                    # Créer auth_group_permissions si elle n'existe pas
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = 'auth_group_permissions'
                        );
                    """)
                    auth_group_permissions_exists = cursor.fetchone()[0]
                    
                    # Créer auth_group_permissions si les deux tables parentes existent
                    if not auth_group_permissions_exists:
                        if auth_group_exists_after_create and auth_permission_exists_after_create:
                            self.stdout.write('Création de auth_group_permissions...')
                            cursor.execute("""
                            CREATE TABLE auth_group_permissions (
                                id BIGSERIAL PRIMARY KEY,
                                group_id INTEGER NOT NULL,
                                permission_id INTEGER NOT NULL,
                                CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq 
                                    UNIQUE (group_id, permission_id),
                                CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id 
                                    FOREIGN KEY (group_id) 
                                    REFERENCES auth_group(id) 
                                    DEFERRABLE INITIALLY DEFERRED,
                                CONSTRAINT auth_group_permissions_permission_id_84c5c92e_fk_auth_permission_id 
                                    FOREIGN KEY (permission_id) 
                                    REFERENCES auth_permission(id) 
                                    DEFERRABLE INITIALLY DEFERRED
                            );
                            CREATE INDEX auth_group_permissions_group_id_b120cbf9 
                                ON auth_group_permissions(group_id);
                            CREATE INDEX auth_group_permissions_permission_id_84c5c92e 
                                ON auth_group_permissions(permission_id);
                            """)
                            self.stdout.write(self.style.SUCCESS('✅ Table auth_group_permissions créée'))
                        else:
                            self.stdout.write(self.style.WARNING('⚠️ Impossible de créer auth_group_permissions: tables parentes manquantes'))
                    
                    # Marquer les migrations auth comme appliquées (fake)
                    self.stdout.write('Marquage des migrations auth comme appliquées...')
                    try:
                        # Vérifier quelles migrations auth sont déjà marquées
                        cursor.execute("""
                            SELECT name FROM django_migrations WHERE app = 'auth' ORDER BY id;
                        """)
                        existing_migrations = [row[0] for row in cursor.fetchall()]
                        
                        # Liste des migrations auth standard de Django
                        auth_migrations = [
                            '0001_initial',
                            '0002_alter_permission_name_max_length',
                            '0003_alter_user_email_max_length',
                            '0004_alter_user_username_opts',
                            '0005_alter_user_last_login_null',
                            '0006_require_contenttypes_0002',
                            '0007_alter_validators_add_error_messages',
                            '0008_alter_user_username_max_length',
                            '0009_alter_user_last_name_max_length',
                            '0010_alter_group_name_max_length',
                            '0011_update_proxy_permissions',
                            '0012_alter_user_first_name_max_length',
                        ]
                        
                        # Ajouter les migrations manquantes
                        for migration_name in auth_migrations:
                            if migration_name not in existing_migrations:
                                cursor.execute("""
                                    INSERT INTO django_migrations (app, name, applied)
                                    VALUES ('auth', %s, NOW())
                                    ON CONFLICT DO NOTHING;
                                """, [migration_name])
                        
                        self.stdout.write(self.style.SUCCESS('✅ Migrations auth marquées comme appliquées'))
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f'⚠️ Erreur lors du marquage des migrations: {e}'))
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
            import traceback
            self.stdout.write(self.style.ERROR(f'Détails: {traceback.format_exc()}'))
            
            # En cas d'erreur, essayer avec --fake-initial
            self.stdout.write('\nTentative avec --fake-initial...')
            try:
                # Supprimer les entrées de migrations pour auth
                with connection.cursor() as cursor:
                    cursor.execute("DELETE FROM django_migrations WHERE app = 'auth';")
                
                # Réappliquer avec --fake-initial pour éviter les conflits
                call_command('migrate', 'auth', '--fake-initial', '--noinput', verbosity=1)
                self.stdout.write(self.style.SUCCESS('✅ Migrations réappliquées avec --fake-initial'))
            except Exception as migrate_error:
                self.stdout.write(self.style.ERROR(f'❌ Erreur lors de la réapplication: {str(migrate_error)}'))
                self.stdout.write(self.style.WARNING('\n💡 Solution alternative: Exécutez manuellement:'))
                self.stdout.write('   python manage.py migrate auth --fake-initial')

