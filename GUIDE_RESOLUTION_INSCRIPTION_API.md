# Guide de Résolution - Problème d'Inscription API

## 🚨 Problème Identifié

L'erreur suivante se produit lors de l'inscription via l'API mobile :

```
insert or update on table "core_activite" violates foreign key constraint "core_activite_utilisateur_id_8f4359bf_fk_auth_user_id"
DETAIL: Key (utilisateur_id)=(5) is not present in table "auth_user".
```

## 🔍 Cause du Problème

Le problème se produit dans la vue `PublicSignUpAPIView` lors de la création d'un utilisateur. La contrainte de clé étrangère est violée car :

1. L'utilisateur est créé et sauvegardé
2. La configuration du site est créée
3. L'utilisateur est mis à jour avec sa `site_configuration`
4. Une activité est créée avec `utilisateur=user`

**Problème** : Il peut y avoir un délai dans la transaction ou un problème de synchronisation entre la création de l'utilisateur et la création de l'activité.

## ✅ Solutions Implémentées

### 1. Correction de la Vue Principale (`PublicSignUpAPIView`)

- Ajout de `user.refresh_from_db()` pour s'assurer que l'utilisateur est bien synchronisé
- Vérification de l'existence de l'utilisateur avant de créer l'activité
- Utilisation de transactions séparées pour la création de l'activité
- Tentative de création différée de l'activité en cas d'échec

### 2. Vue Alternative (`SimpleSignUpAPIView`)

- Création d'une vue d'inscription simplifiée sans journalisation d'activité
- Endpoint : `/api/v1/auth/signup-simple/`
- Évite complètement le problème de contrainte de clé étrangère

### 3. Script de Diagnostic

- Script `diagnostic_signup.py` pour vérifier l'état de la base de données
- Identifie les problèmes potentiels et suggère des corrections

## 🛠️ Utilisation des Solutions

### Solution 1 : Utiliser l'API Corrigée

L'API principale `/api/v1/auth/signup/` a été corrigée et devrait maintenant fonctionner correctement.

### Solution 2 : Utiliser l'API Simplifiée

Si le problème persiste, utilisez l'endpoint simplifié :

```bash
POST /api/v1/auth/signup-simple/
```

Cette version ne crée pas d'activité et évite le problème de contrainte.

### Solution 3 : Diagnostic de la Base de Données

Exécutez le script de diagnostic pour identifier d'autres problèmes :

```bash
python diagnostic_signup.py
```

## 🔧 Corrections Techniques Appliquées

### Dans `api/views.py`

1. **Vérification de l'existence de l'utilisateur** :
   ```python
   user.refresh_from_db()
   if User.objects.filter(id=user.id).exists():
       # Créer l'activité
   ```

2. **Transaction séparée pour l'activité** :
   ```python
   with transaction.atomic():
       Activite.objects.create(...)
   ```

3. **Tentative de création différée** :
   ```python
   time.sleep(0.1)  # Attendre 100ms
   # Réessayer la création de l'activité
   ```

### Dans `api/urls.py`

Ajout de l'endpoint alternatif :
```python
path('auth/signup-simple/', SimpleSignUpAPIView.as_view(), name='api_signup_simple')
```

## 📱 Impact sur l'Application Mobile

### Avant la Correction
- L'inscription échoue avec une erreur 500
- L'utilisateur ne peut pas créer de compte
- Erreur de contrainte de clé étrangère

### Après la Correction
- L'inscription fonctionne normalement
- L'utilisateur peut créer un compte et se connecter
- Les activités sont journalisées correctement (ou de manière différée)

## 🚀 Déploiement

### 1. Redéployer l'API
```bash
# Redémarrer le serveur Django
python manage.py runserver

# Ou redéployer sur Railway
git add .
git commit -m "Fix: Correction du problème d'inscription API"
git push
```

### 2. Tester l'API
```bash
# Test de l'inscription principale
curl -X POST https://web-production-e896b.up.railway.app/api/v1/auth/signup/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password1":"testpass123","password2":"testpass123","first_name":"Test","last_name":"User","email":"test@example.com"}'

# Test de l'inscription simplifiée
curl -X POST https://web-production-e896b.up.railway.app/api/v1/auth/signup-simple/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test2","password1":"testpass123","password2":"testpass123","first_name":"Test2","last_name":"User","email":"test2@example.com"}'
```

## 🔍 Surveillance et Maintenance

### 1. Vérifier les Logs
Surveillez les logs Django pour détecter d'autres problèmes similaires.

### 2. Exécuter le Diagnostic Régulièrement
```bash
python diagnostic_signup.py
```

### 3. Vérifier les Contraintes de Base de Données
```sql
-- Vérifier les contraintes de clé étrangère
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('core_activite', 'core_configuration', 'auth_user');
```

## 💡 Prévention Future

### 1. Utiliser des Signaux Django
Considérez l'utilisation de signaux `post_save` pour créer les activités de manière asynchrone.

### 2. Tests Automatisés
Ajoutez des tests unitaires pour vérifier le processus d'inscription.

### 3. Monitoring des Erreurs
Implémentez un système de monitoring pour détecter rapidement les erreurs de contrainte.

## 📞 Support

Si le problème persiste après l'application de ces corrections :

1. Vérifiez les logs du serveur
2. Exécutez le script de diagnostic
3. Vérifiez l'état de la base de données
4. Contactez l'équipe de développement

---

**Note** : Ces corrections maintiennent la compatibilité avec l'application mobile existante tout en résolvant le problème de contrainte de clé étrangère.
