from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('login/', views.CustomLoginView.as_view(), name='login'),
    path('logout/', views.CustomLogoutView.as_view(), name='logout'),
    path('register/', views.UserCreateView.as_view(), name='register'),
    path('configuration/', views.ConfigurationUpdateView.as_view(), name='configuration'),
    path('configuration/quick-edit/', views.configuration_quick_edit, name='configuration_quick_edit'),
    path('configuration/reset/', views.configuration_reset_defaults, name='configuration_reset'),
    path('configuration/export/', views.configuration_export, name='configuration_export'),
    path('configuration/history/', views.configuration_history, name='configuration_history'),
    path('activites/', views.ActiviteListView.as_view(), name='activite_list'),
    path('notifications/', views.NotificationListView.as_view(), name='notification_list'),
    path('parametres/', views.ParametreListView.as_view(), name='parametre_list'),
    path('parametres/<int:pk>/edit/', views.ParametreUpdateView.as_view(), name='parametre_update'),
    path('settings/', views.settings, name='settings'),
    path('test-auth/', views.test_auth, name='test_auth'),
    path('debug-signup/', views.debug_signup, name='debug_signup'),
    
    # Gestion des utilisateurs (gérants uniquement)
    path('users/', views.UserListView.as_view(), name='user_list'),
    path('users/new/', views.UserCreateView.as_view(), name='user_create'),
    path('users/<int:pk>/edit/', views.UserUpdateView.as_view(), name='user_update'),
    path('users/<int:pk>/delete/', views.UserDeleteView.as_view(), name='user_delete'),
    path('users/<int:pk>/toggle/', views.user_toggle_status, name='user_toggle_status'),

] 