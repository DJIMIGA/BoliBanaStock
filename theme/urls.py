from django.urls import path
from .views import HomeView, HomeViewDebug

app_name = 'theme'
 
urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('debug/', HomeViewDebug.as_view(), name='home_debug'),
] 
