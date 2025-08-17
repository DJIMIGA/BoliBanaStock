from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.views import LoginView, LogoutView
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login
from .models import User, Configuration, Activite, Notification, Parametre
from .forms import CustomUserCreationForm, CustomUserUpdateForm, PublicSignUpForm
from django.contrib.auth.decorators import login_required, user_passes_test
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.http import require_POST
from django.db.models.deletion import ProtectedError
import json
from django.db import transaction
from django.contrib.auth import get_user_model

User = get_user_model()

def get_user_site_configuration(user):
    """
    Récupère la configuration du site de l'utilisateur
    """
    if user.is_superuser:
        # Les superusers voient la première configuration ou peuvent en créer une
        config = Configuration.objects.first()
        if not config:
            config = Configuration.objects.create(
                site_name='Site Principal',
                nom_societe='BoliBana Stock',
                adresse='Adresse de votre entreprise',
                telephone='+226 XX XX XX XX',
                email='contact@votreentreprise.com',
                devise='FCFA',
                tva=0.00,
                description='Système de gestion de stock',
                site_owner=user,
                created_by=user,
                updated_by=user
            )
            # Assigner la configuration au superuser
            user.site_configuration = config
            user.is_site_admin = True
            user.save()
        return config
    else:
        # Les utilisateurs normaux voient leur configuration
        if not user.site_configuration:
            raise Http404("Aucun site configuré pour cet utilisateur")
        return user.site_configuration

def is_manager(user):
    """Vérifie si l'utilisateur peut gérer les utilisateurs de son site"""
    return user.is_superuser or user.is_site_admin

class ManagerRequiredMixin(UserPassesTestMixin):
    """Mixin pour vérifier que l'utilisateur peut gérer les utilisateurs de son site"""
    def test_func(self):
        return is_manager(self.request.user)

    def handle_no_permission(self):
        messages.error(self.request, "Vous n'avez pas les permissions pour accéder à cette page.")
        return redirect('theme:home')

class CustomLoginView(LoginView):
    template_name = 'registration/login.html'
    redirect_authenticated_user = True

    def get_success_url(self):
        return reverse_lazy('theme:home')

class CustomLogoutView(LogoutView):
    next_page = 'login'

class CustomSignUpView(LoginRequiredMixin, ManagerRequiredMixin, CreateView):
    form_class = CustomUserCreationForm
    template_name = 'registration/signup.html'
    success_url = reverse_lazy('core:user_list')

    def form_valid(self, form):
        user = form.save(commit=False)
        user.created_by = self.request.user
        user.save()
        
        messages.success(self.request, f'Utilisateur "{user.username}" créé avec succès !')
        
        # Journaliser l'activité
        Activite.objects.create(
            utilisateur=self.request.user,
            type_action='creation',
            description=f'Création de l\'utilisateur: {user.username}',
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            url=self.request.path
        )
        
        return super().form_valid(form)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Nouvel utilisateur'
        context['subtitle'] = 'Ajouter un nouvel utilisateur au système'
        return context

