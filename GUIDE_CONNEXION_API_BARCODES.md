# 🔗 GUIDE - Connexion API pour la Gestion des Codes-barres

## 🎯 **OBJECTIF**

Connecter le modal de gestion des codes-barres à l'API Django pour permettre la sauvegarde, modification et suppression réelles des codes-barres.

## 🔄 **MODIFICATIONS APPLIQUÉES**

### **1. Nouvelles Fonctions API dans `api.ts`**

#### **Ajout d'un Code-barres**
```typescript
addBarcode: async (productId: number, barcodeData: { 
  ean: string; 
  notes?: string; 
  is_primary: boolean 
}) => {
  try {
    const response = await api.post(`/inventory/barcode/add/`, {
      product: productId,
      ean: barcodeData.ean,
      notes: barcodeData.notes || '',
      is_primary: barcodeData.is_primary
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}
```

#### **Mise à Jour d'un Code-barres**
```typescript
updateBarcode: async (barcodeId: number, barcodeData: { 
  ean: string; 
  notes?: string; 
  is_primary: boolean 
}) => {
  try {
    const response = await api.put(`/inventory/barcode/${barcodeId}/edit/`, {
      ean: barcodeData.ean,
      notes: barcodeData.notes || '',
      is_primary: barcodeData.is_primary
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}
```

#### **Suppression d'un Code-barres**
```typescript
deleteBarcode: async (barcodeId: number) => {
  try {
    const response = await api.delete(`/inventory/barcode/${barcodeId}/delete/`);
    return response.data;
  } catch (error) {
    throw error;
  }
}
```

#### **Définition du Code Principal**
```typescript
setPrimaryBarcode: async (barcodeId: number) => {
  try {
    const response = await api.post(`/inventory/barcode/${barcodeId}/set_primary/`);
    return response.data;
  } catch (error) {
    throw error;
  }
}
```

### **2. BarcodeModal Modifié pour Utiliser l'API**

#### **Import du Service API**
```typescript
import { productService } from '../services/api';
```

#### **Fonction `saveBarcodes` Connectée à l'API**
```typescript
const saveBarcodes = async () => {
  // ... validation ...
  
  setLoading(true);
  try {
    const barcodesToProcess = [...localBarcodes];
    const processedBarcodes = [];

    for (const barcode of barcodesToProcess) {
      if (barcode.id > 0 && barcode.id < 1000000) {
        // Code-barres existant - mise à jour
        const updatedBarcode = await productService.updateBarcode(barcode.id, {
          ean: barcode.ean,
          notes: barcode.notes,
          is_primary: barcode.is_primary
        });
        processedBarcodes.push(updatedBarcode);
      } else {
        // Nouveau code-barres - création
        const newBarcode = await productService.addBarcode(productId, {
          ean: barcode.ean,
          notes: barcode.notes,
          is_primary: barcode.is_primary
        });
        processedBarcodes.push(newBarcode);
      }
    }

    onBarcodesUpdate(processedBarcodes);
    onClose();
    Alert.alert('Succès', 'Codes-barres sauvegardés avec succès');
  } catch (error) {
    console.error('❌ Erreur générale sauvegarde:', error);
    Alert.alert('Erreur', 'Erreur lors de la sauvegarde des codes-barres');
  } finally {
    setLoading(false);
  }
};
```

#### **Fonction `deleteBarcode` Connectée à l'API**
```typescript
const deleteBarcode = async (id: number) => {
  Alert.alert(
    'Confirmer la suppression',
    'Êtes-vous sûr de vouloir supprimer ce code-barres ?',
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            // Si c'est un code-barres existant (ID réel), le supprimer de l'API
            if (id > 0 && id < 1000000) {
              await productService.deleteBarcode(id);
            }
            
            // Mettre à jour l'interface locale
            setLocalBarcodes(prev => prev.filter(b => b.id !== id));
          } catch (error) {
            console.error('❌ Erreur suppression code-barres:', error);
            Alert.alert('Erreur', 'Impossible de supprimer le code-barres');
          }
        }
      }
    ]
  );
};
```

