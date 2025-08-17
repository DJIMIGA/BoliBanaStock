import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface KeyDebuggerProps {
  data: any[];
  name: string;
}

const KeyDebugger: React.FC<KeyDebuggerProps> = ({ data, name }) => {
  useEffect(() => {
    if (!data || !Array.isArray(data)) {
      console.log(`🔍 [${name}] Données invalides:`, data);
      return;
    }

    // Vérifier les clés dupliquées
    const ids = data.map(item => item?.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    
    if (duplicates.length > 0) {
      console.warn(`⚠️ [${name}] Clés dupliquées détectées:`, duplicates);
      console.warn(`📊 [${name}] Données complètes:`, data);
    } else {
      console.log(`✅ [${name}] Aucune clé dupliquée détectée (${data.length} éléments)`);
    }

    // Vérifier les éléments sans ID
    const itemsWithoutId = data.filter(item => !item?.id);
    if (itemsWithoutId.length > 0) {
      console.warn(`⚠️ [${name}] Éléments sans ID:`, itemsWithoutId);
    }
  }, [data, name]);

  return null; // Composant invisible
};

export default KeyDebugger;
