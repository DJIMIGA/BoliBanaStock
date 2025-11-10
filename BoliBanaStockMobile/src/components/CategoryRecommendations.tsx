import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';

interface CategoryRecommendation {
  id: number;
  name: string;
  level: number;
  is_rayon: boolean;
  rayon_type?: string;
  parent?: {
    id: number;
    name: string;
    rayon_type?: string;
  } | null;
  score?: number;
  frequency?: number;
}

interface CategoryRecommendationsProps {
  recommendations: CategoryRecommendation[];
  loading?: boolean;
  error?: string;
  onSelect: (categoryId: number, categoryName: string) => void;
  onDismiss?: () => void;
}

const CategoryRecommendations: React.FC<CategoryRecommendationsProps> = ({
  recommendations,
  loading = false,
  error,
  onSelect,
  onDismiss,
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (recommendations.length > 0 || error) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [recommendations.length, error]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Recherche de catégories...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color={theme.colors.error[500]} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </Animated.View>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyText}>
            Aucune catégorie trouvée, essayez un nom plus précis
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="bulb-outline" size={16} color={theme.colors.primary[500]} />
          <Text style={styles.headerText}>
            Suggestions ({recommendations.length})
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={18} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.recommendationsList}>
        {recommendations.map((rec, index) => (
          <TouchableOpacity
            key={rec.id}
            style={styles.recommendationItem}
            onPress={() => onSelect(rec.id, rec.name)}
            activeOpacity={0.7}
          >
            <View style={styles.recommendationContent}>
              <View style={styles.recommendationHeader}>
                <View style={styles.recommendationNameContainer}>
                  {rec.level === 1 && (
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>Sous-catégorie</Text>
                    </View>
                  )}
                  {rec.level === 0 && rec.is_rayon && (
                    <View style={[styles.levelBadge, styles.rayonBadge]}>
                      <Text style={styles.levelBadgeText}>Rayon</Text>
                    </View>
                  )}
                  <Text style={styles.recommendationName} numberOfLines={1}>
                    {rec.name}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.text.tertiary}
                />
              </View>

              {rec.parent && (
                <View style={styles.parentContainer}>
                  <Ionicons
                    name="arrow-down"
                    size={12}
                    color={theme.colors.text.tertiary}
                  />
                  <Text style={styles.parentText}>
                    {rec.parent.name}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.error[50],
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.error[200],
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error[600],
    flex: 1,
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 8,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  dismissButton: {
    padding: 4,
  },
  recommendationsList: {
    gap: 6,
  },
  recommendationItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    overflow: 'hidden',
  },
  recommendationContent: {
    padding: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recommendationNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  recommendationName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text.primary,
    flex: 1,
  },
  levelBadge: {
    backgroundColor: theme.colors.primary[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rayonBadge: {
    backgroundColor: theme.colors.success[100],
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primary[700],
    textTransform: 'uppercase',
  },
  parentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingLeft: 20,
  },
  parentText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
  },
});

export default CategoryRecommendations;

