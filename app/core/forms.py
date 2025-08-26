from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

User = get_user_model()

class PublicSignUpForm(UserCreationForm):
    """
    Formulaire simplifié pour l'inscription publique
    """
    # Champs de base uniquement
    username = forms.CharField(
        label=_('Nom d\'utilisateur'),
        max_length=150,
        help_text=_('Requis. 150 caractères maximum.'),
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
            'placeholder': 'nom.utilisateur'
        })
    )
    
    password1 = forms.CharField(
        label=_('Mot de passe'),
        widget=forms.PasswordInput(attrs={
            'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
            'placeholder': '••••••••'
        }),
        help_text=_('Votre mot de passe doit contenir au moins 8 caractères.')
    )
    
    password2 = forms.CharField(
        label=_('Confirmation du mot de passe'),
        widget=forms.PasswordInput(attrs={
            'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
            'placeholder': '••••••••'
        }),
        help_text=_('Entrez le même mot de passe que précédemment.')
    )
    
    # Informations personnelles minimales
    first_name = forms.CharField(
        label=_('Prénom'),
        max_length=30,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
            'placeholder': 'Prénom'
        })
    )
    
    last_name = forms.CharField(
        label=_('Nom'),
        max_length=30,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
            'placeholder': 'Nom'
        })
    )
    
    email = forms.EmailField(
        label=_('Adresse e-mail'),
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
            'placeholder': 'email@exemple.com'
        })
    )

    class Meta:
        model = User
        fields = ['username', 'password1', 'password2', 'first_name', 'last_name', 'email']

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email and User.objects.filter(email=email).exists():
            raise ValidationError(_('Cette adresse e-mail est déjà utilisée.'))
        return email

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if username and User.objects.filter(username=username).exists():
            raise ValidationError(_('Ce nom d\'utilisateur est déjà pris.'))
        return username

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.first_name = self.cleaned_data['first_name']
        user.last_name = self.cleaned_data['last_name']
        
        # Valeurs par défaut pour les champs optionnels
        # user.telephone = ''  # Champ supprimé
        # user.poste = ''      # Champ supprimé
        # user.adresse = ''    # Champ supprimé
        # user.est_actif = True  # Champ supprimé
        # Ne pas forcer is_staff et is_superuser ici, laisser la vue les définir
        # user.is_staff = False
        # user.is_superuser = False
        
        if commit:
            user.save()
            if hasattr(self, 'save_m2m'):
                self.save_m2m()
        return user


