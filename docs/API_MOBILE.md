# API Mobile BoliBana Stock

## Base URL
```
http://localhost:8000/api/v1/
```

## Authentification

### Login
**POST** `/auth/login/`

**Body:**
```json
{
  "username": "votre_username",
  "password": "votre_password"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "first_name": "Admin",
    "last_name": "User",
    "is_active": true
  }
}
```

### Refresh Token
**POST** `/auth/refresh/`

**Body:**
```json
{
  "refresh": "votre_refresh_token"
}
```

**Response:**
```json
{
  "access_token": "nouveau_access_token"
}
```

## Produits

### Liste des produits
**GET** `/products/`

**Query Parameters:**
- `search`: Recherche par nom, CUG ou description
- `category`: Filtrer par catégorie
- `brand`: Filtrer par marque
- `is_active`: Filtrer par statut actif
- `ordering`: Tri (name, -name, price, -price, quantity, -quantity)
- `page`: Numéro de page

**Response:**
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/v1/products/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Produit Test",
      "cug": "12345",
      "quantity": 10,
      "alert_threshold": 5,
      "selling_price": "15000",
      "category_name": "Électronique",
      "brand_name": "Marque Test",
      "stock_status": "En stock",
      "is_active": true
    }
  ]
}
```

### Détail d'un produit
**GET** `/products/{id}/`

**Response:**
```json
{
  "id": 1,
  "name": "Produit Test",
  "slug": "produit-test",
  "cug": "12345",
  "description": "Description du produit",
  "purchase_price": "10000",
  "selling_price": "15000",
  "quantity": 10,
  "alert_threshold": 5,
  "category": {
    "id": 1,
    "name": "Électronique",
    "description": "Catégorie électronique"
  },
  "brand": {
    "id": 1,
    "name": "Marque Test",
    "description": "Marque de test"
  },
  "image": "http://localhost:8000/media/products/image.jpg",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "stock_status": "En stock",
  "formatted_purchase_price": "10 000 FCFA",
  "formatted_selling_price": "15 000 FCFA",
  "formatted_margin": "5 000 FCFA"
}
```

### Scanner un produit
**POST** `/products/scan/`

**Body:**
```json
{
  "code": "12345"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Produit Test",
  "cug": "12345",
  "quantity": 10,
  "selling_price": "15000",
  "stock_status": "En stock"
}
```

### Produits en stock faible
**GET** `/products/low_stock/`

### Produits en rupture
**GET** `/products/out_of_stock/`

### Mettre à jour le stock
**POST** `/products/{id}/update_stock/`

**Body:**
```json
{
  "quantity": 15,
  "notes": "Réapprovisionnement"
}
```

## Catégories

### Liste des catégories
**GET** `/categories/`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Électronique",
    "description": "Catégorie électronique",
    "slug": "electronique",
    "level": 0,
    "parent": null,
    "is_active": true
  }
]
```

## Marques

### Liste des marques
**GET** `/brands/`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Marque Test",
    "description": "Marque de test",
    "logo": "http://localhost:8000/media/brands/logo.jpg"
  }
]
```

## Transactions

### Liste des transactions
**GET** `/transactions/`

**Query Parameters:**
- `type`: Type de transaction (in, out, loss)
- `product`: ID du produit
- `user`: ID de l'utilisateur
- `start_date`: Date de début (YYYY-MM-DD)
- `end_date`: Date de fin (YYYY-MM-DD)

**Response:**
```json
{
  "count": 50,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "type": "in",
      "product": 1,
      "product_name": "Produit Test",
      "product_cug": "12345",
      "quantity": 10,
      "unit_price": "10000",
      "transaction_date": "2024-01-01T00:00:00Z",
      "notes": "Réapprovisionnement",
      "user": 1,
      "user_name": "admin"
    }
  ]
}
```

### Créer une transaction
**POST** `/transactions/`

**Body:**
```json
{
  "type": "in",
  "product": 1,
  "quantity": 10,
  "unit_price": "10000",
  "notes": "Réapprovisionnement"
}
```

## Ventes

### Liste des ventes
**GET** `/sales/`

**Response:**
```json
{
  "count": 25,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "date": "2024-01-01T00:00:00Z",
      "customer": 1,
      "customer_name": "Client Test",
      "total_amount": "15000",
      "payment_method": "cash",
      "status": "completed",
      "items": [
        {
          "id": 1,
          "sale": 1,
          "product": 1,
          "product_name": "Produit Test",
          "product_cug": "12345",
          "quantity": 1,
          "unit_price": "15000",
          "total_price": "15000"
        }
      ]
    }
  ]
}
```

## Tableau de bord

### Statistiques
**GET** `/dashboard/`

**Response:**
```json
{
  "stats": {
    "total_products": 100,
    "low_stock_count": 15,
    "out_of_stock_count": 5,
    "total_stock_value": 1500000
  },
  "recent_transactions": [
    {
      "id": 1,
      "type": "in",
      "product_name": "Produit Test",
      "quantity": 10,
      "transaction_date": "2024-01-01T00:00:00Z"
    }
  ],
  "recent_sales": [
    {
      "id": 1,
      "customer_name": "Client Test",
      "total_amount": "15000",
      "date": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## Codes d'erreur

### 400 - Bad Request
```json
{
  "error": "Données invalides",
  "details": {
    "field": ["Message d'erreur"]
  }
}
```

### 401 - Unauthorized
```json
{
  "error": "Token d'authentification invalide ou expiré"
}
```

### 403 - Forbidden
```json
{
  "error": "Vous n'avez pas les permissions nécessaires"
}
```

### 404 - Not Found
```json
{
  "error": "Ressource non trouvée"
}
```

### 500 - Internal Server Error
```json
{
  "error": "Erreur interne du serveur"
}
```

## Exemples d'utilisation

### JavaScript (Fetch)
```javascript
const API_BASE = 'http://localhost:8000/api/v1';

// Login
const login = async (username, password) => {
  const response = await fetch(`${API_BASE}/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
  return response.json();
};

// Récupérer les produits
const getProducts = async (token) => {
  const response = await fetch(`${API_BASE}/products/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
};
```

### Python (Requests)
```python
import requests

API_BASE = 'http://localhost:8000/api/v1'

# Login
def login(username, password):
    response = requests.post(f'{API_BASE}/auth/login/', json={
        'username': username,
        'password': password
    })
    return response.json()

# Récupérer les produits
def get_products(token):
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f'{API_BASE}/products/', headers=headers)
    return response.json()
```

## Sécurité

- Toutes les requêtes (sauf login) nécessitent un token JWT
- Les tokens expirent après 1 heure
- Utilisez le refresh token pour obtenir un nouveau token
- Stockez les tokens de manière sécurisée côté client

## Performance

- Pagination automatique (20 éléments par page)
- Filtrage et recherche optimisés
- Cache côté serveur pour les requêtes fréquentes
- Compression des réponses JSON 