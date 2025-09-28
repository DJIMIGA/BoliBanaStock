# Solution pour les problèmes pycairo dans Docker

## Problème
L'erreur `pycairo` se produit lors du déploiement Docker car :
- `xhtml2pdf` → `svglib` → `rlpycairo` → `pycairo`
- `pycairo` nécessite des dépendances système (cairo, pkg-config) qui ne sont pas installées
- La compilation depuis les sources échoue dans l'environnement Docker

## Solutions implémentées

### 1. Dockerfile optimisé
- ✅ Installation minimale des dépendances système (gcc uniquement)
- ✅ Utilisation de `requirements-docker.txt` (sans xhtml2pdf)
- ✅ Évite les packages système complexes qui causent des erreurs

### 2. Fichiers créés
- `requirements-docker.txt` : Version sans xhtml2pdf pour Docker
- `constraints-docker.txt` : Contraintes pour pycairo
- `Dockerfile.simple` : Version simplifiée du Dockerfile
- `deploy-docker.sh` : Script de déploiement automatisé

### 3. Alternatives pour la génération PDF
Au lieu de `xhtml2pdf`, utilisez directement `reportlab` qui est déjà installé :

```python
# Dans vos vues Django
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

def generate_pdf():
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    story = [Paragraph("Contenu PDF", styles['Normal'])]
    doc.build(story)
    return buffer.getvalue()
```

## Utilisation

### Déploiement local
```bash
# Version standard
docker build -t bolibanastock .
docker run -p 8000:8000 bolibanastock

# Version simplifiée (recommandée)
docker build -f Dockerfile.simple -t bolibanastock-simple .
docker run -p 8000:8000 bolibanastock-simple
```

### Déploiement avec script
```bash
./deploy-docker.sh
```

## Vérification
Après déploiement, vérifiez que l'application fonctionne :
- ✅ Pas d'erreur pycairo
- ✅ Génération PDF avec reportlab
- ✅ Toutes les fonctionnalités Django opérationnelles

## Notes importantes
- `xhtml2pdf` est temporairement désactivé dans Docker
- `reportlab` est utilisé pour la génération PDF
- Les dépendances système sont installées dans le Dockerfile
- Le déploiement local continue d'utiliser `requirements.txt` complet
