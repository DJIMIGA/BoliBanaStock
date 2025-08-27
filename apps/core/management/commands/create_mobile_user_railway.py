from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import IntegrityError

class Command(BaseCommand):
    help = 'Créer l\'utilisateur mobile pour l\'application mobile sur Railway'

    def handle(self, *args, **options):
        self.stdout.write("🔧 Création de l'utilisateur mobile sur Railway...")
        
        try:
            # Vérifier si l'utilisateur mobile existe déjà
            try:
                mobile_user = User.objects.get(username='mobile')
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Utilisateur mobile existe déjà (ID: {mobile_user.id})")
                )
                
                # Vérifier le mot de passe
                if mobile_user.check_password('12345678'):
                    self.stdout.write(
                        self.style.SUCCESS("✅ Mot de passe correct")
                    )
                else:
                    self.stdout.write("⚠️ Mot de passe incorrect, mise à jour...")
                    mobile_user.set_password('12345678')
                    mobile_user.save()
                    self.stdout.write(
                        self.style.SUCCESS("✅ Mot de passe mis à jour")
                    )
                    
            except User.DoesNotExist:
                self.stdout.write("📝 Création de l'utilisateur mobile...")
                
                # Créer l'utilisateur mobile
                mobile_user = User.objects.create_user(
                    username='mobile',
                    password='12345678',
                    email='mobile@bolibana.com',
                    first_name='Mobile',
                    last_name='User',
                    is_staff=True,
                    is_superuser=False
                )
                
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Utilisateur mobile créé avec succès (ID: {mobile_user.id})")
                )
                
        except IntegrityError as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Erreur d'intégrité: {e}")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Erreur lors de la création de l'utilisateur: {e}")
            )
        
        self.stdout.write("\n📋 Informations de connexion:")
        self.stdout.write("   Username: mobile")
        self.stdout.write("   Password: 12345678")
        self.stdout.write("   Email: mobile@bolibana.com")
        self.stdout.write("   Staff: Oui")
        self.stdout.write("   Superuser: Non")
