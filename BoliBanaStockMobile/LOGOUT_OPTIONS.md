# 🔐 Options de Déconnexion Multi-Appareils

## 🎯 **Problème initial**

**Question** : Un utilisateur qui se déconnecte du mobile est-il aussi déconnecté du desktop ?

**Réponse initiale** : **NON** - Les sessions sont indépendantes.

## 🔧 **Solutions implémentées**

### ✅ **Option 1 : Déconnexion simple (actuelle)**
- **Mobile** : Déconnexion locale + invalidation du token
- **Desktop** : Session Django toujours active
- **Résultat** : Déconnexion partielle

### ✅ **Option 2 : Déconnexion avec invalidation de token**
- **Mobile** : Envoie le refresh token pour invalidation
- **Django** : Blackliste le token spécifique
- **Résultat** : Token mobile invalidé, desktop intact

### ✅ **Option 3 : Déconnexion forcée sur tous les appareils**
- **Mobile** : Appelle `/auth/logout-all/`
- **Django** : Blackliste TOUS les tokens de l'utilisateur
- **Résultat** : Déconnexion complète sur tous les appareils

## 🔄 **Flux de déconnexion amélioré**

### 📱 **Déconnexion simple (mobile uniquement)**
```typescript
// Service API
logout: async () => {
  const refreshToken = await AsyncStorage.getItem('refresh_token');
  await api.post('/auth/logout/', { refresh: refreshToken });
  await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
}
```

### 🚫 **Déconnexion forcée (tous appareils)**
```typescript
// Service API
logoutAllDevices: async () => {
  await api.post('/auth/logout-all/');
  await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
}
```

### 🛠️ **Côté Django**
```python
# Déconnexion simple
class LogoutView(APIView):
    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            RefreshToken(refresh_token).blacklist()

# Déconnexion forcée
class ForceLogoutAllView(APIView):
    def post(self, request):
        OutstandingToken.objects.filter(user=request.user).update(blacklisted=True)
```

## 🎯 **Recommandations d'usage**

### 🔐 **Déconnexion simple**
- **Quand** : Déconnexion normale du mobile
- **Effet** : Mobile déconnecté, desktop intact
- **Cas d'usage** : Changement d'appareil temporaire

### 🚫 **Déconnexion forcée**
- **Quand** : Sécurité renforcée, changement de mot de passe
- **Effet** : Tous les appareils déconnectés
- **Cas d'usage** : Perte d'appareil, suspicion de compromission

## 🧪 **Test des options**

### 1. **Test déconnexion simple**
```bash
# Mobile
curl -X POST http://192.168.1.7:8000/api/v1/auth/logout/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"refresh": "<refresh_token>"}'

# Résultat
✅ Token refresh invalidé pour: mobile
```

### 2. **Test déconnexion forcée**
```bash
# Mobile
curl -X POST http://192.168.1.7:8000/api/v1/auth/logout-all/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"

# Résultat
🚫 Force déconnexion tous appareils pour: mobile
✅ 3 tokens invalidés pour: mobile
```

## 🔍 **Vérification côté desktop**

### **Avant déconnexion forcée**
- ✅ Desktop connecté
- ✅ API calls fonctionnent
- ✅ Session active

### **Après déconnexion forcée**
- ❌ Desktop déconnecté
- ❌ API calls retournent 401
- ❌ Redirection vers login

## 🎯 **Interface utilisateur suggérée**

### 📱 **Mobile - Options de déconnexion**
```typescript
const handleLogout = () => {
  Alert.alert(
    'Déconnexion',
    'Choisissez le type de déconnexion :',
    [
      { text: 'Annuler', style: 'cancel' },
      { 
        text: 'Déconnexion mobile', 
        onPress: () => dispatch(logout()) 
      },
      { 
        text: 'Déconnexion tous appareils', 
        style: 'destructive',
        onPress: () => dispatch(logoutAllDevices()) 
      }
    ]
  );
};
```

## 🚀 **Résultat final**

**Maintenant, vous avez le choix !**

- ✅ **Déconnexion simple** : Mobile uniquement
- ✅ **Déconnexion forcée** : Tous les appareils
- ✅ **Sécurité renforcée** : Invalidation des tokens
- ✅ **Flexibilité** : Choix selon le contexte

**L'utilisateur peut maintenant contrôler sa déconnexion !** 🎯 