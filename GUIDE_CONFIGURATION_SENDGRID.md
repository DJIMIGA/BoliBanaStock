# 📧 Guide de Configuration SendGrid pour Railway

## Problème identifié

Railway ne peut pas se connecter à `smtp.gmail.com` depuis son réseau (erreur: `[Errno 101] Network is unreachable`). C'est une restriction réseau courante sur les plateformes cloud.

## Solution : Utiliser SendGrid

SendGrid est un service d'email transactionnel qui fonctionne parfaitement avec Railway et offre :
- ✅ 100 emails/jour gratuitement
- ✅ Pas de restrictions réseau
- ✅ Configuration simple
- ✅ Fiable et rapide

**Méthode utilisée** : **Web API** (HTTPS - port 443)
- ✅ Fonctionne sur Railway (pas de blocage réseau)
- ✅ Plus rapide et fiable que SMTP
- ✅ Utilise le package `sendgrid-python`
- ✅ Configuration simple via variables d'environnement

## Étapes de configuration

### 1. Créer un compte SendGrid

1. Allez sur [https://sendgrid.com](https://sendgrid.com)
2. Créez un compte gratuit
3. Vérifiez votre email

### 2. Créer une API Key

1. Dans le dashboard SendGrid, allez dans **Settings** > **API Keys**
2. Cliquez sur **Create API Key**
3. Donnez un nom (ex: "BoliBana Stock Railway")
4. Sélectionnez **Full Access** ou **Restricted Access** avec les permissions **Mail Send**
5. **Copiez la clé API** (vous ne pourrez plus la voir après !)

**Note importante** : 
- La même clé API fonctionne pour **SMTP Relay** ET **Web API**
- Aucune configuration supplémentaire n'est nécessaire sur SendGrid
- Assurez-vous que la clé a la permission **Mail Send** activée

### 3. Vérifier votre expéditeur (Sender)

1. Dans SendGrid, allez dans **Settings** > **Sender Authentication**
2. Cliquez sur **Verify a Single Sender**
3. Remplissez le formulaire avec :
   - **From Email Address** : L'email que vous voulez utiliser comme expéditeur (ex: `noreply@votredomaine.com` ou `bolibanastock@gmail.com`)
   - **From Name** : Le nom d'affichage (ex: "BoliBana Stock")
   - **Reply To** : L'email pour les réponses
4. Vérifiez l'email de confirmation envoyé par SendGrid

**Note importante** : L'email vérifié sera utilisé comme expéditeur (`from_email`) dans les emails envoyés.

### 4. Configurer la variable d'environnement sur Railway

1. Dans le dashboard Railway, allez dans votre projet
2. Cliquez sur votre service Django
3. Allez dans l'onglet **Variables**
4. Ajoutez une nouvelle variable :
   - **Nom** : `SENDGRID_API_KEY`
   - **Valeur** : La clé API que vous avez copiée à l'étape 2
5. Cliquez sur **Add**

**C'est tout !** Aucune autre configuration n'est nécessaire. La même clé API fonctionne pour la Web API.

### 5. Redéployer l'application

Après avoir ajouté la variable d'environnement, Railway redéploiera automatiquement votre application et installera automatiquement le package `sendgrid-python`.

## Vérification

Une fois configuré, les logs Railway devraient afficher :
```
📧 Configuration SendGrid activée pour l'envoi d'emails
```

Au lieu de :
```
📧 Configuration Gmail activée pour l'envoi d'emails (⚠️ peut ne pas fonctionner sur Railway)
```

## Comment ça fonctionne (Web API)

Le système utilise la **Web API** de SendGrid :
- **Protocole** : HTTPS (port 443)
- **Avantage** : Fonctionne sur Railway (pas de blocage réseau comme SMTP)
- **Authentification** : Clé API SendGrid (`SENDGRID_API_KEY`)
- **Package** : `sendgrid-python` (déjà ajouté à `requirements.txt`)

Cette méthode utilise des requêtes HTTPS standard et fonctionne parfaitement sur Railway.

## Configuration de l'expéditeur

Le système utilisera automatiquement :
1. **L'email du site** (Configuration.email) si configuré
2. **Le fallback** (`bolibanastock@gmail.com`) sinon

**Important** : L'email utilisé comme expéditeur doit être vérifié dans SendGrid (étape 3).

## Alternative : Mailgun

Si vous préférez utiliser Mailgun au lieu de SendGrid :

1. Créez un compte sur [https://mailgun.com](https://mailgun.com)
2. Récupérez vos identifiants SMTP
3. Configurez les variables d'environnement :
   - `EMAIL_HOST=smtp.mailgun.org`
   - `EMAIL_PORT=587`
   - `EMAIL_HOST_USER=votre-username-mailgun`
   - `EMAIL_HOST_PASSWORD=votre-password-mailgun`

## Dépannage

### L'email n'est pas envoyé

1. Vérifiez que `SENDGRID_API_KEY` est bien configuré dans Railway
2. Vérifiez que l'expéditeur est vérifié dans SendGrid
3. Consultez les logs Railway pour voir les erreurs détaillées
4. Vérifiez votre quota SendGrid (100 emails/jour en gratuit)

### Erreur d'authentification

- Vérifiez que la clé API est correcte
- Vérifiez que la clé API a les bonnes permissions

### L'email est marqué comme spam ⚠️

**Problème courant** : Les emails arrivent dans les spams même si SendGrid fonctionne correctement.

**Solution : Vérifier l'expéditeur dans SendGrid**

1. **Connectez-vous à SendGrid** : [https://app.sendgrid.com](https://app.sendgrid.com)

2. **Allez dans Settings > Sender Authentication**

3. **Vérifiez l'email utilisé comme expéditeur** :
   - Si vous utilisez `bolibanastock@gmail.com` (fallback), vous devez le vérifier
   - Cliquez sur **Verify a Single Sender**
   - Remplissez le formulaire :
     - **From Email Address** : `bolibanastock@gmail.com`
     - **From Name** : `BoliBana Stock` (ou le nom de votre entreprise)
     - **Reply To** : `bolibanastock@gmail.com` (ou un autre email pour les réponses)
     - **Company Address** : Votre adresse
     - **City** : Votre ville
     - **State** : Votre région
     - **Country** : Votre pays
     - **Zip Code** : Votre code postal
   - Cliquez sur **Create**

4. **Vérifiez votre boîte email** :
   - SendGrid enverra un email de vérification à `bolibanastock@gmail.com`
   - Ouvrez l'email et cliquez sur le lien de vérification
   - L'email sera marqué comme **Verified** dans SendGrid

5. **Attendez quelques minutes** pour que la vérification soit propagée

**Pourquoi c'est important ?**
- Les emails non vérifiés sont souvent marqués comme spam
- La vérification permet à SendGrid d'authentifier vos emails (SPF, DKIM)
- Cela améliore significativement la délivrabilité

**Alternative : Utiliser un domaine personnalisé (recommandé pour la production)**

Pour une meilleure délivrabilité, utilisez un domaine personnalisé :

1. Dans SendGrid, allez dans **Settings > Sender Authentication**
2. Cliquez sur **Authenticate Your Domain**
3. Suivez les instructions pour configurer les enregistrements DNS (SPF, DKIM, DMARC)
4. Une fois configuré, utilisez un email de ce domaine (ex: `noreply@votredomaine.com`)

**Autres conseils pour éviter les spams :**
- Évitez les mots déclencheurs dans le sujet (ex: "GRATUIT", "CLIQUEZ ICI", etc.)
- Utilisez un nom d'expéditeur clair et professionnel
- Incluez un lien de désinscription si nécessaire
- Évitez d'envoyer trop d'emails en peu de temps

## Support

Pour plus d'aide :
- Documentation SendGrid : [https://docs.sendgrid.com](https://docs.sendgrid.com)
- Support SendGrid : [https://support.sendgrid.com](https://support.sendgrid.com)