#### **Fonction `setPrimaryBarcode` Connectée à l'API**
```typescript
const setPrimaryBarcode = async (id: number) => {
  try {
    // Si c'est un code-barres existant (ID réel), mettre à jour l'API
    if (id > 0 && id < 1000000) {
      await productService.setPrimaryBarcode(id);
    }
    
    // Mettre à jour l'interface locale
    setLocalBarcodes(prev => 
      prev.map(barcode => ({
        ...barcode,
        is_primary: barcode.id === id
      }))
    );
  } catch (error) {
    console.error('❌ Erreur définition code principal:', error);
    Alert.alert('Erreur', 'Impossible de définir ce code-barres comme principal');
  }
};
```

## 🔍 **LOGIQUE DE GESTION DES IDS**

### **1. Distinction entre Codes Existants et Nouveaux**

#### **Codes-barres Existants (ID Réel)**
- **Condition** : `id > 0 && id < 1000000`
- **Action** : Appel à l'API de mise à jour/suppression
- **Exemple** : ID 123 → `updateBarcode(123, ...)`

#### **Nouveaux Codes-barres (ID Temporaire)**
- **Condition** : `id >= 1000000` (généré par `Date.now()`)
- **Action** : Appel à l'API de création
- **Exemple** : ID 1703123456789 → `addBarcode(productId, ...)`

### **2. Gestion des Erreurs**

#### **Erreurs de Création**
```typescript
try {
  const newBarcode = await productService.addBarcode(productId, {...});
} catch (error) {
  console.error('❌ Erreur création code-barres:', error);
  Alert.alert('Erreur', `Impossible de créer le code-barres ${barcode.ean}`);
  return;
}
```

#### **Erreurs de Mise à Jour**
```typescript
try {
  const updatedBarcode = await productService.updateBarcode(barcode.id, {...});
} catch (error) {
  console.error('❌ Erreur mise à jour code-barres:', error);
  Alert.alert('Erreur', `Impossible de mettre à jour le code-barres ${barcode.ean}`);
  return;
}
```

## 🚀 **ENDPOINTS API UTILISÉS**

### **1. Création de Code-barres**
- **URL** : `POST /inventory/barcode/add/`
- **Données** : `{ product, ean, notes, is_primary }`

### **2. Mise à Jour de Code-barres**
- **URL** : `PUT /inventory/barcode/{id}/edit/`
- **Données** : `{ ean, notes, is_primary }`

### **3. Suppression de Code-barres**
- **URL** : `DELETE /inventory/barcode/{id}/delete/`

### **4. Définition du Code Principal**
- **URL** : `POST /inventory/barcode/{id}/set_primary/`

## 🎯 **FONCTIONNALITÉS OBTENUES**

### **1. Sauvegarde Réelle**
- ✅ **Création** de nouveaux codes-barres via API
- ✅ **Mise à jour** des codes-barres existants via API
- ✅ **Synchronisation** avec la base de données

### **2. Gestion des Erreurs**
- ✅ **Validation** des données avant envoi
- ✅ **Gestion** des erreurs réseau
- ✅ **Messages d'erreur** informatifs

### **3. Interface Réactive**
- ✅ **Mise à jour immédiate** après opérations
- ✅ **Gestion des états** de chargement
- ✅ **Feedback utilisateur** en temps réel

## 🔄 **FLUX DE TRAITEMENT**

### **1. Sauvegarde des Codes-barres**
```
1. Validation des données ✅
2. Traitement par lot des codes-barres
3. Distinction existant/nouveau par ID
4. Appels API appropriés
5. Mise à jour de l'interface
6. Fermeture du modal
```

### **2. Suppression d'un Code-barres**
```
1. Confirmation utilisateur ✅
2. Vérification ID (existant/nouveau)
3. Appel API si existant
4. Mise à jour interface locale
5. Gestion des erreurs
```

### **3. Changement de Code Principal**
```
1. Vérification ID (existant/nouveau)
2. Appel API si existant
3. Mise à jour interface locale
4. Gestion des erreurs
```

## 🎉 **RÉSULTAT FINAL**

**Le modal de gestion des codes-barres est maintenant entièrement connecté à l'API Django !**

- ✅ **Interface complète** et intuitive
- ✅ **API connectée** pour toutes les opérations
- ✅ **Gestion des erreurs** robuste
- ✅ **Synchronisation** en temps réel
- ✅ **Validation** des données

L'utilisateur peut maintenant :
1. **Ajouter** de nouveaux codes-barres
2. **Modifier** les codes-barres existants
3. **Supprimer** des codes-barres
4. **Définir** le code principal
5. **Sauvegarder** toutes les modifications

Tout est synchronisé avec la base de données via l'API REST ! 🚀✨