class PublicSignUpView(CreateView):
    """
    Vue d'inscription publique - Crée un nouveau site avec son admin
    """
    form_class = PublicSignUpForm
    template_name = 'registration/signup.html'
    success_url = reverse_lazy('theme:home')

    def form_valid(self, form):
        # Créer l'utilisateur d'abord
        user = form.save(commit=False)
        
        # Générer un nom de site unique basé sur le nom de l'utilisateur
        base_site_name = f"{user.first_name}-{user.last_name}".replace(' ', '-').lower()
        site_name = base_site_name
        counter = 1
        
        # Vérifier l'unicité du nom de site
        while Configuration.objects.filter(site_name=site_name).exists():
            site_name = f"{base_site_name}-{counter}"
            counter += 1
        
        # Configurer l'utilisateur comme admin de son site
        user.is_site_admin = True
        user.is_staff = True  # Donner accès à l'administration
        user.save()  # Sauvegarder l'utilisateur d'abord
        
        # Créer la configuration du nouveau site après avoir sauvegardé l'utilisateur
        site_config = Configuration.objects.create(
            site_name=site_name,
            site_owner=user,
            nom_societe=f"Entreprise {user.first_name} {user.last_name}",
            adresse="Adresse à configurer",
            telephone="Téléphone à configurer",
            email=user.email,
            devise="FCFA",
            tva=0.00,
            description=f"Site créé par {user.get_full_name()}",
            created_by=user,
            updated_by=user
        )
        
        # Maintenant lier l'utilisateur à sa configuration
        user.site_configuration = site_config
        user.save()
        
        messages.success(
            self.request, 
            f'Compte "{user.username}" créé avec succès ! '
            f'Vous êtes maintenant connecté et administrateur de votre site "{site_name}". '
            f'Bienvenue dans BoliBana Stock !'
        )
        
        # Journaliser l'activité
        Activite.objects.create(
            utilisateur=user,
            type_action='creation',
            description=f'Création du site "{site_name}" par {user.username}',
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            url=self.request.path
        )
        
        # S'assurer que la session est créée
        if not self.request.session.session_key:
            self.request.session.create()
        
        # Connecter l'utilisateur après la création du compte
        login(self.request, user)
        
        # Vérifier que l'utilisateur est bien connecté
        if self.request.user.is_authenticated:
            print(f"✅ Utilisateur {user.username} connecté avec succès")
            print(f"📋 Session ID: {self.request.session.session_key}")
            print(f"👤 User ID: {self.request.user.id}")
        else:
            print(f"❌ Erreur: Utilisateur {user.username} n'est pas connecté")
        
        # Sauvegarder la session
        self.request.session.save()
        
        # Rediriger vers la page d'accueil normale
        return redirect('theme:home')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Créer un compte'
        context['subtitle'] = 'Rejoignez BoliBana Stock pour gérer votre inventaire efficacement'
        context['is_public_signup'] = True
        return context

class UserCreateView(LoginRequiredMixin, ManagerRequiredMixin, CreateView):
    form_class = CustomUserCreationForm
    template_name = 'core/user_form.html'
    success_url = reverse_lazy('core:user_list')

    def form_valid(self, form):
        user = form.save(commit=False)
        
        # Assigner l'utilisateur au site de l'admin qui le crée
        if self.request.user.is_superuser:
            # Les superusers peuvent créer des utilisateurs pour n'importe quel site
            # ou créer de nouveaux sites
            pass
        else:
            # Les admins de site ne peuvent créer que des utilisateurs pour leur site
            user.site_configuration = self.request.user.site_configuration
            user.is_site_admin = False  # Par défaut, les nouveaux utilisateurs ne sont pas admins
        
        user.created_by = self.request.user
        user.save()
        
        messages.success(self.request, f'Utilisateur "{user.username}" créé avec succès !')
        
        # Journaliser l'activité
        Activite.objects.create(
            utilisateur=self.request.user,
            type_action='creation',
            description=f'Création de l\'utilisateur: {user.username}',
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            url=self.request.path
        )
        
        return super().form_valid(form)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Nouvel utilisateur'
        context['subtitle'] = 'Ajouter un nouvel utilisateur au système'
        return context

class UserListView(LoginRequiredMixin, ManagerRequiredMixin, ListView):
    model = User
    template_name = 'core/user_list.html'
    context_object_name = 'users'
    paginate_by = 20

    def get_queryset(self):
        if self.request.user.is_superuser:
            # Les superusers voient tous les utilisateurs
            return User.objects.all().order_by('-date_joined')
        else:
            # Les admins de site ne voient que les utilisateurs de leur site
            return User.objects.filter(
                site_configuration=self.request.user.site_configuration
            ).order_by('-date_joined')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.user.is_superuser:
            context['admin_count'] = User.objects.filter(is_superuser=True).count()
        else:
            context['admin_count'] = User.objects.filter(
                site_configuration=self.request.user.site_configuration,
                is_site_admin=True
            ).count()
        return context

class UserUpdateView(LoginRequiredMixin, ManagerRequiredMixin, UpdateView):
    model = User
    form_class = CustomUserUpdateForm
    template_name = 'core/user_form.html'
    success_url = reverse_lazy('core:user_list')

    def get_queryset(self):
        if self.request.user.is_superuser:
            return User.objects.all()
        else:
            # Les admins de site ne peuvent modifier que les utilisateurs de leur site
            return User.objects.filter(site_configuration=self.request.user.site_configuration)

    def form_valid(self, form):
        user = form.save(commit=False)
        user.updated_by = self.request.user
        user.save()
        
        messages.success(self.request, f'Utilisateur "{user.username}" modifié avec succès !')
        
        # Journaliser l'activité
        Activite.objects.create(
            utilisateur=self.request.user,
            type_action='modification',
            description=f'Modification de l\'utilisateur: {user.username}',
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            url=self.request.path
        )
        
        return super().form_valid(form)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Modifier l\'utilisateur'
        context['subtitle'] = 'Modifier les informations de l\'utilisateur'
        return context

