from rest_framework import viewsets, status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, F
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from apps.core.forms import CustomUserUpdateForm, PublicSignUpForm
from apps.core.models import User, Configuration, Parametre, Activite
from apps.core.views import PublicSignUpView
from apps.core.services import (
    PermissionService, UserInfoService,
    can_user_manage_brand_quick, can_user_create_brand_quick, can_user_delete_brand_quick,
    can_user_manage_category_quick, can_user_create_category_quick, can_user_delete_category_quick
)
from django.db import transaction

from .serializers import (
    ProductSerializer, ProductListSerializer, CategorySerializer, BrandSerializer,
    TransactionSerializer, SaleSerializer, BarcodeSerializer,
    CustomerSerializer, CreditTransactionSerializer,
    LabelTemplateSerializer, LabelBatchSerializer, UserSerializer,
    LoginSerializer, RefreshTokenSerializer, ProductScanSerializer,
    StockUpdateSerializer, SaleCreateSerializer, LabelBatchCreateSerializer
)
from apps.inventory.models import Product, Category, Brand, Transaction, LabelTemplate, LabelBatch, LabelItem, Barcode, Customer
from apps.inventory.utils import generate_ean13_from_cug
from apps.sales.models import Sale, SaleItem, CreditTransaction
from apps.sales.services import CreditService
from apps.core.views import ConfigurationUpdateView, ParametreListView, ParametreUpdateView
from django.http import JsonResponse
from django.core.files.base import ContentFile
import os
import json
from django.http import Http404
from apps.inventory.printing.pdf import render_label_batch_pdf
from apps.inventory.printing.tsc import render_label_batch_tsc
from django.shortcuts import get_object_or_404
from django.core.management import call_command
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser


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
            
        except Exception as e:
            print(f"⚠️  Erreur lors du logging de création: {e}")
        
        return super().create(request, *args, **kwargs)

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
        
        # Récupérer les transactions pour ce produit (plus récentes d'abord)
        transactions = (
            Transaction.objects
            .filter(product=product)
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
            })
        
        return Response({
            'product_id': product.id,
            'product_name': product.name,
            'current_stock': product.quantity,
            'movements': movements,
        })

    @action(detail=True, methods=['post'])
    def add_stock(self, request, pk=None):
        """Ajouter du stock à un produit"""
        product = self.get_object()
        quantity = request.data.get('quantity')
        notes = request.data.get('notes', 'Ajout de stock')
        
        if not quantity or quantity <= 0:
            return Response(
                {'error': 'La quantité doit être positive'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mettre à jour le stock
        old_quantity = product.quantity
        product.quantity += quantity
        product.save()
        
        # Créer la transaction
        Transaction.objects.create(
            product=product,
            type='in',
            quantity=quantity,
            unit_price=product.purchase_price,
            notes=notes,
            user=request.user
        )
        
        return Response({
            'success': True,
            'message': f'{quantity} unités ajoutées au stock',
            'old_quantity': old_quantity,
            'new_quantity': product.quantity,
            'product': ProductSerializer(product).data
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
        
        # Mettre à jour le stock
        old_quantity = product.quantity
        product.quantity -= quantity
        product.save()
        
        # Déterminer le type de transaction selon le stock final
        transaction_type = 'out'
        if product.quantity < 0:
            transaction_type = 'backorder'  # Nouveau type pour les backorders
        
        # Créer la transaction
        Transaction.objects.create(
            product=product,
            type=transaction_type,
            quantity=quantity,
            unit_price=product.purchase_price,
            notes=notes,
            user=request.user
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
            'product': ProductSerializer(product).data
        })

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        """Ajuster le stock d'un produit (correction)"""
        product = self.get_object()
        try:
            new_quantity = int(request.data.get('quantity'))
        except (TypeError, ValueError):
            return Response({'error': 'Quantité invalide'}, status=status.HTTP_400_BAD_REQUEST)
        notes = request.data.get('notes', 'Ajustement de stock')
        
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
                notes=notes,
                user=request.user
            )
        
        return Response({
            'success': True,
            'message': f'Stock ajusté de {old_quantity} à {new_quantity}',
            'old_quantity': old_quantity,
            'new_quantity': product.quantity,
            'product': ProductSerializer(product).data
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
    filterset_fields = ['type', 'product', 'user']
    search_fields = ['product__name', 'product__cug', 'notes']
    ordering_fields = ['transaction_date', 'quantity']
    ordering = ['-transaction_date']
    
    def get_queryset(self):
        """Filtrer les transactions par site de l'utilisateur"""
        user_site = self.request.user.site_configuration
        
        if self.request.user.is_superuser:
            # Superuser voit tout
            return Transaction.objects.select_related('product', 'user').all()
        else:
            # Utilisateur normal voit seulement son site
            if not user_site:
                return Transaction.objects.none()
            return Transaction.objects.filter(
                product__site_configuration=user_site
            ).select_related('product', 'user')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SaleViewSet(viewsets.ModelViewSet):
    """ViewSet pour les ventes"""
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'payment_method', 'customer']
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
        
        if self.request.user.is_superuser:
            # Superuser voit tout
            return Sale.objects.select_related('customer').prefetch_related('items').all()
        else:
            # Utilisateur normal voit seulement son site
            if not user_site:
                return Sale.objects.none()
            return Sale.objects.filter(
                site_configuration=user_site
            ).select_related('customer').prefetch_related('items')
    
    def perform_create(self, serializer):
        """Créer une vente avec gestion automatique du stock"""
        user_site = getattr(self.request.user, 'site_configuration', None)
        
        if not user_site and not self.request.user.is_superuser:
            raise ValidationError({"detail": "Aucun site configuré pour cet utilisateur"})
        
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
                    
                    # Mettre à jour le stock (peut devenir négatif)
                    old_quantity = product.quantity
                    product.quantity -= quantity
                    product.save()
                    
                    # Déterminer le type de transaction selon le stock final
                    if product.quantity < 0:
                        transaction_type = 'backorder'  # Nouveau type pour les backorders
                        notes = f'Vente #{sale.id} - Stock en backorder ({abs(product.quantity)} unités en attente)'
                    else:
                        transaction_type = 'out'
                        notes = f'Vente #{sale.id}'
                    
                    # Créer une transaction de sortie
                    Transaction.objects.create(
                        product=product,
                        type=transaction_type,
                        quantity=quantity,
                        unit_price=unit_price,
                        notes=notes,
                        user=self.request.user
                    )
                    
                    total_amount += quantity * unit_price
                    
                except Product.DoesNotExist:
                    raise ValidationError({
                        "detail": f"Produit avec l'ID {product_id} non trouvé"
                    })
        
        # Mettre à jour le montant total de la vente
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
                    pass  # Garder les valeurs par défaut
        
        elif payment_method == 'sarali':
            # Paiement Sarali - valider la référence
            sarali_reference = self.request.data.get('sarali_reference')
            if sarali_reference:
                if CreditService.validate_sarali_reference(sarali_reference):
                    sale.sarali_reference = sarali_reference
                    sale.amount_paid = total_amount
                    sale.payment_status = 'paid'
                else:
                    raise ValidationError({
                        "sarali_reference": "Format de référence Sarali invalide"
                    })
            else:
                raise ValidationError({
                    "sarali_reference": "Référence Sarali requise pour ce mode de paiement"
                })
        
        elif payment_method == 'credit':
            # Paiement à crédit - vérifier le client et créer la transaction
            if not sale.customer:
                raise ValidationError({
                    "customer": "Un client est requis pour les ventes à crédit"
                })
            
            # Vérifier que le client est actif
            if not sale.customer.is_active:
                raise ValidationError({
                    "customer": "Ce client n'est pas actif pour les ventes à crédit"
                })
            
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
        
        sale.save()
        
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
            
            # Statistiques de base
            stats = {
                'total_products': products.count(),
                'low_stock_count': products.filter(
                    quantity__gt=0,
                    quantity__lte=F('alert_threshold')
                ).count(),
                'out_of_stock_count': products.filter(quantity=0).count(),
                'total_stock_value': products.aggregate(
                    total=Sum(F('quantity') * F('purchase_price'))
                )['total'] or 0,
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
    """API pour récupérer la liste des sites (pour les superusers)"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Récupérer la liste des sites"""
        try:
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
                        devise="€",
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
                        devise="€",
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
        user_site = request.user.site_configuration
        if not user_site and not request.user.is_superuser:
            raise ValidationError({"detail": "Aucun site configuré pour cet utilisateur"})

        data = LabelBatchCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        payload = data.validated_data

        template = None
        if payload.get('template_id'):
            template = LabelTemplate.objects.filter(id=payload['template_id']).first()
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

        # Créer les items
        position = 0
        total_copies = 0
        from apps.inventory.models import Product
        for item in payload['items']:
            product = Product.objects.get(id=item['product_id'])
            copies = item.get('copies', 1)
            barcode_value = item.get('barcode_value') or ''
            LabelItem.objects.create(
                batch=batch,
                product=product,
                copies=copies,
                barcode_value=barcode_value,
                position=position,
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
        tsc_text, filename = render_label_batch_tsc(batch)
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
                primary_barcode = product.barcodes.filter(is_primary=True).first()
                if not primary_barcode:
                    primary_barcode = product.barcodes.first()
                
                # Utiliser l'EAN généré stocké (toujours disponible maintenant)
                barcode_ean = product.generated_ean
                
                label_data['products'].append({
                    'id': product.id,
                    'name': product.name,
                    'cug': product.cug,
                    'barcode_ean': barcode_ean,
                    'selling_price': product.selling_price,
                    'quantity': product.quantity,
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
                product_data = {
                    'id': product.id,
                    'name': product.name,
                    'cug': product.cug,
                    'generated_ean': product.generated_ean,
                    'category': product.category.name if product.category else None,
                    'brand': product.brand.name if product.brand else None,
                }
                
                if include_prices:
                    product_data['selling_price'] = product.selling_price
                
                if include_stock:
                    product_data['quantity'] = product.quantity
                
                if include_descriptions and product.description:
                    product_data['description'] = product.description
                
                if include_images and product.image:
                    product_data['image_url'] = product.image.url
                
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
                LabelItem.objects.create(
                    batch=label_batch,
                    product=product,
                    copies=copies,
                    barcode_value=product.generated_ean or product.cug,
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
            
            # Récupérer les produits du site principal (supposé être la première configuration créée)
            # Utiliser un ordering explicite pour éviter qu'un .first() non ordonné retourne le site courant
            main_site = Configuration.objects.order_by('id').first()
            
            if not main_site or main_site == current_site:
                return Response({'error': 'Aucun site principal disponible pour la copie'}, status=400)
            
            # Récupérer les produits du site principal
            main_products = Product.objects.filter(
                site_configuration=main_site,
                is_active=True
            ).select_related('category', 'brand')
            
            # Filtrer les produits déjà copiés
            from apps.inventory.models import ProductCopy
            copied_products = ProductCopy.objects.filter(
                destination_site=current_site
            ).values_list('original_product_id', flat=True)
            
            available_products = main_products.exclude(id__in=copied_products)
            
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
            paginator = Paginator(available_products, 20)
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
                    'image_url': product.image.url if product.image else None,
                    'is_active': product.is_active,
                    'created_at': product.created_at.isoformat(),
                    'updated_at': product.updated_at.isoformat()
                })
            
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
            # Sélection explicite du site principal (plus ancien id)
            main_site = Configuration.objects.order_by('id').first()
            
            if not current_site or not main_site:
                return Response({'error': 'Configuration de site invalide'}, status=400)
            
            from apps.inventory.models import ProductCopy
            copied_count = 0
            errors = []
            
            for product_id in product_ids:
                try:
                    # Récupérer le produit original
                    original_product = Product.objects.get(
                        id=product_id,
                        site_configuration=main_site
                    )
                    
                    # Vérifier si déjà copié
                    if ProductCopy.objects.filter(
                        original_product=original_product,
                        destination_site=current_site
                    ).exists():
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
                    ProductCopy.objects.create(
                        original_product=original_product,
                        copied_product=copied_product,
                        source_site=main_site,
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
                                'image_url': request.build_absolute_uri(copied_product.image.url) if copied_product.image else None,
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
                        'image_url': request.build_absolute_uri(copy.original_product.image.url) if copy.original_product.image else None,
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
                        'image_url': request.build_absolute_uri(copy.copied_product.image.url) if copy.copied_product.image else None,
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
    filterset_fields = ['is_active']
    search_fields = ['name', 'first_name', 'phone', 'email']
    ordering_fields = ['name', 'credit_balance', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filtrer les clients par site de l'utilisateur"""
        user_site = getattr(self.request.user, 'site_configuration', None)
        
        if self.request.user.is_superuser:
            # Superuser voit tout
            return Customer.objects.all()
        else:
            # Utilisateur normal voit seulement son site
            if not user_site:
                return Customer.objects.none()
            return Customer.objects.filter(site_configuration=user_site)
    
    def perform_create(self, serializer):
        """Créer un client avec gestion du site"""
        user_site = getattr(self.request.user, 'site_configuration', None)
        
        if not user_site and not self.request.user.is_superuser:
            raise ValidationError({"detail": "Aucun site configuré pour cet utilisateur"})
        
        serializer.save(site_configuration=user_site)
    
    @action(detail=True, methods=['get'])
    def credit_history(self, request, pk=None):
        """Récupérer l'historique des transactions de crédit d'un client"""
        customer = self.get_object()
        limit = request.query_params.get('limit', 20)
        
        try:
            limit = int(limit)
        except ValueError:
            limit = 20
            
        transactions = CreditService.get_credit_history(customer, limit=limit)
        serializer = CreditTransactionSerializer(transactions, many=True, context={'request': request})
        
        return Response({
            'customer': CustomerSerializer(customer, context={'request': request}).data,
            'transactions': serializer.data,
            'total_count': customer.credit_transactions.count()
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
