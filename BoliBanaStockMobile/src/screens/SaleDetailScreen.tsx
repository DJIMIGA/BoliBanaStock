import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { saleService } from '../services/api';

interface SaleItem {
  id: number;
  product_name: string;
  product_cug: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Sale {
  id: number;
  sale_date: string;
  reference: string;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  status: string;
  items: SaleItem[];
}

export default function SaleDetailScreen({ route, navigation }: any) {
  const { saleId } = route.params;
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSaleDetail();
  }, [saleId]);

  const loadSaleDetail = async () => {
    try {
      setLoading(true);
      console.log('🏪 [SALE_DETAIL] Chargement détail vente ID:', saleId);
      console.log('🏪 [SALE_DETAIL] Type de saleId:', typeof saleId);
      const data = await saleService.getSale(saleId);
      console.log('🏪 [SALE_DETAIL] Données reçues:', JSON.stringify(data, null, 2));
      console.log('🏪 [SALE_DETAIL] Items dans les données:', data?.items);
      console.log('🏪 [SALE_DETAIL] Type des items:', typeof data?.items);
      console.log('🏪 [SALE_DETAIL] Longueur des items:', data?.items?.length);
      setSale(data);
    } catch (error) {
      console.error('❌ [SALE_DETAIL] Erreur chargement détail vente:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la vente');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Espèces';
      case 'card':
        return 'Carte';
      case 'mobile_money':
        return 'Mobile Money';
      case 'transfer':
        return 'Virement';
      default:
        return method;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulée';
      default:
        return 'Inconnu';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const handleShare = async () => {
    if (!sale) return;

    const shareText = `Vente #${sale.reference || sale.id}
Client: ${sale.customer_name}
Date: ${formatDate(sale.sale_date)}
Total: ${sale.total_amount.toLocaleString()} FCFA
Méthode de paiement: ${getPaymentMethodText(sale.payment_method)}
Statut: ${getStatusText(sale.status)}

Articles:
${sale.items.map(item => 
  `• ${item.product_name} (${item.product_cug}) - ${item.quantity}x ${item.unit_price.toLocaleString()} FCFA = ${item.total_price.toLocaleString()} FCFA`
).join('\n')}`;

    try {
      await Share.share({
        message: shareText,
        title: `Vente #${sale.reference || sale.id}`,
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const handlePrint = () => {
    // TODO: Implémenter l'impression
    Alert.alert('Impression', 'Fonctionnalité d\'impression à implémenter');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Chargement des détails...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!sale) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#F44336" />
          <Text style={styles.errorText}>Vente non trouvée</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Vente #{sale.reference || sale.id}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
            <Ionicons name="share-outline" size={24} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePrint} style={styles.actionButton}>
            <Ionicons name="print-outline" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Informations générales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations générales</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Référence:</Text>
              <Text style={styles.infoValue}>#{sale.reference || sale.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>{formatDate(sale.sale_date)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Client:</Text>
              <Text style={styles.infoValue}>{sale.customer_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Paiement:</Text>
              <Text style={styles.infoValue}>{getPaymentMethodText(sale.payment_method)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Statut:</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sale.status) }]}>
                <Text style={styles.statusText}>{getStatusText(sale.status)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Articles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Articles ({sale.items.length} article{sale.items.length > 1 ? 's' : ''})
          </Text>
          <View style={styles.itemsCard}>
            {sale.items.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemCug}>CUG: {item.product_cug}</Text>
                </View>
                <View style={styles.itemQuantities}>
                  <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                  <Text style={styles.itemPrice}>{item.unit_price.toLocaleString()} FCFA</Text>
                </View>
                <Text style={styles.itemTotal}>{item.total_price.toLocaleString()} FCFA</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Total */}
        <View style={styles.section}>
          <View style={styles.totalCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>{sale.total_amount.toLocaleString()} FCFA</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 15,
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  itemsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemCug: {
    fontSize: 12,
    color: '#666',
  },
  itemQuantities: {
    alignItems: 'center',
    marginHorizontal: 15,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  itemPrice: {
    fontSize: 12,
    color: '#666',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    minWidth: 80,
    textAlign: 'right',
  },
  totalCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});