class CustomUserCreationForm(UserCreationForm):
    """
    Formulaire personnalisé pour la création d'utilisateur
    """
    # Champs de base
    username = forms.CharField(
        label=_('Nom d\'utilisateur'),
        max_length=150,
        help_text=_('Requis. 150 caractères maximum. Lettres, chiffres et @/./+/-/_ uniquement.'),
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
            'placeholder': 'nom.utilisateur'
        })
    )
    
    password1 = forms.CharField(
        label=_('Mot de passe'),
        widget=forms.PasswordInput(attrs={
            'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
            'placeholder': '••••••••'
        }),
        help_text=_('Votre mot de passe doit contenir au moins 8 caractères et ne peut pas être entièrement numérique.')
    )
    
    password2 = forms.CharField(
        label=_('Confirmation du mot de passe'),
        widget=forms.PasswordInput(attrs={
            'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
            'placeholder': '••••••••'
        }),
        help_text=_('Entrez le même mot de passe que précédemment, pour vérification.')
    )
    
    # Informations personnelles
    first_name = forms.CharField(
        label=_('Prénom'),
        max_length=30,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
            'placeholder': 'Prénom'
        })
    )
    
    last_name = forms.CharField(
        label=_('Nom'),
        max_length=30,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
            'placeholder': 'Nom'
        })
    )
    
    email = forms.EmailField(
        label=_('Adresse e-mail'),
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
            'placeholder': 'email@exemple.com'
        })
    )
    

    
    is_staff = forms.BooleanField(
        label=_('Accès à l\'administration'),
        required=False,
        initial=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'h-4 w-4 text-bolibana-600 focus:ring-bolibana-500 border-neutral-300 rounded'
        }),
        help_text=_('Permet d\'accéder à l\'interface d\'administration')
    )
    
    is_superuser = forms.BooleanField(
        label=_('Administrateur'),
        required=False,
        initial=False,
        widget=forms.CheckboxInput(attrs={
            'class': 'h-4 w-4 text-bolibana-600 focus:ring-bolibana-500 border-neutral-300 rounded'
        }),
        help_text=_('Accorde tous les droits d\'administration')
    )

    class Meta:
        model = User
        fields = [
            'username', 'password1', 'password2',
            'first_name', 'last_name', 'email',
            'is_staff', 'is_superuser'
        ]

    def __init__(self, *args, **kwargs):
        self.is_public_signup = kwargs.pop('is_public_signup', False)
        super().__init__(*args, **kwargs)
        
        # Personnaliser les labels et help_text
        self.fields['username'].label = _('Nom d\'utilisateur')
        self.fields['password1'].label = _('Mot de passe')
        self.fields['password2'].label = _('Confirmation du mot de passe')
        self.fields['first_name'].label = _('Prénom')
        self.fields['last_name'].label = _('Nom')
        self.fields['email'].label = _('Adresse e-mail')
        self.fields['is_staff'].label = _('Accès à l\'administration')
        self.fields['is_superuser'].label = _('Administrateur')

        # Pour l'inscription publique, masquer les champs de permissions avancées
        if self.is_public_signup:
            self.fields['is_staff'].widget = forms.HiddenInput()
            self.fields['is_superuser'].widget = forms.HiddenInput()
            self.fields['is_staff'].initial = False
            self.fields['is_superuser'].initial = False

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email and User.objects.filter(email=email).exists():
            raise ValidationError(_('Cette adresse e-mail est déjà utilisée.'))
        return email

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if username and User.objects.filter(username=username).exists():
            raise ValidationError(_('Ce nom d\'utilisateur est déjà pris.'))
        return username

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.first_name = self.cleaned_data['first_name']
        user.last_name = self.cleaned_data['last_name']
        # user.telephone = self.cleaned_data.get('telephone', '')  # Champ supprimé
        # user.poste = self.cleaned_data.get('poste', '')          # Champ supprimé
        # user.adresse = self.cleaned_data.get('adresse', '')      # Champ supprimé
        # user.est_actif = self.cleaned_data.get('est_actif', True)  # Champ supprimé
        user.is_staff = self.cleaned_data.get('is_staff', False)
        user.is_superuser = self.cleaned_data.get('is_superuser', False)
        
        if commit:
            user.save()
            if hasattr(self, 'save_m2m'):
                self.save_m2m()
        return user


class CustomUserUpdateForm(forms.ModelForm):
    """
    Formulaire personnalisé pour la modification d'utilisateur
    """
    class Meta:
        model = User
        fields = [
            'username', 'first_name', 'last_name', 'email',
            'is_staff', 'is_superuser'
        ]
        widgets = {
            'username': forms.TextInput(attrs={
                'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'placeholder': 'nom.utilisateur'
            }),
            'first_name': forms.TextInput(attrs={
                'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'placeholder': 'Prénom'
            }),
            'last_name': forms.TextInput(attrs={
                'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'placeholder': 'Nom'
            }),
            'email': forms.EmailInput(attrs={
                'class': 'block w-full rounded-md border-neutral-300 shadow-sm focus:border-bolibana-500 focus:ring-bolibana-500 sm:text-sm',
                'placeholder': 'email@exemple.com'
            }),
            'is_staff': forms.CheckboxInput(attrs={
                'class': 'h-4 w-4 text-bolibana-600 focus:ring-bolibana-500 border-neutral-300 rounded'
            }),
            'is_superuser': forms.CheckboxInput(attrs={
                'class': 'h-4 w-4 text-bolibana-600 focus:ring-bolibana-500 border-neutral-300 rounded'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Personnaliser les labels et help_text
        self.fields['username'].label = _('Nom d\'utilisateur')
        self.fields['first_name'].label = _('Prénom')
        self.fields['last_name'].label = _('Nom')
        self.fields['email'].label = _('Adresse e-mail')
        self.fields['is_staff'].label = _('Accès à l\'administration')
        self.fields['is_superuser'].label = _('Administrateur')
        
        # Help text pour les permissions
        self.fields['is_staff'].help_text = _('Permet d\'accéder à l\'interface d\'administration')
        self.fields['is_superuser'].help_text = _('Accorde tous les droits d\'administration')

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email and User.objects.filter(email=email).exclude(pk=self.instance.pk).exists():
            raise ValidationError(_('Cette adresse e-mail est déjà utilisée.'))
        return email

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if username and User.objects.filter(username=username).exclude(pk=self.instance.pk).exists():
            raise ValidationError(_('Ce nom d\'utilisateur est déjà pris.'))
        return username 