import AsyncStorage from '@react-native-async-storage/async-storage';

const RECEPTION_KEY = '@bbstock:reception_draft';
const INVENTORY_KEY = '@bbstock:inventory_draft';
const SALES_KEY = '@bbstock:sales_cart_draft';

export async function saveReceptionDraft(items: any[]) {
  try {
    console.log('🔍 [DRAFT] Sauvegarde brouillon réception:', items?.length || 0, 'items');
    if (items && items.length > 0) {
      items.forEach((it: any, index: number) => {
        console.log(`🔍 [DRAFT] Item ${index} à sauvegarder:`, {
          line_id: it.line_id,
          product_id: it.product?.id,
          product_name: it.product?.name,
          notes: it.notes,
          notes_type: typeof it.notes,
          notes_length: it.notes?.length || 0,
          notes_starts_with_prefix: it.notes?.toLowerCase()?.startsWith('réception marchandise') || false
        });
      });
    }
    await AsyncStorage.setItem(RECEPTION_KEY, JSON.stringify(items || []));
    console.log('🔍 [DRAFT] Brouillon réception sauvegardé avec succès');
  } catch (e) {
    console.warn('saveReceptionDraft failed', e);
  }
}

export async function loadReceptionDraft(): Promise<any[] | null> {
  try {
    const raw = await AsyncStorage.getItem(RECEPTION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('loadReceptionDraft failed', e);
    return null;
  }
}

export async function clearReceptionDraft() {
  try {
    await AsyncStorage.removeItem(RECEPTION_KEY);
  } catch (e) {
    console.warn('clearReceptionDraft failed', e);
  }
}

export async function saveInventoryDraft(items: any[]) {
  try {
    await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(items || []));
  } catch (e) {
    console.warn('saveInventoryDraft failed', e);
  }
}

export async function loadInventoryDraft(): Promise<any[] | null> {
  try {
    const raw = await AsyncStorage.getItem(INVENTORY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('loadInventoryDraft failed', e);
    return null;
  }
}

export async function clearInventoryDraft() {
  try {
    await AsyncStorage.removeItem(INVENTORY_KEY);
  } catch (e) {
    console.warn('clearInventoryDraft failed', e);
  }
}

export async function saveSalesCartDraft(items: any[]) {
  try {
    await AsyncStorage.setItem(SALES_KEY, JSON.stringify(items || []));
  } catch (e) {
    console.warn('saveSalesCartDraft failed', e);
  }
}

export async function loadSalesCartDraft(): Promise<any[] | null> {
  try {
    const raw = await AsyncStorage.getItem(SALES_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('loadSalesCartDraft failed', e);
    return null;
  }
}

export async function clearSalesCartDraft() {
  try {
    await AsyncStorage.removeItem(SALES_KEY);
  } catch (e) {
    console.warn('clearSalesCartDraft failed', e);
  }
}


