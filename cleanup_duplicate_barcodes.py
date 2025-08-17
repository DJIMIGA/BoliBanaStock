#!/usr/bin/env python3
"""
Script de nettoyage des codes-barres dupliqués
Nettoie la base de données des codes-barres dupliqués avant l'application des nouvelles contraintes
"""

import os
import sys
import django
from collections import defaultdict

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bolibanastock.settings')
django.setup()

from app.inventory.models import Product, Barcode
from django.db.models import Count

def find_duplicate_barcodes():
    """Trouver les codes-barres dupliqués dans la base de données"""
    print("🔍 Recherche des codes-barres dupliqués...")
    
    # Trouver les codes-barres dupliqués dans le modèle Barcode
    duplicate_eans = Barcode.objects.values('ean').annotate(
        count=Count('ean')
    ).filter(count__gt=1)
    
    print(f"📊 {duplicate_eans.count()} codes-barres dupliqués trouvés")
    
    duplicates = []
    for dup in duplicate_eans:
        ean = dup['ean']
        barcodes = Barcode.objects.filter(ean=ean).select_related('product')
        
        print(f"\n🔴 Code-barres dupliqué: {ean}")
        print(f"   Nombre d'occurrences: {dup['count']}")
        
        for barcode in barcodes:
            print(f"   - Produit: {barcode.product.name} (ID: {barcode.product.id}) - Principal: {barcode.is_primary}")
        
        duplicates.append({
            'ean': ean,
            'count': dup['count'],
            'barcodes': list(barcodes)
        })
    
    return duplicates

def find_conflicting_product_barcodes():
    """Trouver les conflits entre le champ barcode du produit et les modèles Barcode"""
    print("\n🔍 Recherche des conflits avec le champ barcode des produits...")
    
    conflicts = []
    
    # Trouver les produits avec un champ barcode qui existe aussi dans les modèles Barcode
    products_with_barcode = Product.objects.filter(barcode__isnull=False).exclude(barcode='')
    
    for product in products_with_barcode:
        conflicting_barcodes = Barcode.objects.filter(ean=product.barcode).exclude(product=product)
        
        if conflicting_barcodes.exists():
            print(f"⚠️ Conflit détecté pour le produit {product.name} (ID: {product.id})")
            print(f"   Code-barres: {product.barcode}")
            
            for barcode in conflicting_barcodes:
                print(f"   - Utilisé par: {barcode.product.name} (ID: {barcode.product.id})")
            
            conflicts.append({
                'product': product,
                'barcode': product.barcode,
                'conflicting_barcodes': list(conflicting_barcodes)
            })
    
    print(f"📊 {len(conflicts)} conflits détectés")
    return conflicts

def cleanup_duplicate_barcodes(duplicates):
    """Nettoyer les codes-barres dupliqués"""
    print("\n🧹 Nettoyage des codes-barres dupliqués...")
    
    cleaned_count = 0
    
    for dup in duplicates:
        ean = dup['ean']
        barcodes = dup['barcodes']
        
        print(f"\n🔧 Nettoyage du code-barres: {ean}")
        
        # Garder le premier code-barres (le plus ancien) et supprimer les autres
        primary_barcode = barcodes[0]
        duplicates_to_remove = barcodes[1:]
        
        print(f"   Gardé: {primary_barcode.product.name} (ID: {primary_barcode.product.id})")
        
        for barcode in duplicates_to_remove:
            print(f"   Supprimé: {barcode.product.name} (ID: {barcode.product.id})")
            barcode.delete()
            cleaned_count += 1
        
        # S'assurer qu'il n'y a qu'un seul code-barres principal
        primary_barcodes = Barcode.objects.filter(ean=ean, is_primary=True)
        if primary_barcodes.count() > 1:
            # Garder le premier et retirer le statut principal des autres
            first_primary = primary_barcodes.first()
            for barcode in primary_barcodes[1:]:
                barcode.is_primary = False
                barcode.save()
                print(f"   Retiré le statut principal de: {barcode.product.name}")
    
    print(f"\n✅ {cleaned_count} codes-barres dupliqués supprimés")
    return cleaned_count

