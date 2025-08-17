import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';

interface Barcode {
  id: string | number;
  ean: string;
  is_primary: boolean;
  notes?: string;
  added_at?: string;
}

interface BarcodeManagerProps {
  barcodes: Barcode[];
  onAddBarcode: (ean: string, notes?: string) => void;
  onRemoveBarcode: (id: string | number) => void;
  onSetPrimary: (id: string | number) => void;
  onUpdateBarcode: (id: string | number, ean: string, notes?: string) => void;
}

// Composant pour afficher un code-barres visuel
const VisualBarcode: React.FC<{ ean: string; isPrimary: boolean }> = ({ ean, isPrimary }) => {
  // Générer des barres basées sur l'EAN pour un effet visuel cohérent
  const generateBars = (ean: string) => {
    const bars = [];
    const eanDigits = ean.replace(/\s/g, '').split('').map(d => parseInt(d));
    
    // Créer un motif de barres basé sur les chiffres de l'EAN
    for (let i = 0; i < eanDigits.length; i++) {
      const digit = eanDigits[i];
      const baseHeight = 20 + (digit * 2); // Hauteur basée sur le chiffre
      
      // Barre principale
      bars.push({ height: baseHeight, width: 2, isMain: true });
      
      // Barres secondaires
      for (let j = 0; j < 2; j++) {
        const subHeight = baseHeight * 0.6 + (j * 3);
        bars.push({ height: subHeight, width: 1, isMain: false });
      }
    }
    
    return bars;
  };

  const bars = generateBars(ean);

  return (
    <View style={styles.visualBarcodeContainer}>
      <View style={styles.barcodeBars}>
        {bars.map((bar, index) => (
          <View
            key={index}
            style={[
              styles.barcodeBar,
              {
                height: bar.height,
                width: bar.width,
                backgroundColor: isPrimary 
                  ? (bar.isMain ? theme.colors.warning[700] : theme.colors.warning[400])
                  : (bar.isMain ? theme.colors.neutral[800] : theme.colors.neutral[500]),
              }
            ]}
          />
        ))}
      </View>
      <View style={styles.barcodeTextContainer}>
        <Text style={[styles.barcodeNumber, isPrimary && styles.primaryBarcodeNumber]}>
          {ean}
        </Text>
        <Text style={styles.barcodeType}>EAN-13</Text>
      </View>
    </View>
  );
};

