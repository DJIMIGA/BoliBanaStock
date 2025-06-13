from django.views.generic import TemplateView
from django.db.models import Sum
from django.utils import timezone
from inventory.models import Product
from sales.models import Vente

class HomeView(TemplateView):
    template_name = "theme/home.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Statistiques pour la page d'accueil
        context['total_products'] = Product.objects.count()
        
        # Ventes du jour
        today = timezone.now().date()
        context['today_sales'] = Vente.objects.filter(date_vente__date=today).count()
        
        # Chiffre d'affaires du jour
        context['revenue'] = Vente.objects.filter(
            date_vente__date=today
        ).aggregate(
            total=Sum('montant_total')
        )['total'] or 0
        
        return context 