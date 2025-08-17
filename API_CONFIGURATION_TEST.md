# 🧪 Test API Configuration

## 🎯 **Endpoints disponibles**

### 📋 **1. Récupérer la configuration**
```bash
GET /api/v1/configuration/
```

**Headers requis :**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Réponse attendue :**
```json
{
  "success": true,
  "configuration": {
    "id": 1,
    "nom_societe": "BoliBana Stock",
    "adresse": "Adresse de votre entreprise",
    "telephone": "+226 XX XX XX XX",
    "email": "contact@votreentreprise.com",
    "devise": "FCFA",
    "tva": 18.0,
    "site_web": null,
    "description": "Système de gestion de stock",
    "logo_url": null,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "message": "Configuration récupérée avec succès"
}
```

### ✏️ **2. Mettre à jour la configuration**
```bash
PUT /api/v1/configuration/
```

**Headers requis :**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body (exemple) :**
```json
{
  "nom_societe": "Ma Boutique",
  "adresse": "123 Rue du Commerce, Bamako",
  "telephone": "+223 20 21 22 23",
  "email": "contact@maboutique.ml",
  "devise": "FCFA",
  "tva": 18.0,
  "site_web": "https://maboutique.ml",
  "description": "Boutique de vente au détail"
}
```

**Réponse attendue :**
```json
{
  "success": true,
  "configuration": {
    "id": 1,
    "nom_societe": "Ma Boutique",
    "adresse": "123 Rue du Commerce, Bamako",
    "telephone": "+223 20 21 22 23",
    "email": "contact@maboutique.ml",
    "devise": "FCFA",
    "tva": 18.0,
    "site_web": "https://maboutique.ml",
    "description": "Boutique de vente au détail",
    "logo_url": null,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:35:00Z"
  },
  "message": "Configuration mise à jour avec succès"
}
```

### 🔄 **3. Réinitialiser la configuration**
```bash
POST /api/v1/configuration/reset/
```

**Headers requis :**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Réponse attendue :**
```json
{
  "success": true,
  "configuration": {
    "id": 1,
    "nom_societe": "BoliBana Stock",
    "adresse": "Adresse de votre entreprise",
    "telephone": "+226 XX XX XX XX",
    "email": "contact@votreentreprise.com",
    "devise": "FCFA",
    "tva": 18.0,
    "site_web": null,
    "description": "Système de gestion de stock",
    "logo_url": null,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:40:00Z"
  },
  "message": "Configuration réinitialisée avec succès"
}
```

### ⚙️ **4. Récupérer les paramètres**
```bash
GET /api/v1/parametres/
```

**Headers requis :**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Réponse attendue :**
```json
{
  "success": true,
  "parametres": [
    {
      "id": 1,
      "cle": "SITE_NAME",
      "valeur": "BoliBana Stock",
      "description": "Nom du site",
      "est_actif": true,
      "type_valeur": "string"
    }
  ],
  "count": 1,
  "message": "Paramètres récupérés avec succès"
}
```

### 🔧 **5. Mettre à jour un paramètre**
```bash
PUT /api/v1/parametres/
```

**Headers requis :**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body :**
```json
{
  "id": 1,
  "valeur": "Nouveau nom du site"
}
```

**Réponse attendue :**
```json
{
  "success": true,
  "parametre": {
    "id": 1,
    "cle": "SITE_NAME",
    "valeur": "Nouveau nom du site",
    "description": "Nom du site",
    "est_actif": true,
    "type_valeur": "string"
  },
  "message": "Paramètre SITE_NAME mis à jour avec succès"
}
```

## 🧪 **Tests avec cURL**

### **1. Test récupération configuration**
```bash
# Se connecter d'abord
curl -X POST http://192.168.1.7:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "mobile", "password": "12345678"}'

# Récupérer la configuration
curl -X GET http://192.168.1.7:8000/api/v1/configuration/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json"
```

### **2. Test mise à jour configuration**
```bash
curl -X PUT http://192.168.1.7:8000/api/v1/configuration/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nom_societe": "Test Boutique",
    "adresse": "Adresse de test",
    "telephone": "+223 99 99 99 99",
    "email": "test@boutique.ml"
  }'
```

### **3. Test réinitialisation**
```bash
curl -X POST http://192.168.1.7:8000/api/v1/configuration/reset/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json"
```

## 📱 **Test application mobile**

### **1. Accéder à la configuration**
1. Se connecter à l'application mobile
2. Aller sur le Dashboard
3. Appuyer sur le bouton "Configuration" (⚙️)
4. Vérifier que les données se chargent

### **2. Modifier la configuration**
1. Appuyer sur "Modifier"
2. Changer quelques champs
3. Appuyer sur "Sauvegarder"
4. Vérifier que les modifications sont sauvegardées

### **3. Réinitialiser la configuration**
1. Appuyer sur "Réinitialiser"
2. Confirmer l'action
3. Vérifier que les valeurs reviennent aux défauts

## 🔍 **Vérifications**

### ✅ **Côté serveur**
- Logs Django appropriés
- Configuration créée/modifiée en base
- Utilisateur enregistré dans `updated_by`

### ✅ **Côté mobile**
- Interface responsive
- Gestion des erreurs
- Feedback utilisateur
- Navigation fluide

## 🚨 **Cas d'erreur**

### **401 Unauthorized**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### **400 Bad Request**
```json
{
  "success": false,
  "error": "Données invalides",
  "details": {
    "email": ["Enter a valid email address."]
  }
}
```

### **500 Internal Server Error**
```json
{
  "success": false,
  "error": "Erreur lors de la récupération de la configuration",
  "details": "Description de l'erreur"
}
```

## 🎯 **Résultat attendu**

**L'API de configuration doit permettre :**
- ✅ Récupération de la configuration actuelle
- ✅ Mise à jour des informations de l'entreprise
- ✅ Réinitialisation aux valeurs par défaut
- ✅ Gestion des paramètres système
- ✅ Interface mobile fonctionnelle
- ✅ Gestion des erreurs appropriée 