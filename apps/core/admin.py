from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, Configuration, Activite, Notification, Parametre, PasswordResetToken

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Configuration admin pour le modèle User personnalisé"""
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser', 
                    'is_site_admin', 'site_configuration', 'is_active', 'derniere_connexion')
    list_filter = ('is_staff', 'is_superuser', 'is_site_admin', 'is_active', 'site_configuration', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'telephone')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Informations personnelles'), {
            'fields': ('first_name', 'last_name', 'email', 'telephone', 'adresse', 'poste', 'photo')
        }),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'is_site_admin', 
                      'groups', 'user_permissions'),
            'description': _('Le champ "Actif" contrôle l\'accès au système. Décochez ceci plutôt que de supprimer le compte.'),
        }),
        (_('Configuration du site'), {
            'fields': ('site_configuration',),
        }),
        (_('Dates importantes'), {
            'fields': ('last_login', 'derniere_connexion', 'date_joined'),
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'first_name', 'last_name', 'is_active'),
        }),
    )
    
    readonly_fields = ('last_login', 'date_joined', 'derniere_connexion')
    
    def get_form(self, request, obj=None, **kwargs):
        """Personnaliser le formulaire pour rendre groups et user_permissions optionnels"""
        form = super().get_form(request, obj, **kwargs)
        
        # Rendre groups et user_permissions optionnels
        if 'groups' in form.base_fields:
            form.base_fields['groups'].required = False
        if 'user_permissions' in form.base_fields:
            form.base_fields['user_permissions'].required = False
        
        return form

@admin.register(Configuration)
class ConfigurationAdmin(admin.ModelAdmin):
    list_display = ('nom_societe', 'email', 'telephone', 'devise', 'tva', 'subscription_plan')
    list_filter = ('devise', 'subscription_plan', 'created_at')
    search_fields = ('nom_societe', 'site_name', 'email', 'telephone')
    readonly_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')
    
    fieldsets = (
        (_('Informations du site'), {
            'fields': ('site_name', 'site_owner', 'nom_societe', 'description')
        }),
        (_('Coordonnées'), {
            'fields': ('adresse', 'telephone', 'email')
        }),
        (_('Configuration'), {
            'fields': ('devise', 'tva', 'logo')
        }),
        (_('Abonnement'), {
            'fields': ('subscription_plan',)
        }),
        (_('Dates'), {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(Activite)
class ActiviteAdmin(admin.ModelAdmin):
    list_display = ('utilisateur', 'type_action', 'date_action', 'ip_address')
    list_filter = ('type_action', 'date_action')
    search_fields = ('utilisateur__username', 'description', 'ip_address')
    readonly_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')
    ordering = ('-date_action',)

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('destinataire', 'type_notification', 'titre', 'lu', 'created_at')
    list_filter = ('type_notification', 'lu', 'created_at')
    search_fields = ('destinataire__username', 'titre', 'message')
    readonly_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')
    ordering = ('-created_at',)

@admin.register(Parametre)
class ParametreAdmin(admin.ModelAdmin):
    list_display = ('cle', 'valeur', 'type_valeur', 'est_actif')
    list_filter = ('type_valeur', 'est_actif')
    search_fields = ('cle', 'valeur', 'description')
    readonly_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')
    ordering = ('cle',)

@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'code', 'created_at', 'expires_at', 'used', 'is_valid_display')
    list_filter = ('used', 'created_at', 'expires_at')
    search_fields = ('user__username', 'user__email', 'code')
    readonly_fields = ('created_at', 'is_valid_display')
    ordering = ('-created_at',)
    
    def is_valid_display(self, obj):
        return obj.is_valid()
    is_valid_display.boolean = True
    is_valid_display.short_description = 'Valide' 
