# 🔒 Résolution : Site Apparaît Non Sécurisé (SSL)

## ❌ Problème

Le site apparaît comme **non sécurisé** dans le navigateur avec un avertissement SSL/HTTPS.

## ✅ Solutions

### **Solution 1 : Vérifier le Certificat SSL dans Railway**

1. **Accéder au Dashboard Railway**
   - Allez sur [railway.app](https://railway.app)
   - Connectez-vous à votre compte
   - Sélectionnez votre projet **BoliBanaStock**

2. **Vérifier le Statut du Domaine**
   - Allez dans **Settings** > **Domains**
   - Vérifiez que votre domaine (`www.bolibanastock.com`) est listé
   - Vérifiez le statut :
     - ✅ **Active** avec un cadenas vert = SSL OK
     - ⚠️ **Pending** = En attente de génération SSL
     - ❌ **Failed** = Erreur de configuration

3. **Si le Statut est "Pending"**
   - Attendez **5-15 minutes** pour que Let's Encrypt génère le certificat
   - Railway génère automatiquement les certificats SSL
   - Rafraîchissez la page après quelques minutes

### **Solution 2 : Vérifier la Propagation DNS**

Le certificat SSL ne peut être généré que si le domaine pointe correctement vers Railway.

1. **Vérifier avec whatsmydns.net**
   - Allez sur [whatsmydns.net](https://www.whatsmydns.net)
   - Sélectionnez **CNAME**
   - Entrez `www.bolibanastock.com`
   - Vérifiez que la valeur pointe vers votre URL Railway (ex: `evwg4fci.up.railway.app`)

2. **Si le DNS n'est pas propagé**
   - Attendez la propagation DNS (5-15 minutes, jusqu'à 48h)
   - Vérifiez les enregistrements DNS dans Gandi
   - Une fois propagé, Railway détectera automatiquement le domaine et générera le certificat

### **Solution 3 : Forcer la Régénération du Certificat**

Si le certificat ne se génère pas automatiquement :

1. **Dans Railway**
   - Allez dans **Settings** > **Domains**
   - Supprimez le domaine personnalisé
   - Attendez 1-2 minutes
   - Ajoutez-le à nouveau
   - Railway tentera de générer un nouveau certificat

2. **Vérifier les Logs**
   - Allez dans **Deployments** > Ouvrez les logs
   - Cherchez les erreurs liées à SSL ou Let's Encrypt
   - Vérifiez qu'il n'y a pas d'erreurs de configuration

### **Solution 4 : Vérifier la Configuration du Port**

Le certificat SSL nécessite que le domaine pointe vers le bon port.

1. **Vérifier le Port dans Railway**
   - Dans **Settings** > **Domains**
   - Vérifiez que le port sélectionné est correct (généralement **8080**)
   - Si le port est incorrect, modifiez-le

2. **Vérifier le Port dans le Service**
   - Allez dans votre service (pas Settings)
   - Vérifiez la variable `PORT` (généralement **8080**)
   - Assurez-vous que le port du domaine correspond

### **Solution 5 : Vérifier les Enregistrements DNS**

Assurez-vous que les enregistrements DNS sont corrects :

1. **Dans Gandi**
   - Allez dans **Enregistrements DNS**
   - Vérifiez que le CNAME pour `www` pointe vers votre URL Railway
   - **Valeur correcte** : `evwg4fci.up.railway.app` (sans https://, sans www)
   - **Valeur incorrecte** : `webredir.vip.gandi.net` ou `https://...`

2. **Supprimer les Enregistrements Conflictuels**
   - Supprimez tout enregistrement A ou CNAME en double
   - Gardez uniquement le CNAME correct

### **Solution 6 : Vérifier les Variables d'Environnement**

Assurez-vous que les variables d'environnement sont correctement configurées :

1. **Dans Railway** > **Variables**
   - Vérifiez que `CUSTOM_DOMAIN` est défini :
     ```
     CUSTOM_DOMAIN=www.bolibanastock.com
     ```
   - Ou :
     ```
     CUSTOM_DOMAIN=bolibanastock.com
     ```

2. **Redéployer l'Application**
   - Après avoir modifié les variables, redéployez l'application
   - Allez dans **Deployments** > **Deploy Now**

### **Solution 7 : Vérifier avec SSL Labs**

Testez le certificat SSL avec un outil externe :

1. **Aller sur SSL Labs**
   - Allez sur [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/)
   - Entrez votre domaine : `www.bolibanastock.com`
   - Cliquez sur **Submit**
   - Attendez le résultat (peut prendre quelques minutes)

2. **Interpréter les Résultats**
   - ✅ **Grade A ou B** = Certificat valide
   - ⚠️ **Grade C ou D** = Problème de configuration
   - ❌ **No certificate** = Certificat non généré

## 🔍 Checklist de Vérification

- [ ] Domaine ajouté dans Railway Settings > Domains
- [ ] Statut du domaine est "Active" avec cadenas vert
- [ ] Enregistrements DNS correctement configurés dans Gandi
- [ ] Propagation DNS vérifiée avec whatsmydns.net
- [ ] Port correct configuré dans Railway (généralement 8080)
- [ ] Variables d'environnement `CUSTOM_DOMAIN` configurées
- [ ] Application redéployée après configuration
- [ ] Attente de 5-15 minutes pour la génération SSL
- [ ] Test SSL avec SSL Labs effectué

## ⏱️ Délais Normaux

- **Propagation DNS** : 5-15 minutes (jusqu'à 48h)
- **Génération SSL** : 5-15 minutes après propagation DNS
- **Total** : Généralement 10-30 minutes, parfois jusqu'à 1-2 heures

## 🐛 Erreurs Courantes

### **Erreur : "Certificate generation failed"**

**Causes possibles** :
- DNS non propagé
- Port incorrect
- Enregistrements DNS incorrects

**Solution** :
- Vérifier la propagation DNS
- Vérifier le port dans Railway
- Vérifier les enregistrements DNS dans Gandi

### **Erreur : "Domain not pointing to Railway"**

**Causes possibles** :
- CNAME incorrect dans Gandi
- Propagation DNS non terminée

**Solution** :
- Vérifier le CNAME dans Gandi
- Attendre la propagation DNS
- Utiliser whatsmydns.net pour vérifier

### **Erreur : "Rate limit exceeded" (Let's Encrypt)**

**Causes possibles** :
- Trop de tentatives de génération de certificat

**Solution** :
- Attendre 1 heure avant de réessayer
- Ne pas supprimer/ajouter le domaine trop souvent

## 📚 Ressources

- [Documentation Railway - Custom Domains](https://docs.railway.app/guides/custom-domains)
- [Documentation Let's Encrypt](https://letsencrypt.org/docs/)
- [Test SSL - SSL Labs](https://www.ssllabs.com/ssltest/)
- [Vérification DNS - whatsmydns.net](https://www.whatsmydns.net)

## 💡 Notes Importantes

- ⏱️ **Patience** : La génération SSL peut prendre du temps, soyez patient
- 🔄 **Ne pas supprimer/ajouter trop souvent** : Cela peut déclencher des rate limits
- ✅ **Vérifier DNS d'abord** : Le certificat ne peut être généré que si le DNS est correct
- 🔒 **HTTPS automatique** : Railway redirige automatiquement HTTP vers HTTPS
- 📱 **Navigateur** : Parfois, le navigateur cache l'état SSL, essayez en navigation privée