def resolve_barcode_conflicts(conflicts):
    """Résoudre les conflits entre le champ barcode du produit et les modèles Barcode"""
    print("\n🔧 Résolution des conflits de codes-barres...")
    
    resolved_count = 0
    
    for conflict in conflicts:
        product = conflict['product']
        barcode_value = conflict['barcode']
        conflicting_barcodes = conflict['conflicting_barcodes']
        
        print(f"\n🔧 Résolution du conflit pour {product.name} (ID: {product.id})")
        print(f"   Code-barres: {barcode_value}")
        
        # Option 1: Supprimer le champ barcode du produit (recommandé)
        # Option 2: Supprimer les modèles Barcode conflictuels
        
        # Nous choisissons l'option 1 pour éviter les conflits
        old_barcode = product.barcode
        product.barcode = None
        product.save()
        
        print(f"   ✅ Champ barcode supprimé du produit {product.name}")
        print(f"   📝 Note: Le code-barres '{old_barcode}' peut être ajouté via le modèle Barcode si nécessaire")
        
        resolved_count += 1
    
    print(f"\n✅ {resolved_count} conflits résolus")
    return resolved_count

def verify_cleanup():
    """Vérifier que le nettoyage a été effectué correctement"""
    print("\n🔍 Vérification du nettoyage...")
    
    # Vérifier qu'il n'y a plus de codes-barres dupliqués
    duplicate_eans = Barcode.objects.values('ean').annotate(
        count=Count('ean')
    ).filter(count__gt=1)
    
    if duplicate_eans.exists():
        print("❌ Il reste des codes-barres dupliqués:")
        for dup in duplicate_eans:
            print(f"   - {dup['ean']}: {dup['count']} occurrences")
        return False
    else:
        print("✅ Aucun code-barres dupliqué trouvé")
    
    # Vérifier qu'il n'y a plus de conflits
    products_with_barcode = Product.objects.filter(barcode__isnull=False).exclude(barcode='')
    conflicts_found = 0
    
    for product in products_with_barcode:
        conflicting_barcodes = Barcode.objects.filter(ean=product.barcode).exclude(product=product)
        if conflicting_barcodes.exists():
            conflicts_found += 1
            print(f"❌ Conflit restant: {product.name} (ID: {product.id}) - {product.barcode}")
    
    if conflicts_found == 0:
        print("✅ Aucun conflit de codes-barres trouvé")
        return True
    else:
        print(f"❌ {conflicts_found} conflits restent à résoudre")
        return False

def main():
    """Fonction principale"""
    print("🚀 Script de nettoyage des codes-barres dupliqués")
    print("=" * 60)
    
    try:
        # Étape 1: Trouver les doublons
        duplicates = find_duplicate_barcodes()
        
        # Étape 2: Trouver les conflits
        conflicts = find_conflicting_product_barcodes()
        
        if not duplicates and not conflicts:
            print("\n🎉 Aucun problème détecté ! La base de données est propre.")
            return
        
        # Étape 3: Demander confirmation
        print(f"\n⚠️ ATTENTION: Ce script va supprimer {len(duplicates)} codes-barres dupliqués")
        print(f"   et résoudre {len(conflicts)} conflits.")
        
        response = input("\n❓ Continuer ? (oui/non): ").lower().strip()
        
        if response not in ['oui', 'o', 'yes', 'y']:
            print("❌ Opération annulée.")
            return
        
        # Étape 4: Nettoyer les doublons
        if duplicates:
            cleaned_count = cleanup_duplicate_barcodes(duplicates)
        
        # Étape 5: Résoudre les conflits
        if conflicts:
            resolved_count = resolve_barcode_conflicts(conflicts)
        
        # Étape 6: Vérifier le nettoyage
        success = verify_cleanup()
        
        if success:
            print("\n🎉 Nettoyage terminé avec succès !")
            print("✅ La base de données est maintenant prête pour les nouvelles contraintes.")
        else:
            print("\n⚠️ Nettoyage terminé mais des problèmes persistent.")
            print("🔧 Vérifiez manuellement les conflits restants.")
        
    except Exception as e:
        print(f"\n❌ Erreur lors du nettoyage: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
