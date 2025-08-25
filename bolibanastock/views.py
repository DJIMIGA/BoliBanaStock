from django.http import HttpResponse

def health_check(request):
    """Vue ultra-simple pour le healthcheck Railway"""
    return HttpResponse("OK", status=200)
