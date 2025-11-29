import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../utils/theme';
import { formatCurrency } from '../utils/currencyFormatter';

const { width, height } = Dimensions.get('window');

interface PaymentMethodModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMethod: (method: 'cash' | 'credit' | 'sarali') => void;
  totalAmount: number;
}

export default function PaymentMethodModal({
  visible,
  onClose,
  onSelectMethod,
  totalAmount,
}: PaymentMethodModalProps) {
  // Hauteur approximative du modal (header + total + 3 méthodes + footer + padding)
  const modalHeight = 500;
  const slideAnim = React.useRef(new Animated.Value(modalHeight)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: modalHeight,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleMethodSelect = (method: 'cash' | 'credit' | 'sarali') => {
    onSelectMethod(method);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.title}>Mode de Paiement</Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Total Amount */}
              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Total à payer</Text>
                <Text style={styles.totalAmount}>
                  {formatCurrency(totalAmount)}
                </Text>
              </View>

              {/* Payment Methods */}
              <View style={styles.methodsContainer}>
                {/* Cash Payment */}
                <TouchableOpacity
                  style={[styles.methodButton, styles.cashButton]}
                  onPress={() => handleMethodSelect('cash')}
                >
                  <View style={styles.methodIcon}>
                    <Ionicons name="cash-outline" size={32} color="white" />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodTitle}>Liquide</Text>
                    <Text style={styles.methodSubtitle}>Paiement en espèces</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </TouchableOpacity>

                {/* Credit Payment */}
                <TouchableOpacity
                  style={[styles.methodButton, styles.creditButton]}
                  onPress={() => handleMethodSelect('credit')}
                >
                  <View style={styles.methodIcon}>
                    <Ionicons name="card-outline" size={32} color="white" />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodTitle}>Crédit</Text>
                    <Text style={styles.methodSubtitle}>Paiement différé</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </TouchableOpacity>

                {/* Sarali Payment */}
                <TouchableOpacity
                  style={[styles.methodButton, styles.saraliButton]}
                  onPress={() => handleMethodSelect('sarali')}
                >
                  <View style={styles.methodIcon}>
                    <Ionicons name="phone-portrait-outline" size={32} color="white" />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodTitle}>Sarali</Text>
                    <Text style={styles.methodSubtitle}>Mobile Money</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Choisissez votre mode de paiement préféré
                </Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9, // Maximum 90% de la hauteur de l'écran
    width: '100%',
  },
  safeArea: {
    maxHeight: height * 0.9,
  },
  scrollView: {
    maxHeight: height * 0.75, // Limiter la hauteur du scroll
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 32, // Même largeur que le bouton retour pour équilibrer
  },
  totalSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.primary[50],
  },
  totalLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary[600],
  },
  methodsContainer: {
    padding: 20,
    gap: 16,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    ...theme.shadows.md,
  },
  cashButton: {
    backgroundColor: theme.colors.success[500],
  },
  creditButton: {
    backgroundColor: theme.colors.warning[500],
  },
  saraliButton: {
    backgroundColor: theme.colors.info[500],
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  methodSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});
