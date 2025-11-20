import { useState, useEffect, useRef } from 'react';
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

  const loadConfiguration = async (forceRefresh = false) => {
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
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  // Fonction pour forcer le rafraîchissement
  const refresh = () => {
    loadConfiguration(true);
  };

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

