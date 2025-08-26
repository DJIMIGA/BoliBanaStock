from django.core.management.base import BaseCommand, CommandError
from app.core.models import User
from django.db import transaction
import getpass

class Command(BaseCommand):
    help = 'Créer un superuser sur Railway avec des informations interactives'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Nom d\'utilisateur pour le superuser',
        )
        parser.add_argument(
            '--email',
            type=str,
            help='Email pour le superuser',
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Mot de passe pour le superuser (non recommandé en production)',
        )
        parser.add_argument(
            '--first-name',
            type=str,
            help='Prénom du superuser',
        )
        parser.add_argument(
            '--last-name',
            type=str,
            help='Nom de famille du superuser',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Forcer la création même si l\'utilisateur existe déjà',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🚀 Création d\'un superuser sur Railway...')
        )

        try:
            with transaction.atomic():
                # Récupérer ou demander les informations
                username = options['username'] or self.get_username()
                email = options['email'] or self.get_email()
                password = options['password'] or self.get_password()
                first_name = options['first_name'] or self.get_first_name()
                last_name = options['last_name'] or self.get_last_name()

                # Vérifier si l'utilisateur existe déjà
                try:
                    existing_user = User.objects.get(username=username)
                    
                    if not options['force']:
                        self.stdout.write(
                            self.style.WARNING(
                                f'⚠️ L\'utilisateur "{username}" existe déjà (ID: {existing_user.id})'
                            )
                        )
                        
                        if existing_user.is_superuser:
                            self.stdout.write(
                                self.style.SUCCESS('✅ Cet utilisateur est déjà un superuser')
                            )
                            
                            # Demander s'il faut mettre à jour le mot de passe
                            update_pwd = input('❓ Mettre à jour le mot de passe ? (y/N): ').strip().lower()
                            if update_pwd in ['y', 'yes', 'oui', 'o']:
                                existing_user.set_password(password)
                                existing_user.save()
                                self.stdout.write(
                                    self.style.SUCCESS('✅ Mot de passe mis à jour')
                                )
                            return
                        else:
                            self.stdout.write(
                                self.style.WARNING('⚠️ Cet utilisateur n\'est pas un superuser')
                            )
                            
                            # Demander s'il faut le promouvoir
                            promote = input('❓ Le promouvoir superuser ? (y/N): ').strip().lower()
                            if promote in ['y', 'yes', 'oui', 'o']:
                                existing_user.is_superuser = True
                                existing_user.is_staff = True
                                existing_user.set_password(password)
                                existing_user.save()
                                self.stdout.write(
                                    self.style.SUCCESS('✅ Utilisateur promu superuser et mot de passe mis à jour')
                                )
                                return
                            else:
                                self.stdout.write(
                                    self.style.ERROR('❌ Promotion annulée')
                                )
                                return
                    else:
                        # Mode force - supprimer l'utilisateur existant
                        self.stdout.write(
                            self.style.WARNING(f'🗑️ Suppression de l\'utilisateur existant "{username}"...')
                        )
                        existing_user.delete()

                except User.DoesNotExist:
                    pass

                # Créer le superuser
                self.stdout.write(f'📝 Création du superuser "{username}"...')
                
                superuser = User.objects.create_user(
                    username=username,
                    password=password,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    is_staff=True,
                    is_superuser=True
                )

                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Superuser créé avec succès (ID: {superuser.id})'
                    )
                )

                # Afficher les informations de connexion
                self.stdout.write('\n📋 Informations de connexion:')
                self.stdout.write(f'   Username: {username}')
                self.stdout.write(f'   Email: {email}')
                self.stdout.write(f'   Prénom: {first_name or "Non spécifié"}')
                self.stdout.write(f'   Nom: {last_name or "Non spécifié"}')
                self.stdout.write('   Accès: Superuser + Staff')
                
                self.stdout.write(
                    self.style.SUCCESS('\n🎉 Superuser prêt à utiliser sur Railway!')
                )

        except Exception as e:
            raise CommandError(f'Erreur lors de la création du superuser: {e}')

    def get_username(self):
        """Demander le nom d'utilisateur"""
        while True:
            username = input('Nom d\'utilisateur (admin): ').strip()
            if username:
                return username
            self.stdout.write(
                self.style.ERROR('❌ Le nom d\'utilisateur ne peut pas être vide')
            )

    def get_email(self):
        """Demander l'email"""
        while True:
            email = input('Email: ').strip()
            if email and '@' in email:
                return email
            self.stdout.write(
                self.style.ERROR('❌ Veuillez fournir un email valide')
            )

    def get_password(self):
        """Demander le mot de passe de manière sécurisée"""
        while True:
            password = getpass.getpass('Mot de passe: ')
            if len(password) < 8:
                self.stdout.write(
                    self.style.ERROR('❌ Le mot de passe doit contenir au moins 8 caractères')
                )
                continue
            
            confirm_password = getpass.getpass('Confirmer le mot de passe: ')
            if password == confirm_password:
                return password
            else:
                self.stdout.write(
                    self.style.ERROR('❌ Les mots de passe ne correspondent pas')
                )

    def get_first_name(self):
        """Demander le prénom"""
        first_name = input('Prénom (optionnel): ').strip()
        return first_name if first_name else ''

    def get_last_name(self):
        """Demander le nom de famille"""
        last_name = input('Nom de famille (optionnel): ').strip()
        return last_name if last_name else ''
