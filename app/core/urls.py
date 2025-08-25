from django.urls import path
from . import views

app_name = 'core'

urlpatterns = [
    path('', views.home, name='home'),
    path('configuration/', views.configuration_view, name='configuration'),
    path('configuration/reset/', views.reset_configuration, name='reset_configuration'),
    path('debug-signup/', views.debug_signup, name='debug_signup'),
    path('health/', views.health_check, name='health_check'),
] 