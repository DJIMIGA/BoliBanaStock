from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Corriger la contrainte FK CatalogGeneration.user pour pointer vers core_user"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== Correction FK CatalogGeneration.user ==="))
        
        try:
            with connection.cursor() as cursor:
                # 1. Supprimer l'ancienne contrainte FK
                self.stdout.write("1. Suppression de l'ancienne contrainte FK...")
                cursor.execute("""
                    ALTER TABLE inventory_cataloggeneration 
                    DROP CONSTRAINT IF EXISTS inventory_cataloggeneration_user_id_55a209da_fk_auth_user_id;
                """)
                
                # 2. Créer la nouvelle contrainte FK vers core_user
                self.stdout.write("2. Création de la nouvelle contrainte FK vers core_user...")
                cursor.execute("""
                    ALTER TABLE inventory_cataloggeneration 
                    ADD CONSTRAINT inventory_cataloggeneration_user_id_fk_core_user_id 
                    FOREIGN KEY (user_id) REFERENCES core_user(id) 
                    ON DELETE CASCADE;
                """)
                
                # 3. Vérifier la nouvelle contrainte
                self.stdout.write("3. Vérification de la nouvelle contrainte...")
                cursor.execute("""
                    SELECT confrelid::regclass::text 
                    FROM pg_constraint 
                    WHERE conrelid = 'inventory_cataloggeneration'::regclass 
                    AND contype = 'f' 
                    AND conname LIKE '%user_id%';
                """)
                result = cursor.fetchone()
                if result:
                    self.stdout.write(f"✅ Nouvelle FK cible: {result[0]}")
                else:
                    self.stdout.write("❌ Impossible de vérifier la nouvelle FK")
                
                self.stdout.write(self.style.SUCCESS("✅ Correction FK terminée avec succès !"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Erreur lors de la correction: {e}"))
            raise
