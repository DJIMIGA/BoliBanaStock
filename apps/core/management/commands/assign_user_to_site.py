from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from apps.core.models import Configuration

User = get_user_model()


class Command(BaseCommand):
    help = 'Assigne un utilisateur à un site existant'

    def add_arguments(self, parser):
        parser.add_argument(
            'username',
            type=str,
            help='Nom d\'utilisateur à assigner'
        )
        parser.add_argument(
            '--site-name',
            type=str,
            help='Nom du site (optionnel, utilise le premier site si non spécifié)'
        )
        parser.add_argument(
            '--make-admin',
            action='store_true',
            help='Rendre l\'utilisateur administrateur du site'
        )

    def handle(self, *args, **options):
        username = options['username']
        site_name = options.get('site_name')
        make_admin = options.get('make_admin', False)

        try:
            # Récupérer l'utilisateur
            user = User.objects.get(username=username)
            
            # Vérifier si l'utilisateur a déjà un site
            if user.site_configuration:
                self.stdout.write(
                    self.style.WARNING(
                        f'L\'utilisateur {username} est déjà assigné au site: {user.site_configuration.site_name}'
                    )
                )
                return

            # Récupérer le site
            if site_name:
                try:
                    site = Configuration.objects.get(site_name=site_name)
                except Configuration.DoesNotExist:
                    raise CommandError(f'Site "{site_name}" non trouvé')
            else:
                # Utiliser le premier site disponible
                site = Configuration.objects.first()
                if not site:
                    raise CommandError('Aucun site configuré dans la base de données')
                
                self.stdout.write(
                    self.style.WARNING(
                        f'Aucun site spécifié, utilisation du premier site: {site.site_name}'
                    )
                )

            # Assigner l'utilisateur au site
            user.site_configuration = site
            if make_admin:
                user.is_site_admin = True
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Utilisateur {username} assigné au site {site.site_name} en tant qu\'administrateur'
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Utilisateur {username} assigné au site {site.site_name}'
                    )
                )
            
            user.save()

        except User.DoesNotExist:
            raise CommandError(f'Utilisateur "{username}" non trouvé')
        except Exception as e:
            raise CommandError(f'Erreur lors de l\'assignation: {str(e)}')
