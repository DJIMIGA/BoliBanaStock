"""
Backend d'authentification personnalisé pour JWT
Utilise is_active de Django (vérifié automatiquement par SimpleJWT)
"""
from rest_framework_simplejwt.authentication import JWTAuthentication


class CustomJWTAuthentication(JWTAuthentication):
    """
    Authentification JWT personnalisée
    SimpleJWT vérifie déjà is_active automatiquement, donc on hérite simplement
    """
    pass

