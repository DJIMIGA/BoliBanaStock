from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.apps import apps


class Command(BaseCommand):
    help = 'Corrige toutes les contraintes FK qui pointent vers auth_user pour qu\'elles pointent vers core_user'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== Correction de toutes les FK vers auth_user ==='))

        if connection.vendor != 'postgresql':
            raise CommandError('Ce script est conçu uniquement pour PostgreSQL.')

        try:
            CoreUser = apps.get_model('core', 'User')
        except LookupError as e:
            raise CommandError(f'Erreur de chargement du modèle CoreUser: {e}')

        core_user_table = CoreUser._meta.db_table

        # Liste des tables et colonnes à corriger
        fk_corrections = [
            ('django_admin_log', 'user_id'),
            ('core_parametre', 'created_by_id'),
            ('core_parametre', 'updated_by_id'),
            ('core_notification', 'created_by_id'),
            ('core_notification', 'destinataire_id'),
            ('core_notification', 'updated_by_id'),
            ('core_configuration', 'created_by_id'),
            ('core_configuration', 'updated_by_id'),
            ('core_activite', 'created_by_id'),
            ('core_activite', 'updated_by_id'),
            ('core_activite', 'utilisateur_id'),
            ('sales_sale', 'seller_id'),
            ('sales_cashregister', 'user_id'),
            ('inventory_transaction', 'user_id'),
            ('inventory_labelbatch', 'user_id'),
            ('inventory_catalogtemplate', 'created_by_id'),
        ]

        with connection.cursor() as cursor:
            with transaction.atomic():
                for table_name, column_name in fk_corrections:
                    self.stdout.write(f'Correction de {table_name}.{column_name}...')
                    
                    # 1. Trouver et supprimer l'ancienne contrainte FK
                    cursor.execute(f"""
                        SELECT conname
                        FROM pg_constraint
                        WHERE conrelid = '{table_name}'::regclass
                        AND confrelid = 'auth_user'::regclass
                        AND conkey = (
                            SELECT attnum 
                            FROM pg_attribute 
                            WHERE attrelid = '{table_name}'::regclass 
                            AND attname = '{column_name}'
                        );
                    """)
                    old_constraints = cursor.fetchall()
                    
                    for (conname,) in old_constraints:
                        self.stdout.write(f'  - Suppression de la contrainte "{conname}"...')
                        cursor.execute(f'ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS "{conname}";')
                        self.stdout.write(f'  ✅ Contrainte "{conname}" supprimée')
                    
                    # 2. Créer la nouvelle contrainte FK vers core_user
                    new_fk_name = f'{table_name}_{column_name}_fk_{core_user_table}_id'
                    self.stdout.write(f'  - Création de la nouvelle contrainte "{new_fk_name}"...')
                    
                    try:
                        cursor.execute(f"""
                            ALTER TABLE {table_name}
                            ADD CONSTRAINT "{new_fk_name}"
                            FOREIGN KEY ({column_name})
                            REFERENCES {core_user_table} (id)
                            DEFERRABLE INITIALLY DEFERRED;
                        """)
                        self.stdout.write(f'  ✅ Contrainte "{new_fk_name}" créée')
                    except Exception as e:
                        self.stdout.write(f'  ⚠️  Erreur lors de la création de la contrainte: {e}')
                        # Continuer avec les autres corrections

        self.stdout.write(self.style.SUCCESS('=== Correction des FK vers auth_user terminée ==='))
        
        # Maintenant corriger les FK vers auth_group
        self.stdout.write(self.style.SUCCESS('=== Correction des FK vers auth_group ==='))
        
        # Pour les groupes, on va créer une table core_group si elle n'existe pas
        with connection.cursor() as cursor:
            # Vérifier si core_group existe
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'core_group'
                );
            """)
            
            if not cursor.fetchone()[0]:
                self.stdout.write('Création de la table core_group...')
                cursor.execute("""
                    CREATE TABLE core_group (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(150) NOT NULL UNIQUE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                """)
                
                # Copier les données de auth_group vers core_group
                cursor.execute("""
                    INSERT INTO core_group (id, name, created_at, updated_at)
                    SELECT id, name, NOW(), NOW()
                    FROM auth_group
                    ON CONFLICT (id) DO NOTHING;
                """)
                self.stdout.write('✅ Table core_group créée et données copiées')
            
            # Corriger les FK vers auth_group
            group_fk_corrections = [
                ('core_user_groups', 'group_id'),
                ('users_user_groups', 'group_id'),
            ]
            
            for table_name, column_name in group_fk_corrections:
                self.stdout.write(f'Correction de {table_name}.{column_name}...')
                
                # Supprimer l'ancienne contrainte
                cursor.execute(f"""
                    SELECT conname
                    FROM pg_constraint
                    WHERE conrelid = '{table_name}'::regclass
                    AND confrelid = 'auth_group'::regclass
                    AND conkey = (
                        SELECT attnum 
                        FROM pg_attribute 
                        WHERE attrelid = '{table_name}'::regclass 
                        AND attname = '{column_name}'
                    );
                """)
                old_constraints = cursor.fetchall()
                
                for (conname,) in old_constraints:
                    self.stdout.write(f'  - Suppression de la contrainte "{conname}"...')
                    cursor.execute(f'ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS "{conname}";')
                    self.stdout.write(f'  ✅ Contrainte "{conname}" supprimée')
                
                # Créer la nouvelle contrainte
                new_fk_name = f'{table_name}_{column_name}_fk_core_group_id'
                self.stdout.write(f'  - Création de la nouvelle contrainte "{new_fk_name}"...')
                
                try:
                    cursor.execute(f"""
                        ALTER TABLE {table_name}
                        ADD CONSTRAINT "{new_fk_name}"
                        FOREIGN KEY ({column_name})
                        REFERENCES core_group (id)
                        DEFERRABLE INITIALLY DEFERRED;
                    """)
                    self.stdout.write(f'  ✅ Contrainte "{new_fk_name}" créée')
                except Exception as e:
                    self.stdout.write(f'  ⚠️  Erreur lors de la création de la contrainte: {e}')

        self.stdout.write(self.style.SUCCESS('=== Correction de toutes les FK terminée ==='))
