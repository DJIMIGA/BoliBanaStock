import { useState, useEffect, useRef, useCallback } from 'react';
import { configurationService } from '../services/api';

export interface Configuration {
  id: number;
  nom_societe: string;
  adresse: string;
  telephone: string;
  email: string;
  devise: string;
  tva: number;
  site_web: string;
  description: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ConfigurationCache {
  configuration: Configuration | null;
  timestamp: number;
}

// Cache global avec expiration de 5 minutes
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes en millisecondes
let globalCache: ConfigurationCache | null = null;

export const useConfiguration = () => {
  const [configuration, setConfiguration] = useState<Configuration | null>(
    globalCache?.configuration || null
  );
  const [loading, setLoading] = useState(!globalCache);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadConfiguration = useCallback(async (forceRefresh = false) => {
    // Vérifier le cache si pas de refresh forcé
    if (!forceRefresh && globalCache) {
      const now = Date.now();
      const cacheAge = now - globalCache.timestamp;
      
      if (cacheAge < CACHE_DURATION && globalCache.configuration) {
        if (isMountedRef.current) {
          setConfiguration(globalCache.configuration);
          setLoading(false);
        }
        return;
      }
    }

    try {
      if (isMountedRef.current) {
        setLoading(true);
        setError(null);
      }

      const response = await configurationService.getConfiguration();
      
      if (response.success && response.configuration) {
        const config = response.configuration;
        
        // Mettre à jour le cache global
        globalCache = {
          configuration: config,
          timestamp: Date.now(),
        };

        if (isMountedRef.current) {
          setConfiguration(config);
          setLoading(false);
        }
      } else {
        throw new Error('Configuration non disponible');
      }
    } catch (err: any) {
      console.error('Erreur chargement configuration:', err);
      
      if (isMountedRef.current) {
        setError(err.message || 'Impossible de charger la configuration');
        setLoading(false);
        
        // En cas d'erreur, utiliser le cache s'il existe
        if (globalCache?.configuration) {
          setConfiguration(globalCache.configuration);
        }
      }
    }
  }, []);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  // Fonction pour forcer le rafraîchissement (mémorisée pour éviter les re-renders)
  const refresh = useCallback(() => {
    loadConfiguration(true);
  }, [loadConfiguration]);

  // Fonction pour obtenir la devise avec fallback
  const getCurrency = (): string => {
    return configuration?.devise || 'FCFA';
  };

  // Fonction pour invalider le cache (utile après une mise à jour)
  const invalidateCache = () => {
    globalCache = null;
    loadConfiguration(true);
  };

  return {
    configuration,
    loading,
    error,
    currency: getCurrency(),
    refresh,
    invalidateCache,
  };
};

// Fonction utilitaire pour obtenir la devise depuis le cache sans hook
export const getCachedCurrency = (): string => {
  if (globalCache?.configuration?.devise) {
    return globalCache.configuration.devise;
  }
  return 'FCFA';
};

// Liste des callbacks pour notifier les écrans du changement de configuration
let cacheUpdateCallbacks: Array<() => void> = [];

// Fonction pour notifier tous les abonnés d'un changement de cache
const notifyCacheUpdate = () => {
  cacheUpdateCallbacks.forEach(callback => {
    try {
      callback();
    } catch (error) {
      console.error('Erreur lors de la notification de mise à jour du cache:', error);
    }
  });
};

// Fonction pour mettre à jour le cache global (utile après une sauvegarde)
export const updateCache = (configuration: Configuration) => {
  globalCache = {
    configuration: configuration,
    timestamp: Date.now(),
  };
  console.log('🔄 [CONFIG] Cache mis à jour - Devise:', configuration.devise);
  notifyCacheUpdate();
};

// Fonction pour s'abonner aux mises à jour du cache
export const subscribeToCacheUpdates = (callback: () => void) => {
  cacheUpdateCallbacks.push(callback);
  return () => {
    cacheUpdateCallbacks = cacheUpdateCallbacks.filter(cb => cb !== callback);
  };
};

// Fonction pour invalider le cache global
export const invalidateGlobalCache = () => {
  globalCache = null;
  console.log('🔄 [CONFIG] Cache invalidé');
  notifyCacheUpdate(); // Notify subscribers
};

// Fonction pour initialiser le cache au démarrage (peut être appelée sans hook)
export const initializeConfigurationCache = async (): Promise<void> => {
  try {
    const response = await configurationService.getConfiguration();
    if (response.success && response.configuration) {
      globalCache = {
        configuration: response.configuration,
        timestamp: Date.now(),
      };
      console.log('✅ [CONFIG] Cache initialisé au démarrage - Devise:', response.configuration.devise);
      notifyCacheUpdate();
    }
  } catch (error) {
    console.error('❌ [CONFIG] Erreur initialisation cache:', error);
  }
};

