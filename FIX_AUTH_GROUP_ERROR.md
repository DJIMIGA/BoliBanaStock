# 🔧 Résolution de l'erreur "relation auth_group does not exist"

## 🎯 Problème

L'erreur `django.db.utils.ProgrammingError: relation "auth_group" does not exist` se produit lorsque vous essayez d'accéder à l'admin Django et d'éditer un utilisateur.

### Cause

Les tables Django `auth_group` et `auth_permission` n'existent pas dans la base de données PostgreSQL sur Railway, bien que les migrations soient marquées comme appliquées.

## 🚀 Solution

### Option 1: Utiliser la commande de réparation (Recommandé)

Exécutez la commande de gestion que nous avons créée :

```bash
python manage.py fix_auth_tables
```

Cette commande va :
1. ✅ Vérifier si les tables `auth_group` et `auth_permission` existent
2. ✅ Si elles manquent, supprimer les entrées de migrations pour l'app `auth`
3. ✅ Réappliquer les migrations `auth` pour créer les tables manquantes

### Option 2: Réappliquer toutes les migrations auth

```bash
# Supprimer les entrées de migrations pour auth
python manage.py shell
```

```python
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("DELETE FROM django_migrations WHERE app = 'auth';")
```

Puis :

```bash
python manage.py migrate auth --noinput
```

### Option 3: Réappliquer toutes les migrations (si nécessaire)

```bash
# Supprimer toutes les entrées de migrations (ATTENTION: à utiliser avec précaution)
python manage.py shell
```

```python
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("DELETE FROM django_migrations;")
```

Puis :

```bash
python manage.py migrate --noinput
```

## 🔍 Vérification

Après avoir exécuté la commande, vérifiez que les tables existent :

```bash
python manage.py shell
```

```python
from django.db import connection

with connection.cursor() as cursor:
    # Vérifier auth_group
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'auth_group'
        );
    """)
    auth_group_exists = cursor.fetchone()[0]
    print(f"auth_group existe: {auth_group_exists}")
    
    # Vérifier auth_permission
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'auth_permission'
        );
    """)
    auth_permission_exists = cursor.fetchone()[0]
    print(f"auth_permission existe: {auth_permission_exists}")
```

## 📋 Sur Railway

Si vous êtes sur Railway, vous pouvez exécuter la commande via le CLI Railway :

```bash
railway run python manage.py fix_auth_tables
```

Ou via le dashboard Railway :
1. Allez dans votre projet
2. Ouvrez la console/terminal
3. Exécutez : `python manage.py fix_auth_tables`

## 🛡️ Prévention

Le script `deploy_railway.py` a été mis à jour pour vérifier automatiquement l'existence de `auth_group` et `auth_permission` lors du déploiement. Si ces tables manquent, les migrations seront automatiquement réappliquées.

## ⚠️ Notes importantes

- Les tables `auth_group` et `auth_permission` sont nécessaires même si vous utilisez un modèle User personnalisé (`core.User`)
- Ces tables sont utilisées pour les groupes et permissions Django
- Ne supprimez jamais ces tables manuellement, utilisez toujours les migrations Django

