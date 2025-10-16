// Script de test pour vérifier la visibilité des catégories personnalisées
console.log('🧪 Test de visibilité des catégories personnalisées');
console.log('================================================');

// Simuler les données de test
const mockCategories = [
  {
    id: 1,
    name: 'Rayon Épicerie',
    is_rayon: true,
    rayon_type: 'epicerie',
    description: 'Rayon épicerie du supermarché'
  },
  {
    id: 2,
    name: 'Rayon Frais',
    is_rayon: true,
    rayon_type: 'frais_libre_service',
    description: 'Rayon frais libre service'
  },
  {
    id: 3,
    name: 'Ma Catégorie Personnalisée',
    is_rayon: false,
    is_global: false,
    site_configuration: 1,
    description: 'Catégorie créée par l\'utilisateur',
    created_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 4,
    name: 'Catégorie Globale',
    is_rayon: false,
    is_global: true,
    site_configuration: null,
    description: 'Catégorie visible par tous',
    created_at: '2024-01-10T08:15:00Z'
  }
];

// Simuler l'utilisateur connecté
const mockUser = {
  id: 1,
  username: 'testuser',
  is_staff: true
};

// Fonction de filtrage (copiée du code)
function filterCustomCategories(categories, user) {
  return categories.filter((cat) => {
    if (cat.is_rayon) return false; // Exclure les rayons
    
    // Filtrer les catégories personnalisées :
    // 1. Catégories globales (is_global = true) - visibles par tous
    // 2. Catégories du site de l'utilisateur connecté
    // 3. Catégories sans site_configuration (créées avant l'implémentation multisite)
    if (cat.is_global === true) {
      return true; // Catégories globales visibles par tous
    }
    
    // Pour les catégories spécifiques à un site, vérifier si elles appartiennent au site de l'utilisateur
    if (user?.id && cat.site_configuration) {
      // Ici, vous devriez comparer cat.site_configuration avec le site de l'utilisateur
      // Pour l'instant, on affiche toutes les catégories non-globales
      return true;
    }
    
    // Catégories sans site_configuration (anciennes catégories)
    return cat.site_configuration === null || cat.site_configuration === undefined;
  });
}

// Test du filtrage
console.log('📊 Données de test:');
console.log('Total catégories:', mockCategories.length);
console.log('Rayons:', mockCategories.filter(cat => cat.is_rayon).length);
console.log('Catégories personnalisées:', mockCategories.filter(cat => !cat.is_rayon).length);

const customCategories = filterCustomCategories(mockCategories, mockUser);
console.log('\n🔍 Résultat du filtrage:');
console.log('Catégories personnalisées trouvées:', customCategories.length);

if (customCategories.length > 0) {
  console.log('\n📋 Détails des catégories personnalisées:');
  customCategories.forEach((cat, index) => {
    console.log(`  ${index + 1}. ${cat.name} (ID: ${cat.id}, Global: ${cat.is_global}, Site: ${cat.site_configuration})`);
  });
} else {
  console.log('❌ Aucune catégorie personnalisée trouvée!');
}

console.log('\n✅ Test terminé');

