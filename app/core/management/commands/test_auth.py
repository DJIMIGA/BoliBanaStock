from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.contrib.sessions.models import Session
from django.contrib.auth import authenticate, login
from django.test import RequestFactory
from django.contrib.sessions.middleware import SessionMiddleware
from django.contrib.auth.middleware import AuthenticationMiddleware
from app.core.models import Configuration

User = get_user_model()

class Command(BaseCommand):
    help = 'Teste l\'authentification et diagnostique les problèmes de connexion'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Nom d\'utilisateur à tester')
        parser.add_argument('--password', type=str, help='Mot de passe à tester')
        parser.add_argument('--create-test-user', action='store_true', help='Créer un utilisateur de test')

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🔍 Début du diagnostic d\'authentification...'))
        
        # Test 1: Vérifier la base de données
        self.test_database()
        
        # Test 2: Vérifier les sessions
        self.test_sessions()
        
        # Test 3: Créer un utilisateur de test si demandé
        if options['create_test_user']:
            self.create_test_user()
        
        # Test 4: Tester l'authentification
        if options['username'] and options['password']:
            self.test_authentication(options['username'], options['password'])
        
        # Test 5: Simuler une inscription complète
        self.simulate_signup()
        
        self.stdout.write(self.style.SUCCESS('✅ Diagnostic terminé'))

    def test_database(self):
        self.stdout.write('\n📊 Test de la base de données:')
        
        # Compter les utilisateurs
        user_count = User.objects.count()
        self.stdout.write(f'   - Nombre d\'utilisateurs: {user_count}')
        
        # Compter les configurations
        config_count = Configuration.objects.count()
        self.stdout.write(f'   - Nombre de configurations: {config_count}')
        
        # Compter les sessions
        session_count = Session.objects.count()
        self.stdout.write(f'   - Nombre de sessions: {session_count}')
        
        if user_count > 0:
            # Afficher le dernier utilisateur créé
            last_user = User.objects.last()
            self.stdout.write(f'   - Dernier utilisateur: {last_user.username} (ID: {last_user.id})')
            self.stdout.write(f'   - Admin de site: {last_user.is_site_admin}')
            self.stdout.write(f'   - Staff: {last_user.is_staff}')
            self.stdout.write(f'   - Configuration: {last_user.site_configuration}')

    def test_sessions(self):
        self.stdout.write('\n🔐 Test des sessions:')
        
        # Créer une requête de test
        factory = RequestFactory()
        request = factory.get('/')
        
        # Ajouter le middleware de session
        middleware = SessionMiddleware(lambda req: None)
        middleware.process_request(request)
        request.session.save()
        
        # Ajouter le middleware d'authentification
        auth_middleware = AuthenticationMiddleware(lambda req: None)
        auth_middleware.process_request(request)
        
        self.stdout.write(f'   - Session créée: {request.session.session_key is not None}')
        self.stdout.write(f'   - Clé de session: {request.session.session_key}')
        self.stdout.write(f'   - Utilisateur: {request.user}')

    def create_test_user(self):
        self.stdout.write('\n👤 Création d\'un utilisateur de test:')
        
        username = 'testuser'
        password = 'testpass123'
        
        # Vérifier si l'utilisateur existe déjà
        if User.objects.filter(username=username).exists():
            self.stdout.write(f'   - L\'utilisateur {username} existe déjà')
            return
        
        # Créer l'utilisateur
        user = User.objects.create_user(
            username=username,
            password=password,
            first_name='Test',
            last_name='User',
            email='test@example.com',
            is_site_admin=True,
            is_staff=True
        )
        
        # Créer une configuration de test
        config = Configuration.objects.create(
            site_name='test-site',
            site_owner=user,
            nom_societe='Entreprise Test',
            adresse='Adresse test',
            telephone='+223 XX XX XX XX',
            email=user.email,
            devise='FCFA',
            tva=0.00,
            description='Site de test',
            created_by=user,
            updated_by=user
        )
        
        # Lier l'utilisateur à sa configuration
        user.site_configuration = config
        user.save()
        
        self.stdout.write(f'   - Utilisateur créé: {user.username} (ID: {user.id})')
        self.stdout.write(f'   - Configuration créée: {config.site_name}')

    def test_authentication(self, username, password):
        self.stdout.write(f'\n🔑 Test d\'authentification pour {username}:')
        
        # Tester l'authentification
        user = authenticate(username=username, password=password)
        
        if user is not None:
            self.stdout.write(f'   - ✅ Authentification réussie')
            self.stdout.write(f'   - Utilisateur: {user.username} (ID: {user.id})')
            self.stdout.write(f'   - Admin de site: {user.is_site_admin}')
            self.stdout.write(f'   - Staff: {user.is_staff}')
            self.stdout.write(f'   - Configuration: {user.site_configuration}')
        else:
            self.stdout.write(f'   - ❌ Authentification échouée')
            
            # Vérifier si l'utilisateur existe
            try:
                user = User.objects.get(username=username)
                self.stdout.write(f'   - Utilisateur existe mais mot de passe incorrect')
            except User.DoesNotExist:
                self.stdout.write(f'   - Utilisateur n\'existe pas')

    def simulate_signup(self):
        self.stdout.write('\n📝 Simulation d\'une inscription complète:')
        
        # Créer une requête de test
        factory = RequestFactory()
        request = factory.post('/signup/')
        
        # Ajouter le middleware de session
        middleware = SessionMiddleware(lambda req: None)
        middleware.process_request(request)
        request.session.save()
        
        # Ajouter le middleware d'authentification
        auth_middleware = AuthenticationMiddleware(lambda req: None)
        auth_middleware.process_request(request)
        
        # Créer un utilisateur de test
        username = 'simulation_user'
        password = 'simulation123'
        
        if User.objects.filter(username=username).exists():
            user = User.objects.get(username=username)
        else:
            user = User.objects.create_user(
                username=username,
                password=password,
                first_name='Simulation',
                last_name='User',
                email='simulation@example.com',
                is_site_admin=True,
                is_staff=True
            )
            
            # Créer une configuration
            config = Configuration.objects.create(
                site_name='simulation-site',
                site_owner=user,
                nom_societe='Entreprise Simulation',
                adresse='Adresse simulation',
                telephone='+223 XX XX XX XX',
                email=user.email,
                devise='FCFA',
                tva=0.00,
                description='Site de simulation',
                created_by=user,
                updated_by=user
            )
            
            user.site_configuration = config
            user.save()
        
        # Simuler la connexion
        from django.contrib.auth import login
        login(request, user)
        
        self.stdout.write(f'   - Session avant connexion: {request.session.session_key}')
        self.stdout.write(f'   - Utilisateur avant connexion: {request.user}')
        
        # Vérifier après connexion
        self.stdout.write(f'   - Session après connexion: {request.session.session_key}')
        self.stdout.write(f'   - Utilisateur après connexion: {request.user}')
        self.stdout.write(f'   - Authentifié: {request.user.is_authenticated}')
        
        if request.user.is_authenticated:
            self.stdout.write(f'   - ✅ Simulation réussie')
        else:
            self.stdout.write(f'   - ❌ Problème dans la simulation') 