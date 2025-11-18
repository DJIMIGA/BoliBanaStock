from rest_framework import viewsets, status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, F, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.core.cache import cache
import unicodedata
import re
import requests
import json
from apps.core.forms import CustomUserUpdateForm, PublicSignUpForm
from apps.core.models import User, Configuration, Parametre, Activite, PasswordResetToken
from apps.core.views import PublicSignUpView
from apps.core.services import (
    PermissionService, UserInfoService,
    can_user_manage_brand_quick, can_user_create_brand_quick, can_user_delete_brand_quick,
    can_user_manage_category_quick, can_user_create_category_quick, can_user_delete_category_quick
)
from django.db import transaction
from decimal import Decimal

from .serializers import (
    ProductSerializer, ProductListSerializer, CategorySerializer, BrandSerializer,
    TransactionSerializer, SaleSerializer, BarcodeSerializer,
    CustomerSerializer, CreditTransactionSerializer,
    LabelTemplateSerializer, LabelBatchSerializer, UserSerializer,
    LoginSerializer, RefreshTokenSerializer, ProductScanSerializer,
    StockUpdateSerializer, SaleCreateSerializer, LabelBatchCreateSerializer,
    LoyaltyAccountCreateSerializer, LoyaltyPointsCalculateSerializer
)
# Import conditionnel des serializers loyalty
try:
    from .serializers import LoyaltyProgramSerializer, LoyaltyTransactionSerializer
    LOYALTY_SERIALIZERS_AVAILABLE = True
except (ImportError, AttributeError):
    LOYALTY_SERIALIZERS_AVAILABLE = False
    LoyaltyProgramSerializer = None
    LoyaltyTransactionSerializer = None

from apps.inventory.models import Product, Category, Brand, Transaction, LabelTemplate, LabelBatch, LabelItem, Barcode, Customer
from apps.inventory.utils import generate_ean13_from_cug
from apps.sales.models import Sale, SaleItem, CreditTransaction
from apps.sales.services import CreditService
# Import conditionnel de l'application loyalty
try:
    from apps.loyalty.models import LoyaltyProgram, LoyaltyTransaction
    LOYALTY_APP_AVAILABLE = True
except ImportError:
    LOYALTY_APP_AVAILABLE = False
    LoyaltyProgram = None
    LoyaltyTransaction = None

# Import conditionnel de LoyaltyService
try:
    from apps.loyalty.services import LoyaltyService
    LOYALTY_SERVICE_AVAILABLE = True
except ImportError:
    LOYALTY_SERVICE_AVAILABLE = False
    LoyaltyService = None
from apps.core.views import ConfigurationUpdateView, ParametreListView, ParametreUpdateView
from django.http import JsonResponse
from django.core.files.base import ContentFile
import os
import json
import logging

logger = logging.getLogger(__name__)
from django.http import Http404
from apps.inventory.printing.pdf import render_label_batch_pdf
from apps.inventory.printing.tsc import render_label_batch_tsc
from django.shortcuts import get_object_or_404
from django.core.management import call_command
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
import random
from datetime import timedelta
import threading