class UserDeleteView(LoginRequiredMixin, ManagerRequiredMixin, DeleteView):
    model = User
    template_name = 'core/user_confirm_delete.html'
    success_url = reverse_lazy('core:user_list')

    def get_queryset(self):
        if self.request.user.is_superuser:
            return User.objects.all()
        else:
            # Les admins de site ne peuvent supprimer que les utilisateurs de leur site
            return User.objects.filter(site_configuration=self.request.user.site_configuration)

    def post(self, request, *args, **kwargs):
        user = self.get_object()
        username = user.username
        
        # Empêcher la suppression de soi-même
        if user == request.user:
            messages.error(request, 'Vous ne pouvez pas supprimer votre propre compte.')
            return redirect('core:user_list')
        
        # Empêcher la suppression du dernier admin de site
        if not request.user.is_superuser:
            site_admins = User.objects.filter(
                site_configuration=request.user.site_configuration,
                is_site_admin=True
            )
            if user.is_site_admin and site_admins.count() <= 1:
                messages.error(request, 'Vous ne pouvez pas supprimer le dernier administrateur du site.')
                return redirect('core:user_list')
        
        # Empêcher la suppression du dernier superuser
        if user.is_superuser and User.objects.filter(is_superuser=True).count() <= 1:
            messages.error(request, 'Vous ne pouvez pas supprimer le dernier superutilisateur.')
            return redirect('core:user_list')
        
        try:
            user.delete()
            messages.success(request, f'Utilisateur "{username}" supprimé avec succès.')
            Activite.objects.create(
                utilisateur=request.user,
                type_action='suppression',
                description=f'Suppression de l\'utilisateur: {username}',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                url=request.path
            )
            return redirect('core:user_list')
        except ProtectedError as e:
            user.est_actif = False
            user.save()
            transaction_count = user.transaction_set.count()
            sale_count = user.sale_set.count()
            messages.warning(
                request, 
                f'L\'utilisateur "{username}" ne peut pas être supprimé car il est lié à '
                f'{transaction_count} transaction(s) et {sale_count} vente(s). '
                f'Il a été désactivé à la place.'
            )
            Activite.objects.create(
                utilisateur=request.user,
                type_action='modification',
                description=f'Désactivation forcée de l\'utilisateur: {username} (lié à des données)',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                url=request.path
            )
            return redirect('core:user_list')

@login_required
@user_passes_test(is_manager)
def user_toggle_status(request, pk):
    """Activer/désactiver un utilisateur"""
    try:
        user = User.objects.get(pk=pk)
        
        # Vérifier les permissions
        if not request.user.is_superuser:
            if user.site_configuration != request.user.site_configuration:
                messages.error(request, "Vous n'avez pas les permissions pour modifier cet utilisateur.")
                return redirect('core:user_list')
        
        # Empêcher la désactivation de soi-même
        if user == request.user:
            messages.error(request, 'Vous ne pouvez pas désactiver votre propre compte.')
            return redirect('core:user_list')
        
        # Empêcher la désactivation du dernier admin de site
        if not request.user.is_superuser:
            if user.is_site_admin:
                site_admins = User.objects.filter(
                    site_configuration=request.user.site_configuration,
                    is_site_admin=True
                )
                if site_admins.count() <= 1:
                    messages.error(request, 'Vous ne pouvez pas désactiver le dernier administrateur du site.')
                    return redirect('core:user_list')
        
        # Empêcher la désactivation du dernier superuser
        if user.is_superuser and User.objects.filter(is_superuser=True, est_actif=True).count() <= 1:
            messages.error(request, 'Vous ne pouvez pas désactiver le dernier superutilisateur actif.')
            return redirect('core:user_list')
        
        # Basculer le statut
        user.est_actif = not user.est_actif
        user.save()
        
        status = "activé" if user.est_actif else "désactivé"
        messages.success(request, f'Utilisateur "{user.username}" {status} avec succès.')
        
        # Journaliser l'activité
        Activite.objects.create(
            utilisateur=request.user,
            type_action='modification',
            description=f'{status.capitalize()} de l\'utilisateur: {user.username}',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            url=request.path
        )
        
    except User.DoesNotExist:
        messages.error(request, 'Utilisateur introuvable.')
    
    return redirect('core:user_list')

