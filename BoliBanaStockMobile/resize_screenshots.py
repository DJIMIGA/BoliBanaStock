import os
from PIL import Image
import sys

# Dimensions requises par Apple (Portrait)
# 6.5 pouces (iPhone 11 Pro Max, XS Max, 14 Plus...)
SIZE_65 = (1284, 2778)
# 5.5 pouces (iPhone 8 Plus, 7 Plus, 6s Plus)
SIZE_55 = (1242, 2208)

# Définir les chemins relatifs au script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_DIR = os.path.join(BASE_DIR, 'screenshots_input')
OUTPUT_DIR = os.path.join(BASE_DIR, 'screenshots_output')

def resize_images():
    # Vérifier si Pillow est installé
    try:
        import PIL
    except ImportError:
        print("Erreur: La librairie 'Pillow' est requise.")
        print("Installez-la avec : pip install Pillow")
        return

    # Créer les dossiers si nécessaire
    if not os.path.exists(INPUT_DIR):
        os.makedirs(INPUT_DIR)
        print(f"Dossier '{INPUT_DIR}' créé. Mettez vos images dedans et relancez le script.")
        return

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    files = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    if not files:
        print(f"Aucune image trouvée dans '{INPUT_DIR}'.")
        return

    print(f"Traitement de {len(files)} images...")

    for filename in files:
        img_path = os.path.join(INPUT_DIR, filename)
        try:
            with Image.open(img_path) as img:
                # Convertir en RGB si nécessaire (pour les PNG transparents vers JPG ou formats stricts)
                if img.mode != 'RGB':
                    img = img.convert('RGB')

                # 1. Version 6.5 pouces
                img_65 = img.resize(SIZE_65, Image.Resampling.LANCZOS)
                name_65 = f"6.5_{filename}"
                img_65.save(os.path.join(OUTPUT_DIR, name_65), quality=95)
                print(f"✅ Généré: {name_65}")

                # 2. Version 5.5 pouces
                img_55 = img.resize(SIZE_55, Image.Resampling.LANCZOS)
                name_55 = f"5.5_{filename}"
                img_55.save(os.path.join(OUTPUT_DIR, name_55), quality=95)
                print(f"✅ Généré: {name_55}")

        except Exception as e:
            print(f"❌ Erreur sur {filename}: {e}")

    print("\nTerminé ! Vos images prêtes pour l'App Store sont dans 'screenshots_output'.")

if __name__ == "__main__":
    resize_images()

