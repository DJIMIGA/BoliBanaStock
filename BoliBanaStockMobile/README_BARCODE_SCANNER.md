# 📱 GUIDE D'UTILISATION - SCANNER DE CODES-BARRES

## 🎯 **FONCTIONNALITÉ PRINCIPALE**

Le scanner de codes-barres permet de scanner automatiquement les codes-barres des produits pour :
- 🔍 **Rechercher** des produits existants dans la base de données
- ➕ **Ajouter** de nouveaux produits avec le code-barres scanné
- 📊 **Gérer** l'inventaire en temps réel

---

## 🚀 **COMMENT UTILISER LE SCANNER**

### **1. Accès au Scanner**
- Naviguez vers l'écran **"Scanner"** dans l'application
- Appuyez sur le bouton **"Scanner un produit"**

### **2. Autorisation Caméra**
- La première fois, l'application demandera l'autorisation d'accéder à la caméra
- Cliquez sur **"Autoriser"** pour activer le scanner
- ⚠️ **Sans autorisation, le scanner ne fonctionnera pas**

### **3. Scan d'un Code-barres**
- Pointez la caméra vers un code-barres (EAN-13, EAN-8, UPC-A, etc.)
- Le scanner détecte **automatiquement** le code
- Une fois scanné, le code s'affiche dans un popup

### **4. Actions Possibles**
- **"Rechercher"** : Cherche le produit dans la base de données
- **"Scanner à nouveau"** : Relance le scanner pour un nouveau code
- **"Fermer"** : Retourne à l'écran précédent

---

## 🔧 **CODES-BARRES SUPPORTÉS**

| Type | Description | Exemple |
|------|-------------|---------|
| **EAN-13** | Codes européens standard | 3017620422003 |
| **EAN-8** | Codes européens courts | 12345670 |
| **UPC-A** | Codes américains | 123456789012 |
| **Code 128** | Codes industriels | ABC123 |
| **Code 39** | Codes logistiques | *12345* |

---

## ❌ **PROBLÈMES COURANTS ET SOLUTIONS**

### **1. "Demande d'autorisation caméra" reste affiché**
**Symptôme :** Le message de permission reste bloqué à l'écran
**Solution :** 
- Vérifiez que l'application a bien l'autorisation caméra
- Allez dans **Paramètres > Applications > BoliBana Stock > Permissions > Caméra**
- Activez l'autorisation manuellement

### **2. Scanner ne détecte pas les codes-barres**
**Symptôme :** La caméra fonctionne mais aucun code n'est détecté
**Solutions :**
- Assurez-vous que le code-barres est bien éclairé
- Maintenez la caméra stable à 10-20 cm du code
- Vérifiez que le code n'est pas endommagé ou illisible

### **3. Erreur "Produit non trouvé" (400)**
**Symptôme :** Le code est scanné mais l'API retourne une erreur 400
**Explication :** C'est **NORMAL** - le produit n'existe pas encore dans la base
**Solution :** Utilisez le bouton **"Ajouter"** pour créer le produit

### **4. Application plante lors du scan**
**Symptôme :** Crash de l'application quand on ouvre le scanner
**Solutions :**
- Redémarrez l'application
- Vérifiez que la caméra n'est pas utilisée par une autre app
- Redémarrez votre appareil si le problème persiste

---

## 📱 **CONFIGURATION RECOMMANDÉE**

### **Paramètres Caméra Optimaux :**
- **Résolution :** Auto (laissé à l'application)
- **Focus :** Auto-focus activé
- **Flash :** Désactivé (peut interférer avec la lecture)
- **Stabilisation :** Activée si disponible

### **Conditions d'Éclairage :**
- ✅ **Bon éclairage** : Lumière naturelle ou éclairage uniforme
- ❌ **Éclairage faible** : Peut causer des erreurs de lecture
- ❌ **Reflets** : Évitez les surfaces brillantes qui créent des reflets

---

## 🔍 **DÉBOGAGE ET LOGS**

### **Logs Console (Développeur) :**
```
📱 Permission caméra: granted
📱 Code-barres scanné: { data: "3017620422003", type: "ean13" }
```

### **En Cas de Problème :**
1. Ouvrez la **console de développement**
2. Scannez un code-barres
3. Vérifiez les messages de log
4. Notez les erreurs éventuelles

---

## 🆘 **SUPPORT TECHNIQUE**

### **Si le Scanner Ne Fonctionne Pas :**
1. **Vérifiez les permissions** caméra dans les paramètres
2. **Redémarrez l'application** complètement
3. **Testez sur un autre appareil** si possible
4. **Vérifiez la version** d'Expo et React Native

### **Informations à Fournir :**
- Version de l'application
- Modèle de l'appareil
- Version d'Android/iOS
- Message d'erreur exact
- Étapes pour reproduire le problème

---

## 🎉 **FÉLICITATIONS !**

**Votre scanner de codes-barres est maintenant pleinement fonctionnel !**

- ✅ **Scan automatique** en temps réel
- ✅ **Gestion des permissions** automatique
- ✅ **Support multi-formats** de codes-barres
- ✅ **Interface intuitive** et responsive

**Bon scan ! 🚀**
