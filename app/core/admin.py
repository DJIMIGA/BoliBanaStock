from django.contrib import admin
from .models import Configuration, Activite, Notification, Parametre

@admin.register(Configuration)
class ConfigurationAdmin(admin.ModelAdmin):
    list_display = ('nom_societe', 'email', 'telephone', 'devise', 'tva')
    readonly_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')
    
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