class LoginView(APIView):
    """Vue pour l'authentification mobile"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']
            
            user = authenticate(username=username, password=password)
            
            if user:
                refresh = RefreshToken.for_user(user)
                return Response({
                    'access_token': str(refresh.access_token),
                    'refresh_token': str(refresh),
                    'user': UserSerializer(user).data
                })
            else:
                return Response(
                    {'error': 'Identifiants invalides'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RefreshTokenView(APIView):
    """Vue pour le refresh token"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = RefreshTokenSerializer(data=request.data)
        if serializer.is_valid():
            try:
                refresh = RefreshToken(serializer.validated_data['refresh'])
                return Response({
                    'access_token': str(refresh.access_token),
                })
            except Exception:
                return Response(
                    {'error': 'Token invalide'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """Vue pour la déconnexion mobile"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            # Log de la déconnexion
            print(f"🔐 Déconnexion de l'utilisateur: {request.user.username}")
            
            # Invalider le token de rafraîchissement si fourni
            refresh_token = request.data.get('refresh')
            if refresh_token:
                try:
                    RefreshToken(refresh_token).blacklist()
                    print(f"✅ Token refresh invalidé pour: {request.user.username}")
                except Exception as e:
                    print(f"⚠️ Erreur invalidation token: {e}")
            
            # Invalider tous les tokens de l'utilisateur (optionnel)
            # Cette option force la déconnexion sur tous les appareils
            force_logout_all = request.data.get('force_logout_all', False)
            if force_logout_all:
                # Blacklister tous les tokens de l'utilisateur
                from rest_framework_simplejwt.tokens import OutstandingToken
                OutstandingToken.objects.filter(user=request.user).update(blacklisted=True)
                print(f"🚫 Tous les tokens invalidés pour: {request.user.username}")
            
            return Response({
                'message': 'Déconnexion réussie',
                'user': request.user.username,
                'timestamp': timezone.now().isoformat(),
                'tokens_invalidated': bool(refresh_token),
                'all_devices_logged_out': force_logout_all
            })
        except Exception as e:
            print(f"❌ Erreur lors de la déconnexion: {e}")
            return Response(
                {'error': 'Erreur lors de la déconnexion'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ForceLogoutAllView(APIView):
    """Vue pour forcer la déconnexion sur tous les appareils"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            print(f"🚫 Force déconnexion tous appareils pour: {request.user.username}")
            
            # Version robuste qui fonctionne avec la configuration actuelle
            tokens_count = 0
            
            # Méthode 1 : Essayer OutstandingToken (si configuré)
            try:
                from rest_framework_simplejwt.tokens import OutstandingToken
                print("✅ OutstandingToken importé avec succès")
                tokens_count = OutstandingToken.objects.filter(user=request.user).update(blacklisted=True)
                print(f"✅ {tokens_count} tokens invalidés via OutstandingToken")
            except ImportError:
                print("⚠️ OutstandingToken non disponible")
            except Exception as e:
                print(f"⚠️ Erreur OutstandingToken: {e}")
            
            # Méthode 2 : Blacklister le refresh token actuel
            refresh_token = request.data.get('refresh')
            if refresh_token:
                try:
                    RefreshToken(refresh_token).blacklist()
                    tokens_count += 1
                    print(f"✅ Refresh token blacklisté")
                except Exception as e:
                    print(f"⚠️ Erreur blacklist refresh token: {e}")
            
            # Méthode 3 : Invalider la session Django (pour le desktop)
            try:
                from django.contrib.auth import logout
                logout(request)
                print("✅ Session Django invalidée")
            except Exception as e:
                print(f"⚠️ Erreur invalidation session: {e}")
            
            # Méthode 4 : Marquer l'utilisateur comme déconnecté
            try:
                request.user.is_active = False
                request.user.save()
                print("✅ Utilisateur marqué comme inactif")
                # Remettre actif pour permettre les futures connexions
                request.user.is_active = True
                request.user.save()
            except Exception as e:
                print(f"⚠️ Erreur marquage utilisateur: {e}")
            
            print(f"✅ Total: {tokens_count} tokens invalidés pour: {request.user.username}")
            
            return Response({
                'message': 'Déconnexion forcée sur tous les appareils',
                'user': request.user.username,
                'tokens_invalidated': tokens_count,
                'timestamp': timezone.now().isoformat()
            })
        except Exception as e:
            print(f"❌ Erreur lors de la déconnexion forcée: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Erreur lors de la déconnexion forcée: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetRequestView(APIView):
    """
    Vue pour demander une réinitialisation de mot de passe
    Génère un code OTP et l'envoie par email
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email_or_username = request.data.get('email') or request.data.get('username')
        
        if not email_or_username:
            return Response(
                {'error': 'Email ou nom d\'utilisateur requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Chercher l'utilisateur par email ou username
            user = None
            if '@' in email_or_username:
                # C'est probablement un email
                try:
                    user = User.objects.get(email=email_or_username)
                except User.DoesNotExist:
                    pass
            else:
                # C'est probablement un username
                try:
                    user = User.objects.get(username=email_or_username)
                except User.DoesNotExist:
                    pass

            # Ne pas révéler si l'utilisateur existe ou non (sécurité)
            # On retourne toujours un message de succès
            if not user:
                # Attendre un peu pour éviter l'énumération d'utilisateurs
                import time
                time.sleep(0.5)
                return Response({
                    'message': 'Si un compte existe avec cet email/username, un code de réinitialisation a été envoyé.'
                }, status=status.HTTP_200_OK)

            # Vérifier que l'utilisateur a un email
            if not user.email:
                return Response({
                    'message': 'Si un compte existe avec cet email/username, un code de réinitialisation a été envoyé.'
                }, status=status.HTTP_200_OK)

            # Restreindre la réinitialisation aux administrateurs du site uniquement
            if not user.is_site_admin:
                logger.warning(f"Tentative de réinitialisation de mot de passe pour un utilisateur non-admin: {user.username}")
                # Retourner le même message pour ne pas révéler la restriction
                return Response({
                    'message': 'Si un compte existe avec cet email/username, un code de réinitialisation a été envoyé.'
                }, status=status.HTTP_200_OK)

            # Générer un code OTP à 6 chiffres
            code = str(random.randint(100000, 999999))

            # Marquer les anciens tokens comme utilisés
            PasswordResetToken.objects.filter(
                user=user,
                used=False,
                expires_at__gt=timezone.now()
            ).update(used=True)

            # Créer un nouveau token
            expires_at = timezone.now() + timedelta(minutes=15)
            reset_token = PasswordResetToken.objects.create(
                user=user,
                code=code,
                expires_at=expires_at,
                used=False
            )

            # Envoyer l'email avec le code
            try:
                # Récupérer la configuration du site pour personnaliser l'email
                # Priorité : site_configuration de l'utilisateur > première configuration disponible
                site_config = None
                if user.site_configuration:
                    site_config = user.site_configuration
                else:
                    # Fallback vers la première configuration disponible
                    site_config = Configuration.objects.first()
                
                # Déterminer l'email d'envoi (expéditeur)
                # Priorité : email du site > EMAIL_HOST_USER (si ce n'est pas "apikey" pour SendGrid) > fallback
                # Important : éviter que l'expéditeur soit identique au destinataire
                from_email = 'bolibanastock@gmail.com'
                
                # Vérifier si on utilise SendGrid (EMAIL_HOST_USER = "apikey")
                is_sendgrid = settings.EMAIL_HOST_USER == 'apikey'
                
                if site_config and site_config.email:
                    # Utiliser l'email du site en priorité
                    if site_config.email.lower() == user.email.lower():
                        # Si l'email du site est identique à l'email utilisateur, utiliser le fallback
                        from_email = 'bolibanastock@gmail.com'
                        logger.warning(f"Email du site ({site_config.email}) identique à l'email utilisateur, utilisation du fallback: {from_email}")
                    else:
                        from_email = site_config.email
                        logger.info(f"Utilisation de l'email du site comme expéditeur: {from_email} (site: {site_config.nom_societe})")
                elif settings.EMAIL_HOST_USER and not is_sendgrid:
                    # Utiliser EMAIL_HOST_USER seulement si ce n'est pas SendGrid
                    if settings.EMAIL_HOST_USER.lower() == user.email.lower():
                        from_email = 'bolibanastock@gmail.com'
                        logger.warning(f"EMAIL_HOST_USER ({settings.EMAIL_HOST_USER}) identique à l'email utilisateur, utilisation du fallback: {from_email}")
                    else:
                        from_email = settings.EMAIL_HOST_USER
                        logger.info(f"Utilisation de EMAIL_HOST_USER comme expéditeur (SMTP authentifié): {from_email}")
                elif is_sendgrid:
                    # Avec SendGrid, utiliser l'email du site ou le fallback
                    logger.info(f"SendGrid détecté, utilisation de l'email du site ou fallback comme expéditeur")
                else:
                    logger.warning(f"Aucun EMAIL_HOST_USER ni email de site trouvé, utilisation du fallback: {from_email}")
                
                # Personnaliser le sujet avec le nom du site si disponible
                site_name = site_config.nom_societe if site_config else 'BoliBana Stock'
                subject = f'Réinitialisation de votre mot de passe - {site_name}'
                
                # Rendre le template email
                context = {
                    'user': user,
                    'code': code,
                    'expires_in_minutes': 15,
                    'site_config': site_config,
                    'site_name': site_name,
                }
                
                # Essayer de charger le template HTML
                try:
                    message_html = render_to_string('emails/password_reset_otp.html', context)
                    message_text = f"""
Bonjour {user.get_full_name() or user.username},

Vous avez demandé à réinitialiser votre mot de passe pour votre compte {site_name}.

Votre code de réinitialisation est : {code}

Ce code est valide pendant 15 minutes.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

Cordialement,
L'équipe {site_name}
"""
                except Exception:
                    # Si le template n'existe pas, utiliser un message simple
                    message_html = None
                    message_text = f"""
Bonjour {user.get_full_name() or user.username},

Votre code de réinitialisation de mot de passe est : {code}

Ce code est valide pendant 15 minutes.

Cordialement,
L'équipe {site_name}
"""

                # Envoyer l'email de manière asynchrone dans un thread séparé
                # pour éviter de bloquer la requête HTTP (évite les timeouts Gunicorn)
                def send_email_async():
                    import sys
                    try:
                        # Forcer l'affichage des logs immédiatement
                        print(f"[EMAIL_THREAD] Tentative d'envoi d'email OTP à {user.email} depuis {from_email}", flush=True)
                        logger.info(f"[EMAIL_THREAD] Tentative d'envoi d'email OTP à {user.email} depuis {from_email}")
                        
                        # Vérifier si on utilise SendGrid Web API
                        # Vérifier d'abord dans settings, puis dans os.getenv
                        sendgrid_api_key = getattr(settings, 'SENDGRID_API_KEY', None) or os.getenv('SENDGRID_API_KEY', None)
                        print(f"[EMAIL_THREAD] SENDGRID_API_KEY détectée: {'Oui' if sendgrid_api_key else 'Non'}", flush=True)
                        
                        # Vérifier si sendgrid est disponible
                        sendgrid_available = False
                        if sendgrid_api_key:
                            try:
                                from sendgrid import SendGridAPIClient
                                from sendgrid.helpers.mail import Mail
                                sendgrid_available = True
                            except ImportError:
                                # Le package sendgrid n'est pas installé - utiliser SMTP en fallback
                                print(f"[EMAIL_THREAD] ⚠️ Package 'sendgrid' non installé, utilisation de SMTP en fallback", flush=True)
                                logger.warning("Package 'sendgrid' non installé. Utilisation du fallback SMTP. Veuillez redéployer l'application pour installer le package depuis requirements.txt")
                                sendgrid_available = False
                        
                        if sendgrid_api_key and sendgrid_available:
                            # Utiliser SendGrid Web API (HTTPS - fonctionne sur Railway)
                            # Documentation: https://github.com/sendgrid/sendgrid-python
                            try:
                                message = Mail(
                                    from_email=from_email,
                                    to_emails=user.email,
                                    subject=subject,
                                    plain_text_content=message_text,
                                    html_content=message_html if message_html else None
                                )
                                
                                sg = SendGridAPIClient(sendgrid_api_key)
                                response = sg.send(message)
                                
                                print(f"[EMAIL_THREAD] Résultat SendGrid API: {response.status_code}", flush=True)
                                print(f"[EMAIL_THREAD] Response body: {response.body}", flush=True)
                                print(f"[EMAIL_THREAD] Response headers: {response.headers}", flush=True)
                                
                                if response.status_code in [200, 202]:
                                    print(f"[EMAIL_THREAD] ✅ Code OTP envoyé avec succès à {user.email}", flush=True)
                                    logger.info(f"✅ Code OTP envoyé avec succès à {user.email} pour {user.username} (SendGrid API)")
                                else:
                                    print(f"[EMAIL_THREAD] ⚠️ SendGrid API a retourné {response.status_code}", flush=True)
                                    logger.warning(f"⚠️ SendGrid API a retourné {response.status_code} pour {user.email}")
                                    logger.warning(f"   Response body: {response.body}")
                                    logger.warning(f"   Response headers: {response.headers}")
                            except Exception as sendgrid_error:
                                # Gestion d'erreur SendGrid spécifique
                                error_msg = str(sendgrid_error)
                                print(f"[EMAIL_THREAD] ❌ Erreur SendGrid: {error_msg}", flush=True)
                                logger.error(f"❌ Erreur SendGrid lors de l'envoi à {user.email}: {error_msg}", exc_info=True)
                                # Ne pas lever l'exception, continuer avec le fallback SMTP si possible
                                raise sendgrid_error
                        else:
                            # Utiliser SMTP Django (fallback)
                            from django.core.mail import get_connection
                            connection = get_connection(fail_silently=False)
                            
                            from django.core.mail import EmailMultiAlternatives
                            email = EmailMultiAlternatives(
                                subject=subject,
                                body=message_text,
                                from_email=from_email,
                                to=[user.email],
                                connection=connection
                            )
                            if message_html:
                                email.attach_alternative(message_html, "text/html")
                            
                            result = email.send()
                            print(f"[EMAIL_THREAD] Résultat send(): {result}", flush=True)
                            
                            if result == 1:
                                print(f"[EMAIL_THREAD] ✅ Code OTP envoyé avec succès à {user.email}", flush=True)
                                logger.info(f"✅ Code OTP envoyé avec succès à {user.email} pour {user.username}")
                            else:
                                print(f"[EMAIL_THREAD] ⚠️ send() a retourné {result} (attendu: 1)", flush=True)
                                logger.warning(f"⚠️ send_mail a retourné {result} (attendu: 1) pour {user.email}")
                    except Exception as email_error:
                        # Logger l'erreur détaillée avec print pour forcer l'affichage
                        error_msg = str(email_error)
                        print(f"[EMAIL_THREAD] ❌ Erreur: {error_msg}", flush=True)
                        import traceback
                        traceback.print_exc()
                        logger.error(f"❌ Erreur lors de l'envoi de l'email à {user.email}: {email_error}", exc_info=True)
                        sendgrid_api_key_check = getattr(settings, 'SENDGRID_API_KEY', None)
                        if sendgrid_api_key_check:
                            logger.error(f"   SendGrid API Key configurée: Oui")
                        else:
                            logger.error(f"   SMTP Config - Host: {settings.EMAIL_HOST}, Port: {settings.EMAIL_PORT}, User: {settings.EMAIL_HOST_USER}, Timeout: {getattr(settings, 'EMAIL_TIMEOUT', 'Non défini')}")
                    finally:
                        print(f"[EMAIL_THREAD] Thread terminé pour {user.email}", flush=True)
                
                # Démarrer l'envoi d'email dans un thread séparé
                email_thread = threading.Thread(target=send_email_async, daemon=True)
                email_thread.start()
                logger.info(f"Envoi d'email OTP initié pour {user.email} (thread asynchrone)")

            except Exception as e:
                logger.error(f"Erreur lors de la préparation de l'email: {e}", exc_info=True)
                # Ne pas révéler l'erreur à l'utilisateur
                return Response({
                    'message': 'Si un compte existe avec cet email/username, un code de réinitialisation a été envoyé.'
                }, status=status.HTTP_200_OK)

            return Response({
                'message': 'Si un compte existe avec cet email/username, un code de réinitialisation a été envoyé.'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erreur lors de la demande de réinitialisation: {e}", exc_info=True)
            # Toujours retourner un succès pour des raisons de sécurité
            return Response({
                'message': 'Si un compte existe avec cet email/username, un code de réinitialisation a été envoyé.'
            }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """
    Vue pour confirmer la réinitialisation de mot de passe avec le code OTP
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email_or_username = request.data.get('email') or request.data.get('username')
        code = request.data.get('code')
        new_password = request.data.get('new_password')

        if not all([email_or_username, code, new_password]):
            return Response(
                {'error': 'Email/username, code et nouveau mot de passe requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validation du mot de passe
        if len(new_password) < 8:
            return Response(
                {'error': 'Le mot de passe doit contenir au moins 8 caractères'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Chercher l'utilisateur
            user = None
            if '@' in email_or_username:
                try:
                    user = User.objects.get(email=email_or_username)
                except User.DoesNotExist:
                    return Response(
                        {'error': 'Code invalide ou expiré'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                try:
                    user = User.objects.get(username=email_or_username)
                except User.DoesNotExist:
                    return Response(
                        {'error': 'Code invalide ou expiré'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Vérifier que l'utilisateur est administrateur du site
            if not user.is_site_admin:
                logger.warning(f"Tentative de confirmation de réinitialisation pour un utilisateur non-admin: {user.username}")
                return Response(
                    {'error': 'Code invalide ou expiré'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Chercher le token valide
            reset_token = PasswordResetToken.objects.filter(
                user=user,
                code=code,
                used=False
            ).order_by('-created_at').first()

            if not reset_token or not reset_token.is_valid():
                return Response(
                    {'error': 'Code invalide ou expiré'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Mettre à jour le mot de passe
            user.set_password(new_password)
            user.save()

            # Marquer le token comme utilisé
            reset_token.mark_as_used()

            # Marquer tous les autres tokens non utilisés comme utilisés (sécurité)
            PasswordResetToken.objects.filter(
                user=user,
                used=False
            ).exclude(id=reset_token.id).update(used=True)

            logger.info(f"Mot de passe réinitialisé pour {user.username}")

            return Response({
                'message': 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erreur lors de la réinitialisation du mot de passe: {e}")
            return Response(
                {'error': 'Une erreur est survenue lors de la réinitialisation'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet pour les produits"""
    # Support explicite du multipart pour upload d'images
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'brand', 'is_active', 'quantity', 'site_configuration']  # ✅ Ajout de 'site_configuration'
    search_fields = ['name', 'cug', 'description']
    ordering_fields = ['name', 'selling_price', 'quantity', 'created_at']
    ordering = ['-updated_at']
    
    def get_queryset(self):
        """Filtrer les produits par site de l'utilisateur"""
        try:
            user_site = getattr(self.request.user, 'site_configuration', None)
        except:
            user_site = None
        
        if self.request.user.is_superuser:
            # Superuser voit tout
            return Product.objects.select_related('category', 'brand').all()
        elif user_site:
            # Utilisateur avec site configuré voit seulement son site
            return Product.objects.filter(site_configuration=user_site).select_related('category', 'brand')
        else:
            # Utilisateur sans site configuré (comme mobile) voit tous les produits
            # C'est une solution temporaire pour permettre l'accès mobile
            print(f"⚠️  Utilisateur {self.request.user.username} sans site configuré - accès à tous les produits")
            return Product.objects.select_related('category', 'brand').all()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer
    
    def get_serializer_context(self):
        """Ajouter le contexte de la requête aux serializers"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def retrieve(self, request, *args, **kwargs):
        """Récupérer un produit avec logs détaillés sur l'image"""
        instance = self.get_object()
        
        # ✅ Logs détaillés sur l'image
        print(f"🔍 DÉTAIL PRODUIT: {instance.name} (ID: {instance.id})")
        print(f"   CUG: {instance.cug}")
        print(f"   Site: {instance.site_configuration.site_name if instance.site_configuration else 'Aucun'}")
        print(f"   Image field: {instance.image}")
        if instance.image:
            try:
                print(f"   Image URL directe: {instance.image.url}")
                # Tester l'URL via le serializer
                serializer = self.get_serializer(instance)
                image_url_from_serializer = serializer.data.get('image_url')
                print(f"   Image URL via serializer: {image_url_from_serializer}")
            except Exception as e:
                print(f"   ❌ Erreur URL image: {e}")
        else:
            print("   ❌ Aucune image")
        
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """Créer un produit avec gestion améliorée des images"""
        try:
            print(f"🆕 Création produit - Méthode: {request.method}")
            print(f"📦 Données reçues: {dict(request.data)}")
            print(f"📎 Fichiers reçus: {list(request.FILES.keys())}")
            print(f"🌐 Origine: {request.META.get('HTTP_ORIGIN', 'Non spécifiée')}")
            print(f"📱 User-Agent: {request.META.get('HTTP_USER_AGENT', 'Non spécifié')}")
            
            # Vérifier la taille des fichiers
            for field_name, file_obj in request.FILES.items():
                print(f"📏 Fichier {field_name}: {file_obj.size} bytes, type: {file_obj.content_type}")
                if file_obj.size > 50 * 1024 * 1024:  # 50MB
                    return Response(
                        {'error': f'Fichier {field_name} trop volumineux (max 50MB)'},
                        status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                    )
            
            # Log spécifique pour l'image
            if 'image' in request.FILES:
                image_file = request.FILES['image']
                print(f"🖼️ Image reçue: {image_file.name}, {image_file.size} bytes, {image_file.content_type}")
                print(f"🎨 Image sera traitée automatiquement par Product.save()")
            else:
                print(f"❌ Aucune image reçue")
            
        except Exception as e:
            print(f"⚠️  Erreur lors du logging de création: {e}")
        
        # Appeler le create par défaut qui va appeler Product.save()
        # Product.save() appelle _auto_process_background() après super().save()
        response = super().create(request, *args, **kwargs)
        
        # Vérifier si le produit a été créé avec succès
        if hasattr(response, 'data') and 'id' in response.data:
            product_id = response.data['id']
            print(f"✅ Produit créé avec ID: {product_id}")
            print(f"🎨 Le traitement automatique de background devrait avoir été appliqué par Product.save()")
        
        return response

    def update(self, request, *args, **kwargs):
        # Log de debug pour suivre les mises à jour complètes (PUT)
        try:
            print("📝 Update Product (PUT) - payload:", request.data)
            try:
                print("📎 Fichiers reçus (PUT):", list(request.FILES.keys()))
            except Exception:
                pass
        except Exception:
            pass
        # Autoriser une mise à jour partielle même via PUT pour simplifier côté mobile
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        # Log de debug pour suivre les mises à jour partielles (PATCH)
        try:
            print("📝 Update Product (PATCH) - payload:", request.data)
            try:
                print("📎 Fichiers reçus (PATCH):", list(request.FILES.keys()))
            except Exception:
                pass
        except Exception:
            pass
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='upload_image')
    def upload_image(self, request, pk=None):
        """Action dédiée pour uploader/mettre à jour l'image (POST multipart) avec gestion améliorée des erreurs.
        Contourne les soucis de certains clients avec PUT multipart.
        """
        import time
        start_time = time.time()
        
        try:
            print("🖼️  Upload image (POST) - payload:", dict(request.data))
            print("📎 Fichiers reçus (POST):", list(request.FILES.keys()))
            print(f"🌐 Origine: {request.META.get('HTTP_ORIGIN', 'Non spécifiée')}")
            print(f"📱 User-Agent: {request.META.get('HTTP_USER_AGENT', 'Non spécifié')}")
            
            # Vérifier la taille des fichiers avec limite augmentée
            for field_name, file_obj in request.FILES.items():
                print(f"📏 Fichier {field_name}: {file_obj.size} bytes, type: {file_obj.content_type}")
                if file_obj.size > 100 * 1024 * 1024:  # 100MB au lieu de 50MB
                    return Response(
                        {'error': f'Fichier {field_name} trop volumineux (max 100MB)'},
                        status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                    )
                    
        except Exception as e:
            print(f"⚠️  Erreur lors du logging d'upload: {e}")

        product = get_object_or_404(Product, pk=pk)
        
        # ✅ Gestion explicite de l'image avec retry
        if 'image' in request.FILES:
            print(f"🖼️  Gestion explicite de l'image pour le produit {product.name}")
            
            try:
                # Supprimer l'ancienne image si elle existe
                if product.image:
                    print(f"🗑️  Suppression de l'ancienne image: {product.image.name}")
                    try:
                        product.image.delete()
                        print(f"✅ Ancienne image supprimée avec succès")
                    except Exception as e:
                        print(f"⚠️  Erreur lors de la suppression de l'ancienne image: {e}")
                        print(f"💡 L'upload continuera avec la nouvelle image")
                
                # Sauvegarder la nouvelle image avec gestion d'erreur
                print(f"💾 Sauvegarde de la nouvelle image via le modèle")
                serializer = self.get_serializer(product, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)
                
                duration = time.time() - start_time
                print(f"✅ Upload réussi en {duration:.2f}s")
                
                return Response(serializer.data)
                
            except Exception as e:
                print(f"❌ Erreur lors de l'upload: {e}")
                return Response(
                    {'error': f'Erreur lors de l\'upload: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response({'error': 'Aucune image fournie'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def scan(self, request):
        """Scanner un produit par code"""
        serializer = ProductScanSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            code = serializer.validated_data['code']
            
            
            # Filtrer par site de l'utilisateur
            user_site = getattr(request.user, 'site_configuration', None)
            
            if request.user.is_superuser:
                # Superuser peut scanner tous les produits
                # 1. Chercher par CUG (champ qui existe encore)
                product = Product.objects.filter(cug=code).first()
                
                # 2. Si pas trouvé, chercher dans le modèle Barcode lié
                if not product:
                    product = Product.objects.filter(barcodes__ean=code).first()

                # 3. Heuristiques supplémentaires pour codes variables (POS/caisses)
                if not product:
                    normalized_candidates = set()
                    raw = str(code).strip()
                    normalized_candidates.add(raw)

                    # Zero-pad jusqu'à 13 caractères (EAN-13)
                    if len(raw) < 13:
                        normalized_candidates.add(raw.zfill(13))

                    # Retirer les préfixes magasin/poids/prix courants (20/21/22)
                    for prefix in ("20", "21", "22"):
                        if raw.startswith(prefix) and len(raw) > 2:
                            normalized_candidates.add(raw[2:])
                            if len(raw[2:]) < 13:
                                normalized_candidates.add(raw[2:].zfill(13))

                    # Correspondance par suffixe (les caisses utilisent parfois les 8 derniers chiffres)
                    suffix_lengths = (8, 7, 6)
                    for n in suffix_lengths:
                        if len(raw) > n:
                            normalized_candidates.add(raw[-n:])
                            normalized_candidates.add(raw[-n:].zfill(13))

                    # Rechercher dans barcodes puis dans l'EAN généré
                    from django.db.models import Q
                    candidate_query = Q()
                    for cand in normalized_candidates:
                        candidate_query |= Q(barcodes__ean=cand) | Q(generated_ean=cand)
                    potential = Product.objects.filter(candidate_query).first()
                    if potential:
                        product = potential
                
            else:
                # Utilisateur normal ne peut scanner que ses produits
                if not user_site:
                    print("❌ Aucun site configuré pour l'utilisateur")
                    return Response(
                        {
                            'error': 'Aucun site configuré pour cet utilisateur',
                            'message': 'Veuillez contacter l\'administrateur pour configurer votre site'
                        }, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # 1. Chercher par CUG (champ qui existe encore)
                product = Product.objects.filter(
                    site_configuration=user_site,
                    cug=code
                ).first()
                
                # 2. Si pas trouvé, chercher dans le modèle Barcode lié
                if not product:
                    product = Product.objects.filter(
                        site_configuration=user_site,
                        barcodes__ean=code
                    ).first()

                # 3. Heuristiques supplémentaires pour codes variables (POS/caisses)
                if not product:
                    normalized_candidates = set()
                    raw = str(code).strip()
                    normalized_candidates.add(raw)

                    # Zero-pad jusqu'à 13 caractères (EAN-13)
                    if len(raw) < 13:
                        normalized_candidates.add(raw.zfill(13))

                    # Retirer les préfixes magasin/poids/prix courants (20/21/22)
                    for prefix in ("20", "21", "22"):
                        if raw.startswith(prefix) and len(raw) > 2:
                            normalized_candidates.add(raw[2:])
                            if len(raw[2:]) < 13:
                                normalized_candidates.add(raw[2:].zfill(13))

                    # Correspondance par suffixe (les caisses utilisent parfois les 8 derniers chiffres)
                    suffix_lengths = (8, 7, 6)
                    for n in suffix_lengths:
                        if len(raw) > n:
                            normalized_candidates.add(raw[-n:])
                            normalized_candidates.add(raw[-n:].zfill(13))

                    from django.db.models import Q
                    candidate_query = Q(site_configuration=user_site)
                    barcode_conditions = Q()
                    for cand in normalized_candidates:
                        barcode_conditions |= (Q(barcodes__ean=cand) | Q(generated_ean=cand) | Q(cug=cand))
                    candidate_query &= barcode_conditions
                    potential = Product.objects.filter(candidate_query).first()
                    if not potential:
                        # Tentative par suffixe sur barcodes/généré (endswith)
                        ends_conditions = Q()
                        for cand in normalized_candidates:
                            ends_conditions |= Q(barcodes__ean__endswith=cand) | Q(generated_ean__endswith=cand)
                        suffix_query = Q(site_configuration=user_site) & ends_conditions
                        potential = Product.objects.filter(suffix_query).first()
                    if potential:
                        product = potential
            
            if product:
                return Response(ProductSerializer(product).data)
            else:
                # Vérifier si le produit existe ailleurs (pour les utilisateurs non-superuser)
                if not request.user.is_superuser:
                    global_product = Product.objects.filter(cug=code).first()
                    if not global_product:
                        global_product = Product.objects.filter(barcodes__ean=code).first()
                    
                    if global_product:
                        return Response(
                            {
                                'error': 'Produit non trouvé dans votre site',
                                'message': f'Le produit "{global_product.name}" existe mais n\'est pas accessible depuis votre site',
                                'product_exists': True,
                                'product_name': global_product.name
                            }, 
                            status=status.HTTP_404_NOT_FOUND
                        )
                
                return Response(
                    {
                        'error': 'Produit non trouvé',
                        'message': f'Aucun produit trouvé avec le code "{code}" dans la base de données',
                        'product_exists': False,
                        'suggestions': 'Vérifiez le code ou ajoutez le produit'
                    }, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        """Assigner automatiquement le site de l'utilisateur lors de la création"""
        if self.request.user.is_superuser:
            # Les superusers créent des produits pour le site principal
            from apps.core.models import Configuration
            main_site = Configuration.objects.order_by('id').first()
            if main_site:
                serializer.save(site_configuration=main_site)
            else:
                serializer.save()
            return
        user_site = getattr(self.request.user, 'site_configuration', None)
        if not user_site:
            raise ValidationError({"detail": "Aucun site configuré pour cet utilisateur. Veuillez contacter l'administrateur."})
        serializer.save(site_configuration=user_site)
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Produits en stock faible"""
        products = self.get_queryset().filter(
            quantity__gt=0,
            quantity__lte=F('alert_threshold')
        )
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def out_of_stock(self, request):
        """Produits en rupture de stock (quantité = 0) ET en backorder (quantité < 0)"""
        products = self.get_queryset().filter(quantity__lte=0)
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def backorders(self, request):
        """Produits en backorder (stock négatif) uniquement"""
        products = self.get_queryset().filter(quantity__lt=0)
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_stock(self, request, pk=None):
        """Mettre à jour le stock d'un produit"""
        product = self.get_object()
        serializer = StockUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            quantity = serializer.validated_data['quantity']
            notes = serializer.validated_data.get('notes', '')
            
            # Créer une transaction
            old_quantity = product.quantity
            product.quantity = quantity
            product.save()
            
            if quantity != old_quantity:
                transaction_type = 'in' if quantity > old_quantity else 'loss'
                Transaction.objects.create(
                    product=product,
                    type=transaction_type,
                    quantity=abs(quantity - old_quantity),
                    unit_price=product.purchase_price,
                    notes=notes or f'Mise à jour stock: {old_quantity} -> {quantity}',
                    user=request.user
                )
            
            return Response(ProductSerializer(product).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def stock_movements(self, request, pk=None):
        """Récupérer les mouvements de stock d'un produit avec avant/après"""
        product = self.get_object()
        
        # Filtrer par site de l'utilisateur
        user_site = getattr(request.user, 'site_configuration', None)
        
        # Récupérer les transactions pour ce produit (plus récentes d'abord)
        transactions_query = Transaction.objects.filter(product=product)
        
        if not request.user.is_superuser and user_site:
            # Filtrer par site pour les utilisateurs normaux (transactions récentes et historiques)
            from django.db.models import Q
            transactions_query = transactions_query.filter(
                Q(site_configuration=user_site) | Q(product__site_configuration=user_site)
            )
        
        transactions = (
            transactions_query
            .select_related('user')
            .order_by('-transaction_date')[:50]
        )
        
        movements = []
        current_stock = product.quantity
        
        for transaction in transactions:
            # Déterminer stock_before et stock_after en remontant le temps
            stock_after = current_stock
            if transaction.type == 'in':
                stock_before = stock_after - transaction.quantity
            elif transaction.type == 'out':
                stock_before = stock_after + transaction.quantity
            elif transaction.type == 'adjustment':
                stock_before = stock_after - transaction.quantity
            else:
                stock_before = None
                stock_after = None
            
            # Mettre à jour le curseur pour la prochaine itération
            if stock_before is not None:
                current_stock = stock_before
            
            movements.append({
                'id': transaction.id,
                'type': transaction.type,
                'quantity': transaction.quantity,
                'stock_before': stock_before,
                'stock_after': stock_after,
                'date': transaction.transaction_date.isoformat(),
                'notes': transaction.notes,
                'user': transaction.user.username if transaction.user else 'Système',
                'sale_id': transaction.sale.id if transaction.sale else None,
                'sale_reference': f"Vente #{transaction.sale.reference or transaction.sale.id}" if transaction.sale else None,
                'is_sale_transaction': transaction.sale is not None,
            })
        
        return Response({
            'product_id': product.id,
            'product_name': product.name,
            'current_stock': product.quantity,
            'movements': movements,
        })

    @action(detail=True, methods=['post'])
    def add_stock(self, request, pk=None):
        """Ajouter du stock à un produit avec contexte métier"""
        product = self.get_object()
        quantity = request.data.get('quantity')
        notes = request.data.get('notes', 'Ajout de stock')
        
        # Log des données brutes reçues
        logger.info(f"🔍 [BACKEND] add_stock - Requête complète: {request.data}")
        logger.info(f"🔍 [BACKEND] add_stock - Product ID: {product.id}, Quantity: {quantity}")
        logger.info(f"🔍 [BACKEND] add_stock - Notes brutes (request.data.get): '{notes}'")
        logger.info(f"🔍 [BACKEND] add_stock - Notes type: {type(notes)}, Notes repr: {repr(notes)}")
        
        # Nouveaux paramètres de contexte métier
        context = request.data.get('context', 'manual')  # 'reception', 'inventory', 'manual'
        context_id = request.data.get('context_id')     # ID du contexte
        
        logger.info(f"🔍 [BACKEND] add_stock - Context: '{context}', Context ID: {context_id}")
        
        # Gestion du contexte métier
        context_notes = notes
        
        if context == 'reception':
            logger.info(f"🔍 [BACKEND] add_stock RECEPTION - Notes reçues (type={type(notes)}): '{notes}'")
            logger.info(f"🔍 [BACKEND] add_stock RECEPTION - Notes None? {notes is None}")
            logger.info(f"🔍 [BACKEND] add_stock RECEPTION - Notes strip: '{notes.strip() if notes else None}'")
            logger.info(f"🔍 [BACKEND] add_stock RECEPTION - Notes bool: {bool(notes and notes.strip())}")
            if notes and notes.strip():
                notes_stripped = notes.strip()
                notes_lower = notes_stripped.lower()
                starts_with_prefix = notes_lower.startswith('réception marchandise')
                logger.info(f"🔍 [BACKEND] add_stock RECEPTION - Notes stripped: '{notes_stripped}'")
                logger.info(f"🔍 [BACKEND] add_stock RECEPTION - Notes lower: '{notes_lower}'")
                logger.info(f"🔍 [BACKEND] add_stock RECEPTION - Starts with prefix? {starts_with_prefix}")
                logger.info(f"🔍 [BACKEND] add_stock RECEPTION - Prefix check string: 'réception marchandise'")
                logger.info(f"🔍 [BACKEND] add_stock RECEPTION - Prefix check result: {notes_lower[:22]} == 'réception marchandise'")
                # Éviter la duplication si les notes commencent déjà par "Réception marchandise"
                if starts_with_prefix:
                    context_notes = notes_stripped
                    logger.info(f"🔍 [BACKEND] add_stock RECEPTION - ✅ Utilisation notes telles quelles: '{context_notes}'")
                else:
                    context_notes = f'Réception marchandise - {notes_stripped}'
                    logger.info(f"🔍 [BACKEND] add_stock RECEPTION - ✅ Ajout préfixe: '{context_notes}'")
            else:
                context_notes = 'Réception marchandise'
                logger.info(f"🔍 [BACKEND] add_stock RECEPTION - ✅ Notes vides, préfixe par défaut: '{context_notes}'")
            logger.info(f"🔍 [BACKEND] add_stock RECEPTION - 📝 context_notes FINAL: '{context_notes}'")
        elif context == 'inventory':
            if notes and notes.strip():
                # Éviter la duplication si les notes commencent déjà par "Ajustement inventaire"
                if notes.strip().lower().startswith('ajustement inventaire'):
                    context_notes = notes.strip()
                else:
                    context_notes = f'Ajustement inventaire - {notes.strip()}'
            else:
                context_notes = 'Ajustement inventaire'
        elif context == 'manual':
            # Les actions manuelles sont considérées comme des écarts d'inventaire
            if notes and notes.strip():
                notes_lower = notes.strip().lower()
                # Éviter la duplication si les notes commencent déjà par "Écart inventaire"
                if notes_lower.startswith('écart inventaire'):
                    context_notes = notes.strip()
                else:
                    context_notes = f'Écart inventaire - Ajout manuel - {notes.strip()}'
            else:
                context_notes = 'Écart inventaire - Ajout manuel'
        
        if not quantity or quantity <= 0:
            return Response(
                {'error': 'La quantité doit être positive'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Utiliser une transaction atomique pour éviter les race conditions
        with transaction.atomic():
            # Recharger le produit depuis la base pour avoir la dernière version
            product.refresh_from_db()
            
            # Mettre à jour le stock
            old_quantity = product.quantity
            product.quantity += quantity
            product.save()
            
            # Créer la transaction
            logger.info(f"🔍 [BACKEND] Transaction.objects.create - notes à sauvegarder: '{context_notes}'")
            transaction_obj = Transaction.objects.create(
                product=product,
                type='in',
                quantity=quantity,
                unit_price=product.purchase_price,
                notes=context_notes,
                user=request.user,
                site_configuration=getattr(request.user, 'site_configuration', None)
            )
            logger.info(f"🔍 [BACKEND] Transaction créée - ID: {transaction_obj.id}, notes sauvegardées (depuis DB): '{transaction_obj.notes}'")
            # Vérifier si les notes ont changé après sauvegarde
            transaction_obj.refresh_from_db()
            logger.info(f"🔍 [BACKEND] Transaction après refresh - notes: '{transaction_obj.notes}'")
        
        return Response({
            'success': True,
            'message': f'{quantity} unités ajoutées au stock',
            'old_quantity': old_quantity,
            'new_quantity': product.quantity,
            'product': ProductSerializer(product).data,
            'context': context,
            'context_id': context_id
        })

    @action(detail=True, methods=['post'])
    def remove_stock(self, request, pk=None):
        """Retirer du stock d'un produit - Permet les stocks négatifs (backorder)"""
        product = self.get_object()
        quantity = request.data.get('quantity')
        notes = request.data.get('notes', 'Retrait de stock')
        
        if not quantity or quantity <= 0:
            return Response(
                {'error': 'La quantité doit être positive'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ✅ NOUVELLE LOGIQUE: Permettre les stocks négatifs pour les backorders
        # Plus de vérification de stock insuffisant - on peut descendre en dessous de 0
        
        # Nouveau paramètre pour spécifier le type de transaction
        # 'out' = retrait normal, 'loss' = casse, None = auto (out ou backorder selon stock)
        requested_transaction_type = request.data.get('transaction_type')
        if requested_transaction_type and requested_transaction_type not in ['out', 'loss']:
            return Response(
                {'error': "transaction_type doit être 'out' ou 'loss'"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Utiliser une transaction atomique pour éviter les race conditions
        with transaction.atomic():
            # Recharger le produit depuis la base pour avoir la dernière version
            product.refresh_from_db()
            
            # Mettre à jour le stock
            old_quantity = product.quantity
            product.quantity -= quantity
            product.save()
            
            # Déterminer le type de transaction
            if requested_transaction_type:
                # Si un type est explicitement demandé (out ou loss), l'utiliser
                transaction_type = requested_transaction_type
            else:
                # Sinon, déterminer automatiquement selon le stock final
                transaction_type = 'out'
                if product.quantity < 0:
                    transaction_type = 'backorder'  # Nouveau type pour les backorders
            
            # Récupérer le site de l'utilisateur
            user_site = getattr(request.user, 'site_configuration', None)
            
        # Nouveaux paramètres de contexte métier
        context = request.data.get('context', 'manual')  # 'sale', 'inventory', 'return', 'manual', 'loss'
        context_id = request.data.get('context_id')     # ID du contexte
        
        # Gestion du contexte métier
        sale = None
        context_notes = notes
        
        if context == 'sale' and context_id:
            try:
                sale = Sale.objects.get(id=context_id)
                context_notes = f'Retrait pour vente #{sale.reference or sale.id} - {notes}'
            except Sale.DoesNotExist:
                return Response(
                    {'error': f'Vente avec ID {context_id} non trouvée'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif context == 'inventory':
            context_notes = f'Ajustement inventaire - {notes}'
        elif context == 'return':
            context_notes = f'Retour client - {notes}'
        elif context == 'loss' or transaction_type == 'loss':
            # Si c'est une casse, utiliser des notes spécifiques (pas un écart inventaire)
            if notes and notes.strip() and not notes.strip().lower().startswith('casse'):
                context_notes = f'Casse - {notes.strip()}'
            else:
                context_notes = notes if notes and notes.strip() else 'Casse'
        elif context == 'manual':
            # Les actions manuelles sont considérées comme des écarts d'inventaire
            if notes and notes.strip():
                notes_lower = notes.strip().lower()
                # Éviter la duplication si les notes commencent déjà par "Écart inventaire"
                if notes_lower.startswith('écart inventaire'):
                    context_notes = notes.strip()
                else:
                    context_notes = f'Écart inventaire - Retrait manuel - {notes.strip()}'
            else:
                context_notes = 'Écart inventaire - Retrait manuel'
        
        # Compatibilité avec l'ancien paramètre sale_id
        sale_id = request.data.get('sale_id')
        if sale_id and not sale:
            try:
                sale = Sale.objects.get(id=sale_id)
                context_notes = f'Retrait pour vente #{sale.reference or sale.id} - {notes}'
            except Sale.DoesNotExist:
                return Response(
                    {'error': f'Vente avec ID {sale_id} non trouvée'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Créer la transaction systématiquement, avec association vente si présente
        Transaction.objects.create(
            product=product,
            type=transaction_type,
            quantity=quantity,
            unit_price=product.purchase_price,
            notes=context_notes,
            user=request.user,
            site_configuration=user_site,
            sale=sale
        )
        
        # Message adaptatif selon le stock final
        if product.quantity < 0:
            message = f'{quantity} unités retirées - Stock en backorder ({abs(product.quantity)} unités en attente)'
        elif product.quantity == 0:
            message = f'{quantity} unités retirées - Stock épuisé'
        else:
            message = f'{quantity} unités retirées du stock'
        
        return Response({
            'success': True,
            'message': message,
            'old_quantity': old_quantity,
            'new_quantity': product.quantity,
            'stock_status': product.stock_status,
            'has_backorder': product.has_backorder,
            'backorder_quantity': product.backorder_quantity,
            'product': ProductSerializer(product).data,
            'context': context,
            'context_id': context_id,
            'sale_linked': sale.id if sale else None
        })

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        """Ajuster le stock d'un produit avec contexte métier (correction)"""
        product = self.get_object()
        try:
            new_quantity = int(request.data.get('quantity'))
        except (TypeError, ValueError):
            return Response({'error': 'Quantité invalide'}, status=status.HTTP_400_BAD_REQUEST)
        notes = request.data.get('notes', 'Ajustement de stock')
        
        # Nouveaux paramètres de contexte métier
        context = request.data.get('context', 'manual')  # 'inventory', 'correction', 'manual'
        context_id = request.data.get('context_id')     # ID du contexte
        
        # Gestion du contexte métier
        context_notes = notes
        
        if context == 'inventory':
            if notes and notes.strip():
                # Éviter la duplication si les notes commencent déjà par "Écart inventaire" ou "Ajustement inventaire"
                notes_lower = notes.strip().lower()
                if notes_lower.startswith('écart inventaire') or notes_lower.startswith('ajustement inventaire'):
                    context_notes = notes.strip()
                else:
                    context_notes = f'Écart inventaire - {notes.strip()}'
            else:
                context_notes = 'Écart inventaire'
        elif context == 'correction':
            if notes and notes.strip():
                # Éviter la duplication si les notes commencent déjà par "Correction stock"
                if notes.strip().lower().startswith('correction stock'):
                    context_notes = notes.strip()
                else:
                    context_notes = f'Correction stock - {notes.strip()}'
            else:
                context_notes = 'Correction stock'
        elif context == 'manual':
            # Par défaut, les ajustements manuels sont considérés comme des écarts d'inventaire
            if notes and notes.strip():
                notes_lower = notes.strip().lower()
                # Éviter la duplication si les notes commencent déjà par "Écart" ou "Ajustement"
                if notes_lower.startswith('écart') or notes_lower.startswith('ajustement'):
                    context_notes = notes.strip()
                else:
                    context_notes = f'Écart inventaire - {notes.strip()}'
            else:
                context_notes = 'Écart inventaire'
        
        if new_quantity is None or new_quantity < 0:
            return Response(
                {'error': 'La quantité doit être positive ou nulle'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mettre à jour le stock
        old_quantity = product.quantity
        product.quantity = new_quantity
        product.save()
        
        # Créer la transaction d'ajustement
        if new_quantity != old_quantity:
            adjustment_quantity = new_quantity - old_quantity
            Transaction.objects.create(
                product=product,
                type='adjustment',
                quantity=adjustment_quantity,
                unit_price=product.purchase_price,
                notes=context_notes,
                user=request.user,
                site_configuration=getattr(request.user, 'site_configuration', None)
            )
        
        return Response({
            'success': True,
            'message': f'Stock ajusté de {old_quantity} à {new_quantity}',
            'old_quantity': old_quantity,
            'new_quantity': product.quantity,
            'product': ProductSerializer(product).data,
            'context': context,
            'context_id': context_id
        })

    @action(detail=False, methods=['get'])
    def all_barcodes(self, request):
        """Récupérer tous les codes-barres de tous les produits"""
        # Récupérer tous les codes-barres avec les informations du produit
        barcodes = Barcode.objects.select_related('product').all().order_by('product__name', '-is_primary', 'added_at')
        
        # Sérialiser les codes-barres
        barcode_data = []
        for barcode in barcodes:
            barcode_data.append({
                'id': barcode.id,
                'ean': barcode.ean,
                'is_primary': barcode.is_primary,
                'notes': barcode.notes,
                'added_at': barcode.added_at.isoformat() if barcode.added_at else None,
                'updated_at': barcode.updated_at.isoformat() if barcode.updated_at else None,
                'product': {
                    'id': barcode.product.id,
                    'name': barcode.product.name,
                    'cug': barcode.product.cug,
                    'category': barcode.product.category.name if barcode.product.category else None,
                    'brand': barcode.product.brand.name if barcode.product.brand else None
                }
            })
        
        return Response({
            'success': True,
            'total_barcodes': len(barcode_data),
            'barcodes': barcode_data
        })

    @action(detail=True, methods=['get'])
    def list_barcodes(self, request, pk=None):
        """Récupérer tous les codes-barres d'un produit"""
        product = self.get_object()
        
        # Récupérer tous les codes-barres du produit
        barcodes = product.barcodes.all().order_by('-is_primary', 'added_at')
        
        # Sérialiser les codes-barres
        barcode_data = []
        for barcode in barcodes:
            barcode_data.append({
                'id': barcode.id,
                'ean': barcode.ean,
                'is_primary': barcode.is_primary,
                'notes': barcode.notes,
                'added_at': barcode.added_at.isoformat() if barcode.added_at else None,
                'updated_at': barcode.updated_at.isoformat() if barcode.updated_at else None
            })
        
        return Response({
            'success': True,
            'product_id': product.id,
            'product_name': product.name,
            'barcodes_count': len(barcode_data),
            'barcodes': barcode_data
        })

    @action(detail=True, methods=['post'])
    def add_barcode(self, request, pk=None):
        """Ajouter un code-barres au produit"""
        product = self.get_object()
        ean = request.data.get('ean')
        notes = request.data.get('notes', '')
        
        if not ean:
            return Response(
                {'error': 'Le code-barres est requis'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vérifier que le code-barres n'existe pas déjà pour ce produit
        if product.barcodes.filter(ean=ean).exists():
            return Response(
                {'error': 'Ce code-barres existe déjà pour ce produit'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ✅ Vérifier que le code-barres n'est pas déjà utilisé par un autre produit DU MÊME SITE
        user_site = getattr(request.user, 'site_configuration', None)
        if user_site:
            existing_barcode = Barcode.objects.filter(
                ean=ean,
                product__site_configuration=user_site
            ).exclude(product=product).first()
            if existing_barcode:
                return Response({
                    'error': f'Ce code-barres "{ean}" est déjà utilisé par le produit "{existing_barcode.product.name}" (ID: {existing_barcode.product.id}) sur le site "{user_site.site_name}"'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Fallback pour utilisateurs sans site (comme mobile)
            existing_barcode = Barcode.objects.filter(ean=ean).exclude(product=product).first()
            if existing_barcode:
                return Response({
                    'error': f'Ce code-barres "{ean}" est déjà utilisé par le produit "{existing_barcode.product.name}" (ID: {existing_barcode.product.id})'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Cette vérification est redondante car nous avons déjà vérifié dans le modèle Barcode
        # Le code-barres est stocké dans le modèle Barcode, pas directement dans Product
        
        # Créer le nouveau code-barres
        try:
            barcode = Barcode.objects.create(
                product=product,
                ean=ean,
                notes=notes,
                is_primary=not product.barcodes.exists()  # Premier code-barres = principal
            )
        except Exception as e:
            return Response({
                'error': f'Erreur lors de l\'ajout du code-barres: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'message': 'Code-barres ajouté avec succès',
            'barcode': {
                'id': barcode.id,
                'ean': barcode.ean,
                'is_primary': barcode.is_primary,
                'notes': barcode.notes,
                'added_at': barcode.added_at.isoformat() if barcode.added_at else None
            }
        })

    @action(detail=True, methods=['delete'])
    def remove_barcode(self, request, pk=None):
        """Supprimer un code-barres du produit"""
        product = self.get_object()
        barcode_id = request.data.get('barcode_id')
        
        if not barcode_id:
            return Response(
                {'error': 'L\'ID du code-barres est requis'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Gérer le cas où barcode_id est 'primary'
        if barcode_id == 'primary':
            try:
                barcode = product.barcodes.get(is_primary=True)
            except Barcode.DoesNotExist:
                return Response(
                    {'error': 'Aucun code-barres principal trouvé'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            try:
                barcode_id = int(barcode_id)
                barcode = product.barcodes.get(id=barcode_id)
            except (ValueError, TypeError):
                return Response(
                    {'error': 'L\'ID du code-barres doit être un nombre valide'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Barcode.DoesNotExist:
                return Response(
                    {'error': 'Code-barres non trouvé'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        barcode.delete()
        return Response({'message': 'Code-barres supprimé avec succès'})

    @action(detail=True, methods=['post', 'put'])
    def set_primary_barcode(self, request, pk=None):
        """Définir un code-barres comme principal"""
        product = self.get_object()
        barcode_id = request.data.get('barcode_id')
        
        if not barcode_id:
            return Response(
                {'error': 'L\'ID du code-barres est requis'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Gérer le cas où barcode_id est 'primary'
        if barcode_id == 'primary':
            return Response(
                {'error': 'Impossible de définir un code-barres comme principal avec l\'identifiant "primary"'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            barcode_id = int(barcode_id)
            # Retirer le statut principal de tous les codes-barres
            product.barcodes.update(is_primary=False)
            
            # Définir le nouveau code-barres principal
            barcode = product.barcodes.get(id=barcode_id)
            barcode.is_primary = True
            barcode.save()
            
            # Le champ barcode n'existe pas sur le modèle Product
            # Le code-barres principal est géré via la relation barcodes avec is_primary=True
            
            return Response({
                'message': 'Code-barres principal défini avec succès',
                'barcode': {
                    'id': barcode.id,
                    'ean': barcode.ean,
                    'is_primary': barcode.is_primary,
                    'notes': barcode.notes
                }
            })
        except (ValueError, TypeError):
            return Response(
                {'error': 'L\'ID du code-barres doit être un nombre valide'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Barcode.DoesNotExist:
            return Response(
                {'error': 'Code-barres non trouvé'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['put'])
    def update_barcode(self, request, pk=None):
        """Modifier un code-barres du produit"""
        product = self.get_object()
        barcode_id = request.data.get('barcode_id')
        ean = request.data.get('ean')
        notes = request.data.get('notes', '')
        
        if not barcode_id or not ean:
            return Response(
                {'error': 'L\'ID et le code-barres sont requis'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Gérer le cas où barcode_id est 'primary'
        if barcode_id == 'primary':
            try:
                barcode = product.barcodes.get(is_primary=True)
            except Barcode.DoesNotExist:
                return Response(
                    {'error': 'Aucun code-barres principal trouvé'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            try:
                barcode_id = int(barcode_id)
                barcode = product.barcodes.get(id=barcode_id)
            except (ValueError, TypeError):
                return Response(
                    {'error': 'L\'ID du code-barres doit être un nombre valide'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Barcode.DoesNotExist:
                return Response(
                    {'error': 'Code-barres non trouvé'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Vérifier que le nouveau code-barres n'existe pas déjà (sauf pour celui qu'on modifie)
            if product.barcodes.filter(ean=ean).exclude(id=barcode.id).exists():
                return Response(
                    {'error': 'Ce code-barres existe déjà pour ce produit'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # ✅ Vérifier que le code-barres n'est pas déjà utilisé par un autre produit DU MÊME SITE
            user_site = getattr(request.user, 'site_configuration', None)
            if user_site:
                existing_barcode = Barcode.objects.filter(
                    ean=ean,
                    product__site_configuration=user_site
                ).exclude(product=product).first()
                if existing_barcode:
                    return Response({
                        'error': f'Ce code-barres "{ean}" est déjà utilisé par le produit "{existing_barcode.product.name}" (ID: {existing_barcode.product.id}) sur le site "{user_site.site_name}"'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Fallback pour utilisateurs sans site (comme mobile)
                existing_barcode = Barcode.objects.filter(ean=ean).exclude(product=product).first()
                if existing_barcode:
                    return Response({
                        'error': f'Ce code-barres "{ean}" est déjà utilisé par le produit "{existing_barcode.product.name}" (ID: {existing_barcode.product.id})'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Note: Le modèle Product n'a pas de champ 'ean' direct
            # Les codes-barres sont gérés via la relation barcodes
            # Cette vérification n'est pas nécessaire car l'unicité est gérée au niveau des codes-barres
            
            barcode.ean = ean
            barcode.notes = notes
            barcode.save()
            
            # Si c'est le code-barres principal, mettre à jour le champ du produit
            # Note: Le modèle Product n'a pas de champ 'barcode' direct
            # Le code-barres principal est géré via la relation barcodes
            if barcode.is_primary:
                # Pas besoin de mettre à jour un champ inexistant
                pass
            
            return Response({
                'message': 'Code-barres modifié avec succès',
                'barcode': {
                    'id': barcode.id,
                    'ean': barcode.ean,
                    'is_primary': barcode.is_primary,
                    'notes': barcode.notes
                }
            })


class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet pour les catégories"""
    serializer_class = CategorySerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'level', 'order']
    ordering = ['level', 'order', 'name']
    pagination_class = None  # Désactiver la pagination pour les catégories
    
    def get_queryset(self):
        """Filtrer les catégories par site de l'utilisateur en utilisant le service centralisé"""
        print(f"🔍 CategoryViewSet.get_queryset - Utilisateur: {self.request.user.username}")
        print(f"🔍 CategoryViewSet.get_queryset - Site utilisateur: {getattr(self.request.user, 'site_configuration', None)}")
        
        # Utiliser le service centralisé pour obtenir les catégories accessibles
        queryset = PermissionService.get_user_accessible_resources(self.request.user, Category).select_related('parent')
        
        print(f"🔍 CategoryViewSet.get_queryset - Queryset initial: {queryset.count()} catégories")
        
        # Gérer les paramètres de filtrage du mobile
        site_only = self.request.GET.get('site_only', '').lower() == 'true'
        global_only = self.request.GET.get('global_only', '').lower() == 'true'
        
        print(f"🔍 CategoryViewSet.get_queryset - Filtres: site_only={site_only}, global_only={global_only}")
        
        # Appliquer les filtres supplémentaires
        if site_only:
            # Retourner seulement les rayons (is_rayon=True)
            queryset = queryset.filter(is_rayon=True)
            print(f"🔍 CategoryViewSet.get_queryset - Après filtre site_only: {queryset.count()} rayons")
        elif global_only:
            # Retourner seulement les catégories globales
            queryset = queryset.filter(is_global=True)
            print(f"🔍 CategoryViewSet.get_queryset - Après filtre global_only: {queryset.count()} catégories globales")
        
        print(f"🔍 CategoryViewSet.get_queryset - Queryset final: {queryset.count()} catégories")
        return queryset
    
    def perform_create(self, serializer):
        """Créer une catégorie avec gestion du site en utilisant le service centralisé"""
        user = self.request.user
        site_config = serializer.validated_data.get('site_configuration')
        
        # Vérifier les permissions de création
        if not can_user_create_category_quick(user, site_config):
            raise ValidationError({"detail": "Vous n'avez pas les permissions pour créer cette catégorie"})
        
        # Superutilisateur peut créer des catégories globales ou pour un site spécifique
        if user.is_superuser:
            if not site_config:
                # Catégorie globale - accessible à tous les sites
                serializer.save(site_configuration=None)
            else:
                serializer.save(site_configuration=site_config)
        else:
            # Utilisateur normal crée pour son site uniquement
            user_site = getattr(user, 'site_configuration', None)
            if not user_site:
                raise ValidationError({"detail": "Aucun site configuré pour cet utilisateur"})
            serializer.save(site_configuration=user_site)
    
    def retrieve(self, request, *args, **kwargs):
        """Récupérer une catégorie spécifique avec logs de débogage"""
        instance = self.get_object()
        print(f"🔍 CategoryViewSet.retrieve - Catégorie ID {instance.id}: {instance.name}")
        print(f"🔍 CategoryViewSet.retrieve - Données catégorie: {{")
        print(f"            'id': {instance.id},")
        print(f"            'name': '{instance.name}',")
        print(f"            'is_global': {instance.is_global},")
        print(f"            'is_rayon': {instance.is_rayon},")
        print(f"            'parent': {instance.parent_id},")
        print(f"            'level': {instance.level},")
        print(f"            'rayon_type': '{instance.rayon_type}',")
        print(f"            'created_at': '{instance.created_at}',")
        print(f"            'updated_at': '{instance.updated_at}'")
        print(f"        }}")
        
        serializer = self.get_serializer(instance)
        print(f"🔍 CategoryViewSet.retrieve - Données sérialisées: {serializer.data}")
        return Response(serializer.data)

    def perform_update(self, serializer):
        """Mettre à jour une catégorie avec gestion du site en utilisant le service centralisé"""
        user = self.request.user
        category = self.get_object()
        
        # Vérifier les permissions de modification
        if not can_user_manage_category_quick(user, category):
            raise ValidationError({"detail": "Vous n'avez pas les permissions pour modifier cette catégorie"})
        
        serializer.save()
    
    def destroy(self, request, *args, **kwargs):
        """Supprimer une catégorie avec gestion du site en utilisant le service centralisé"""
        user = request.user
        category = self.get_object()
        
        # Vérifier les permissions de suppression
        if not can_user_delete_category_quick(user, category):
            return Response(
                {'error': 'Vous n\'avez pas les permissions pour supprimer cette catégorie'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Vérifier s'il y a des produits ou sous-catégories associés
        from apps.inventory.models import Product
        products_count = Product.objects.filter(category=category).count()
        subcategories_count = Category.objects.filter(parent=category).count()
        
        if products_count > 0 or subcategories_count > 0:
            return Response(
                {'error': f'Impossible de supprimer cette catégorie. {products_count} produit(s) et {subcategories_count} sous-catégorie(s) y sont encore associés.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BrandViewSet(viewsets.ModelViewSet):
    """ViewSet pour les marques"""
    serializer_class = BrandSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name']
    ordering = ['name']
    
    def get_queryset(self):
        """Filtrer les marques par site de l'utilisateur"""
        try:
            user_site = getattr(self.request.user, 'site_configuration', None)
        except:
            user_site = None
        
        if self.request.user.is_superuser:
            # Superuser voit tout
            return Brand.objects.prefetch_related('rayons')
        else:
            # Utilisateur normal voit les marques de son site + les marques globales
            if not user_site:
                # Si pas de site, voir seulement les marques globales
                return Brand.objects.filter(site_configuration__isnull=True).prefetch_related('rayons')
            else:
                # Marques du site de l'utilisateur + marques globales
                from django.db import models
                return Brand.objects.filter(
                    models.Q(site_configuration=user_site) | 
                    models.Q(site_configuration__isnull=True)
                ).prefetch_related('rayons')
    
    def perform_create(self, serializer):
        """Créer une marque avec gestion du site"""
        try:
            user_site = getattr(self.request.user, 'site_configuration', None)
        except:
            user_site = None
        
        if self.request.user.is_superuser:
            # Superuser peut créer des marques globales (sans site) ou pour un site spécifique
            # Si site_configuration n'est pas fourni dans la requête, créer une marque globale
            site_config = serializer.validated_data.get('site_configuration')
            if not site_config:
                # Marque globale - accessible à tous les sites
                serializer.save(site_configuration=None)
            else:
                serializer.save(site_configuration=site_config)
        else:
            # Utilisateur normal crée pour son site uniquement
            if not user_site:
                raise ValidationError({"detail": "Aucun site configuré pour cet utilisateur"})
            serializer.save(site_configuration=user_site)
    
    def perform_update(self, serializer):
        """Mettre à jour une marque avec gestion du site"""
        user_site = self.request.user.site_configuration
        
        if self.request.user.is_superuser:
            # Superuser peut modifier n'importe quelle marque
            serializer.save()
        else:
            # Utilisateur normal ne peut modifier que les marques de son site
            if not user_site:
                raise ValidationError({"detail": "Aucun site configuré pour cet utilisateur"})
            
            # Vérifier que la marque appartient au site de l'utilisateur
            brand = self.get_object()
            if brand.site_configuration != user_site:
                raise ValidationError({"detail": "Vous ne pouvez pas modifier cette marque"})
            
            serializer.save()
    
    def destroy(self, request, *args, **kwargs):
        """Supprimer une marque avec gestion du site"""
        try:
            user_site = getattr(request.user, 'site_configuration', None)
        except:
            user_site = None
        
        brand = self.get_object()
        
        if request.user.is_superuser:
            # Superuser peut supprimer n'importe quelle marque
            # Vérifier s'il y a des produits associés
            from apps.inventory.models import Product
            products_count = Product.objects.filter(brand=brand).count()
            if products_count > 0:
                return Response(
                    {'error': f'Impossible de supprimer cette marque. {products_count} produit(s) y sont encore associés.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            brand.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        else:
            # Utilisateur normal ne peut supprimer que les marques de son site
            if not user_site:
                return Response(
                    {'error': 'Aucun site configuré pour cet utilisateur'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Vérifier que la marque appartient au site de l'utilisateur
            if brand.site_configuration != user_site:
                return Response(
                    {'error': 'Vous ne pouvez pas supprimer cette marque'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Vérifier s'il y a des produits associés
            from apps.inventory.models import Product
            products_count = Product.objects.filter(brand=brand).count()
            if products_count > 0:
                return Response(
                    {'error': f'Impossible de supprimer cette marque. {products_count} produit(s) y sont encore associés.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            brand.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def by_rayon(self, request):
        """Récupère les marques d'un rayon spécifique"""
        rayon_id = request.query_params.get('rayon_id')
        if not rayon_id:
            return Response(
                {'error': 'rayon_id est requis'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            rayon = Category.objects.get(id=rayon_id, is_rayon=True)
            brands = self.get_queryset().filter(rayons=rayon)
            
            serializer = self.get_serializer(brands, many=True)
            return Response({
                'rayon': {
                    'id': rayon.id,
                    'name': rayon.name,
                    'rayon_type': rayon.get_rayon_type_display()
                },
                'brands': serializer.data,
                'count': brands.count()
            })
            
        except Category.DoesNotExist:
            return Response(
                {'error': 'Rayon introuvable'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class TransactionViewSet(viewsets.ModelViewSet):
    """ViewSet pour les transactions"""
    serializer_class = TransactionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'product', 'user', 'site_configuration']
    search_fields = ['product__name', 'product__cug', 'notes']
    ordering_fields = ['transaction_date', 'quantity']
    ordering = ['-transaction_date']
    
    def get_queryset(self):
        """Filtrer les transactions par site de l'utilisateur.
        Inclut à la fois les transactions marquées avec site_configuration
        et les anciennes transactions liées via product.site_configuration."""
        user_site = getattr(self.request.user, 'site_configuration', None)
        
        # Vérifier si un filtre par site est demandé dans les paramètres de requête
        site_filter = self.request.query_params.get('site_configuration')
        
        from django.db.models import Q
        queryset = Transaction.objects.select_related('product', 'user', 'sale')
        
        if self.request.user.is_superuser:
            # Superuser peut filtrer par site si demandé, sinon voit tout
            if site_filter:
                try:
                    site_id = int(site_filter)
                    queryset = queryset.filter(
                        Q(site_configuration=site_id) | Q(product__site_configuration=site_id)
                    )
                except (ValueError, TypeError):
                    pass  # Si le paramètre est invalide, on ignore le filtre
            # Sinon, on retourne tout (pas de filtre)
        else:
            # Utilisateur normal voit seulement son site
            if not user_site:
                return Transaction.objects.none()
            queryset = queryset.filter(
                Q(site_configuration=user_site) | Q(product__site_configuration=user_site)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SaleViewSet(viewsets.ModelViewSet):
    """ViewSet pour les ventes"""
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'payment_method', 'customer', 'site_configuration']
    search_fields = ['customer__name', 'customer__first_name']
    ordering_fields = ['sale_date', 'total_amount']
    ordering = ['-sale_date']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SaleCreateSerializer
        return SaleSerializer
    
    def get_queryset(self):
        """Filtrer les ventes par site de l'utilisateur"""
        user_site = getattr(self.request.user, 'site_configuration', None)
        
        # Vérifier si un filtre par site est demandé dans les paramètres de requête
        site_filter = self.request.query_params.get('site_configuration')
        
        queryset = Sale.objects.select_related('customer').prefetch_related('items')
        
        if self.request.user.is_superuser:
            # Superuser peut filtrer par site si demandé, sinon voit tout
            if site_filter:
                try:
                    site_id = int(site_filter)
                    queryset = queryset.filter(site_configuration=site_id)
                except (ValueError, TypeError):
                    pass  # Si le paramètre est invalide, on ignore le filtre
            # Sinon, on retourne tout (pas de filtre)
        else:
            # Utilisateur normal voit seulement son site
            if not user_site:
                return Sale.objects.none()
            queryset = queryset.filter(site_configuration=user_site)
        
        return queryset
    
    def perform_create(self, serializer):
        """Créer une vente avec gestion automatique du stock"""
        user_site = getattr(self.request.user, 'site_configuration', None)
        
        if not user_site and not self.request.user.is_superuser:
            raise ValidationError({"detail": "Aucun site configuré pour cet utilisateur"})
        
        # Valider le client pour les ventes à crédit AVANT de créer la vente
        payment_method = self.request.data.get('payment_method')
        if payment_method == 'credit':
            from apps.inventory.models import Customer
            customer_id = self.request.data.get('customer')
            if not customer_id:
                raise ValidationError({
                    "customer": "Un client est requis pour les ventes à crédit"
                })
            try:
                customer = Customer.objects.get(id=customer_id)
                if not customer.is_active:
                    raise ValidationError({
                        "customer": "Ce client n'est pas actif pour les ventes à crédit"
                    })
            except Customer.DoesNotExist:
                raise ValidationError({
                    "customer": f"Client avec l'ID {customer_id} non trouvé"
                })
        
        # Créer la vente
        sale = serializer.save(
            site_configuration=user_site,
            seller=self.request.user
        )
        
        # Traiter les articles de la vente
        items_data = self.request.data.get('items', [])
        total_amount = 0
        
        for item_data in items_data:
            product_id = item_data.get('product_id') or item_data.get('product')
            quantity = item_data.get('quantity', 0)
            unit_price = item_data.get('unit_price', 0)
            
            if product_id and quantity > 0:
                try:
                    product = Product.objects.get(id=product_id)
                    
                    # ✅ NOUVELLE LOGIQUE: Permettre les stocks négatifs pour les backorders
                    # Plus de vérification de stock insuffisant - on peut descendre en dessous de 0
                    
                    # Créer l'article de vente
                    SaleItem.objects.create(
                        sale=sale,
                        product=product,
                        quantity=quantity,
                        unit_price=unit_price
                    )
                    
                    # ✅ NOUVELLE APPROCHE: Le stock sera retiré via l'endpoint remove_stock appelé par le frontend
                    # Plus de retrait automatique ici pour éviter les doublons
                    
                    total_amount += quantity * unit_price
                    
                except Product.DoesNotExist:
                    raise ValidationError({
                        "detail": f"Produit avec l'ID {product_id} non trouvé"
                    })
        
        # Mettre à jour le sous-total et le montant total de la vente (sous-total avant réduction fidélité)
        sale.subtotal = total_amount
        sale.total_amount = total_amount
        
        # Gérer les différents modes de paiement
        payment_method = sale.payment_method
        
        if payment_method == 'cash':
            # Paiement liquide - calculer la monnaie si amount_given est fourni
            amount_given = self.request.data.get('amount_given')
            if amount_given:
                try:
                    amount_given = float(amount_given)
                    sale.amount_given = amount_given
                    sale.change_amount = CreditService.calculate_change_amount(total_amount, amount_given)
                    sale.amount_paid = total_amount
                    sale.payment_status = 'paid'
                except (ValueError, TypeError):
                    # En cas d'erreur, considérer comme payé si amount_given est fourni
                    sale.amount_paid = total_amount
                    sale.payment_status = 'paid'
            else:
                # Si pas de amount_given, considérer comme payé (paiement exact)
                sale.amount_paid = total_amount
                sale.payment_status = 'paid'
        
        elif payment_method == 'sarali':
            # Paiement Sarali - la référence est optionnelle
            sarali_reference = self.request.data.get('sarali_reference', '').strip()
            sale.sarali_reference = sarali_reference if sarali_reference else None
            sale.amount_paid = total_amount
            sale.payment_status = 'paid'
        
        elif payment_method == 'credit':
            # Paiement à crédit - le client a déjà été validé avant la création
            # Créer la transaction de crédit
            try:
                CreditService.create_credit_sale(
                    customer=sale.customer,
                    sale=sale,
                    amount=total_amount,
                    user=self.request.user,
                    site_configuration=user_site,
                    notes=f"Vente à crédit #{sale.id}"
                )
                sale.amount_paid = 0  # Pas de paiement immédiat
                sale.payment_status = 'pending'
            except ValueError as e:
                raise ValidationError({"detail": str(e)})
        
        else:
            # Autres modes de paiement (card, mobile, transfer)
            sale.amount_paid = total_amount
            sale.payment_status = 'paid'
        
        # Gestion de la fidélité
        # Vérifier si des points sont utilisés
        loyalty_points_used = self.request.data.get('loyalty_points_used')
        logger.info(f"Sale #{sale.id}: Vérification points utilisés - loyalty_points_used={loyalty_points_used}, customer={sale.customer}")
        
        if loyalty_points_used and sale.customer:
            try:
                # Convertir en Decimal pour éviter les problèmes de type avec les DecimalField
                loyalty_points_used = Decimal(str(loyalty_points_used))
                logger.info(f"Sale #{sale.id}: Points utilisés convertis: {loyalty_points_used}")
                
                if loyalty_points_used > 0:
                    # Calculer d'abord la valeur en FCFA des points
                    program = LoyaltyService.get_program(user_site)
                    logger.info(f"Sale #{sale.id}: Programme fidélité récupéré: {program}")
                    
                    if program:
                        calculated_discount = LoyaltyService.calculate_points_value(loyalty_points_used, user_site)
                        logger.info(f"Sale #{sale.id}: Réduction calculée: {calculated_discount} FCFA pour {loyalty_points_used} points")
                        
                        # Limiter la réduction au total (ne pas permettre un total négatif)
                        max_discount = sale.total_amount
                        actual_discount = min(calculated_discount, max_discount)
                        logger.info(f"Sale #{sale.id}: Réduction limitée: {actual_discount} FCFA (max: {max_discount} FCFA)")
                        
                        # Si la réduction est limitée, ajuster le nombre de points utilisés
                        if calculated_discount > max_discount:
                            # Recalculer les points utilisés pour correspondre à la réduction réelle
                            if program.amount_per_point > 0:
                                adjusted_points = actual_discount / program.amount_per_point
                                original_points = loyalty_points_used
                                loyalty_points_used = adjusted_points
                                logger.info(f"Sale #{sale.id}: Réduction limitée de {calculated_discount} à {actual_discount} FCFA. Points ajustés de {original_points} à {adjusted_points}")
                        
                        # Utiliser les points ajustés comme réduction
                        if loyalty_points_used > 0:
                            logger.info(f"Sale #{sale.id}: Utilisation de {loyalty_points_used} points pour le client {sale.customer.id}")
                            try:
                                discount_amount = LoyaltyService.redeem_points(
                                    customer=sale.customer,
                                    sale=sale,
                                    points=loyalty_points_used,
                                    site_configuration=user_site,
                                    notes=f"Points utilisés pour la vente #{sale.reference or sale.id}"
                                )
                                logger.info(f"Sale #{sale.id}: redeem_points retourné: {discount_amount}")
                                
                                # Sauvegarder les points utilisés même si discount_amount est 0 (pour traçabilité)
                                # Le discount_amount peut être 0 si le programme n'est pas actif, mais on veut quand même enregistrer l'utilisation
                                if discount_amount is not False:
                                    sale.loyalty_points_used = loyalty_points_used
                                    sale.loyalty_discount_amount = actual_discount
                                    # Réduire le total avec la réduction fidélité (limitée)
                                    sale.total_amount = sale.total_amount - actual_discount
                                    # Ne pas permettre un total négatif
                                    if sale.total_amount < 0:
                                        sale.total_amount = 0
                                    # Ajuster le montant payé si nécessaire
                                    if sale.amount_paid > sale.total_amount:
                                        sale.amount_paid = sale.total_amount
                                    logger.info(f"Sale #{sale.id}: Points utilisés sauvegardés: {sale.loyalty_points_used}, Réduction: {sale.loyalty_discount_amount} FCFA, Total: {sale.total_amount} FCFA")
                                else:
                                    logger.warning(f"Sale #{sale.id}: redeem_points a retourné False (client non membre ou points insuffisants), points non sauvegardés")
                            except Exception as e:
                                logger.error(f"Sale #{sale.id}: Erreur lors de redeem_points: {e}", exc_info=True)
                        else:
                            logger.warning(f"Sale #{sale.id}: loyalty_points_used <= 0 après ajustement: {loyalty_points_used}")
                    else:
                        logger.warning(f"Sale #{sale.id}: Programme fidélité non trouvé")
                else:
                    logger.warning(f"Sale #{sale.id}: loyalty_points_used <= 0: {loyalty_points_used}")
            except (ValueError, TypeError) as e:
                # Ignorer les erreurs de conversion, continuer sans utiliser de points
                logger.error(f"Sale #{sale.id}: Erreur lors du traitement des points utilisés: {e}", exc_info=True)
        else:
            logger.info(f"Sale #{sale.id}: Pas de points utilisés ou pas de client - loyalty_points_used={loyalty_points_used}, customer={sale.customer}")
        
        sale.save()
        
        # Calculer et attribuer les points gagnés si le client est membre du programme
        # Les points sont attribués pour toutes les ventes (cash, crédit, etc.) dès la vente
        if sale.customer and sale.customer.is_loyalty_member:
            # Calculer les points gagnés sur le montant total (après réduction fidélité)
            points_earned = LoyaltyService.calculate_points_earned(
                sale.total_amount + (sale.loyalty_discount_amount or 0),  # Montant avant réduction fidélité
                user_site
            )
            logger.info(f"Sale #{sale.id}: Customer {sale.customer.id} is loyalty member, payment_status={sale.payment_status}, points_earned={points_earned}")
            
            if points_earned > 0:
                # Attribuer les points (pour toutes les ventes, y compris à crédit)
                result = LoyaltyService.earn_points(
                    customer=sale.customer,
                    sale=sale,
                    points=points_earned,
                    site_configuration=user_site,
                    notes=f"Points gagnés lors de la vente #{sale.reference or sale.id} ({sale.get_payment_method_display()})"
                )
                if result:
                    sale.loyalty_points_earned = points_earned
                    sale.save()
                    logger.info(f"Sale #{sale.id}: {points_earned} points attribués au client {sale.customer.id} (payment_method={sale.payment_method})")
                else:
                    logger.warning(f"Sale #{sale.id}: Échec de l'attribution des points au client {sale.customer.id}")
            else:
                logger.info(f"Sale #{sale.id}: Aucun point gagné (points_earned={points_earned})")
        else:
            if sale.customer:
                logger.info(f"Sale #{sale.id}: Client {sale.customer.id} n'est pas membre du programme (is_loyalty_member={sale.customer.is_loyalty_member})")
            else:
                logger.info(f"Sale #{sale.id}: Pas de client associé")
        
        # Rafraîchir la vente pour s'assurer d'avoir la référence générée par le signal
        sale.refresh_from_db()
        
        return sale


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Récupérer les statistiques du tableau de bord"""
        try:
            # Filtrer par site de l'utilisateur
            user_site = request.user.site_configuration
            
            if request.user.is_superuser:
                # Superuser voit tout
                products = Product.objects.all()
                categories = Category.objects.all()
                brands = Brand.objects.all()
                sales = Sale.objects.all()
            else:
                # Utilisateur normal voit seulement son site
                if not user_site:
                    # Retourner des données vides au lieu d'une erreur 400
                    return Response({
                        'success': True,
                        'stats': {
                            'total_products': 0,
                            'low_stock_count': 0,
                            'out_of_stock_count': 0,
                            'total_stock_value': 0,
                            'total_categories': 0,
                            'total_brands': 0,
                            'total_sales_today': 0,
                            'total_revenue_today': 0,
                        },
                        'recent_sales': [],
                        'low_stock_alerts': [],
                        'warning': 'Aucun site configuré pour cet utilisateur'
                    })
                
                products = Product.objects.filter(site_configuration=user_site)
                categories = Category.objects.filter(site_configuration=user_site)
                brands = Brand.objects.filter(site_configuration=user_site)
                sales = Sale.objects.filter(site_configuration=user_site)
            
            # Calculer total_stock_value à partir des transactions (prix figés)
            # Inclure : transactions de type 'in' (achats) + ajustements positifs
            if request.user.is_superuser:
                transactions_query = Transaction.objects.all()
            else:
                if not user_site:
                    transactions_query = Transaction.objects.none()
                else:
                    transactions_query = Transaction.objects.filter(site_configuration=user_site)
            
            # Transactions d'entrée (achats)
            in_transactions = transactions_query.filter(type='in').select_related('product')
            
            # Ajustements positifs (ajouts de stock)
            positive_adjustments = transactions_query.filter(
                type='adjustment',
                quantity__gt=0
            ).select_related('product')
            
            # Calculer la valeur totale à partir des transactions
            total_stock_value = Decimal('0')
            
            # Somme des transactions d'entrée
            for tx in in_transactions:
                if tx.total_amount and tx.total_amount > 0:
                    total_stock_value += Decimal(str(tx.total_amount))
                elif tx.unit_price and tx.unit_price > 0:
                    # Si total_amount est 0 mais unit_price existe, calculer
                    total_stock_value += Decimal(str(tx.unit_price)) * Decimal(str(tx.quantity))
                elif tx.product:
                    # Fallback : utiliser le prix d'achat actuel du produit
                    total_stock_value += Decimal(str(tx.product.purchase_price)) * Decimal(str(tx.quantity))
            
            # Somme des ajustements positifs
            for tx in positive_adjustments:
                if tx.total_amount and tx.total_amount > 0:
                    total_stock_value += Decimal(str(tx.total_amount))
                elif tx.unit_price and tx.unit_price > 0:
                    # Si total_amount est 0 mais unit_price existe, calculer
                    total_stock_value += Decimal(str(tx.unit_price)) * Decimal(str(tx.quantity))
                elif tx.product:
                    # Fallback : utiliser le prix d'achat actuel du produit
                    total_stock_value += Decimal(str(tx.product.purchase_price)) * Decimal(str(tx.quantity))
            
            # Convertir en float pour la réponse JSON
            total_stock_value_float = float(total_stock_value)
            
            # Statistiques de base
            stats = {
                'total_products': products.count(),
                'low_stock_count': products.filter(
                    quantity__gt=0,
                    quantity__lte=F('alert_threshold')
                ).count(),
                'out_of_stock_count': products.filter(quantity=0).count(),
                'total_stock_value': total_stock_value_float,
                'total_categories': categories.count(),
                'total_brands': brands.count(),
                'total_sales_today': sales.filter(
                    sale_date__date=timezone.now().date()
                ).count(),
                'total_revenue_today': sales.filter(
                    sale_date__date=timezone.now().date()
                ).aggregate(
                    total=Sum('total_amount')
                )['total'] or 0,
            }
            
            # Ventes récentes (limitées à 5)
            recent_sales = sales.order_by('-sale_date')[:5]
            
            # Produits en rupture de stock (limités à 10)
            low_stock_alerts = products.filter(
                quantity__gt=0,
                quantity__lte=F('alert_threshold')
            ).order_by('quantity')[:10]
            
            return Response({
                'success': True,
                'stats': stats,
                'recent_sales': [
                    {
                        'id': sale.id,
                        'sale_number': getattr(sale, 'reference', None),
                        'total_amount': float(sale.total_amount),
                        'date': sale.sale_date.isoformat() if getattr(sale, 'sale_date', None) else None,
                        'payment_method': sale.payment_method,
                    }
                    for sale in recent_sales
                ],
                'low_stock_alerts': [
                    {
                        'id': product.id,
                        'name': product.name,
                        'quantity': product.quantity,
                        'alert_threshold': product.alert_threshold,
                    }
                    for product in low_stock_alerts
                ],
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': 'Erreur lors du chargement du tableau de bord'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConfigurationAPIView(APIView):
    """Vue API pour la configuration basée sur la vue existante"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Récupérer la configuration actuelle"""
        try:
            # Utiliser la logique de la vue existante
            config = get_user_site_configuration_api(request.user)
            
            # Préparer les données pour l'API
            config_data = {
                'id': config.id,
                'nom_societe': config.nom_societe,
                'adresse': config.adresse,
                'telephone': config.telephone,
                'email': config.email,
                'devise': config.devise,
                'tva': float(config.tva),
                'site_web': getattr(config, 'site_web', ''),
                'description': config.description,
                'created_at': config.created_at.isoformat() if config.created_at else None,
                'updated_at': config.updated_at.isoformat() if config.updated_at else None,
            }
            
            # Ajouter l'URL du logo si disponible
            if config.logo:
                request = self.request
                config_data['logo_url'] = request.build_absolute_uri(config.logo.url)
            else:
                config_data['logo_url'] = None
            
            return Response({
                'success': True,
                'configuration': config_data,
                'message': 'Configuration récupérée avec succès'
            })
            
        except Http404:
            return Response({
                'success': False,
                'error': 'Aucun site configuré pour cet utilisateur'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"❌ Erreur lors de la récupération de la configuration: {e}")
            return Response({
                'success': False,
                'error': 'Erreur lors de la récupération de la configuration',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request):
        """Mettre à jour la configuration"""
        try:
            config = get_user_site_configuration_api(request.user)
            
            # Mettre à jour les champs fournis
            fields_to_update = [
                'nom_societe', 'adresse', 'telephone', 'email', 
                'devise', 'tva', 'site_web', 'description'
            ]
            
            for field in fields_to_update:
                if field in request.data:
                    setattr(config, field, request.data[field])
            
            # Gérer le logo séparément
            if 'logo' in request.FILES:
                config.logo = request.FILES['logo']
            
            # Enregistrer l'utilisateur qui a fait la modification
            config.updated_by = request.user
            config.save()
            
            print(f"✅ Configuration mise à jour par: {request.user.username}")
            
            # Retourner la configuration mise à jour
            config_data = {
                'id': config.id,
                'nom_societe': config.nom_societe,
                'adresse': config.adresse,
                'telephone': config.telephone,
                'email': config.email,
                'devise': config.devise,
                'tva': float(config.tva),
                'site_web': getattr(config, 'site_web', ''),
                'description': config.description,
                'created_at': config.created_at.isoformat() if config.created_at else None,
                'updated_at': config.updated_at.isoformat() if config.updated_at else None,
            }
            
            if config.logo:
                config_data['logo_url'] = request.build_absolute_uri(config.logo.url)
            else:
                config_data['logo_url'] = None
            
            return Response({
                'success': True,
                'configuration': config_data,
                'message': 'Configuration mise à jour avec succès'
            })
                
        except Exception as e:
            print(f"❌ Erreur lors de la mise à jour de la configuration: {e}")
            return Response({
                'success': False,
                'error': 'Erreur lors de la mise à jour de la configuration',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SitesAPIView(APIView):
    """API pour récupérer la liste des sites (uniquement pour les superusers)"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Récupérer la liste des sites"""
        try:
            # ✅ Sécurité : Seuls les superusers peuvent voir tous les sites
            if not request.user.is_superuser:
                return Response({
                    'success': False,
                    'error': 'Accès non autorisé'
                }, status=status.HTTP_403_FORBIDDEN)
            
            sites = Configuration.objects.all().order_by('site_name')
            sites_data = []
            for site in sites:
                sites_data.append({
                    'id': site.id,
                    'site_name': site.site_name,
                    'nom_societe': site.nom_societe,
                    'adresse': site.adresse,
                    'telephone': site.telephone,
                    'email': site.email,
                    'devise': site.devise,
                    'created_at': site.created_at.isoformat() if site.created_at else None,
                })
            
            return Response({
                'success': True,
                'sites': sites_data,
                'count': len(sites_data)
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ParametresAPIView(APIView):
    """Vue API pour les paramètres basée sur la vue existante"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Récupérer les paramètres système"""
        try:
            # Utiliser la logique de la vue existante
            parametres = Parametre.objects.filter(est_actif=True).order_by('cle')
            
            parametres_data = []
            for parametre in parametres:
                parametres_data.append({
                    'id': parametre.id,
                    'cle': parametre.cle,
                    'valeur': parametre.valeur,
                    'description': parametre.description,
                    'est_actif': parametre.est_actif,
                    'type_valeur': parametre.type_valeur,
                })
            
            return Response({
                'success': True,
                'parametres': parametres_data,
                'count': parametres.count(),
                'message': 'Paramètres récupérés avec succès'
            })
            
        except Exception as e:
            print(f"❌ Erreur lors de la récupération des paramètres: {e}")
            return Response({
                'success': False,
                'error': 'Erreur lors de la récupération des paramètres',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request):
        """Mettre à jour un paramètre spécifique"""
        try:
            parametre_id = request.data.get('id')
            nouvelle_valeur = request.data.get('valeur')
            
            if not parametre_id or nouvelle_valeur is None:
                return Response({
                    'success': False,
                    'error': 'ID du paramètre et nouvelle valeur requis'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                parametre = Parametre.objects.get(id=parametre_id)
            except Parametre.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Paramètre non trouvé'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Mettre à jour la valeur
            parametre.valeur = str(nouvelle_valeur)
            parametre.updated_by = request.user
            parametre.save()
            
            print(f"✅ Paramètre '{parametre.cle}' mis à jour par: {request.user.username}")
            
            parametre_data = {
                'id': parametre.id,
                'cle': parametre.cle,
                'valeur': parametre.valeur,
                'description': parametre.description,
                'est_actif': parametre.est_actif,
                'type_valeur': parametre.type_valeur,
            }
            
            return Response({
                'success': True,
                'parametre': parametre_data,
                'message': f'Paramètre {parametre.cle} mis à jour avec succès'
            })
            
        except Exception as e:
            print(f"❌ Erreur lors de la mise à jour du paramètre: {e}")
            return Response({
                'success': False,
                'error': 'Erreur lors de la mise à jour du paramètre',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ConfigurationResetAPIView(APIView):
    """Vue API pour réinitialiser la configuration"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Réinitialiser la configuration avec des valeurs par défaut"""
        try:
            config = get_user_site_configuration_api(request.user)
            
            # Valeurs par défaut
            config.nom_societe = 'BoliBana Stock'
            config.adresse = 'Adresse de votre entreprise'
            config.telephone = '+226 XX XX XX XX'
            config.email = 'contact@votreentreprise.com'
            config.devise = 'FCFA'
            config.tva = 0.00
            config.description = 'Système de gestion de stock'
            config.updated_by = request.user
            config.save()
            
            # Journaliser l'activité
            Activite.objects.create(
                utilisateur=request.user,
                type_action='modification',
                description=f'Réinitialisation de la configuration du site: {config.site_name}',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                url=request.path
            )
            
            return Response({
                'success': True,
                'message': 'Configuration réinitialisée avec succès',
                'configuration': {
                    'id': config.id,
                    'nom_societe': config.nom_societe,
                    'adresse': config.adresse,
                    'telephone': config.telephone,
                    'email': config.email,
                    'devise': config.devise,
                    'tva': float(config.tva),
                    'description': config.description,
                }
            })
            
        except Http404:
            return Response({
                'success': False,
                'error': 'Aucun site configuré pour cet utilisateur'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': 'Erreur lors de la réinitialisation de la configuration',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserProfileAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Récupérer les informations du profil utilisateur"""
        try:
            from apps.core.services import UserInfoService
            
            user = request.user
            user_info = UserInfoService.get_user_complete_info(user)
            
            if not user_info:
                return Response({
                    'success': False,
                    'error': 'Utilisateur non trouvé'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Formater les dates pour l'API
            if user_info['basic_info'].get('date_joined'):
                user_info['basic_info']['date_joined'] = user_info['basic_info']['date_joined'].isoformat()
            if user_info['basic_info'].get('last_login'):
                user_info['basic_info']['last_login'] = user_info['basic_info']['last_login'].isoformat()
            if user_info['activity_summary'].get('last_login'):
                user_info['activity_summary']['last_login'] = user_info['activity_summary']['last_login'].isoformat()
            if user_info['activity_summary'].get('derniere_connexion'):
                user_info['activity_summary']['derniere_connexion'] = user_info['activity_summary']['derniere_connexion'].isoformat()
            if user_info['activity_summary'].get('date_joined'):
                user_info['activity_summary']['date_joined'] = user_info['activity_summary']['date_joined'].isoformat()
            
            return Response({
                'success': True,
                'user': user_info['basic_info'],
                'status_summary': user_info['status_summary'],
                'permissions': user_info['permissions'],
                'activity_summary': user_info['activity_summary'],
                'display_name': user_info['display_name'],
                'available_sites': user_info['available_sites'],
                'site_configuration': user_info['site_configuration'],
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': 'Erreur lors de la récupération du profil'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request):
        """Mettre à jour le profil utilisateur en utilisant le formulaire existant"""
        try:
            user = request.user
            
            # Utiliser le formulaire existant CustomUserUpdateForm
            form = CustomUserUpdateForm(request.data, instance=user)
            
            if form.is_valid():
                # Sauvegarder les données
                updated_user = form.save(commit=False)
                updated_user.save()
                
                # Retourner les données mises à jour
                updated_data = {
                    'id': updated_user.id,
                    'username': updated_user.username,
                    'email': updated_user.email,
                    'first_name': updated_user.first_name,
                    'last_name': updated_user.last_name,
                    'telephone': getattr(updated_user, 'telephone', ''),
                    'poste': getattr(updated_user, 'poste', ''),
                    'adresse': getattr(updated_user, 'adresse', ''),
                    'is_staff': updated_user.is_staff,
                    'is_active': updated_user.is_active,
                    'date_joined': updated_user.date_joined.isoformat(),
                    'last_login': updated_user.last_login.isoformat() if updated_user.last_login else None,
                }
                
                return Response({
                    'success': True,
                    'message': 'Profil mis à jour avec succès',
                    'user': updated_data
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Données invalides',
                    'details': form.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': 'Erreur lors de la mise à jour du profil'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DeleteAccountAPIView(APIView):
    """
    API endpoint pour demander la suppression de son propre compte
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Demander la suppression de son compte"""
        try:
            user = request.user
            password = request.data.get('password', '')
            
            # Vérifier le mot de passe pour confirmer
            if not password:
                return Response({
                    'success': False,
                    'error': 'Le mot de passe est requis pour confirmer la suppression'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier que le mot de passe est correct
            if not user.check_password(password):
                return Response({
                    'success': False,
                    'error': 'Mot de passe incorrect'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier si l'utilisateur est le dernier superuser
            if user.is_superuser and User.objects.filter(is_superuser=True).count() <= 1:
                return Response({
                    'success': False,
                    'error': 'Impossible de supprimer le dernier administrateur système'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier si l'utilisateur est le dernier admin de site
            # Mais permettre la suppression si c'est le seul utilisateur du site
            if hasattr(user, 'site_configuration') and user.is_site_admin:
                from apps.core.models import User
                site_admins = User.objects.filter(
                    site_configuration=user.site_configuration,
                    is_site_admin=True
                )
                site_users = User.objects.filter(
                    site_configuration=user.site_configuration
                )
                # Bloquer seulement s'il y a d'autres utilisateurs sur le site
                if site_admins.count() <= 1 and site_users.count() > 1:
                    return Response({
                        'success': False,
                        'error': 'Impossible de supprimer le dernier administrateur du site. Veuillez d\'abord créer un autre administrateur ou supprimer les autres utilisateurs.',
                        'details': {
                            'site_admins_count': site_admins.count(),
                            'site_users_count': site_users.count(),
                        }
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Enregistrer la demande de suppression dans les activités
            try:
                Activite.objects.create(
                    utilisateur=user,
                    type_action='suppression',
                    description=f'Demande de suppression de compte: {user.username}',
                    ip_address=request.META.get('REMOTE_ADDR', ''),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    url=request.path
                )
            except Exception as e:
                logger.warning(f"Erreur lors de l'enregistrement de l'activité de suppression: {e}")
            
            # Désactiver le compte plutôt que de le supprimer immédiatement
            # (pour permettre une récupération si nécessaire)
            username = user.username
            # Désactiver is_active (qui synchronisera automatiquement est_actif)
            user.is_active = False
            user.save()
            
            # Optionnel : Supprimer complètement après un délai
            # Pour l'instant, on désactive seulement
            
            return Response({
                'success': True,
                'message': f'Votre compte "{username}" a été désactivé. La suppression définitive sera effectuée dans les 30 jours. Vous pouvez contacter le support pour annuler cette demande.',
                'note': 'Votre compte a été désactivé. Pour une suppression immédiate, contactez le support à support@bolibanastock.com'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur lors de la suppression de compte: {e}")
            return Response({
                'success': False,
                'error': 'Erreur lors de la suppression du compte'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserInfoAPIView(APIView):
    """
    API endpoint pour récupérer les informations d'utilisateur de manière simplifiée
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Récupérer les informations d'utilisateur simplifiées"""
        try:
            from apps.core.services import get_user_info, get_user_permissions_quick
            
            user = request.user
            user_info = get_user_info(user)
            permissions = get_user_permissions_quick(user)
            
            if not user_info:
                return Response({
                    'success': False,
                    'error': 'Utilisateur non trouvé'
                }, status=status.HTTP_404_NOT_FOUND)
            
            return Response({
                'success': True,
                'data': {
                    'user': user_info['basic_info'],
                    'permissions': permissions,
                    'status': user_info['status_summary'],
                    'activity': user_info['activity_summary'],
                }
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': 'Erreur lors de la récupération des informations utilisateur',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserPermissionsAPIView(APIView):
    """
    API endpoint pour récupérer uniquement les permissions d'un utilisateur
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Récupérer les permissions de l'utilisateur"""
        try:
            from apps.core.services import get_user_permissions_quick
            
            user = request.user
            permissions = get_user_permissions_quick(user)
            
            return Response({
                'success': True,
                'permissions': permissions
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': 'Erreur lors de la récupération des permissions',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PublicSignUpAPIView(APIView):
    """
    API d'inscription publique - Crée un nouveau site avec son admin
    Basé sur PublicSignUpView
    """
    permission_classes = [permissions.AllowAny]  # Accès public

    def post(self, request):
        """Créer un nouveau compte utilisateur et site"""
        try:
            # Utiliser le formulaire existant pour la validation
            form = PublicSignUpForm(request.data)
            
            if form.is_valid():
                # Utiliser une transaction atomique pour garantir la cohérence
                with transaction.atomic():
                    # Créer l'utilisateur
                    user = form.save(commit=False)
                    
                    # Générer un nom de site unique basé sur le nom de l'utilisateur et un timestamp
                    import time
                    timestamp = int(time.time())
                    base_site_name = f"{user.first_name}-{user.last_name}".replace(' ', '-').lower()
                    site_name = f"{base_site_name}-{timestamp}"
                    
                    # Vérifier l'unicité du nom de site (au cas où)
                    counter = 1
                    original_site_name = site_name
                    while Configuration.objects.filter(site_name=site_name).exists():
                        site_name = f"{original_site_name}-{counter}"
                        counter += 1
                    
                    # D'abord sauvegarder l'utilisateur sans site_configuration
                    user.est_actif = True
                    user.is_staff = True  # Donner accès à l'administration
                    user.is_superuser = False
                    user.save()
                    
                    # Maintenant créer la configuration du nouveau site
                    site_config = Configuration(
                        site_name=site_name,
                        site_owner=user,
                        nom_societe=f"Entreprise {user.first_name} {user.last_name}",
                        adresse="Adresse à configurer",
                        telephone="",
                        email=user.email,
                        devise="FCFA",
                        tva=0,
                        description=f"Site créé automatiquement pour {user.get_full_name()}"
                    )
                    site_config.save()
                    
                    # Maintenant mettre à jour l'utilisateur avec sa site_configuration
                    user.site_configuration = site_config
                    user.is_site_admin = True
                    user.save()
                    
                    # Vérifier que l'utilisateur existe bien dans la base avant de créer l'activité
                    user.refresh_from_db()
                    
                    # Journaliser l'activité de manière sécurisée
                    try:
                        # Vérifier que l'utilisateur existe toujours
                        if User.objects.filter(id=user.id).exists():
                            # Utiliser une transaction séparée pour la création de l'activité
                            with transaction.atomic():
                                Activite.objects.create(
                                    utilisateur=user,
                                    type_action='creation',
                                    description=f'Inscription publique - Création du site: {site_name}',
                                    ip_address=request.META.get('REMOTE_ADDR'),
                                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                                    url=request.path
                                )
                            print(f"✅ Activité journalisée pour l'utilisateur {user.username}")
                        else:
                            print(f"⚠️ Utilisateur {user.username} non trouvé lors de la journalisation")
                    except Exception as e:
                        print(f"⚠️ Erreur création activité: {e}")
                        # Continuer sans journaliser l'activité - ce n'est pas critique
                        # L'utilisateur et le site ont été créés avec succès
                        
                        # Essayer de créer l'activité de manière différée
                        try:
                            # Attendre un peu et réessayer
                            import time
                            time.sleep(0.1)  # Attendre 100ms
                            
                            if User.objects.filter(id=user.id).exists():
                                with transaction.atomic():
                                    Activite.objects.create(
                                        utilisateur=user,
                                        type_action='creation',
                                        description=f'Inscription publique - Création du site: {site_name} (différée)',
                                        ip_address=request.META.get('REMOTE_ADDR'),
                                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                                        url=request.path
                                    )
                                print(f"✅ Activité journalisée de manière différée pour l'utilisateur {user.username}")
                        except Exception as retry_e:
                            print(f"⚠️ Échec de la création différée de l'activité: {retry_e}")
                            # Finalement, abandonner la journalisation de l'activité
                    
                    # Générer les tokens d'authentification
                    refresh = RefreshToken.for_user(user)
                    access_token = str(refresh.access_token)
                    refresh_token = str(refresh)
                    
                    # Retourner les informations de l'utilisateur créé avec les tokens
                    user_data = {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'is_staff': user.is_staff,
                        'is_active': user.is_active,
                        'date_joined': user.date_joined.isoformat(),
                        'site_name': site_name,
                        'site_config_id': site_config.id
                    }
                    
                    return Response({
                        'success': True,
                        'message': 'Compte créé avec succès ! Vous êtes maintenant connecté.',
                        'user': user_data,
                        'site_info': {
                            'site_name': site_name,
                            'nom_societe': site_config.nom_societe
                        },
                        'tokens': {
                            'access': access_token,
                            'refresh': refresh_token
                        }
                    })
            else:
                # Erreurs de validation du formulaire
                return Response({
                    'success': False,
                    'error': 'Données invalides',
                    'details': form.errors
                }, status=400)
                
        except Exception as e:
            print(f"❌ Erreur lors de la création du compte: {e}")
            return Response({
                'success': False,
                'error': f'Erreur lors de la création du compte: {str(e)}'
            }, status=500)


class SimpleSignUpAPIView(APIView):
    """
    Vue d'inscription simplifiée sans journalisation d'activité
    Pour éviter les problèmes de contrainte de clé étrangère
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Créer un nouveau compte utilisateur et site sans journalisation d'activité"""
        try:
            form = PublicSignUpForm(request.data)
            
            if form.is_valid():
                with transaction.atomic():
                    # Créer l'utilisateur
                    user = form.save(commit=False)
                    
                    # Générer un nom de site unique
                    import time
                    timestamp = int(time.time())
                    base_site_name = f"{user.first_name}-{user.last_name}".replace(' ', '-').lower()
                    site_name = f"{base_site_name}-{timestamp}"
                    
                    # Vérifier l'unicité du nom de site
                    counter = 1
                    original_site_name = site_name
                    while Configuration.objects.filter(site_name=site_name).exists():
                        site_name = f"{original_site_name}-{counter}"
                        counter += 1
                    
                    # Sauvegarder l'utilisateur
                    user.est_actif = True
                    user.is_staff = True  # Donner accès à l'administration
                    user.is_superuser = False
                    user.save()
                    
                    # Créer la configuration du site
                    site_config = Configuration(
                        site_name=site_name,
                        site_owner=user,
                        nom_societe=f"Entreprise {user.first_name} {user.last_name}",
                        adresse="Adresse à configurer",
                        telephone="",
                        email=user.email,
                        devise="FCFA",
                        tva=0,
                        description=f"Site créé automatiquement pour {user.get_full_name()}"
                    )
                    site_config.save()
                    
                    # Lier l'utilisateur à sa configuration
                    user.site_configuration = site_config
                    user.is_site_admin = True
                    user.save()
                    
                    # Générer les tokens d'authentification
                    refresh = RefreshToken.for_user(user)
                    access_token = str(refresh.access_token)
                    refresh_token = str(refresh)
                    
                    # Retourner la réponse
                    user_data = {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'is_staff': user.is_staff,
                        'is_active': user.is_active,
                        'date_joined': user.date_joined.isoformat(),
                        'site_name': site_name,
                        'site_config_id': site_config.id
                    }
                    
                    return Response({
                        'success': True,
                        'message': 'Compte créé avec succès ! Vous êtes maintenant connecté.',
                        'user': user_data,
                        'site_info': {
                            'site_name': site_name,
                            'nom_societe': site_config.nom_societe
                        },
                        'tokens': {
                            'access': access_token,
                            'refresh': refresh_token
                        }
                    })
            else:
                return Response({
                    'success': False,
                    'error': 'Données invalides',
                    'details': form.errors
                }, status=400)
                
        except Exception as e:
            print(f"❌ Erreur lors de la création du compte (SimpleSignUp): {e}")
            return Response({
                'success': False,
                'error': f'Erreur lors de la création du compte: {str(e)}'
            }, status=500)


# ============ Labels API ============
class LabelTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LabelTemplateSerializer

    def get_queryset(self):
        user_site = self.request.user.site_configuration
        if self.request.user.is_superuser:
            return LabelTemplate.objects.all()
        return LabelTemplate.for_site_qs(user_site)


class LabelBatchViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LabelBatchSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'channel']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return LabelBatch.objects.all()
        return LabelBatch.objects.filter(site_configuration=user.site_configuration)

    @action(detail=False, methods=['post'])
    def create_batch(self, request):
        """Créer un lot d'étiquettes"""
        import logging
        logger = logging.getLogger(__name__)
        
        user_site = request.user.site_configuration
        if not user_site and not request.user.is_superuser:
            logger.error(f"❌ [CREATE_BATCH] Aucun site configuré pour l'utilisateur {request.user.id}")
            raise ValidationError({"detail": "Aucun site configuré pour cet utilisateur"})

        # Créer un dictionnaire modifiable à partir de request.data
        request_data = dict(request.data)
        logger.info(f"📥 [CREATE_BATCH] Données reçues: {request_data}")
        logger.info(f"🔍 [CREATE_BATCH] Vérification include_price dans request_data: {request_data.get('include_price')}")
        logger.info(f"🔍 [CREATE_BATCH] Toutes les clés de request_data: {list(request_data.keys())}")
        
        # Nettoyer la valeur 'channel' pour éviter les problèmes d'encodage
        if 'channel' in request_data:
            channel_value = str(request_data['channel']).strip()
            # Supprimer les guillemets typographiques et autres caractères spéciaux
            channel_value = channel_value.replace('«', '').replace('»', '').replace('"', '').replace("'", '')
            # Supprimer les caractères non-ASCII et les caractères invisibles
            channel_value = ''.join(c for c in channel_value if c.isprintable() and ord(c) < 128)
            channel_value = channel_value.strip()
            # Forcer les valeurs valides uniquement
            valid_channels = ['escpos', 'tsc', 'pdf']
            if channel_value not in valid_channels:
                logger.warning(f"⚠️ [CREATE_BATCH] Channel invalide reçu: {repr(request_data['channel'])}, valeur nettoyée: {repr(channel_value)}, utilisation de 'escpos'")
                channel_value = 'escpos'
            # Remplacer la valeur dans request_data
            request_data['channel'] = channel_value
            logger.info(f"✅ [CREATE_BATCH] Channel nettoyé: {repr(request_data['channel'])} -> {repr(channel_value)}")

        data = LabelBatchCreateSerializer(data=request_data)
        if not data.is_valid():
            logger.error(f"❌ [CREATE_BATCH] Erreur de validation: {data.errors}")
            logger.error(f"❌ [CREATE_BATCH] Données reçues: {request_data}")
        data.is_valid(raise_exception=True)
        payload = data.validated_data

        template = None
        # Le serializer valide 'template' mais on peut aussi récupérer depuis request_data
        if payload.get('template'):
            # Si c'est un ID (int), on récupère le template
            template_id = payload['template'] if isinstance(payload['template'], int) else payload['template'].id
            template = LabelTemplate.objects.filter(id=template_id).first()
        elif request_data.get('template_id'):
            # Fallback pour compatibilité
            template = LabelTemplate.objects.filter(id=request_data['template_id']).first()
        if not template:
            template = LabelTemplate.get_default_for_site(user_site)
        if not template:
            raise ValidationError({"detail": "Aucun modèle d'étiquette disponible"})

        batch = LabelBatch.objects.create(
            site_configuration=user_site,
            user=request.user,
            template=template,
            source='manual',
            channel=payload['channel'],
            status='queued',
            copies_total=0,
        )

        # Récupérer include_price depuis request_data (peut être passé depuis le mobile)
        include_price_from_request = request_data.get('include_price')
        logger.info(f"🔍 [CREATE_BATCH] include_price reçu: {include_price_from_request} (type: {type(include_price_from_request)})")
        if include_price_from_request is not None:
            # Convertir en booléen si c'est une chaîne
            if isinstance(include_price_from_request, str):
                include_price_from_request = include_price_from_request.lower() in ('true', '1', 'yes', 'on')
            elif not isinstance(include_price_from_request, bool):
                include_price_from_request = bool(include_price_from_request)
            logger.info(f"✅ [CREATE_BATCH] include_price converti: {include_price_from_request}")

        # Créer les items
        position = 0
        total_copies = 0
        from apps.inventory.models import Product
        # items n'est pas dans le serializer, on le récupère depuis request_data
        items_data = request_data.get('items', [])
        for item in items_data:
            product = Product.objects.get(id=item['product_id'])
            copies = item.get('copies', 1)
            
            # Logique pour déterminer le code-barres à utiliser
            # 1. Vérifier si le produit a des barcodes dans le tableau
            primary_barcode = product.barcodes.filter(is_primary=True).first()
            if not primary_barcode:
                primary_barcode = product.barcodes.first()
            
            # 2. Si pas de barcodes dans le tableau, utiliser generated_ean (au lieu du CUG)
            barcode_value = item.get('barcode_value', '').strip()
            if not barcode_value:
                if primary_barcode and primary_barcode.ean:
                    barcode_value = primary_barcode.ean
                    barcode_source = 'primary_barcode'
                elif product.generated_ean:
                    barcode_value = product.generated_ean
                    barcode_source = 'generated_ean'
                else:
                    # Dernier recours : générer depuis le CUG (pas utiliser le CUG directement)
                    from apps.inventory.utils import generate_ean13_from_cug
                    barcode_value = generate_ean13_from_cug(product.cug) if product.cug else str(product.id)
                    barcode_source = 'generated_from_cug_fallback'
            else:
                barcode_source = 'provided'
            
            print(f"🔍 [CREATE_BATCH] Produit {product.name} (ID: {product.id})")
            print(f"   CUG: {product.cug}")
            print(f"   generated_ean: {product.generated_ean}")
            print(f"   primary_barcode: {primary_barcode.ean if primary_barcode else 'None'}")
            print(f"   barcode_value utilisé: {barcode_value} (source: {barcode_source})")
            
            # Stocker include_price dans data_snapshot du premier item pour pouvoir le récupérer plus tard
            data_snapshot = None
            if position == 0 and include_price_from_request is not None:
                data_snapshot = {'include_price': include_price_from_request}
            
            LabelItem.objects.create(
                batch=batch,
                product=product,
                copies=copies,
                barcode_value=barcode_value,
                position=position,
                data_snapshot=data_snapshot,
            )
            total_copies += copies
            position += 1

        batch.copies_total = total_copies
        batch.status = 'success'
        batch.save(update_fields=['copies_total', 'status'])

        return Response(LabelBatchSerializer(batch).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Générer un PDF pour le lot d'étiquettes"""
        batch = self.get_object()
        pdf_bytes, filename = render_label_batch_pdf(batch)
        from django.http import HttpResponse
        resp = HttpResponse(pdf_bytes, content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="{filename}"'
        return resp

    @action(detail=True, methods=['get'])
    def tsc(self, request, pk=None):
        """Générer un fichier TSC pour le lot d'étiquettes"""
        batch = self.get_object()
        
        # Récupérer include_price depuis les paramètres de requête (GET) en priorité
        include_price_param = request.query_params.get('include_price')
        include_price_override = None
        
        if include_price_param is not None:
            # Convertir la chaîne en booléen
            include_price_override = include_price_param.lower() in ('true', '1', 'yes', 'on')
            logger.info(f"🔍 [TSC] include_price depuis query_params: {include_price_override}")
        else:
            # Si non fourni dans l'URL, récupérer depuis data_snapshot du premier item
            first_item = batch.items.first()
            if first_item and first_item.data_snapshot:
                include_price_from_snapshot = first_item.data_snapshot.get('include_price')
                if include_price_from_snapshot is not None:
                    include_price_override = bool(include_price_from_snapshot)
                    logger.info(f"🔍 [TSC] include_price depuis data_snapshot: {include_price_override}")
        
        logger.info(f"🔍 [TSC] include_price_override final pour render_label_batch_tsc: {include_price_override}")
        
        tsc_text, filename = render_label_batch_tsc(batch, include_price_override=include_price_override)
        from django.http import HttpResponse
        resp = HttpResponse(tsc_text, content_type='text/plain; charset=utf-8')
        resp['Content-Disposition'] = f'attachment; filename="{filename}"'
        return resp


class BarcodeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour la consultation des codes-barres"""
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_primary', 'product__category', 'product__brand']
    search_fields = ['ean', 'product__name', 'product__cug', 'notes']
    ordering_fields = ['ean', 'added_at', 'product__name']
    ordering = ['product__name', '-is_primary', 'added_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Barcode.objects.select_related('product', 'product__category', 'product__brand').all()
        return Barcode.objects.select_related('product', 'product__category', 'product__brand').filter(
            product__site_configuration=user.site_configuration
        )

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Récupérer les statistiques des codes-barres"""
        queryset = self.get_queryset()
        
        total_barcodes = queryset.count()
        primary_barcodes = queryset.filter(is_primary=True).count()
        secondary_barcodes = total_barcodes - primary_barcodes
        
        # Statistiques par catégorie
        category_stats = {}
        for barcode in queryset.select_related('product__category'):
            category_name = barcode.product.category.name if barcode.product.category else 'Sans catégorie'
            if category_name not in category_stats:
                category_stats[category_name] = 0
            category_stats[category_name] += 1
        
        # Statistiques par marque
        brand_stats = {}
        for barcode in queryset.select_related('product__brand'):
            brand_name = barcode.product.brand.name if barcode.product.brand else 'Sans marque'
            if brand_name not in brand_stats:
                brand_stats[brand_name] = 0
            brand_stats[brand_name] += 1
        
        return Response({
            'success': True,
            'statistics': {
                'total_barcodes': total_barcodes,
                'primary_barcodes': primary_barcodes,
                'secondary_barcodes': secondary_barcodes,
                'by_category': category_stats,
                'by_brand': brand_stats
            }
        })

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Rechercher des codes-barres par EAN ou nom de produit"""
        search_query = request.query_params.get('q', '')
        if not search_query:
            return Response({'error': 'Paramètre de recherche requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        queryset = self.get_queryset().filter(
            Q(ean__icontains=search_query) |
            Q(product__name__icontains=search_query) |
            Q(product__cug__icontains=search_query)
        )
        
        # Sérialiser les résultats
        barcode_data = []
        for barcode in queryset:
            barcode_data.append({
                'id': barcode.id,
                'ean': barcode.ean,
                'is_primary': barcode.is_primary,
                'notes': barcode.notes,
                'added_at': barcode.added_at.isoformat() if barcode.added_at else None,
                'product': {
                    'id': barcode.product.id,
                    'name': barcode.product.name,
                    'cug': barcode.product.cug,
                    'category': barcode.product.category.name if barcode.product.category else None,
                    'brand': barcode.product.brand.name if barcode.product.brand else None
                }
            })
        
        return Response({
            'success': True,
            'search_query': search_query,
            'results_count': len(barcode_data),
            'barcodes': barcode_data
        })


class LabelGeneratorAPIView(APIView):
    """API pour générer des étiquettes avec codes-barres CUG"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Récupérer la liste des produits avec codes-barres pour générer des étiquettes"""
        try:
            # Récupérer le site de l'utilisateur
            user_site = request.user.site_configuration
            if not user_site and not request.user.is_superuser:
                return Response(
                    {'error': 'Aucun site configuré pour cet utilisateur'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Récupérer tous les produits (avec ou sans codes-barres)
            if request.user.is_superuser:
                products = Product.objects.all().select_related('category', 'brand').prefetch_related('barcodes')
            else:
                products = Product.objects.filter(
                    site_configuration=user_site
                ).select_related('category', 'brand').prefetch_related('barcodes')
            
            # Organiser par catégorie et marque
            if request.user.is_superuser:
                categories = Category.objects.all()
                brands = Brand.objects.all()
            else:
                categories = Category.objects.filter(
                    site_configuration=user_site
                ) if user_site else Category.objects.all()
                brands = Brand.objects.filter(
                    site_configuration=user_site
                ) if user_site else Brand.objects.all()
            
            # Préparer les données pour le mobile
            label_data = {
                'products': [],
                'categories': CategorySerializer(categories, many=True).data,
                'brands': BrandSerializer(brands, many=True).data,
                'total_products': products.count(),
                'generated_at': timezone.now().isoformat()
            }
            
            # Ajouter tous les produits (avec ou sans codes-barres)
            for product in products:
                # Récupérer le code-barres principal du modèle Barcode
                primary_barcode = product.barcodes.filter(is_primary=True).first()
                if not primary_barcode:
                    primary_barcode = product.barcodes.first()
                
                # Priorité 1 : EAN du modèle Barcode (manuel)
                # Priorité 2 : EAN généré dans Product (automatique)
                barcode_ean_from_model = primary_barcode.ean if primary_barcode else None
                barcode_ean_generated = product.generated_ean
                
                # Utiliser l'EAN du modèle Barcode s'il existe, sinon l'EAN généré
                barcode_ean = barcode_ean_from_model or barcode_ean_generated
                has_barcode_ean = bool(barcode_ean_from_model and barcode_ean_from_model.strip())
                has_generated_ean = bool(barcode_ean_generated and barcode_ean_generated.strip())
                has_ean = has_barcode_ean or has_generated_ean
                
                # Récupérer l'URL de l'image
                image_url = get_product_image_url(product)
                # S'assurer que l'URL est valide (non vide et non None)
                if image_url:
                    image_url = str(image_url).strip()
                    if not image_url or image_url == 'None':
                        image_url = None
                else:
                    image_url = None
                
                label_data['products'].append({
                    'id': product.id,
                    'name': product.name,
                    'cug': product.cug,
                    'barcode_ean': barcode_ean or '',  # EAN utilisé (priorité au modèle Barcode)
                    'barcode_ean_from_model': barcode_ean_from_model or '',  # EAN du modèle Barcode
                    'barcode_ean_generated': barcode_ean_generated or '',  # EAN généré
                    'has_ean': has_ean,
                    'has_barcode_ean': has_barcode_ean,  # A un EAN dans le modèle Barcode
                    'has_generated_ean': has_generated_ean,  # A un EAN généré
                    'selling_price': product.selling_price,
                    'quantity': product.quantity,
                    'image_url': image_url,
                    'category': {
                        'id': product.category.id,
                        'name': product.category.name
                    } if product.category else None,
                    'brand': {
                        'id': product.brand.id,
                        'name': product.brand.name
                    } if product.brand else None
                })
            
            return Response(label_data)
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la génération des étiquettes: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Générer des étiquettes pour des produits spécifiques"""
        try:
            product_ids = request.data.get('product_ids', [])
            include_prices = request.data.get('include_prices', True)
            include_stock = request.data.get('include_stock', True)
            
            if not product_ids:
                return Response(
                    {'error': 'Veuillez spécifier au moins un produit'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Récupérer les produits demandés (avec ou sans codes-barres)
            user_site = request.user.site_configuration
            if request.user.is_superuser:
                products = Product.objects.filter(
                    id__in=product_ids
                ).select_related('category', 'brand').prefetch_related('barcodes')
            else:
                products = Product.objects.filter(
                    id__in=product_ids,
                    site_configuration=user_site
                ).select_related('category', 'brand').prefetch_related('barcodes')
            
            # Préparer les données des étiquettes
            labels = []
            for product in products:
                primary_barcode = product.barcodes.filter(is_primary=True).first()
                if not primary_barcode:
                    primary_barcode = product.barcodes.first()
                
                # Utiliser l'EAN généré stocké (toujours disponible maintenant)
                barcode_ean = product.generated_ean
                
                label = {
                    'product_id': product.id,
                    'name': product.name,
                    'cug': product.cug,
                    'barcode_ean': barcode_ean,
                    'category': product.category.name if product.category else None,
                    'brand': product.brand.name if product.brand else None,
                }
                
                if include_prices:
                    label['price'] = product.selling_price
                
                if include_stock:
                    label['stock'] = product.quantity
                
                labels.append(label)
            
            return Response({
                'labels': labels,
                'total_labels': len(labels),
                'include_prices': include_prices,
                'include_stock': include_stock,
                'generated_at': timezone.now().isoformat()
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la génération des étiquettes: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


def get_product_image_url(product):
    """Retourne l'URL complète de l'image du produit.
    Utilise le système de stockage Django pour générer l'URL correcte (signée si nécessaire).
    """
    image_field = getattr(product, 'image', None)
    
    # Tenter d'utiliser l'image de l'original si ProductCopy existe et lie ce produit
    try:
        from apps.inventory.models import ProductCopy
        copy = ProductCopy.objects.select_related('original_product').filter(copied_product=product).first()
        if copy and getattr(copy.original_product, 'image', None):
            image_field = copy.original_product.image
    except Exception:
        pass

    if image_field:
        try:
            # Essayer d'abord d'utiliser l'URL générée par le système de stockage Django
            # Cela garantit que les URLs signées sont générées correctement si nécessaire
            try:
                storage_url = image_field.url
                if storage_url and storage_url.startswith('http'):
                    # L'URL générée par le storage est valide, l'utiliser
                    # Corriger les fautes de frappe dans le nom du bucket si nécessaire
                    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
                    if bucket_name:
                        storage_url = storage_url.replace('bolibana-stocck', 'bolibana-stock')
                        storage_url = storage_url.replace('bolibana-stockk', 'bolibana-stock')
                        storage_url = storage_url.replace('bolibanna-stock', 'bolibana-stock')
                    return storage_url
            except Exception as e:
                # Si le storage ne peut pas générer l'URL, continuer avec la construction manuelle
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"⚠️ [get_product_image_url] Impossible de générer l'URL via storage: {e}")
                pass
            
            from django.conf import settings
            if getattr(settings, 'AWS_S3_ENABLED', False):
                region = getattr(settings, 'AWS_S3_REGION_NAME', 'eu-north-1')
                image_path = image_field.name
                
                # ÉTAPE 1: Corriger TOUS les "produccts" → "products" AVANT toute autre opération
                # Utiliser replace() globalement pour s'assurer que toutes les occurrences sont corrigées
                image_path = image_path.replace('produccts', 'products')
                
                # ÉTAPE 2: Nettoyer le chemin et s'assurer que la duplication existe
                # Pattern réel sur S3: assets/products/site-XXX/assets/products/site-XXX/filename (AVEC duplication)
                # Pattern parfois stocké en DB sans duplication: assets/products/site-XXX/filename
                import re
                
                # Vérifier si la duplication existe déjà
                duplication_pattern = r'^assets/products/(site-\d+)/assets/products/\1/(.+)$'
                duplication_match = re.match(duplication_pattern, image_path)
                
                if not duplication_match:
                    # La duplication n'existe pas, l'ajouter
                    single_pattern = r'^assets/products/(site-\d+)/(.+)$'
                    single_match = re.match(single_pattern, image_path)
                    
                    if single_match:
                        # Le chemin n'a pas la duplication, l'ajouter
                        site_id = single_match.group(1)
                        filename = single_match.group(2)
                        image_path = f'assets/products/{site_id}/assets/products/{site_id}/{filename}'
                    else:
                        # Cas spécial : chemin avec duplication partielle ou malformé
                        # Vérifier d'abord s'il reste encore "produccts" après le remplacement initial
                        if 'produccts' in image_path:
                            # Forcer le remplacement une dernière fois
                            image_path = image_path.replace('produccts', 'products')
                        
                        # Essayer d'extraire le site_id et filename de n'importe quel pattern
                        mixed_pattern = r'assets/products/(site-\d+).*?/(.+)$'
                        mixed_match = re.search(mixed_pattern, image_path)
                        if mixed_match:
                            site_id = mixed_match.group(1)
                            filename = mixed_match.group(2)
                            # Reconstruire le chemin avec duplication (format réel sur S3)
                            image_path = f'assets/products/{site_id}/assets/products/{site_id}/{filename}'
                        else:
                            # Dernier recours : essayer de trouver le site_id même avec "produccts"
                            produccts_pattern = r'assets/(?:produccts|products)/(site-\d+).*?/(.+)$'
                            produccts_match = re.search(produccts_pattern, image_path)
                            if produccts_match:
                                site_id = produccts_match.group(1)
                                filename = produccts_match.group(2)
                                # Reconstruire le chemin avec duplication (format réel sur S3)
                                image_path = f'assets/products/{site_id}/assets/products/{site_id}/{filename}'
                
                bucket_name = settings.AWS_STORAGE_BUCKET_NAME
                # Corriger les fautes de frappe courantes dans le nom du bucket
                if bucket_name:
                    bucket_name = bucket_name.replace('bolibana-stocck', 'bolibana-stock')
                    bucket_name = bucket_name.replace('bolibana-stockk', 'bolibana-stock')
                    bucket_name = bucket_name.replace('bolibanna-stock', 'bolibana-stock')
                
                return f"https://{bucket_name}.s3.{region}.amazonaws.com/{image_path}"
            else:
                # Fallback pour les environnements sans S3
                url = image_field.url
                if url.startswith('http'):
                    return url
                media_url = getattr(settings, 'MEDIA_URL', '/media/')
                if media_url.startswith('http'):
                    # Utiliser le chemin tel qu'il est stocké dans la base de données
                    image_path = image_field.name
                    return f"{media_url.rstrip('/')}/{image_path}"
                return f"https://web-production-e896b.up.railway.app{url}"
        except (ValueError, AttributeError) as e:
            print(f"⚠️ Erreur dans get_product_image_url: {e}")
            try:
                return image_field.url
            except Exception:
                return None
    return None


def get_product_image_base64(product):
    """Retourne l'image du produit en base64 (data URI) pour le PDF.
    Utile car expo-print ne peut pas charger les images depuis des URLs externes.
    Les images sont compressées et redimensionnées pour réduire la taille.
    """
    import base64
    import logging
    from io import BytesIO
    logger = logging.getLogger(__name__)
    
    image_field = getattr(product, 'image', None)
    
    # Tenter d'utiliser l'image de l'original si ProductCopy existe et lie ce produit
    try:
        from apps.inventory.models import ProductCopy
        copy = ProductCopy.objects.select_related('original_product').filter(copied_product=product).first()
        if copy and getattr(copy.original_product, 'image', None):
            image_field = copy.original_product.image
    except Exception:
        pass

    if image_field:
        try:
            # Lire le fichier image
            image_file = image_field.read()
            if image_file:
                # Compresser et redimensionner l'image avant de la convertir en base64
                # Pour éviter les erreurs de mémoire lors de la génération du PDF
                try:
                    from PIL import Image, ImageOps
                    
                    # Ouvrir l'image depuis les bytes
                    img = Image.open(BytesIO(image_file))
                    
                    # Corriger l'orientation EXIF si nécessaire
                    # Certaines images ont une orientation EXIF qui doit être appliquée
                    try:
                        img = ImageOps.exif_transpose(img)
                    except Exception:
                        # Si exif_transpose échoue, continuer sans correction
                        pass
                    
                    # Convertir en RGB si nécessaire (pour JPEG)
                    if img.mode in ('RGBA', 'LA', 'P'):
                        background = Image.new('RGB', img.size, (255, 255, 255))
                        if img.mode == 'P':
                            img = img.convert('RGBA')
                        background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                        img = background
                    elif img.mode != 'RGB':
                        img = img.convert('RGB')
                    
                    # Redimensionner si trop grande (max 400x400 pour le PDF)
                    max_size = (400, 400)
                    if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                        img.thumbnail(max_size, Image.Resampling.LANCZOS)
                    
                    # Compresser l'image en JPEG avec qualité réduite
                    output = BytesIO()
                    img.save(output, format='JPEG', quality=75, optimize=True)
                    output.seek(0)
                    compressed_image = output.read()
                    
                    # Convertir en base64
                    base64_data = base64.b64encode(compressed_image).decode('utf-8')
                    
                    # Toujours utiliser JPEG pour les images compressées
                    mime_type = 'image/jpeg'
                    
                    # Créer la data URI
                    data_uri = f"data:{mime_type};base64,{base64_data}"
                    
                    # Log seulement si l'image est très grande (pour diagnostic)
                    if len(data_uri) > 500 * 1024:  # > 500 KB
                        logger.info(f"✅ [CATALOG_PDF] Image compressée pour produit {product.id} ({product.name}) - {len(data_uri) // 1024} KB (original: {len(image_file) // 1024} KB)")
                    return data_uri
                except ImportError:
                    # Si PIL n'est pas disponible, utiliser l'image originale
                    logger.warning(f"⚠️ [CATALOG_PDF] PIL non disponible, utilisation de l'image originale pour produit {product.id} ({product.name})")
                    base64_data = base64.b64encode(image_file).decode('utf-8')
                    
                    # Déterminer le type MIME à partir de l'extension
                    image_name = image_field.name.lower()
                    if image_name.endswith('.png'):
                        mime_type = 'image/png'
                    elif image_name.endswith('.gif'):
                        mime_type = 'image/gif'
                    else:
                        mime_type = 'image/jpeg'
                    
                    data_uri = f"data:{mime_type};base64,{base64_data}"
                    # Log seulement si l'image est très grande (pour diagnostic)
                    if len(data_uri) > 500 * 1024:  # > 500 KB
                        logger.info(f"✅ [CATALOG_PDF] Image convertie en base64 (sans compression) pour produit {product.id} ({product.name}) - {len(data_uri) // 1024} KB")
                    return data_uri
                except Exception as pil_error:
                    logger.error(f"❌ [CATALOG_PDF] Erreur lors de la compression de l'image pour produit {product.id} ({product.name}): {pil_error}")
                    # Fallback: utiliser l'image originale
                    base64_data = base64.b64encode(image_file).decode('utf-8')
                    image_name = image_field.name.lower()
                    if image_name.endswith('.png'):
                        mime_type = 'image/png'
                    elif image_name.endswith('.gif'):
                        mime_type = 'image/gif'
                    else:
                        mime_type = 'image/jpeg'
                    data_uri = f"data:{mime_type};base64,{base64_data}"
                    return data_uri
            else:
                logger.warning(f"⚠️ [CATALOG_PDF] Image vide pour produit {product.id} ({product.name})")
                return None
        except Exception as e:
            logger.error(f"❌ [CATALOG_PDF] Erreur lors de la conversion en base64 pour produit {product.id} ({product.name}): {e}")
            return None
    return None


class CatalogPDFAPIView(APIView):
    """API pour générer un catalogue PDF A4"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Générer un catalogue PDF A4"""
        try:
            from apps.inventory.catalog_models import CatalogTemplate, CatalogGeneration, CatalogItem
            
            # Récupérer les paramètres
            product_ids = request.data.get('product_ids', [])
            template_id = request.data.get('template_id', None)
            include_prices = request.data.get('include_prices', True)
            include_stock = request.data.get('include_stock', True)
            include_descriptions = request.data.get('include_descriptions', True)
            include_images = request.data.get('include_images', False)
            
            # Récupérer et valider l'utilisateur
            user = request.user
            
            # Validation robuste de l'utilisateur
            if not user or not hasattr(user, 'id') or not user.id:
                return Response(
                    {'error': 'Utilisateur invalide ou non authentifié'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Récupérer l'utilisateur depuis la base de données core_user
            try:
                from apps.core.models import User as CoreUser
                # Récupérer l'utilisateur depuis la base de données
                try:
                    core_user = CoreUser.objects.get(id=user.id)
                except CoreUser.DoesNotExist:
                    return Response(
                        {'error': f'Utilisateur ID {user.id} non trouvé dans core_user'},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                    
            except Exception as e:
                return Response(
                    {'error': f'Erreur de validation utilisateur: {str(e)}'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Récupérer la configuration du site de l'utilisateur
            try:
                user_site = get_user_site_configuration_api(user)
            except Exception as e:
                return Response(
                    {'error': f'Erreur lors de la récupération de la configuration du site: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if user.is_superuser:
                products = Product.objects.filter(id__in=product_ids).select_related('category', 'brand').prefetch_related('barcodes')
            else:
                if not user_site:
                    return Response(
                        {'error': 'Aucun site configuré pour cet utilisateur'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                products = Product.objects.filter(
                    id__in=product_ids,
                    site_configuration=user_site
                ).select_related('category', 'brand').prefetch_related('barcodes')
            
            if not products.exists():
                return Response(
                    {'error': 'Aucun produit trouvé'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Récupérer ou créer un template par défaut
            if template_id:
                template = CatalogTemplate.objects.get(id=template_id)
            else:
                template = CatalogTemplate.get_default_for_site(user_site)
                if not template:
                    # Créer un template par défaut
                    template = CatalogTemplate.objects.create(
                        name="Catalogue par défaut",
                        format='A4',
                        products_per_page=12,
                        show_product_names=True,
                        show_prices=include_prices,
                        show_descriptions=include_descriptions,
                        show_images=include_images,
                        site_configuration=user_site,
                        is_default=True
                    )
            
            # Calculer le nombre de pages directement (pas de stockage)
            total_pages = (products.count() + template.products_per_page - 1) // template.products_per_page
            
            # Préparer les données du catalogue (génération directe)
            catalog_data = {
                'id': f"catalog_{int(timezone.now().timestamp())}",  # ID temporaire
                'name': f"Catalogue - {timezone.now().strftime('%Y-%m-%d %H:%M')}",
                'template': {
                    'id': template.id,
                    'name': template.name,
                    'format': template.format,
                    'products_per_page': template.products_per_page
                },
                'total_products': products.count(),
                'total_pages': total_pages,
                'generated_at': timezone.now().isoformat(),
                'products': []
            }
            
            for product in products:
                # Récupérer le code-barres principal du modèle Barcode
                primary_barcode = product.barcodes.filter(is_primary=True).first()
                if not primary_barcode:
                    primary_barcode = product.barcodes.first()
                
                # Priorité 1 : EAN du modèle Barcode (manuel)
                # Priorité 2 : EAN généré dans Product (automatique)
                barcode_ean_from_model = primary_barcode.ean if primary_barcode else None
                barcode_ean_generated = product.generated_ean
                
                # Utiliser l'EAN du modèle Barcode s'il existe, sinon l'EAN généré
                barcode_ean = barcode_ean_from_model or barcode_ean_generated
                
                product_data = {
                    'id': product.id,
                    'name': product.name,
                    'cug': product.cug,
                    'barcode_ean': barcode_ean or '',  # EAN utilisé (priorité au modèle Barcode)
                    'barcode_ean_from_model': barcode_ean_from_model or '',  # EAN du modèle Barcode
                    'barcode_ean_generated': barcode_ean_generated or '',  # EAN généré
                    'generated_ean': barcode_ean_generated or '',  # Pour compatibilité
                    'category': product.category.name if product.category else None,
                    'brand': product.brand.name if product.brand else None,
                }
                
                if include_prices:
                    product_data['selling_price'] = product.selling_price
                
                if include_stock:
                    product_data['quantity'] = product.quantity
                
                if include_descriptions and product.description:
                    product_data['description'] = product.description
                
                if include_images:
                    # Utiliser la fonction helper pour générer l'URL correctement
                    image_url = get_product_image_url(product)
                    if image_url:
                        product_data['image_url'] = image_url
                    
                    # IMPORTANT: Inclure aussi l'image en base64 pour le PDF
                    # expo-print ne peut pas charger les images depuis des URLs externes (S3)
                    # Il faut utiliser des data URIs (base64) pour les images dans le PDF
                    image_base64 = get_product_image_base64(product)
                    if image_base64:
                        product_data['image_data'] = image_base64
                    
                    if not image_url and not image_base64:
                        # Logger si le produit a une image mais aucune méthode ne fonctionne
                        if product.image:
                            import logging
                            logger = logging.getLogger(__name__)
                            logger.warning(f"⚠️ [CATALOG_PDF] Produit {product.id} ({product.name}) a une image mais get_product_image_url et get_product_image_base64 retournent None. Image field: {product.image.name if product.image else 'None'}")
                
                catalog_data['products'].append(product_data)
            
            return Response({
                'success': True,
                'catalog': catalog_data,
                'message': f'Catalogue généré avec succès - {total_pages} pages'
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la génération du catalogue: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LabelPrintAPIView(APIView):
    """API pour générer des étiquettes individuelles à coller"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Générer des étiquettes individuelles"""
        try:
            from apps.inventory.models import LabelTemplate, LabelBatch, LabelItem
            
            # Récupérer les paramètres
            product_ids = request.data.get('product_ids', [])
            template_id = request.data.get('template_id', None)
            copies = request.data.get('copies', 1)
            include_cug = request.data.get('include_cug', True)
            include_ean = request.data.get('include_ean', True)
            include_barcode = request.data.get('include_barcode', True)
            
            # Récupérer les produits
            user = request.user
            user_site = get_user_site_configuration_api(user)
            
            if user.is_superuser:
                products = Product.objects.filter(id__in=product_ids).select_related('category', 'brand')
            else:
                if not user_site:
                    return Response(
                        {'error': 'Aucun site configuré pour cet utilisateur'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                products = Product.objects.filter(
                    id__in=product_ids,
                    site_configuration=user_site
                ).select_related('category', 'brand')
            
            if not products.exists():
                return Response(
                    {'error': 'Aucun produit trouvé'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Récupérer ou créer un template d'étiquette par défaut
            if template_id:
                template = LabelTemplate.objects.get(id=template_id)
            else:
                template = LabelTemplate.get_default_for_site(user_site)
                if not template:
                    # Créer un template par défaut
                    template = LabelTemplate.objects.create(
                        name="Étiquette par défaut",
                        type='barcode',
                        width_mm=40,
                        height_mm=30,
                        site_configuration=user_site,
                        is_default=True
                    )
            
            # Créer un lot d'étiquettes
            label_batch = LabelBatch.objects.create(
                site_configuration=user_site,
                user=user,
                template=template,
                source='manual',
                status='processing',
                copies_total=products.count() * copies
            )
            
            # Ajouter les étiquettes au lot
            for i, product in enumerate(products):
                # Logique pour déterminer le code-barres à utiliser
                # 1. Vérifier si le produit a des barcodes dans le tableau
                primary_barcode = product.barcodes.filter(is_primary=True).first()
                if not primary_barcode:
                    primary_barcode = product.barcodes.first()
                
                # 2. Si pas de barcodes dans le tableau, utiliser generated_ean (au lieu du CUG)
                if primary_barcode and primary_barcode.ean:
                    barcode_value = primary_barcode.ean
                    barcode_source = 'primary_barcode'
                elif product.generated_ean:
                    barcode_value = product.generated_ean
                    barcode_source = 'generated_ean'
                else:
                    # Dernier recours : générer depuis l'ID (pas le CUG)
                    from apps.inventory.utils import generate_ean13_from_cug
                    barcode_value = generate_ean13_from_cug(product.cug) if product.cug else str(product.id)
                    barcode_source = 'generated_from_cug_fallback'
                
                print(f"🔍 [LABELS API] Produit {product.name} (ID: {product.id})")
                print(f"   CUG: {product.cug}")
                print(f"   generated_ean: {product.generated_ean}")
                print(f"   primary_barcode: {primary_barcode.ean if primary_barcode else 'None'}")
                print(f"   barcode_value utilisé: {barcode_value} (source: {barcode_source})")
                
                LabelItem.objects.create(
                    batch=label_batch,
                    product=product,
                    copies=copies,
                    barcode_value=barcode_value,
                    position=i
                )
            
            # Mettre à jour le lot
            label_batch.status = 'success'
            label_batch.completed_at = timezone.now()
            label_batch.save()
            
            # Préparer les données des étiquettes
            labels_data = {
                'id': label_batch.id,
                'template': {
                    'id': template.id,
                    'name': template.name,
                    'type': template.type,
                    'width_mm': template.width_mm,
                    'height_mm': template.height_mm
                },
                'total_labels': products.count(),
                'total_copies': products.count() * copies,
                'generated_at': label_batch.completed_at.isoformat(),
                'labels': []
            }
            
            for product in products:
                label_data = {
                    'id': product.id,
                    'name': product.name,
                    'cug': product.cug if include_cug else None,
                    'generated_ean': product.generated_ean if include_ean else None,
                    'category': product.category.name if product.category else None,
                    'brand': product.brand.name if product.brand else None,
                    'copies': copies
                }
                
                if include_barcode and product.generated_ean:
                    label_data['barcode_data'] = {
                        'ean': product.generated_ean,
                        'cug': product.cug,
                        'name': product.name
                    }
                
                labels_data['labels'].append(label_data)
            
            return Response({
                'success': True,
                'labels': labels_data,
                'message': f'Étiquettes générées avec succès - {products.count()} étiquettes x {copies} copies'
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la génération des étiquettes: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ReceiptPrintAPIView(APIView):
    """API pour générer des tickets de caisse"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Générer un ticket de caisse"""
        try:
            from apps.sales.models import Sale, SaleItem
            
            # Récupérer les paramètres
            sale_id = request.data.get('sale_id')
            printer_type = request.data.get('printer_type', 'pdf')  # 'pdf' ou 'escpos'
            
            if not sale_id:
                return Response(
                    {'error': 'ID de vente requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Récupérer la vente
            user = request.user
            user_site = get_user_site_configuration_api(user)
            
            try:
                if user.is_superuser:
                    sale = Sale.objects.select_related(
                        'customer', 'seller', 'cash_register', 'site_configuration'
                    ).prefetch_related('items__product').get(id=sale_id)
                else:
                    if not user_site:
                        return Response(
                            {'error': 'Aucun site configuré pour cet utilisateur'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    sale = Sale.objects.select_related(
                        'customer', 'seller', 'cash_register', 'site_configuration'
                    ).prefetch_related('items__product').filter(
                        id=sale_id,
                        site_configuration=user_site
                    ).first()
                    
                    if not sale:
                        return Response(
                            {'error': 'Vente non trouvée ou non autorisée'},
                            status=status.HTTP_404_NOT_FOUND
                        )
                
                # Debug: Vérifier que la vente a bien un customer_id
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f'🔍 [RECEIPT] Vente récupérée #{sale.id} - customer_id: {sale.customer_id}, customer chargé: {sale.customer is not None}')
            except Sale.DoesNotExist:
                return Response(
                    {'error': 'Vente non trouvée'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Récupérer les informations du site
            site_config = sale.site_configuration or user_site
            
            # Préparer les données du ticket
            receipt_data = {
                'sale': {
                    'id': sale.id,
                    'reference': sale.reference or f"V{sale.id}",
                    'sale_date': sale.sale_date.isoformat(),
                    'status': sale.status,
                    'payment_status': sale.payment_status,
                    'payment_method': sale.payment_method,
                    'subtotal': float(sale.subtotal),
                    'tax_amount': float(sale.tax_amount),
                    'discount_amount': float(sale.discount_amount),
                    'total_amount': float(sale.total_amount),
                    'amount_paid': float(sale.amount_paid),
                    'amount_given': float(sale.amount_given) if sale.amount_given else None,
                    'change_amount': float(sale.change_amount) if sale.change_amount else None,
                    'sarali_reference': sale.sarali_reference,
                    'notes': sale.notes,
                },
                'site': {
                    'name': site_config.site_name if site_config else 'BoliBana Stock',
                    'company_name': site_config.nom_societe if site_config else 'BoliBana Stock',
                    'address': site_config.adresse if site_config else '',
                    'phone': site_config.telephone if site_config else '',
                    'email': site_config.email if site_config else '',
                    'currency': site_config.devise if site_config else 'FCFA',
                },
                'seller': {
                    'username': sale.seller.username,
                    'first_name': sale.seller.first_name,
                    'last_name': sale.seller.last_name,
                },
                'customer': None,
                'items': [],
                'printer_type': printer_type,
                'generated_at': timezone.now().isoformat(),
            }
            
            # Informations client si défini
            # Vérifier d'abord si customer_id est présent même si customer n'est pas chargé
            customer_id = getattr(sale, 'customer_id', None)
            
            # Debug: Afficher les informations de la vente
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f'🔍 [RECEIPT] Vente #{sale.id} - customer_id: {customer_id}, customer chargé: {sale.customer is not None}, payment_method: {sale.payment_method}')
            
            if sale.customer:
                receipt_data['customer'] = {
                    'id': sale.customer.id,
                    'name': sale.customer.name or '',
                    'first_name': sale.customer.first_name or '',
                    'phone': sale.customer.phone or '',
                    'email': sale.customer.email or '',
                    'credit_balance': float(sale.customer.credit_balance) if hasattr(sale.customer, 'credit_balance') else 0,
                }
                logger.info(f'✅ [RECEIPT] Client trouvé: ID={sale.customer.id}, name="{sale.customer.name}", first_name="{sale.customer.first_name}"')
            elif customer_id:
                # Si customer_id existe mais customer n'est pas chargé, le récupérer
                from apps.inventory.models import Customer
                try:
                    customer = Customer.objects.get(id=customer_id)
                    receipt_data['customer'] = {
                        'id': customer.id,
                        'name': customer.name or '',
                        'first_name': customer.first_name or '',
                        'phone': customer.phone or '',
                        'email': customer.email or '',
                        'credit_balance': float(customer.credit_balance) if hasattr(customer, 'credit_balance') else 0,
                    }
                    logger.info(f'✅ [RECEIPT] Client récupéré manuellement: ID={customer.id}, name="{customer.name}", first_name="{customer.first_name}"')
                except Customer.DoesNotExist:
                    logger.warning(f'⚠️ [RECEIPT] Client ID {customer_id} non trouvé pour la vente #{sale.id}')
            else:
                # Log pour déboguer si le client n'est pas présent
                logger.warning(f'⚠️ [RECEIPT] Vente #{sale.id} n\'a pas de client associé. Payment method: {sale.payment_method}')
            
            # Articles de la vente
            for item in sale.items.all():
                item_data = {
                    'product_name': item.product.name,
                    'product_cug': item.product.cug,
                    'quantity': item.quantity,
                    'unit_price': float(item.unit_price),
                    'total_price': float(item.amount),
                }
                receipt_data['items'].append(item_data)
            
            # Calculer les totaux pour vérification
            calculated_subtotal = sum(item['total_price'] for item in receipt_data['items'])
            calculated_total = calculated_subtotal + receipt_data['sale']['tax_amount'] - receipt_data['sale']['discount_amount']
            
            # Ajouter les totaux calculés pour vérification côté client
            receipt_data['calculated_totals'] = {
                'subtotal': calculated_subtotal,
                'total': calculated_total,
            }
            
            return Response({
                'success': True,
                'receipt': receipt_data,
                'message': f'Ticket de caisse généré avec succès - Vente #{sale.reference or sale.id}'
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la génération du ticket de caisse: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


def get_user_site_configuration_api(user):
    """
    Récupère la configuration du site de l'utilisateur pour l'API
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def collect_static_files(request):
    """
    Endpoint API pour collecter les fichiers statiques
    Accessible à tous les utilisateurs authentifiés
    """
    try:
        # Collecter les fichiers statiques
        call_command('collectstatic', '--noinput', '--clear')
        
        return Response({
            'success': True,
            'message': 'Fichiers statiques collectés avec succès',
            'details': {
                'command': 'collectstatic --noinput --clear',
                'timestamp': timezone.now().isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'message': 'Erreur lors de la collecte des fichiers statiques'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetRayonsView(APIView):
    """
    Vue API pour récupérer tous les rayons (niveau 0) pour l'interface mobile
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            print(f"🔍 GetRayonsView.get - Utilisateur: {request.user.username}")
            print(f"🔍 GetRayonsView.get - Site utilisateur: {getattr(request.user, 'site_configuration', None)}")
            
            # Utiliser le service centralisé pour obtenir les rayons accessibles
            from apps.core.services import PermissionService
            rayons_queryset = PermissionService.get_user_accessible_resources(request.user, Category)
            
            print(f"🔍 GetRayonsView.get - Queryset initial: {rayons_queryset.count()} catégories")
            
            # Récupérer tous les rayons principaux avec filtrage par site
            rayons = rayons_queryset.filter(
                is_active=True,
                is_rayon=True,
                level=0
            ).order_by('rayon_type', 'order', 'name')
            
            print(f"🔍 GetRayonsView.get - Rayons trouvés: {rayons.count()}")
            for rayon in rayons:
                print(f"🔍 GetRayonsView.get - Rayon: ID={rayon.id}, Name={rayon.name}, is_rayon={rayon.is_rayon}, level={rayon.level}")
            
            # Sérialiser les rayons avec permissions
            rayons_data = []
            for rayon in rayons:
                # Calculer les permissions pour chaque rayon
                can_edit = PermissionService.can_user_manage_category(request.user, rayon)
                can_delete = PermissionService.can_user_delete_category(request.user, rayon)
                
                rayons_data.append({
                    'id': rayon.id,
                    'name': rayon.name,
                    'description': rayon.description or '',
                    'rayon_type': rayon.rayon_type,
                    'rayon_type_display': dict(Category.RAYON_TYPE_CHOICES).get(rayon.rayon_type, ''),
                    'order': rayon.order,
                    'subcategories_count': rayon.children.filter(is_active=True).count(),
                    'site_configuration': rayon.site_configuration.id if rayon.site_configuration else None,
                    'can_edit': can_edit,
                    'can_delete': can_delete
                })
            
            return Response({
                'success': True,
                'rayons': rayons_data,
                'total': len(rayons_data)
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class GetSubcategoriesMobileView(APIView):
    """
    Vue API pour récupérer les sous-catégories d'un rayon pour l'interface mobile
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        rayon_id = request.GET.get('rayon_id')
        
        if not rayon_id:
            return Response({'error': 'ID du rayon manquant'}, status=400)
        
        try:
            # Utiliser le service centralisé pour obtenir les rayons accessibles
            from apps.core.services import PermissionService
            rayons_queryset = PermissionService.get_user_accessible_resources(request.user, Category)
            
            # Récupérer le rayon principal avec filtrage par site
            rayon = rayons_queryset.get(id=rayon_id, level=0, is_rayon=True)
            
            # Récupérer les sous-catégories avec filtrage par site
            subcategories_queryset = PermissionService.get_user_accessible_resources(request.user, Category)
            subcategories = subcategories_queryset.filter(
                parent=rayon,
                level=1,
                is_active=True
            ).order_by('order', 'name')
            
            # Sérialiser les sous-catégories avec le serializer complet
            from .serializers import CategorySerializer
            serializer = CategorySerializer(subcategories, many=True, context={'request': request})
            subcategories_data = serializer.data
            
            return Response({
                'success': True,
                'rayon': {
                    'id': rayon.id,
                    'name': rayon.name,
                    'rayon_type': rayon.rayon_type
                },
                'subcategories': subcategories_data,
                'total': len(subcategories_data)
            })
            
        except Category.DoesNotExist:
            return Response({'error': 'Rayon non trouvé'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class BrandsByRayonAPIView(APIView):
    """
    Vue API pour récupérer les marques d'un rayon spécifique
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        rayon_id = request.query_params.get('rayon_id')
        if not rayon_id:
            return Response(
                {'error': 'rayon_id est requis'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            rayon = Category.objects.get(id=rayon_id, is_rayon=True)
            
            # Récupérer les marques du rayon
            try:
                user_site = getattr(request.user, 'site_configuration', None)
            except:
                user_site = None
                
            if request.user.is_superuser:
                brands = Brand.objects.filter(rayons=rayon).prefetch_related('rayons')
            else:
                if not user_site:
                    # Si pas de site, voir seulement les marques globales
                    brands = Brand.objects.filter(
                        site_configuration__isnull=True,
                        rayons=rayon
                    ).prefetch_related('rayons')
                else:
                    # Marques du site de l'utilisateur + marques globales
                    from django.db import models
                    brands = Brand.objects.filter(
                        models.Q(site_configuration=user_site) | 
                        models.Q(site_configuration__isnull=True),
                        rayons=rayon
                    ).prefetch_related('rayons')
            
            serializer = BrandSerializer(brands, many=True)
            return Response({
                'rayon': {
                    'id': rayon.id,
                    'name': rayon.name,
                    'rayon_type': rayon.get_rayon_type_display()
                },
                'brands': serializer.data,
                'count': brands.count()
            })
            
        except Category.DoesNotExist:
            return Response(
                {'error': 'Rayon introuvable'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProductCopyAPIView(APIView):
    """
    Vue API pour la copie de produits du site principal vers le site actuel
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Récupère les produits disponibles pour la copie"""
        try:
            # Récupérer la configuration du site actuel
            current_site = request.user.site_configuration
            
            if not current_site:
                return Response({'error': 'Aucune configuration de site trouvée'}, status=400)
            
            # ✅ Pour les superusers : permettre de choisir le site source
            # Pour tous : si aucun site source spécifié, afficher les produits de tous les sites
            source_site_id = request.GET.get('source_site')
            source_site = None
            
            if source_site_id:
                # Site source spécifique sélectionné (superusers uniquement)
                if request.user.is_superuser:
                    try:
                        source_site = Configuration.objects.get(id=int(source_site_id))
                        if source_site == current_site:
                            return Response({'error': 'Le site source ne peut pas être le même que le site destination'}, status=400)
                    except (ValueError, Configuration.DoesNotExist):
                        return Response({'error': 'Site source invalide'}, status=400)
                else:
                    return Response({'error': 'Seuls les superusers peuvent spécifier un site source'}, status=403)
            
            # Récupérer les produits : soit du site source spécifique, soit de tous les sites (sauf actuel)
            include_inactive = request.GET.get('include_inactive', 'false').lower() == 'true'
            
            if source_site:
                # Produits d'un site source spécifique
                if include_inactive:
                    source_products = Product.objects.filter(
                        site_configuration=source_site
                    ).select_related('category', 'brand')
                else:
                    source_products = Product.objects.filter(
                        site_configuration=source_site,
                        is_active=True
                    ).select_related('category', 'brand')
                
                # Filtrer les produits déjà copiés depuis ce site source vers le site actuel
                from apps.inventory.models import ProductCopy
                copied_products = ProductCopy.objects.filter(
                    destination_site=current_site,
                    source_site=source_site
                ).values_list('original_product_id', flat=True)
            else:
                # Produits de TOUS les sites (sauf le site actuel)
                all_sites_except_current = Configuration.objects.exclude(id=current_site.id)
                
                if include_inactive:
                    source_products = Product.objects.filter(
                        site_configuration__in=all_sites_except_current
                    ).select_related('category', 'brand', 'site_configuration')
                else:
                    source_products = Product.objects.filter(
                        site_configuration__in=all_sites_except_current,
                        is_active=True
                    ).select_related('category', 'brand', 'site_configuration')
                
                # Filtrer les produits déjà copiés depuis n'importe quel site vers le site actuel
                from apps.inventory.models import ProductCopy
                copied_products = ProductCopy.objects.filter(
                    destination_site=current_site
                ).values_list('original_product_id', flat=True)
            
            # Log pour débogage
            import logging
            logger = logging.getLogger(__name__)
            if source_site:
                logger.info(f"🔍 ProductCopyAPIView - Site source spécifique: {source_site.id} ({source_site.site_name}), Site destination: {current_site.id} ({current_site.site_name})")
            else:
                logger.info(f"🔍 ProductCopyAPIView - Tous les sites (sauf actuel), Site destination: {current_site.id} ({current_site.site_name})")
            
            logger.info(f"📦 Produits disponibles dans le(s) site(s) source: {source_products.count()}")
            logger.info(f"📋 Produits déjà copiés vers le site actuel: {copied_products.count()}")
            if copied_products:
                logger.info(f"📋 IDs des produits déjà copiés: {list(copied_products)[:10]}...")  # Limiter à 10 pour éviter les logs trop longs
            
            available_products = source_products.exclude(id__in=copied_products)
            
            logger.info(f"✅ Produits disponibles pour copie: {available_products.count()}")
            
            # Log supplémentaire pour débogage : statistiques par site
            if not source_site:
                from django.db.models import Count
                products_by_site = source_products.values('site_configuration__site_name', 'site_configuration__id').annotate(
                    count=Count('id')
                )
                logger.info(f"📊 Répartition par site: {list(products_by_site)}")
            
            # Recherche
            search_query = request.GET.get('search', '').strip()
            if search_query:
                available_products = available_products.filter(
                    Q(name__icontains=search_query) |
                    Q(cug__icontains=search_query) |
                    Q(description__icontains=search_query)
                )
            
            # Filtrage par catégorie
            category_id = request.GET.get('category')
            if category_id:
                try:
                    available_products = available_products.filter(category_id=category_id)
                except ValueError:
                    pass  # Ignorer les IDs de catégorie invalides
            
            # Pagination
            from django.core.paginator import Paginator
            page_size = int(request.GET.get('page_size', 50))  # ✅ Pagination optimisée (50 par défaut)
            paginator = Paginator(available_products, page_size)
            page_number = request.GET.get('page', 1)
            page_obj = paginator.get_page(page_number)
            
            # Sérialiser les produits
            products_data = []
            for product in page_obj:
                products_data.append({
                    'id': product.id,
                    'name': product.name,
                    'cug': product.cug,
                    'description': product.description or '',
                    'selling_price': float(product.selling_price),
                    'purchase_price': float(product.purchase_price),
                    'quantity': product.quantity,
                    'alert_threshold': product.alert_threshold,
                    'category': {
                        'id': product.category.id,
                        'name': product.category.name
                    } if product.category else None,
                    'brand': {
                        'id': product.brand.id,
                        'name': product.brand.name
                    } if product.brand else None,
                    'image_url': get_product_image_url(product),
                    'is_active': product.is_active,
                    'created_at': product.created_at.isoformat(),
                    'updated_at': product.updated_at.isoformat(),
                    # ✅ Ajouter le site source du produit pour affichage (quand on affiche tous les sites)
                    'site_source': {
                        'id': product.site_configuration.id,
                        'name': product.site_configuration.site_name
                    } if not source_site and hasattr(product, 'site_configuration') and product.site_configuration else None
                })
            
            # Log pour débogage
            logger.info(f"📄 Page {page_obj.number}/{paginator.num_pages}, Produits sur cette page: {len(products_data)}, Total: {paginator.count}")
            
            return Response({
                'success': True,
                'results': products_data,
                'count': paginator.count,
                'next': page_obj.next_page_number() if page_obj.has_next() else None,
                'previous': page_obj.previous_page_number() if page_obj.has_previous() else None,
                'page': page_obj.number,
                'total_pages': paginator.num_pages
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    def post(self, request):
        """Copie des produits sélectionnés"""
        try:
            product_ids = request.data.get('products', [])
            single_copy = request.data.get('single_copy', False)  # Nouveau paramètre pour copie unitaire
            
            if not product_ids:
                return Response({'error': 'Aucun produit sélectionné pour la copie'}, status=400)
            
            current_site = request.user.site_configuration
            
            # ✅ Pour les superusers : permettre de choisir le site source
            # Si aucun site source spécifié, les produits peuvent venir de n'importe quel site
            source_site_id = request.data.get('source_site')
            source_site = None
            
            if source_site_id:
                # Site source spécifique sélectionné (superusers uniquement)
                if request.user.is_superuser:
                    try:
                        source_site = Configuration.objects.get(id=int(source_site_id))
                        if source_site == current_site:
                            return Response({'error': 'Le site source ne peut pas être le même que le site destination'}, status=400)
                    except (ValueError, Configuration.DoesNotExist):
                        return Response({'error': 'Site source invalide'}, status=400)
                else:
                    return Response({'error': 'Seuls les superusers peuvent spécifier un site source'}, status=403)
            
            if not current_site:
                return Response({'error': 'Configuration de site invalide'}, status=400)
            
            from apps.inventory.models import ProductCopy
            copied_count = 0
            errors = []
            
            for product_id in product_ids:
                try:
                    # Récupérer le produit original (peut venir de n'importe quel site si source_site est None)
                    if source_site:
                        original_product = Product.objects.get(
                            id=product_id,
                            site_configuration=source_site
                        )
                        # Vérifier si déjà copié depuis ce site source spécifique
                        copy_filter = {
                            'original_product': original_product,
                            'destination_site': current_site,
                            'source_site': source_site
                        }
                    else:
                        # Produit peut venir de n'importe quel site (sauf actuel)
                        original_product = Product.objects.get(id=product_id)
                        if original_product.site_configuration == current_site:
                            errors.append(f"Le produit {product_id} appartient déjà au site actuel")
                            continue
                        # Vérifier si déjà copié depuis n'importe quel site
                        copy_filter = {
                            'original_product': original_product,
                            'destination_site': current_site
                        }
                    
                    if ProductCopy.objects.filter(**copy_filter).exists():
                        continue
                    
                    # Créer une copie du produit avec un CUG unique (contrainte globale)
                    # Laisser le slug vide pour bénéficier de la génération/ajustement auto dans Product.save()
                    from django.db import IntegrityError
                    max_attempts = 3
                    last_err = None
                    copied_product = None
                    for _ in range(max_attempts):
                        try:
                            copied_product = Product.objects.create(
                                name=original_product.name,
                                cug=Product.generate_unique_cug(),
                                description=original_product.description,
                                selling_price=original_product.selling_price,
                                purchase_price=original_product.purchase_price,
                                quantity=0,  # Commencer avec 0 en stock
                                alert_threshold=original_product.alert_threshold,
                                category=original_product.category,
                                brand=original_product.brand,
                                # ✅ Référence directement l'image d'origine pour conserver l'URL
                                image=original_product.image,
                                site_configuration=current_site,
                                is_active=True
                            )
                            break
                        except IntegrityError as ie:
                            # En cas de collision rare, retenter avec un nouveau CUG
                            last_err = ie
                            continue
                    if copied_product is None:
                        raise last_err or Exception('Impossible de créer la copie du produit (CUG/slug)')
                    
                    # ✅ Conserver l'URL d'image d'origine (référence au même fichier)
                    if original_product.image:
                        print(f"🖼️ Image référencée pour le produit copié: {copied_product.image}")
                    else:
                        print("🖼️ Aucun fichier image à référencer pour le produit original")

                    # ✅ Copier les codes-barres du produit original
                    original_barcodes = original_product.barcodes.all()
                    print(f"🔍 PRODUIT ORIGINAL: {original_product.name} (ID: {original_product.id})")
                    print(f"   CUG: {original_product.cug}")
                    print(f"   Generated EAN: {original_product.generated_ean}")
                    print(f"   Image: {original_product.image}")
                    print(f"   Image URL: {original_product.image.url if original_product.image else 'Aucune'}")
                    print(f"   Site: {original_product.site_configuration.site_name if original_product.site_configuration else 'Aucun'}")
                    print(f"   Codes-barres manuels ({original_barcodes.count()}):")
                    for barcode in original_barcodes:
                        print(f"     - {barcode.ean} {'(principal)' if barcode.is_primary else ''} - Notes: {barcode.notes or 'Aucune'}")
                    
                    copied_barcodes_count = 0
                    for original_barcode in original_barcodes:
                        try:
                            Barcode.objects.create(
                                product=copied_product,
                                ean=original_barcode.ean,
                                notes=original_barcode.notes,
                                is_primary=original_barcode.is_primary
                            )
                            copied_barcodes_count += 1
                            print(f"   ✅ Code-barres copié: {original_barcode.ean}")
                        except Exception as e:
                            # En cas d'erreur (EAN déjà utilisé), continuer sans ce code-barres
                            print(f"   ❌ Impossible de copier le code-barres {original_barcode.ean}: {e}")
                            continue
                    
                    print(f"🔍 PRODUIT COPIÉ: {copied_product.name} (ID: {copied_product.id})")
                    print(f"   CUG: {copied_product.cug}")
                    print(f"   Generated EAN: {copied_product.generated_ean}")
                    print(f"   Image: {copied_product.image}")
                    print(f"   Image URL: {copied_product.image.url if copied_product.image else 'Aucune'}")
                    print(f"   Site: {copied_product.site_configuration.site_name if copied_product.site_configuration else 'Aucun'}")
                    print(f"   Codes-barres copiés: {copied_barcodes_count}/{original_barcodes.count()}")
                    
                    # Vérifier les codes-barres finaux
                    final_barcodes = copied_product.barcodes.all()
                    print(f"   Codes-barres finaux dans la DB ({final_barcodes.count()}):")
                    for barcode in final_barcodes:
                        print(f"     - {barcode.ean} {'(principal)' if barcode.is_primary else ''} - Notes: {barcode.notes or 'Aucune'}")
                    
                    # Créer l'enregistrement de copie
                    # Utiliser le site source du produit original si source_site n'est pas spécifié
                    actual_source_site = source_site if source_site else original_product.site_configuration
                    ProductCopy.objects.create(
                        original_product=original_product,
                        copied_product=copied_product,
                        source_site=actual_source_site,
                        destination_site=current_site
                    )
                    
                    copied_count += 1

                    # Si copie unitaire, retourner immédiatement les détails
                    if single_copy:
                        return Response({
                            'success': True,
                            'copied_count': copied_count,
                            'errors': [],
                            'message': f'{copied_count} produit(s) copié(s) avec succès',
                            'copied_product': {
                                'id': copied_product.id,
                                'name': copied_product.name,
                                'cug': copied_product.cug,
                                'selling_price': float(copied_product.selling_price),
                                'purchase_price': float(copied_product.purchase_price),
                                'quantity': copied_product.quantity,
                                'image_url': get_product_image_url(copied_product),
                                'category': {
                                    'id': copied_product.category.id,
                                    'name': copied_product.category.name
                                } if copied_product.category else None,
                                'brand': {
                                    'id': copied_product.brand.id,
                                    'name': copied_product.brand.name
                                } if copied_product.brand else None,
                            },
                            'redirect_to_edit': True
                        })
                    
                except Product.DoesNotExist:
                    errors.append(f'Produit ID {product_id} non trouvé')
                except Exception as e:
                    errors.append(f'Erreur lors de la copie du produit ID {product_id}: {str(e)}')
            
            # Si copie unitaire et aucune réponse immédiate (sécurité), ne rien faire ici
            
            return Response({
                'success': True,
                'copied_count': copied_count,
                'errors': errors,
                'message': f'{copied_count} produit(s) copié(s) avec succès'
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    


class ProductCopyManagementAPIView(APIView):
    """
    Vue API pour gérer les produits copiés (synchronisation, désactivation, etc.)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Récupère la liste des produits copiés"""
        try:
            current_site = request.user.site_configuration
            
            if not current_site:
                return Response({'error': 'Aucune configuration de site trouvée'}, status=400)
            
            from apps.inventory.models import ProductCopy
            product_copies = ProductCopy.objects.filter(
                destination_site=current_site
            ).select_related(
                'original_product', 
                'copied_product', 
                'source_site'
            ).order_by('-copied_at')
            
            # Recherche
            search_query = request.GET.get('search', '').strip()
            if search_query:
                product_copies = product_copies.filter(
                    Q(original_product__name__icontains=search_query) |
                    Q(copied_product__name__icontains=search_query) |
                    Q(original_product__cug__icontains=search_query)
                )
            
            # Filtrage par catégorie
            category_id = request.GET.get('category')
            if category_id:
                try:
                    product_copies = product_copies.filter(
                        Q(original_product__category_id=category_id) |
                        Q(copied_product__category_id=category_id)
                    )
                except ValueError:
                    pass  # Ignorer les IDs de catégorie invalides
            
            # Pagination
            from django.core.paginator import Paginator
            paginator = Paginator(product_copies, 20)
            page_number = request.GET.get('page', 1)
            page_obj = paginator.get_page(page_number)
            
            # Sérialiser les copies
            copies_data = []
            for copy in page_obj:
                copies_data.append({
                    'id': copy.id,
                    'original_product': {
                        'id': copy.original_product.id,
                        'name': copy.original_product.name,
                        'cug': copy.original_product.cug,
                        'selling_price': float(copy.original_product.selling_price),
                        'quantity': copy.original_product.quantity,
                        'image_url': get_product_image_url(copy.original_product),
                        'category': {
                            'id': copy.original_product.category.id,
                            'name': copy.original_product.category.name
                        } if copy.original_product.category else None,
                        'brand': {
                            'id': copy.original_product.brand.id,
                            'name': copy.original_product.brand.name
                        } if copy.original_product.brand else None,
                    },
                    'copied_product': {
                        'id': copy.copied_product.id,
                        'name': copy.copied_product.name,
                        'cug': copy.copied_product.cug,
                        'selling_price': float(copy.copied_product.selling_price),
                        'quantity': copy.copied_product.quantity,
                        'is_active': copy.copied_product.is_active,
                        'image_url': get_product_image_url(copy.copied_product),
                    },
                    'source_site': {
                        'id': copy.source_site.id,
                        'name': copy.source_site.site_name
                    },
                    'copied_at': copy.copied_at.isoformat(),
                    # removed copied_by to avoid missing field errors
                })
            
            return Response({
                'success': True,
                'results': copies_data,
                'count': paginator.count,
                'next': page_obj.next_page_number() if page_obj.has_next() else None,
                'previous': page_obj.previous_page_number() if page_obj.has_previous() else None,
                'page': page_obj.number,
                'total_pages': paginator.num_pages
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    def post(self, request):
        """Actions sur les produits copiés (sync, toggle_active, delete)"""
        try:
            action = request.data.get('action')
            copy_id = request.data.get('copy_id')
            
            if not action or not copy_id:
                return Response({'error': 'Action et copy_id requis'}, status=400)
            
            from apps.inventory.models import ProductCopy
            try:
                copy = ProductCopy.objects.get(id=copy_id, destination_site=request.user.site_configuration)
            except ProductCopy.DoesNotExist:
                return Response({'error': 'Copie non trouvée'}, status=404)
            
            if action == 'sync':
                # Synchroniser le produit copié avec l'original
                original = copy.original_product
                copied = copy.copied_product
                
                # Mettre à jour les données
                copied.name = original.name
                copied.description = original.description
                copied.selling_price = original.selling_price
                copied.purchase_price = original.purchase_price
                copied.alert_threshold = original.alert_threshold
                copied.image_url = original.image_url
                copied.save()
                
                # ✅ Synchroniser les codes-barres
                print(f"🔄 SYNCHRONISATION - Produit original: {original.name} (ID: {original.id})")
                print(f"   CUG original: {original.cug}")
                print(f"   Generated EAN original: {original.generated_ean}")
                print(f"   Image original: {original.image}")
                print(f"   Image URL original: {original.image.url if original.image else 'Aucune'}")
                print(f"   Site original: {original.site_configuration.site_name if original.site_configuration else 'Aucun'}")
                
                # Supprimer les codes-barres existants du produit copié
                old_barcodes = copied.barcodes.all()
                print(f"   Codes-barres existants à supprimer ({old_barcodes.count()}):")
                for barcode in old_barcodes:
                    print(f"     - {barcode.ean} {'(principal)' if barcode.is_primary else ''}")
                copied.barcodes.all().delete()
                
                # Copier les codes-barres de l'original
                original_barcodes = original.barcodes.all()
                print(f"   Codes-barres originaux à copier ({original_barcodes.count()}):")
                for barcode in original_barcodes:
                    print(f"     - {barcode.ean} {'(principal)' if barcode.is_primary else ''} - Notes: {barcode.notes or 'Aucune'}")
                
                synced_barcodes_count = 0
                for original_barcode in original_barcodes:
                    try:
                        Barcode.objects.create(
                            product=copied,
                            ean=original_barcode.ean,
                            notes=original_barcode.notes,
                            is_primary=original_barcode.is_primary
                        )
                        synced_barcodes_count += 1
                        print(f"   ✅ Code-barres synchronisé: {original_barcode.ean}")
                    except Exception as e:
                        # En cas d'erreur (EAN déjà utilisé), continuer sans ce code-barres
                        print(f"   ❌ Impossible de synchroniser le code-barres {original_barcode.ean}: {e}")
                        continue
                
                print(f"🔄 SYNCHRONISATION - Produit copié: {copied.name} (ID: {copied.id})")
                print(f"   CUG copié: {copied.cug}")
                print(f"   Generated EAN copié: {copied.generated_ean}")
                print(f"   Image copié: {copied.image}")
                print(f"   Image URL copié: {copied.image.url if copied.image else 'Aucune'}")
                print(f"   Site copié: {copied.site_configuration.site_name if copied.site_configuration else 'Aucun'}")
                print(f"   Codes-barres synchronisés: {synced_barcodes_count}/{original_barcodes.count()}")
                
                # Vérifier les codes-barres finaux
                final_barcodes = copied.barcodes.all()
                print(f"   Codes-barres finaux après sync ({final_barcodes.count()}):")
                for barcode in final_barcodes:
                    print(f"     - {barcode.ean} {'(principal)' if barcode.is_primary else ''} - Notes: {barcode.notes or 'Aucune'}")
                
                return Response({
                    'success': True,
                    'message': 'Produit synchronisé avec succès'
                })
                
            elif action == 'toggle_active':
                # Activer/désactiver le produit copié
                copied = copy.copied_product
                copied.is_active = not copied.is_active
                copied.save()
                
                return Response({
                    'success': True,
                    'message': f'Produit {"activé" if copied.is_active else "désactivé"} avec succès',
                    'is_active': copied.is_active
                })
                
            elif action == 'delete_copy':
                # Supprimer la copie
                copied_product_id = copy.copied_product.id
                copy.copied_product.delete()
                copy.delete()
                
                return Response({
                    'success': True,
                    'message': 'Copie supprimée avec succès',
                    'deleted_product_id': copied_product_id
                })
            
            else:
                return Response({'error': 'Action non reconnue'}, status=400)
                
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class CustomerViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des clients avec crédit"""
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'site_configuration']
    search_fields = ['name', 'first_name', 'phone', 'email']
    ordering_fields = ['name', 'credit_balance', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filtrer les clients par site de l'utilisateur"""
        user_site = getattr(self.request.user, 'site_configuration', None)
        
        # Vérifier si un filtre par site est demandé dans les paramètres de requête
        site_filter = self.request.query_params.get('site_configuration')
        
        queryset = Customer.objects.all()
        
        if self.request.user.is_superuser:
            # Superuser peut filtrer par site si demandé, sinon voit tout
            if site_filter:
                try:
                    site_id = int(site_filter)
                    queryset = queryset.filter(site_configuration=site_id)
                except (ValueError, TypeError):
                    pass  # Si le paramètre est invalide, on ignore le filtre
            # Sinon, on retourne tout (pas de filtre)
        else:
            # Utilisateur normal voit seulement son site
            if not user_site:
                return Customer.objects.none()
            queryset = queryset.filter(site_configuration=user_site)
        
        return queryset
    
    def perform_create(self, serializer):
        """Créer un client avec gestion du site"""
        user_site = getattr(self.request.user, 'site_configuration', None)
        
        if not user_site and not self.request.user.is_superuser:
            raise ValidationError({"detail": "Aucun site configuré pour cet utilisateur"})
        
        serializer.save(site_configuration=user_site)
    
    @action(detail=True, methods=['get'])
    def credit_history(self, request, pk=None):
        """Récupérer l'historique des transactions de crédit et de fidélité d'un client"""
        customer = self.get_object()
        limit = request.query_params.get('limit', 20)
        
        try:
            limit = int(limit)
        except ValueError:
            limit = 20
            
        # Récupérer les transactions de crédit
        credit_transactions = CreditService.get_credit_history(customer, limit=limit)
        credit_serializer = CreditTransactionSerializer(credit_transactions, many=True, context={'request': request})
        
        # Récupérer les transactions de fidélité
        if not LOYALTY_APP_AVAILABLE:
            loyalty_transactions = []
            loyalty_serializer = None
        else:
            loyalty_transactions = LoyaltyTransaction.objects.filter(
                customer=customer
            ).select_related('sale', 'site_configuration').order_by('-transaction_date')[:limit]
            loyalty_serializer = LoyaltyTransactionSerializer(loyalty_transactions, many=True, context={'request': request}) if LOYALTY_SERIALIZERS_AVAILABLE else None
        
        # Debug: logger le nombre de transactions
        loyalty_count = len(loyalty_serializer.data) if loyalty_serializer else 0
        logger.info(f"Customer {customer.id}: Credit transactions: {len(credit_serializer.data)}, Loyalty transactions: {loyalty_count}")
        
        # Fusionner et trier par date (plus récent en premier)
        all_transactions = []
        
        # Ajouter les transactions de crédit avec un type
        for transaction in credit_serializer.data:
            transaction_date = transaction.get('transaction_date', '')
            all_transactions.append({
                **transaction,
                'transaction_type': 'credit',
                'date': transaction_date
            })
        
        # Ajouter les transactions de fidélité avec un type
        if loyalty_serializer:
            for transaction in loyalty_serializer.data:
                transaction_date = transaction.get('transaction_date', '')
                logger.info(f"Adding loyalty transaction: {transaction.get('id')}, type: {transaction.get('type')}, date: {transaction_date}")
                all_transactions.append({
                    **transaction,
                    'transaction_type': 'loyalty',
                    'type_loyalty': transaction.get('type', 'earned'),
                    'date': transaction_date,
                    'formatted_balance_after_loyalty': transaction.get('formatted_balance_after', '')
                })
        
        loyalty_count = len(loyalty_serializer.data) if loyalty_serializer else 0
        logger.info(f"Total transactions after merge: {len(all_transactions)} (Credit: {len(credit_serializer.data)}, Loyalty: {loyalty_count})")
        
        # Trier par date décroissante en utilisant les objets datetime directement
        from datetime import datetime
        from django.utils.dateparse import parse_datetime
        
        def get_sort_datetime(transaction):
            """Récupère la date de transaction comme datetime pour le tri"""
            date_str = transaction.get('transaction_date', '') or transaction.get('date', '')
            if not date_str:
                return datetime.min
            
            # Essayer de parser la date
            try:
                # Si c'est déjà un datetime, le retourner
                if isinstance(date_str, datetime):
                    return date_str
                
                # Parser depuis ISO format avec parse_datetime de Django
                parsed = parse_datetime(str(date_str))
                if parsed:
                    return parsed
                
                # Essayer avec fromisoformat
                if 'T' in str(date_str):
                    date_str_clean = str(date_str).replace('Z', '+00:00')
                    return datetime.fromisoformat(date_str_clean)
            except (ValueError, AttributeError, TypeError) as e:
                logger.warning(f"Erreur de parsing de date: {date_str}, erreur: {e}")
                return datetime.min
            
            return datetime.min
        
        # Trier par date décroissante (si le tri échoue, garder l'ordre original)
        try:
            all_transactions.sort(key=get_sort_datetime, reverse=True)
        except Exception as e:
            logger.warning(f"Erreur lors du tri des transactions: {e}")
            # En cas d'erreur, garder l'ordre : crédit d'abord, puis fidélité
            pass
        
        # Limiter le nombre total
        all_transactions = all_transactions[:limit]
        
        return Response({
            'customer': CustomerSerializer(customer, context={'request': request}).data,
            'transactions': all_transactions,
            'credit_count': customer.credit_transactions.count(),
            'loyalty_count': customer.loyalty_transactions.count() if customer.is_loyalty_member else 0
        })
    
    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        """Enregistrer un paiement pour un client"""
        customer = self.get_object()
        amount = request.data.get('amount')
        notes = request.data.get('notes', '')
        
        if not amount:
            return Response({'error': 'Le montant est requis'}, status=400)
        
        try:
            from decimal import Decimal
            amount = Decimal(str(amount))
            if amount <= 0:
                return Response({'error': 'Le montant doit être positif'}, status=400)
        except (ValueError, TypeError):
            return Response({'error': 'Montant invalide'}, status=400)
        
        user_site = getattr(request.user, 'site_configuration', None)
        
        try:
            transaction = CreditService.add_payment(
                customer=customer,
                amount=amount,
                user=request.user,
                site_configuration=user_site,
                notes=notes
            )
            
            # Retourner le client mis à jour
            customer.refresh_from_db()
            serializer = CustomerSerializer(customer, context={'request': request})
            
            return Response({
                'success': True,
                'message': f'Paiement de {amount} FCFA enregistré',
                'customer': serializer.data,
                'transaction': CreditTransactionSerializer(transaction, context={'request': request}).data
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    @action(detail=False, methods=['get'])
    def with_debt(self, request):
        """Récupérer les clients ayant une dette"""
        user_site = getattr(request.user, 'site_configuration', None)
        customers = CreditService.get_customers_with_debt(user_site)
        serializer = CustomerSerializer(customers, many=True, context={'request': request})
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Supprimer un client avec vérification des relations"""
        customer = self.get_object()
        
        # Vérifier les ventes associées
        from apps.sales.models import Sale
        sales_count = Sale.objects.filter(customer=customer).count()
        
        # Vérifier les commandes associées
        from apps.inventory.models import Order
        orders_count = Order.objects.filter(customer=customer).count()
        
        # Vérifier les transactions de crédit
        credit_transactions_count = customer.credit_transactions.count()
        
        # Vérifier les transactions de fidélité
        if LOYALTY_APP_AVAILABLE:
            from apps.loyalty.models import LoyaltyTransaction
            loyalty_transactions_count = LoyaltyTransaction.objects.filter(customer=customer).count()
        else:
            loyalty_transactions_count = 0
        
        # Si le client a des ventes ou commandes, on ne peut pas le supprimer
        if sales_count > 0 or orders_count > 0:
            error_message = "Impossible de supprimer ce client car il est associé à "
            errors = []
            if sales_count > 0:
                errors.append(f"{sales_count} vente(s)")
            if orders_count > 0:
                errors.append(f"{orders_count} commande(s)")
            
            return Response(
                {
                    'error': error_message + " et ".join(errors) + ".",
                    'sales_count': sales_count,
                    'orders_count': orders_count,
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Si le client a des transactions de crédit ou fidélité, on les supprime automatiquement
        # (grâce à CASCADE dans les modèles)
        # Mais on peut informer l'utilisateur
        if credit_transactions_count > 0 or loyalty_transactions_count > 0:
            # Les transactions seront supprimées automatiquement grâce à CASCADE
            pass
        
        # Supprimer le client
        customer.delete()
        
        return Response(
            {
                'success': True,
                'message': 'Client supprimé avec succès',
                'deleted_transactions': {
                    'credit': credit_transactions_count,
                    'loyalty': loyalty_transactions_count,
                }
            },
            status=status.HTTP_200_OK
        )


class CreditTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet en lecture seule pour les transactions de crédit"""
    serializer_class = CreditTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'customer']
    search_fields = ['customer__name', 'customer__first_name', 'notes']
    ordering_fields = ['transaction_date', 'amount']
    ordering = ['-transaction_date']
    
    def get_queryset(self):
        """Filtrer les transactions par site de l'utilisateur"""
        user_site = getattr(self.request.user, 'site_configuration', None)
        
        if self.request.user.is_superuser:
            # Superuser voit tout
            return CreditTransaction.objects.select_related('customer', 'sale', 'user').all()
        else:
            # Utilisateur normal voit seulement son site
            if not user_site:
                return CreditTransaction.objects.none()
            return CreditTransaction.objects.filter(
                site_configuration=user_site
            ).select_related('customer', 'sale', 'user')


class CategoryRecommendationAPIView(APIView):
    """
    Vue API pour recommander des catégories basées sur le nom du produit
    Utilise l'IA (sentence-transformers) pour améliorer les recommandations
    Priorise les sous-catégories (level 1) par rapport aux rayons (level 0)
    """
    permission_classes = [IsAuthenticated]
    
    # Modèle IA local (gratuit, pas de clé API requise)
    _model = None
    _model_loaded = False
    
    @classmethod
    def get_model(cls):
        """Charge le modèle IA une seule fois (lazy loading)"""
        if not cls._model_loaded:
            try:
                from sentence_transformers import SentenceTransformer
                # Modèle multilingue léger et rapide
                cls._model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
                cls._model_loaded = True
                logger.info('✅ Modèle IA sentence-transformers chargé avec succès')
            except ImportError:
                logger.warning('⚠️ sentence-transformers non installé, utilisation du fallback')
                cls._model = None
                cls._model_loaded = True
            except Exception as e:
                logger.warning(f'⚠️ Erreur lors du chargement du modèle IA: {str(e)}, utilisation du fallback')
                cls._model = None
                cls._model_loaded = True
        return cls._model
    
    def get_semantic_embedding(self, text):
        """
        Obtient un embedding sémantique du texte via sentence-transformers (local)
        Retourne None en cas d'erreur pour utiliser le fallback
        """
        try:
            if not text or len(text) < 2:
                return None
            
            model = self.get_model()
            if model:
                # Générer l'embedding localement (rapide et gratuit)
                embedding = model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
                return embedding.tolist()  # Convertir en liste pour JSON
            
            # Fallback : API Hugging Face si le modèle local n'est pas disponible
            HF_API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
            try:
                response = requests.post(
                    HF_API_URL,
                    headers={"Content-Type": "application/json"},
                    json={"inputs": text},
                    timeout=3
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list) and len(data) > 0:
                        return data[0] if isinstance(data[0], list) else data
            except:
                pass  # Fallback silencieux
            
            return None
        except Exception as e:
            logger.debug(f'⚠️ Erreur embedding IA (fallback utilisé): {str(e)}')
            return None
    
    def cosine_similarity(self, vec1, vec2):
        """Calcule la similarité cosinus entre deux vecteurs (0.0 à 1.0)"""
        try:
            if not vec1 or not vec2:
                return 0.0
            
            # Convertir en listes si nécessaire
            if hasattr(vec1, 'tolist'):
                vec1 = vec1.tolist()
            if hasattr(vec2, 'tolist'):
                vec2 = vec2.tolist()
            
            if len(vec1) != len(vec2):
                return 0.0
            
            # Calcul de la similarité cosinus
            dot_product = sum(a * b for a, b in zip(vec1, vec2))
            magnitude1 = math.sqrt(sum(a * a for a in vec1))
            magnitude2 = math.sqrt(sum(a * a for a in vec2))
            
            if magnitude1 == 0 or magnitude2 == 0:
                return 0.0
            
            similarity = dot_product / (magnitude1 * magnitude2)
            # S'assurer que le résultat est entre 0 et 1
            return max(0.0, min(1.0, similarity))
        except Exception as e:
            logger.debug(f'⚠️ Erreur calcul similarité cosinus: {str(e)}')
            return 0.0
    
    def normalize_text(self, text):
        """Normalise le texte pour le matching (lowercase, suppression accents)"""
        if not text:
            return ""
        # Convertir en minuscules
        text = text.lower()
        # Supprimer les accents
        text = unicodedata.normalize('NFD', text)
        text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
        return text.strip()
    
    def extract_keywords(self, product_name):
        """Extrait les mots-clés significatifs du nom du produit"""
        if not product_name:
            return []
        
        # Normaliser le texte
        normalized = self.normalize_text(product_name)
        
        # Liste des mots vides en français
        stop_words = {
            'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'des', 'et', 'ou', 'pour',
            'avec', 'sans', 'par', 'sur', 'dans', 'vers', 'à', 'au', 'aux', 'en', 'l',
            'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
            'notre', 'nos', 'votre', 'vos', 'leur', 'leurs', 'du', 'des'
        }
        
        # Mots-clés techniques importants (mapping vers catégories)
        tech_keywords = {
            'iphone': ['telephone', 'telephonie', 'high-tech', 'smartphone', 'hightech'],
            'smartphone': ['telephone', 'telephonie', 'high-tech', 'hightech'],
            'telephone': ['telephonie', 'high-tech', 'hightech'],
            'tablette': ['high-tech', 'hightech', 'ordinateur'],
            'ordinateur': ['high-tech', 'hightech', 'informatique'],
            'laptop': ['high-tech', 'hightech', 'ordinateur'],
            'pc': ['high-tech', 'hightech', 'ordinateur'],
            'console': ['high-tech', 'hightech', 'gaming', 'jeux'],
            'jeux': ['high-tech', 'hightech', 'gaming'],
            'gaming': ['high-tech', 'hightech', 'jeux'],
            'audio': ['high-tech', 'hightech', 'son'],
            'video': ['high-tech', 'hightech', 'image'],
            'ecouteurs': ['high-tech', 'hightech', 'audio'],
            'enceintes': ['high-tech', 'hightech', 'audio'],
            'tv': ['high-tech', 'hightech', 'television'],
            'television': ['high-tech', 'hightech', 'video'],
        }
        
        # Extraire les mots (minimum 3 caractères)
        words = re.findall(r'\b\w{3,}\b', normalized)
        
        # Filtrer les mots vides
        keywords = [w for w in words if w not in stop_words]
        
        # Ajouter les mots-clés techniques associés
        expanded_keywords = list(keywords)
        for keyword in keywords:
            if keyword in tech_keywords:
                expanded_keywords.extend(tech_keywords[keyword])
        
        # Retourner les mots-clés uniques
        return list(set(expanded_keywords))
    
    def calculate_match_score(self, keywords, category_name, category_level, frequency, rayon_type=None, product_name=None, product_embedding=None, category_embedding=None):
        """Calcule le score de correspondance pour une catégorie avec IA"""
        if not keywords or not category_name:
            return 0
        
        normalized_category = self.normalize_text(category_name)
        score = 0
        
        # Mots-clés très importants (correspondance exacte donne un score élevé)
        important_keywords = {
            'telephonie', 'telephone', 'smartphone', 'iphone', 'high-tech', 'hightech',
            'informatique', 'ordinateur', 'tablette', 'gaming', 'audio', 'video'
        }
        
        # Score basé sur la correspondance des mots-clés
        matched_keywords = []
        category_normalized_no_hyphen = normalized_category.replace('-', '').replace(' ', '')
        
        for keyword in keywords:
            keyword_normalized = keyword.replace('-', '')
            if keyword in normalized_category or keyword_normalized in category_normalized_no_hyphen:
                matched_keywords.append(keyword)
                base_score = len(keyword) * 2
                
                if keyword in important_keywords or keyword_normalized in ['hightech', 'telephonie', 'telephone']:
                    base_score *= 3
                
                if keyword == normalized_category or keyword_normalized == category_normalized_no_hyphen:
                    base_score += 20
                elif normalized_category.startswith(keyword) or category_normalized_no_hyphen.startswith(keyword_normalized):
                    base_score += 10
                
                score += base_score
        
        # BONUS IA : Utiliser les embeddings sémantiques si disponibles
        if product_embedding and category_embedding:
            semantic_similarity = self.cosine_similarity(product_embedding, category_embedding)
            # Convertir la similarité (0-1) en score (0-100)
            # Plus la similarité est élevée, plus le score est élevé
            semantic_bonus = semantic_similarity * 100  # Bonus IA peut ajouter jusqu'à 100 points
            score += semantic_bonus
            
            # Bonus supplémentaire pour les très bonnes correspondances sémantiques (>0.7)
            if semantic_similarity > 0.7:
                score += 50  # Bonus important pour correspondances très fortes
            elif semantic_similarity > 0.5:
                score += 25  # Bonus moyen pour correspondances bonnes
        
        # Bonus si plusieurs mots-clés correspondent
        if len(matched_keywords) > 1:
            score *= 1.5
        
        # Bonus pour les catégories avec rayon_type correspondant
        if rayon_type:
            rayon_keywords = {
                'high_tech': ['telephonie', 'telephone', 'smartphone', 'iphone', 'high-tech', 'hightech', 'informatique', 'ordinateur', 'tablette', 'gaming', 'audio', 'video'],
                'epicerie': ['epicerie', 'biscuit', 'biscuits', 'gateau', 'gateaux', 'patisserie', 'confiserie', 'bonbon', 'cereale', 'cereales', 'chocolat', 'sucre', 'pate', 'pates', 'riz', 'conserve', 'conserves', 'sauce', 'sauces', 'huile', 'huiles', 'vinaigre', 'farine', 'farines'],
                'petit_dejeuner': ['petit-dejeuner', 'biscuit', 'biscuits', 'gateau', 'gateaux', 'cereale', 'cereales', 'chocolat', 'sucre', 'confiture', 'miel', 'cafe', 'the', 'biscotte', 'tartine'],
                'liquides': ['liquides', 'eau', 'soda', 'sodas', 'jus', 'boisson', 'boissons', 'cafe', 'the'],
                'frais_libre_service': ['frais', 'libre', 'service', 'boucherie', 'charcuterie', 'poisson', 'fromage', 'laitier', 'laitiers', 'fruits', 'legumes', 'surgeles'],
                'rayons_traditionnels': ['traditionnel', 'traditionnels', 'boucherie', 'charcuterie', 'poissonnerie', 'fromagerie', 'boulangerie', 'patisserie'],
            }
            for rt, keywords_list in rayon_keywords.items():
                if rayon_type == rt:
                    for keyword in keywords:
                        if keyword in keywords_list:
                            score += 30
                            break
        
        # Bonus pour les sous-catégories (level 1)
        if category_level == 1 and score > 5:
            score *= 1.5
        
        # Ajouter la fréquence d'utilisation
        score += frequency * 0.5
        
        return score
    
    def get(self, request):
        """GET endpoint pour recommander des catégories"""
        product_name = request.query_params.get('product_name', '').strip()
        
        if not product_name or len(product_name) < 2:
            return Response({
                'success': False,
                'error': 'Le nom du produit doit contenir au moins 2 caractères',
                'recommendations': []
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Vérifier le cache (TTL de 5 minutes)
            cache_key = f'category_recommendations_{request.user.id}_{product_name.lower()}'
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info(f'✅ Recommandations servies depuis le cache pour: {product_name}')
                return Response(cached_result)
            
            # Obtenir le site de l'utilisateur
            user_site = getattr(request.user, 'site_configuration', None)
            
            # Utiliser le service centralisé pour obtenir les catégories accessibles
            categories_queryset = PermissionService.get_user_accessible_resources(request.user, Category)
            categories_queryset = categories_queryset.filter(is_active=True).select_related('parent')
            
            # Extraire les mots-clés du nom du produit
            keywords = self.extract_keywords(product_name)
            
            if not keywords:
                return Response({
                    'success': True,
                    'recommendations': [],
                    'message': 'Aucun mot-clé significatif trouvé dans le nom du produit'
                })
            
            # IA : Obtenir l'embedding sémantique du nom du produit (en background, non-bloquant)
            product_embedding = None
            try:
                product_embedding = self.get_semantic_embedding(product_name)
            except:
                pass  # Utiliser le fallback si l'IA échoue
            
            # PRIORITÉ 1 : Rechercher dans les sous-catégories (level 1)
            subcategories = categories_queryset.filter(level=1).select_related('parent')
            
            # Rechercher les produits similaires pour calculer la fréquence
            products_queryset = PermissionService.get_user_accessible_resources(request.user, Product)
            products_queryset = products_queryset.filter(is_active=True)
            
            # Produits avec des noms similaires
            similar_query = Q(name__icontains=product_name[:5])  # Premiers caractères
            if keywords:
                similar_query |= Q(name__icontains=keywords[0])  # Premier mot-clé
            
            similar_products = products_queryset.filter(similar_query)[:20].select_related('category')
            
            # Calculer la fréquence d'utilisation des catégories
            category_frequency = {}
            for product in similar_products:
                if product.category:
                    cat_id = product.category.id
                    category_frequency[cat_id] = category_frequency.get(cat_id, 0) + 1
            
            # Calculer les scores pour les sous-catégories avec IA
            subcategory_scores = []
            for subcat in subcategories:
                frequency = category_frequency.get(subcat.id, 0)
                parent_rayon_type = subcat.parent.rayon_type if subcat.parent else None
                
                # IA : Obtenir l'embedding de la catégorie (en cache si possible)
                category_embedding = None
                if product_embedding:
                    try:
                        cache_key_embedding = f'category_embedding_{subcat.id}'
                        category_embedding = cache.get(cache_key_embedding)
                        if not category_embedding:
                            category_embedding = self.get_semantic_embedding(subcat.name)
                            if category_embedding:
                                cache.set(cache_key_embedding, category_embedding, 3600)  # Cache 1h
                    except:
                        pass
                
                score = self.calculate_match_score(
                    keywords, subcat.name, subcat.level, frequency, parent_rayon_type,
                    product_name, product_embedding, category_embedding
                )
                
                if score > 0:
                    subcategory_scores.append({
                        'category': subcat,
                        'score': score,
                        'frequency': frequency
                    })
            
            # TRIER par score décroissant
            subcategory_scores.sort(key=lambda x: x['score'], reverse=True)
            
            # PRIORITÉ 2 : Si aucune sous-catégorie pertinente, rechercher dans les rayons (level 0)
            rayons = categories_queryset.filter(level=0, is_rayon=True)
            
            rayon_scores = []
            for rayon in rayons:
                frequency = category_frequency.get(rayon.id, 0)
                
                # IA : Obtenir l'embedding de la catégorie (en cache si possible)
                category_embedding = None
                if product_embedding:
                    try:
                        cache_key_embedding = f'category_embedding_{rayon.id}'
                        category_embedding = cache.get(cache_key_embedding)
                        if not category_embedding:
                            category_embedding = self.get_semantic_embedding(rayon.name)
                            if category_embedding:
                                cache.set(cache_key_embedding, category_embedding, 3600)  # Cache 1h
                    except:
                        pass
                
                score = self.calculate_match_score(
                    keywords, rayon.name, rayon.level, frequency, rayon.rayon_type,
                    product_name, product_embedding, category_embedding
                )
                
                if score > 0:
                    rayon_scores.append({
                        'category': rayon,
                        'score': score,
                        'frequency': frequency
                    })
            
            rayon_scores.sort(key=lambda x: x['score'], reverse=True)
            
            # Combiner les recommandations (sous-catégories en premier, puis rayons)
            recommendations = []
            
            # Ajouter les sous-catégories (top 5)
            for item in subcategory_scores[:5]:
                cat = item['category']
                recommendations.append({
                    'id': cat.id,
                    'name': cat.name,
                    'level': cat.level,
                    'is_rayon': cat.is_rayon,
                    'rayon_type': cat.rayon_type,
                    'parent': {
                        'id': cat.parent.id,
                        'name': cat.parent.name,
                        'rayon_type': cat.parent.rayon_type
                    } if cat.parent else None,
                    'score': item['score'],
                    'frequency': item['frequency']
                })
            
            # Si moins de 5 sous-catégories, ajouter des rayons (max 5 total)
            remaining_slots = max(0, 5 - len(recommendations))
            if remaining_slots > 0:
                for item in rayon_scores[:remaining_slots]:
                    cat = item['category']
                    recommendations.append({
                        'id': cat.id,
                        'name': cat.name,
                        'level': cat.level,
                        'is_rayon': cat.is_rayon,
                        'rayon_type': cat.rayon_type,
                        'parent': None,
                        'score': item['score'],
                        'frequency': item['frequency']
                    })
            
            # Sérialiser avec CategorySerializer pour cohérence
            result = {
                'success': True,
                'recommendations': recommendations,
                'total': len(recommendations),
                'product_name': product_name
            }
            
            # Mettre en cache (TTL de 5 minutes = 300 secondes)
            cache.set(cache_key, result, 300)
            
            # Logger pour analyse
            logger.info(f'📊 Recommandations générées pour "{product_name}": {len(recommendations)} catégories')
            
            return Response(result)
            
        except Exception as e:
            logger.error(f'❌ Erreur lors de la génération des recommandations: {str(e)}', exc_info=True)
            return Response({
                'success': False,
                'error': 'Erreur lors de la génération des recommandations',
                'recommendations': []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LoyaltyProgramAPIView(APIView):
    """API pour gérer le programme de fidélité"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Récupérer la configuration du programme de fidélité du site"""
        try:
            user_site = getattr(request.user, 'site_configuration', None)
            
            if not user_site and not request.user.is_superuser:
                return Response({
                    'success': False,
                    'error': 'Aucun site configuré pour cet utilisateur'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Si superuser, on peut passer un site_id en paramètre
            if request.user.is_superuser:
                site_id = request.query_params.get('site_configuration')
                if site_id:
                    try:
                        from apps.core.models import Configuration
                        user_site = Configuration.objects.get(id=int(site_id))
                    except (ValueError, Configuration.DoesNotExist):
                        pass
            
            if not user_site:
                return Response({
                    'success': False,
                    'error': 'Aucun site configuré'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Récupérer ou créer le programme
            program = LoyaltyService.get_program(user_site)
            serializer = LoyaltyProgramSerializer(program, context={'request': request})
            
            return Response({
                'success': True,
                'program': serializer.data
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request):
        """Mettre à jour la configuration du programme de fidélité"""
        try:
            user_site = getattr(request.user, 'site_configuration', None)
            
            if not user_site and not request.user.is_superuser:
                return Response({
                    'success': False,
                    'error': 'Aucun site configuré pour cet utilisateur'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Si superuser, on peut passer un site_id en paramètre
            if request.user.is_superuser:
                site_id = request.data.get('site_configuration')
                if site_id:
                    try:
                        from apps.core.models import Configuration
                        user_site = Configuration.objects.get(id=int(site_id))
                    except (ValueError, Configuration.DoesNotExist):
                        pass
            
            if not user_site:
                return Response({
                    'success': False,
                    'error': 'Aucun site configuré'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Récupérer ou créer le programme
            program = LoyaltyService.get_program(user_site)
            serializer = LoyaltyProgramSerializer(program, data=request.data, partial=True, context={'request': request})
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'success': True,
                    'program': serializer.data,
                    'message': 'Programme de fidélité mis à jour avec succès'
                })
            else:
                return Response({
                    'success': False,
                    'error': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LoyaltyAccountAPIView(APIView):
    """API pour gérer les comptes de fidélité"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Récupérer un compte de fidélité par numéro de téléphone"""
        try:
            phone = request.query_params.get('phone')
            
            if not phone:
                return Response({
                    'success': False,
                    'error': 'Le numéro de téléphone est requis'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user_site = getattr(request.user, 'site_configuration', None)
            
            if not user_site and not request.user.is_superuser:
                return Response({
                    'success': False,
                    'error': 'Aucun site configuré pour cet utilisateur'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Si superuser, on peut passer un site_id en paramètre
            if request.user.is_superuser:
                site_id = request.query_params.get('site_configuration')
                if site_id:
                    try:
                        from apps.core.models import Configuration
                        user_site = Configuration.objects.get(id=int(site_id))
                    except (ValueError, Configuration.DoesNotExist):
                        pass
            
            if not user_site:
                return Response({
                    'success': False,
                    'error': 'Aucun site configuré'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Rechercher le client
            customer = LoyaltyService.get_customer_by_phone(phone, user_site)
            
            if not customer:
                return Response({
                    'success': True,
                    'customer': None,
                    'message': 'Aucun compte trouvé pour ce numéro'
                })
            
            serializer = CustomerSerializer(customer, context={'request': request})
            
            return Response({
                'success': True,
                'customer': serializer.data
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Créer un nouveau compte de fidélité (inscription rapide)"""
        try:
            serializer = LoyaltyAccountCreateSerializer(data=request.data)
            
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'error': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            phone = serializer.validated_data['phone']
            name = serializer.validated_data['name']
            first_name = serializer.validated_data.get('first_name', '')
            
            user_site = getattr(request.user, 'site_configuration', None)
            
            if not user_site and not request.user.is_superuser:
                return Response({
                    'success': False,
                    'error': 'Aucun site configuré pour cet utilisateur'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Si superuser, on peut passer un site_id en paramètre
            if request.user.is_superuser:
                site_id = request.data.get('site_configuration')
                if site_id:
                    try:
                        from apps.core.models import Configuration
                        user_site = Configuration.objects.get(id=int(site_id))
                    except (ValueError, Configuration.DoesNotExist):
                        pass
            
            if not user_site:
                return Response({
                    'success': False,
                    'error': 'Aucun site configuré'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Créer ou récupérer le compte de fidélité
            customer = LoyaltyService.get_or_create_loyalty_account(phone, name, first_name, user_site)
            
            if not customer:
                return Response({
                    'success': False,
                    'error': 'Impossible de créer le compte de fidélité'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            customer_serializer = CustomerSerializer(customer, context={'request': request})
            
            return Response({
                'success': True,
                'customer': customer_serializer.data,
                'message': 'Compte de fidélité créé avec succès' if customer.is_loyalty_member else 'Client existant récupéré'
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LoyaltyPointsAPIView(APIView):
    """API pour calculer les points et leur valeur"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Calculer les points gagnés ou la valeur en FCFA de points"""
        try:
            serializer = LoyaltyPointsCalculateSerializer(data=request.data)
            
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'error': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user_site = getattr(request.user, 'site_configuration', None)
            
            if not user_site and not request.user.is_superuser:
                return Response({
                    'success': False,
                    'error': 'Aucun site configuré pour cet utilisateur'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Si superuser, on peut passer un site_id en paramètre
            if request.user.is_superuser:
                site_id = request.data.get('site_configuration')
                if site_id:
                    try:
                        from apps.core.models import Configuration
                        user_site = Configuration.objects.get(id=int(site_id))
                    except (ValueError, Configuration.DoesNotExist):
                        pass
            
            if not user_site:
                return Response({
                    'success': False,
                    'error': 'Aucun site configuré'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            amount = serializer.validated_data.get('amount')
            points = serializer.validated_data.get('points')
            
            if amount:
                # Calculer les points gagnés pour un montant
                points_earned = LoyaltyService.calculate_points_earned(amount, user_site)
                return Response({
                    'success': True,
                    'amount': float(amount),
                    'points_earned': float(points_earned),
                    'message': f'Pour {amount} FCFA, vous gagnez {points_earned} points'
                })
            elif points:
                # Calculer la valeur en FCFA de points
                value = LoyaltyService.calculate_points_value(points, user_site)
                return Response({
                    'success': True,
                    'points': float(points),
                    'value_fcfa': float(value),
                    'message': f'{points} points équivalent à {value} FCFA'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Vous devez fournir soit un montant (amount) soit des points (points)'
                }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
