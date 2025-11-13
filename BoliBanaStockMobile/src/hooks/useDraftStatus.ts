import { useState, useEffect } from 'react';
import { loadReceptionDraft, loadInventoryDraft, loadLossDraft, loadSalesCartDraft } from '../utils/draftStorage';

export interface DraftStatus {
  hasReceptionDraft: boolean;
  hasInventoryDraft: boolean;
  hasLossDraft: boolean;
  hasSalesCartDraft: boolean;
}

export const useDraftStatus = () => {
  const [draftStatus, setDraftStatus] = useState<DraftStatus>({
    hasReceptionDraft: false,
    hasInventoryDraft: false,
    hasLossDraft: false,
    hasSalesCartDraft: false,
  });

  useEffect(() => {
    const checkDrafts = async () => {
      try {
        const [receptionDraft, inventoryDraft, lossDraft, salesCartDraft] = await Promise.all([
          loadReceptionDraft(),
          loadInventoryDraft(),
          loadLossDraft(),
          loadSalesCartDraft(),
        ]);

        setDraftStatus({
          hasReceptionDraft: Array.isArray(receptionDraft) && receptionDraft.length > 0,
          hasInventoryDraft: Array.isArray(inventoryDraft) && inventoryDraft.length > 0,
          hasLossDraft: Array.isArray(lossDraft) && lossDraft.length > 0,
          hasSalesCartDraft: Array.isArray(salesCartDraft) && salesCartDraft.length > 0,
        });
      } catch (error) {
        console.error('❌ Erreur lors de la vérification des brouillons:', error);
      }
    };

    checkDrafts();
    
    // Vérifier périodiquement les brouillons (toutes les 2 secondes)
    const interval = setInterval(checkDrafts, 2000);

    return () => clearInterval(interval);
  }, []);

  return draftStatus;
};

