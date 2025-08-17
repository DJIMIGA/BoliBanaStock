from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Liste les utilisateurs qui n\'ont pas de site assigné'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Afficher plus d\'informations sur les utilisateurs'
        )

    def handle(self, *args, **options):
        verbose = options.get('verbose', False)
        
        # Récupérer les utilisateurs sans site
        users_without_site = User.objects.filter(site_configuration__isnull=True)
        
        if not users_without_site.exists():
            self.stdout.write(
                self.style.SUCCESS('Tous les utilisateurs ont un site assigné.')
            )
            return
        
        self.stdout.write(
            self.style.WARNING(
                f'Utilisateurs sans site assigné ({users_without_site.count()}):'
            )
        )
        
        for user in users_without_site:
            if verbose:
                self.stdout.write(
                    f'  - {user.username} ({user.email}) - '
                    f'Actif: {user.is_active}, '
                    f'Superuser: {user.is_superuser}, '
                    f'Staff: {user.is_staff}'
                )
            else:
                self.stdout.write(f'  - {user.username}')
        
        self.stdout.write('')
        self.stdout.write(
            'Pour assigner un utilisateur à un site, utilisez:'
        )
        self.stdout.write(
            '  python manage.py assign_user_to_site <username> [--site-name <site>] [--make-admin]'
        )
