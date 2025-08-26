# Guide d'Utilisation - Copie de Produits sur Mobile

## Vue d'ensemble

La fonctionnalité de copie de produits permet aux sites enfants de copier des produits depuis le site principal vers leur propre site. Cette fonctionnalité est disponible sur l'application mobile React Native.

## Fonctionnalités Principales

### 1. Copie de Produits
- **Accès** : Bouton avec icône de copie dans l'écran des produits
- **Fonction** : Permet de sélectionner et copier des produits du site principal
- **Stock initial** : Les produits copiés ont un stock initial de 0

### 2. Gestion des Copies
- **Accès** : Icône d'engrenage dans l'écran de copie
- **Fonction** : Gérer les produits copiés (synchronisation, activation/désactivation, suppression)

## Utilisation

### Étape 1 : Accéder à la Copie de Produits
1. Ouvrir l'application mobile
2. Aller dans l'onglet "Produits"
3. Cliquer sur le bouton avec l'icône de copie (📋) dans l'en-tête

### Étape 2 : Sélectionner des Produits
1. Parcourir la liste des produits disponibles
2. Utiliser la barre de recherche pour filtrer les produits
3. Sélectionner les produits à copier en cliquant sur les cases à cocher
4. Utiliser "Tout sélectionner" pour une sélection rapide

### Étape 3 : Copier les Produits
1. Vérifier que les produits souhaités sont sélectionnés
2. Cliquer sur le bouton "Copier X produit(s)"
3. Confirmer l'action dans la boîte de dialogue
4. Attendre la confirmation de copie

### Étape 4 : Gérer les Copies
1. Cliquer sur l'icône d'engrenage (⚙️) pour accéder à la gestion
2. Voir la liste des produits copiés avec leurs statuts
3. Effectuer des actions :
   - **Synchroniser** : Mettre à jour les données depuis le site principal
   - **Activer/Désactiver** : Contrôler l'état de la copie
   - **Supprimer** : Supprimer la copie et le produit local

## Fonctionnalités Avancées

### Synchronisation Automatique
- Les produits copiés peuvent être synchronisés manuellement
- Les options de synchronisation incluent :
  - Prix (activé par défaut)
  - Stock (désactivé par défaut pour la sécurité)
  - Images (activé par défaut)
  - Description (activé par défaut)

### Gestion des Statuts
- **Actif** : La copie est active et peut être synchronisée
- **Inactif** : La copie est désactivée temporairement

### Recherche et Filtrage
- Recherche par nom de produit, CUG ou description
- Pagination automatique pour les grandes listes
- Actualisation par glissement vers le bas

## Interface Utilisateur

### Écran de Copie
- **En-tête** : Titre et bouton de gestion
- **Informations** : Détails sur les sites source et destination
- **Recherche** : Barre de recherche avec filtres
- **Sélection** : Actions de sélection (tout, rien, compteur)
- **Liste** : Cartes de produits avec cases à cocher
- **Bouton de copie** : Action principale en bas d'écran

### Écran de Gestion
- **Statistiques** : Nombre total de copies et copies actives
- **Recherche** : Filtrage des copies existantes
- **Cartes de copies** : Informations détaillées sur chaque copie
- **Actions** : Boutons pour chaque action disponible

## Sécurité et Bonnes Pratiques

### Sécurité
- Seuls les utilisateurs authentifiés peuvent accéder à cette fonctionnalité
- Les actions destructives (suppression) nécessitent une confirmation
- Le stock n'est pas synchronisé par défaut pour éviter les pertes

### Bonnes Pratiques
1. **Vérification** : Toujours vérifier les produits avant la copie
2. **Synchronisation** : Synchroniser régulièrement pour maintenir les données à jour
3. **Gestion** : Désactiver temporairement les copies non utilisées
4. **Nettoyage** : Supprimer les copies obsolètes

## Dépannage

### Problèmes Courants

#### Impossible de copier des produits
- Vérifier la connexion internet
- S'assurer d'être connecté à l'application
- Vérifier que le site principal a des produits disponibles

#### Erreur de synchronisation
- Vérifier que la copie est active
- Réessayer la synchronisation
- Contacter l'administrateur si le problème persiste

#### Produits non visibles
- Utiliser la fonction de recherche
- Vérifier les filtres appliqués
- Actualiser la liste par glissement vers le bas

### Support Technique
- Vérifier les logs de l'application
- Tester la connectivité réseau
- Redémarrer l'application si nécessaire

## Configuration Technique

### API Endpoints
- `GET /inventory/copy/` : Produits disponibles pour la copie
- `POST /inventory/copy/` : Copier des produits
- `GET /inventory/copy/management/` : Liste des copies
- `POST /inventory/copy/management/` : Actions sur les copies

### Permissions Requises
- Authentification utilisateur
- Accès au site enfant
- Droits de création de produits

## Conclusion

La fonctionnalité de copie de produits offre une solution complète pour la gestion multisite, permettant aux sites enfants de bénéficier du catalogue du site principal tout en conservant leur autonomie de gestion locale.
