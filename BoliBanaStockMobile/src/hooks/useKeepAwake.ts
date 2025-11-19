import { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as KeepAwake from 'expo-keep-awake';

const KEEP_SCREEN_AWAKE_KEY = '@bbstock:keep_screen_awake';

// Système de notification simple pour les changements de préférence
type KeepAwakeListener = () => void;
const listeners: Set<KeepAwakeListener> = new Set();

// Fonction utilitaire pour notifier les changements
export const notifyKeepAwakeChanged = () => {
  listeners.forEach(listener => listener());
};

/**
 * Hook pour gérer le mode veille de l'écran
 * Par défaut, l'écran peut s'éteindre normalement pour économiser la batterie
 * 
 * @param enabled - Si true, empêche l'écran de s'éteindre. Si false (défaut), permet le mode veille normal
 */
export const useKeepAwake = (enabled: boolean = false) => {
  useFocusEffect(
    useCallback(() => {
      if (enabled) {
        // Activer le mode "keep awake" uniquement si explicitement demandé
        KeepAwake.activateKeepAwake();
        console.log('🔋 Mode veille désactivé - écran restera allumé');
      } else {
        // Par défaut, permettre le mode veille normal
        KeepAwake.deactivateKeepAwake();
      }

      // Cleanup: réactiver le mode veille normal quand on quitte l'écran
      return () => {
        KeepAwake.deactivateKeepAwake();
        console.log('🔋 Mode veille réactivé - écran peut s\'éteindre');
      };
    }, [enabled])
  );
};

/**
 * Hook global pour gérer le mode veille selon les préférences utilisateur
 * Utilisé dans App.tsx pour contrôler si l'écran doit rester allumé ou non
 */
export const useGlobalKeepAwake = () => {
  const [keepAwake, setKeepAwake] = useState<boolean | null>(null);

  useEffect(() => {
    // Charger la préférence depuis AsyncStorage
    const loadPreference = async () => {
      try {
        const value = await AsyncStorage.getItem(KEEP_SCREEN_AWAKE_KEY);
        const shouldKeepAwake = value !== null ? JSON.parse(value) : false;
        setKeepAwake(shouldKeepAwake);
        
        if (shouldKeepAwake) {
          KeepAwake.activateKeepAwake();
          console.log('🔋 Mode veille désactivé - écran restera allumé (préférence utilisateur)');
        } else {
          KeepAwake.deactivateKeepAwake();
          console.log('🔋 Mode veille activé - écran peut s\'éteindre normalement');
        }
      } catch (error) {
        console.error('Erreur chargement préférence écran:', error);
        // Par défaut, permettre la veille
        KeepAwake.deactivateKeepAwake();
        setKeepAwake(false);
      }
    };

    loadPreference();

    // Fonction pour mettre à jour la préférence
    const updatePreference = async () => {
      try {
        const value = await AsyncStorage.getItem(KEEP_SCREEN_AWAKE_KEY);
        const shouldKeepAwake = value !== null ? JSON.parse(value) : false;
        
        if (shouldKeepAwake !== keepAwake) {
          setKeepAwake(shouldKeepAwake);
          if (shouldKeepAwake) {
            KeepAwake.activateKeepAwake();
            console.log('🔋 Préférence changée - écran restera allumé');
          } else {
            KeepAwake.deactivateKeepAwake();
            console.log('🔋 Préférence changée - veille activée');
          }
        }
      } catch (error) {
        console.error('Erreur vérification préférence écran:', error);
      }
    };

    // Ajouter le listener
    listeners.add(updatePreference);

    // Cleanup au démontage
    return () => {
      listeners.delete(updatePreference);
      KeepAwake.deactivateKeepAwake();
    };
  }, [keepAwake]);
};