class ConfigurationUpdateView(LoginRequiredMixin, UpdateView):
    model = Configuration
    template_name = 'core/configuration_form.html'
    fields = [
        'site_name', 'nom_societe', 'adresse', 'telephone', 'email', 
        'devise', 'tva', 'logo', 'description'
    ]
    success_url = reverse_lazy('core:configuration')

    def get_object(self, queryset=None):
        """Récupère la configuration du site de l'utilisateur connecté"""
        if self.request.user.is_superuser:
            # Les superusers peuvent modifier n'importe quelle configuration
            # ou créer une nouvelle si aucune n'existe
            config, created = Configuration.objects.get_or_create(
                defaults={
                    'site_name': 'Site Principal',
                    'nom_societe': 'BoliBana Stock',
                    'adresse': 'Adresse de votre entreprise',
                    'telephone': '+226 XX XX XX XX',
                    'email': 'contact@votreentreprise.com',
                    'devise': 'FCFA',
                    'tva': 0.00,
                    'description': 'Système de gestion de stock',
                    'site_owner': self.request.user,
                    'created_by': self.request.user,
                    'updated_by': self.request.user
                }
            )
            if created:
                # Si une nouvelle configuration a été créée, l'assigner au superuser
                self.request.user.site_configuration = config
                self.request.user.is_site_admin = True
                self.request.user.save()
        else:
            # Les utilisateurs normaux ne peuvent modifier que leur propre configuration
            if not self.request.user.site_configuration:
                raise Http404("Aucun site configuré pour cet utilisateur")
            config = self.request.user.site_configuration
        return config

    def form_valid(self, form):
        config = form.save(commit=False)
        config.updated_by = self.request.user
        config.save()
        
        messages.success(self.request, 'Configuration mise à jour avec succès !')
        
        # Journaliser l'activité
        Activite.objects.create(
            utilisateur=self.request.user,
            type_action='modification',
            description=f'Modification de la configuration du site: {config.site_name}',
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            url=self.request.path
        )
        
        return super().form_valid(form)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Configuration du site'
        context['subtitle'] = 'Personnalisez les paramètres de votre entreprise'
        return context

class ActiviteListView(LoginRequiredMixin, ListView):
    model = Activite
    template_name = 'core/activite_list.html'
    context_object_name = 'activites'
    paginate_by = 20
    ordering = ['-date_action']

class NotificationListView(LoginRequiredMixin, ListView):
    model = Notification
    template_name = 'core/notification_list.html'
    context_object_name = 'notifications'
    paginate_by = 20

    def get_queryset(self):
        return Notification.objects.filter(destinataire=self.request.user).order_by('-created_at')

class ParametreListView(LoginRequiredMixin, ListView):
    model = Parametre
    template_name = 'core/parametre_list.html'
    context_object_name = 'parametres'
    paginate_by = 20

class ParametreUpdateView(LoginRequiredMixin, UpdateView):
    model = Parametre
    template_name = 'core/parametre_form.html'
    fields = ['valeur', 'description', 'est_actif']
    success_url = reverse_lazy('core:parametre_list')

@login_required
def settings(request):
    """Page de paramètres principale avec configuration simple"""
    try:
        config = get_user_site_configuration(request.user)
    except Http404:
        messages.error(request, "Aucun site configuré pour votre compte.")
        return redirect('theme:home')
    
    # Paramètres système importants
    parametres_importants = Parametre.objects.filter(
        est_actif=True,
        cle__in=[
            'SITE_NAME',
            'EMAIL_HOST',
            'MOBILE_API_ENABLED',
            'BACKUP_AUTO'
        ]
    ).order_by('cle')
    
    context = {
        'config': config,
        'parametres_importants': parametres_importants,
    }
    return render(request, 'core/settings.html', context)

