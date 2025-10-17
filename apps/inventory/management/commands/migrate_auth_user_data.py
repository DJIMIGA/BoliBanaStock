from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.apps import apps


class Command(BaseCommand):
    help = 'Migre les données de auth_user vers core_user'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== Migration des données auth_user vers core_user ==='))

        try:
            CoreUser = apps.get_model('core', 'User')
        except LookupError as e:
            raise CommandError(f'Erreur de chargement du modèle CoreUser: {e}')

        try:
            with connection.cursor() as cursor:
                # 1. Vérifier les utilisateurs dans auth_user
                cursor.execute("SELECT id, username, email, first_name, last_name, is_active, is_staff, is_superuser, date_joined FROM auth_user;")
                auth_users = cursor.fetchall()
                
                if not auth_users:
                    self.stdout.write("Aucun utilisateur dans auth_user")
                    return
                
                self.stdout.write(f"Trouvé {len(auth_users)} utilisateur(s) dans auth_user:")
                for user in auth_users:
                    self.stdout.write(f"  - ID {user[0]}: {user[1]} ({user[2]})")
                
                # 2. Vérifier les utilisateurs dans core_user
                cursor.execute("SELECT id, username, email FROM core_user;")
                core_users = cursor.fetchall()
                
                self.stdout.write(f"\nUtilisateurs existants dans core_user:")
                for user in core_users:
                    self.stdout.write(f"  - ID {user[0]}: {user[1]} ({user[2]})")
                
                # 3. Migrer les utilisateurs manquants
                with transaction.atomic():
                    migrated_count = 0
                    for auth_user in auth_users:
                        auth_id, username, email, first_name, last_name, is_active, is_staff, is_superuser, date_joined = auth_user
                        
                        # Vérifier si l'utilisateur existe déjà dans core_user
                        cursor.execute("SELECT id FROM core_user WHERE username = %s;", [username])
                        existing_core_user = cursor.fetchone()
                        
                        if existing_core_user:
                            self.stdout.write(f"  ⏭️  {username} existe déjà dans core_user (ID: {existing_core_user[0]})")
                            continue
                        
                        # Créer l'utilisateur dans core_user
                        self.stdout.write(f"  📝 Migration de {username}...")
                        
                        try:
                            cursor.execute("""
                                INSERT INTO core_user (
                                    id, username, email, first_name, last_name, 
                                    is_active, is_staff, is_superuser, date_joined,
                                    created_at, updated_at
                                ) VALUES (
                                    %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                                );
                            """, [auth_id, username, email, first_name, last_name, is_active, is_staff, is_superuser, date_joined])
                            
                            self.stdout.write(f"  ✅ {username} migré avec succès")
                            migrated_count += 1
                            
                        except Exception as e:
                            self.stdout.write(f"  ❌ Erreur lors de la migration de {username}: {e}")
                    
                    # 4. Migrer les mots de passe (si possible)
                    self.stdout.write(f"\nMigration des mots de passe...")
                    try:
                        # Copier les mots de passe de auth_user vers core_user
                        cursor.execute("""
                            UPDATE core_user 
                            SET password = auth_user.password
                            FROM auth_user 
                            WHERE core_user.username = auth_user.username;
                        """)
                        password_count = cursor.rowcount
                        self.stdout.write(f"  ✅ {password_count} mot(s) de passe migré(s)")
                    except Exception as e:
                        self.stdout.write(f"  ⚠️  Erreur lors de la migration des mots de passe: {e}")
                    
                    # 5. Migrer les groupes d'utilisateurs
                    self.stdout.write(f"\nMigration des groupes d'utilisateurs...")
                    try:
                        # Vérifier si core_user_groups existe
                        cursor.execute("""
                            SELECT EXISTS (
                                SELECT FROM information_schema.tables 
                                WHERE table_schema = 'public' 
                                AND table_name = 'core_user_groups'
                            );
                        """)
                        
                        if cursor.fetchone()[0]:
                            # Copier les groupes d'utilisateurs
                            cursor.execute("""
                                INSERT INTO core_user_groups (user_id, group_id)
                                SELECT 
                                    cu.id as user_id,
                                    aug.group_id
                                FROM auth_user_groups aug
                                JOIN core_user cu ON cu.username = (
                                    SELECT username FROM auth_user WHERE id = aug.user_id
                                )
                                ON CONFLICT DO NOTHING;
                            """)
                            group_count = cursor.rowcount
                            self.stdout.write(f"  ✅ {group_count} relation(s) utilisateur-groupe migrée(s)")
                        else:
                            self.stdout.write(f"  ⏭️  Table core_user_groups n'existe pas")
                            
                    except Exception as e:
                        self.stdout.write(f"  ⚠️  Erreur lors de la migration des groupes: {e}")
                    
                    # 6. Résumé
                    self.stdout.write(self.style.SUCCESS(f"\n=== Migration terminée ==="))
                    self.stdout.write(f"✅ {migrated_count} utilisateur(s) migré(s)")
                    self.stdout.write(f"✅ Mots de passe migrés")
                    self.stdout.write(f"✅ Groupes d'utilisateurs migrés")
                    
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Erreur lors de la migration: {e}"))
            raise