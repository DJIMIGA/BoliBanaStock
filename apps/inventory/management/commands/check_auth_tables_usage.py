from django.core.management.base import BaseCommand
from django.db import connection
from django.apps import apps


class Command(BaseCommand):
    help = "Vérifier l'utilisation des tables auth_* dans la base de données"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== Vérification utilisation tables auth_* ==="))
        
        try:
            with connection.cursor() as cursor:
                # 1. Lister toutes les tables auth_*
                self.stdout.write("1. Tables auth_* existantes:")
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name LIKE 'auth_%'
                    ORDER BY table_name;
                """)
                auth_tables = cursor.fetchall()
                
                if auth_tables:
                    for table in auth_tables:
                        self.stdout.write(f"   - {table[0]}")
                else:
                    self.stdout.write("   Aucune table auth_* trouvée")
                
                # 2. Vérifier les contraintes FK vers auth_user
                self.stdout.write("\n2. Contraintes FK vers auth_user:")
                cursor.execute("""
                    SELECT 
                        tc.table_name,
                        tc.constraint_name,
                        kcu.column_name,
                        ccu.table_name AS foreign_table_name
                    FROM information_schema.table_constraints AS tc 
                    JOIN information_schema.key_column_usage AS kcu
                        ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage AS ccu
                        ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY' 
                    AND ccu.table_name = 'auth_user';
                """)
                fk_to_auth_user = cursor.fetchall()
                
                if fk_to_auth_user:
                    for fk in fk_to_auth_user:
                        self.stdout.write(f"   - {fk[0]}.{fk[2]} -> {fk[3]} ({fk[1]})")
                else:
                    self.stdout.write("   Aucune contrainte FK vers auth_user")
                
                # 3. Vérifier les contraintes FK vers auth_group
                self.stdout.write("\n3. Contraintes FK vers auth_group:")
                cursor.execute("""
                    SELECT 
                        tc.table_name,
                        tc.constraint_name,
                        kcu.column_name,
                        ccu.table_name AS foreign_table_name
                    FROM information_schema.table_constraints AS tc 
                    JOIN information_schema.key_column_usage AS kcu
                        ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage AS ccu
                        ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY' 
                    AND ccu.table_name = 'auth_group';
                """)
                fk_to_auth_group = cursor.fetchall()
                
                if fk_to_auth_group:
                    for fk in fk_to_auth_group:
                        self.stdout.write(f"   - {fk[0]}.{fk[2]} -> {fk[3]} ({fk[1]})")
                else:
                    self.stdout.write("   Aucune contrainte FK vers auth_group")
                
                # 4. Compter les enregistrements dans auth_user
                if auth_tables and any('auth_user' in table[0] for table in auth_tables):
                    self.stdout.write("\n4. Enregistrements dans auth_user:")
                    cursor.execute("SELECT COUNT(*) FROM auth_user;")
                    count = cursor.fetchone()[0]
                    self.stdout.write(f"   - {count} utilisateurs dans auth_user")
                    
                    if count > 0:
                        cursor.execute("SELECT id, username FROM auth_user ORDER BY id LIMIT 5;")
                        users = cursor.fetchall()
                        self.stdout.write("   - Premiers utilisateurs:")
                        for user in users:
                            self.stdout.write(f"     * ID {user[0]}: {user[1]}")
                
                # 5. Vérifier les modèles Django qui utilisent encore auth_user
                self.stdout.write("\n5. Modèles Django utilisant auth_user:")
                auth_user_models = []
                for model in apps.get_models():
                    for field in model._meta.get_fields():
                        if hasattr(field, 'related_model') and field.related_model:
                            if field.related_model._meta.db_table == 'auth_user':
                                auth_user_models.append(f"{model._meta.label}.{field.name}")
                
                if auth_user_models:
                    for model_field in auth_user_models:
                        self.stdout.write(f"   - {model_field}")
                else:
                    self.stdout.write("   Aucun modèle Django ne référence auth_user")
                
                # 6. Recommandation
                self.stdout.write(self.style.NOTICE("\n=== RECOMMANDATION ==="))
                if not fk_to_auth_user and not fk_to_auth_group and not auth_user_models:
                    self.stdout.write(self.style.SUCCESS("✅ SÉCURISÉ: Aucune référence aux tables auth_*"))
                    self.stdout.write("   → Les tables auth_* peuvent être supprimées en toute sécurité")
                else:
                    self.stdout.write(self.style.WARNING("⚠️  ATTENTION: Références trouvées aux tables auth_*"))
                    self.stdout.write("   → Vérifier et corriger avant suppression")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Erreur lors de la vérification: {e}"))
            raise