@login_required
def configuration_quick_edit(request):
    """Édition rapide de la configuration via AJAX"""
    if request.method == 'POST':
        try:
            config = get_user_site_configuration(request.user)
            
            data = json.loads(request.body)
            field = data.get('field')
            value = data.get('value')
            
            if hasattr(config, field):
                setattr(config, field, value)
                config.updated_by = request.user
                config.save()
                
                return JsonResponse({
                    'success': True,
                    'message': 'Configuration mise à jour avec succès',
                    'value': value
                })
            else:
                return JsonResponse({
                    'success': False,
                    'message': 'Champ invalide'
                }, status=400)
                
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': f'Erreur: {str(e)}'
            }, status=400)
    
    # GET request - afficher la page d'édition rapide
    try:
        config = get_user_site_configuration(request.user)
    except Http404:
        messages.error(request, "Aucun site configuré pour votre compte.")
        return redirect('theme:home')
    
    context = {
        'config': config,
    }
    return render(request, 'core/configuration_quick_edit.html', context)

@login_required
def configuration_reset_defaults(request):
    """Réinitialiser la configuration avec des valeurs par défaut"""
    if request.method == 'POST':
        try:
            config = get_user_site_configuration(request.user)
        except Http404:
            messages.error(request, "Aucun site configuré pour votre compte.")
            return redirect('theme:home')
        
        # Valeurs par défaut
        config.nom_societe = 'BoliBana Stock'
        config.adresse = 'Adresse de votre entreprise'
        config.telephone = '+223 XX XX XX XX'
        config.email = 'contact@votreentreprise.com'
        config.devise = 'FCFA'
        config.tva = 0.00
        config.description = 'Système de gestion de stock'
        config.updated_by = request.user
        config.save()
        
        messages.success(request, 'Configuration réinitialisée avec succès.')
        return redirect('core:configuration')
    
    return render(request, 'core/configuration_reset.html')

@login_required
def configuration_export(request):
    """Exporter la configuration au format JSON"""
    try:
        config = get_user_site_configuration(request.user)
    except Http404:
        messages.error(request, 'Aucun site configuré pour votre compte.')
        return redirect('core:configuration')
    
    config_data = {
        'nom_societe': config.nom_societe,
        'adresse': config.adresse,
        'telephone': config.telephone,
        'email': config.email,
        'devise': config.devise,
        'tva': str(config.tva),
        'site_web': getattr(config, 'site_web', '') or '',
        'description': config.description or '',
        'date_creation': config.created_at.isoformat(),
        'derniere_modification': config.updated_at.isoformat(),
        'created_by': config.get_created_by_display(),
        'updated_by': config.get_updated_by_display(),
    }
    
    response = HttpResponse(
        json.dumps(config_data, indent=2, ensure_ascii=False),
        content_type='application/json'
    )
    response['Content-Disposition'] = 'attachment; filename="configuration_bolibana_stock.json"'
    return response

@login_required
def configuration_history(request):
    """Afficher l'historique des modifications de la configuration"""
    try:
        config = get_user_site_configuration(request.user)
    except Http404:
        messages.error(request, 'Aucun site configuré pour votre compte.')
        return redirect('core:configuration')
    
    # Récupérer les activités liées à la configuration
    activities = Activite.objects.filter(
        type_action__in=['creation', 'modification'],
        description__icontains='Configuration'
    ).order_by('-date_action')[:20]
    
    context = {
        'config': config,
        'activities': activities,
        'title': 'Historique des modifications',
        'subtitle': 'Suivi des changements de configuration'
    }
    return render(request, 'core/configuration_history.html', context)

@login_required
def test_auth(request):
    """
    Vue de test pour diagnostiquer les problèmes d'authentification
    """
    context = {
        'user': request.user,
        'is_authenticated': request.user.is_authenticated,
        'session_id': request.session.session_key,
        'user_id': request.user.id if request.user.is_authenticated else None,
        'username': request.user.username if request.user.is_authenticated else None,
    }
    return render(request, 'core/test_auth.html', context)

def debug_signup(request):
    """
    Vue de debug pour tester l'inscription et la connexion
    """
    if request.method == 'POST':
        from django.contrib.auth.forms import UserCreationForm
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            
            # Créer une session
            if not request.session.session_key:
                request.session.create()
            
            # Connecter l'utilisateur
            login(request, user)
            
            # Vérifier la connexion
            is_authenticated = request.user.is_authenticated
            session_key = request.session.session_key
            
            return JsonResponse({
                'success': True,
                'user_id': user.id,
                'username': user.username,
                'is_authenticated': is_authenticated,
                'session_key': session_key,
                'message': 'Inscription et connexion réussies'
            })
        else:
            return JsonResponse({
                'success': False,
                'errors': form.errors
            })
    
    return render(request, 'core/debug_signup.html')

 