export default function BarcodeManager({
  barcodes,
  onAddBarcode,
  onRemoveBarcode,
  onSetPrimary,
  onUpdateBarcode,
}: BarcodeManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBarcode, setEditingBarcode] = useState<Barcode | null>(null);
  const [newEan, setNewEan] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation EAN-13
  const validateEAN = (ean: string): boolean => {
    const cleanEan = ean.replace(/\s/g, '');
    
    // Vérifier la longueur (EAN-13 = 13 chiffres)
    if (cleanEan.length !== 13) {
      return false;
    }
    
    // Vérifier que ce sont bien des chiffres
    if (!/^\d{13}$/.test(cleanEan)) {
      return false;
    }
    
    // Algorithme de validation EAN-13
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(cleanEan[i]);
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(cleanEan[12]);
  };

  const formatEAN = (ean: string): string => {
    const cleanEan = ean.replace(/\s/g, '');
    if (cleanEan.length <= 4) return cleanEan;
    if (cleanEan.length <= 8) return `${cleanEan.slice(0, 4)} ${cleanEan.slice(4)}`;
    return `${cleanEan.slice(0, 4)} ${cleanEan.slice(4, 8)} ${cleanEan.slice(8)}`;
  };

  const handleAddBarcode = async () => {
    if (!newEan.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un code-barres');
      return;
    }

    const cleanEan = newEan.trim().replace(/\s/g, '');
    
    // Validation EAN-13
    if (!validateEAN(cleanEan)) {
      Alert.alert(
        'Code-barres invalide',
        'Veuillez saisir un code-barres EAN-13 valide (13 chiffres)',
        [{ text: 'OK' }]
      );
      return;
    }

    // Vérifier que le code-barres n'existe pas déjà
    const exists = barcodes.some(b => b.ean.replace(/\s/g, '') === cleanEan);
    if (exists) {
      Alert.alert('Erreur', 'Ce code-barres existe déjà pour ce produit');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddBarcode(cleanEan, newNotes.trim() || undefined);
      
      // Succès
      setNewEan('');
      setNewNotes('');
      setShowAddForm(false);
      
      Alert.alert(
        'Succès',
        'Code-barres ajouté avec succès !',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter le code-barres');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBarcode = async () => {
    if (!editingBarcode || !newEan.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un code-barres');
      return;
    }

    const cleanEan = newEan.trim().replace(/\s/g, '');
    
    // Validation EAN-13
    if (!validateEAN(cleanEan)) {
      Alert.alert(
        'Code-barres invalide',
        'Veuillez saisir un code-barres EAN-13 valide (13 chiffres)',
        [{ text: 'OK' }]
      );
      return;
    }

    // Vérifier que le code-barres n'existe pas déjà (sauf pour celui qu'on modifie)
    const exists = barcodes.some(b => 
      b.ean.replace(/\s/g, '') === cleanEan && b.id !== editingBarcode.id
    );
    if (exists) {
      Alert.alert('Erreur', 'Ce code-barres existe déjà pour ce produit');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateBarcode(editingBarcode.id, cleanEan, newNotes.trim() || undefined);
      
      // Succès
      setNewEan('');
      setNewNotes('');
      setEditingBarcode(null);
      
      Alert.alert(
        'Succès',
        'Code-barres modifié avec succès !',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le code-barres');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (barcode: Barcode) => {
    setEditingBarcode(barcode);
    setNewEan(barcode.ean);
    setNewNotes(barcode.notes || '');
  };

  const cancelEdit = () => {
    setEditingBarcode(null);
    setNewEan('');
    setNewNotes('');
    setShowAddForm(false);
  };

  const confirmRemove = (barcode: Barcode) => {
    if (barcode.is_primary && barcodes.length > 1) {
      Alert.alert(
        'Attention',
        'Vous ne pouvez pas supprimer le code-barres principal s\'il y en a d\'autres. Définissez d\'abord un autre code-barres comme principal.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Confirmer la suppression',
      `Voulez-vous vraiment supprimer le code-barres ${formatEAN(barcode.ean)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await onRemoveBarcode(barcode.id);
              Alert.alert('Succès', 'Code-barres supprimé avec succès');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le code-barres');
            }
          }
        }
      ]
    );
  };

  const confirmSetPrimary = (barcode: Barcode) => {
    if (barcode.is_primary) return;
    
    Alert.alert(
      'Définir comme principal',
      `Voulez-vous définir ${formatEAN(barcode.ean)} comme code-barres principal ?\n\nLe code-barres principal actuel deviendra secondaire.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Définir', 
          onPress: async () => {
            try {
              await onSetPrimary(barcode.id);
              Alert.alert('Succès', 'Code-barres défini comme principal !');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de définir ce code-barres comme principal');
            }
          }
        }
      ]
    );
  };

  const getPrimaryBarcode = () => {
    return barcodes.find(b => b.is_primary);
  };

  const primaryBarcode = getPrimaryBarcode();

  return (
    <View style={styles.container}>
      {/* En-tête avec statistiques */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Codes-barres (EAN)</Text>
          <Text style={styles.subtitle}>
            {barcodes.length} code{barcodes.length > 1 ? 's' : ''}-barres 
            {primaryBarcode ? ` • Principal: ${formatEAN(primaryBarcode.ean)}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, showAddForm && styles.addButtonActive]}
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Ionicons 
            name={showAddForm ? "close" : "add"} 
            size={20} 
            color={theme.colors.text.inverse} 
          />
          <Text style={styles.addButtonText}>
            {showAddForm ? 'Annuler' : 'Ajouter'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary[500]} />
            {' '}Nouveau code-barres
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Code-barres EAN-13 (13 chiffres)"
            value={newEan}
            onChangeText={(text) => setNewEan(formatEAN(text))}
            keyboardType="numeric"
            maxLength={17} // 13 chiffres + 2 espaces
            autoFocus
          />
          <Text style={styles.helpText}>
            Format: XXXX XXXX XXXXX (13 chiffres)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Notes (optionnel)"
            value={newNotes}
            onChangeText={setNewNotes}
            multiline
            numberOfLines={2}
          />
          <View style={styles.formButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]} 
              onPress={handleAddBarcode}
              disabled={isSubmitting}
            >
              <Text style={styles.saveButtonText}>
                {isSubmitting ? 'Ajout...' : 'Ajouter'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Formulaire de modification */}
      {editingBarcode && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            <Ionicons name="create-outline" size={20} color={theme.colors.warning[500]} />
            {' '}Modifier le code-barres
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Code-barres EAN-13 (13 chiffres)"
            value={newEan}
            onChangeText={(text) => setNewEan(formatEAN(text))}
            keyboardType="numeric"
            maxLength={17}
            autoFocus
          />
          <Text style={styles.helpText}>
            Format: XXXX XXXX XXXXX (13 chiffres)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Notes (optionnel)"
            value={newNotes}
            onChangeText={setNewNotes}
            multiline
            numberOfLines={2}
          />
          <View style={styles.formButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]} 
              onPress={handleUpdateBarcode}
              disabled={isSubmitting}
            >
              <Text style={styles.saveButtonText}>
                {isSubmitting ? 'Modification...' : 'Modifier'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Liste des codes-barres */}
      <ScrollView style={styles.barcodeList} showsVerticalScrollIndicator={false}>
        {!barcodes || barcodes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="barcode-outline" size={48} color={theme.colors.neutral[400]} />
            <Text style={styles.emptyText}>Aucun code-barres défini</Text>
            <Text style={styles.emptySubtext}>
              Ajoutez votre premier code-barres pour commencer
            </Text>
            <TouchableOpacity 
              style={styles.addFirstButton}
              onPress={() => setShowAddForm(true)}
            >
              <Ionicons name="add-circle" size={20} color={theme.colors.primary[500]} />
              <Text style={styles.addFirstButtonText}>Ajouter le premier</Text>
            </TouchableOpacity>
          </View>
        ) : (
          barcodes.map((barcode) => (
            <View key={barcode.id} style={[
              styles.barcodeItem,
              barcode.is_primary && styles.primaryBarcodeItem
            ]}>
              <View style={styles.barcodeInfo}>
                {/* Code-barres visuel */}
                <VisualBarcode ean={formatEAN(barcode.ean)} isPrimary={barcode.is_primary} />
                
                {/* Badge principal */}
                {barcode.is_primary && (
                  <View style={styles.primaryBadge}>
                    <Ionicons name="star" size={12} color={theme.colors.warning[600]} />
                    <Text style={styles.primaryText}>Principal</Text>
                  </View>
                )}
                
                {/* Notes */}
                {barcode.notes && (
                  <Text style={styles.notesText}>{barcode.notes}</Text>
                )}
                
                {/* Date d'ajout */}
                {barcode.added_at && (
                  <Text style={styles.dateText}>
                    <Ionicons name="time-outline" size={12} color={theme.colors.neutral[400]} />
                    {' '}Ajouté le {new Date(barcode.added_at).toLocaleDateString('fr-FR')}
                  </Text>
                )}
                
                {/* Boutons d'action en dessous */}
                <View style={styles.barcodeActions}>
                  {!barcode.is_primary && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.primaryActionButton]}
                      onPress={() => confirmSetPrimary(barcode)}
                    >
                      <Ionicons name="star-outline" size={16} color={theme.colors.warning[500]} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editActionButton]}
                    onPress={() => startEdit(barcode)}
                  >
                    <Ionicons name="pencil" size={16} color={theme.colors.primary[500]} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteActionButton]}
                    onPress={() => confirmRemove(barcode)}
                    disabled={barcode.is_primary && barcodes.length === 1}
                  >
                    <Ionicons 
                      name="trash" 
                      size={16} 
                      color={barcode.is_primary && barcodes.length === 1 
                        ? theme.colors.neutral[400] 
                        : theme.colors.error[500]
                      } 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  headerInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.neutral[800],
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.neutral[600],
    marginTop: theme.spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    flexShrink: 0,
  },
  addButtonActive: {
    backgroundColor: theme.colors.error[500],
  },
  addButtonText: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  form: {
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.neutral[50],
    fontSize: 16,
  },
  helpText: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.sm,
    fontStyle: 'italic',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    backgroundColor: theme.colors.neutral[100],
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.neutral[600],
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.neutral[300],
    opacity: 0.7,
  },
  saveButtonText: {
    color: theme.colors.neutral[50],
    fontWeight: '600',
  },
  barcodeList: {
    flex: 1,
    marginTop: theme.spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.neutral[500],
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
    fontSize: 16,
  },
  emptySubtext: {
    textAlign: 'center',
    color: theme.colors.neutral[400],
    marginTop: theme.spacing.xs,
    fontSize: 14,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[100],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  addFirstButtonText: {
    color: theme.colors.primary[700],
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  barcodeItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  primaryBarcodeItem: {
    borderColor: theme.colors.warning[100],
    borderWidth: 2,
    backgroundColor: theme.colors.warning[50],
  },
  barcodeInfo: {
    flex: 1,
    minWidth: 0, // Permet au contenu de se rétrécir
  },
  barcodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    flexWrap: 'nowrap', // Empêche le retour à la ligne
  },
  eanText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginRight: theme.spacing.sm,
    fontFamily: 'monospace',
    flexShrink: 0, // Empêche le texte de se rétrécir
    minWidth: 0, // Permet au contenu de se rétrécir si nécessaire
  },
  primaryEanText: {
    color: theme.colors.warning[700],
    fontWeight: '700',
  },
  primaryBadge: {
    backgroundColor: theme.colors.success[100],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.success[200],
    flexShrink: 0,
  },
  primaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.success[700],
  },
  notesText: {
    fontSize: 14,
    color: theme.colors.neutral[600],
    marginBottom: theme.spacing.xs,
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm, // Espace avant les boutons
  },
  barcodeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm, // Espacement normal entre les boutons
    flexWrap: 'wrap', // Permet aux boutons de passer à la ligne si nécessaire
  },
  actionButton: {
    padding: theme.spacing.sm, // Padding normal pour une meilleure ergonomie
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    minWidth: 40, // Largeur minimale confortable
    minHeight: 40, // Hauteur minimale confortable
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionButton: {
    backgroundColor: theme.colors.warning[100],
    borderColor: theme.colors.warning[200],
  },
  editActionButton: {
    backgroundColor: theme.colors.primary[100],
    borderColor: theme.colors.primary[200],
  },
  deleteActionButton: {
    backgroundColor: theme.colors.error[100],
    borderColor: theme.colors.error[200],
  },
  visualBarcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm, // Réduit le padding
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    minHeight: 80, // Hauteur minimale pour utiliser l'espace
  },
  barcodeBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 50, // Hauteur augmentée pour plus d'impact visuel
    marginRight: theme.spacing.sm, // Réduit la marge droite
    flex: 1, // Prend tout l'espace disponible
  },
  barcodeBar: {
    marginHorizontal: 0.5, // Espacement minimal entre les barres
    borderRadius: 1,
  },
  barcodeNumber: {
    fontSize: 18, // Taille augmentée
    fontWeight: '700', // Plus gras
    color: theme.colors.neutral[800],
    fontFamily: 'monospace',
    flexShrink: 0,
    textAlign: 'right',
  },
  primaryBarcodeNumber: {
    color: theme.colors.warning[700],
    fontWeight: '800',
  },
  barcodeTextContainer: {
    flex: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 110, // Réduit légèrement la largeur minimale
  },
  barcodeType: {
    fontSize: 11, // Plus petit
    color: theme.colors.neutral[500],
    marginTop: theme.spacing.xs,
    textAlign: 'right',
    fontFamily: 'monospace',
    fontWeight: '500',
  },
});
