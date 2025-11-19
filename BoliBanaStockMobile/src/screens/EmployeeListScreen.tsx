import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import theme from '../utils/theme';
import { useUserPermissions } from '../hooks/useUserPermissions';

interface Employee {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  telephone?: string;
  poste?: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_site_admin: boolean;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
  derniere_connexion?: string;
}

const EmployeeListScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { canManageUsers } = useUserPermissions();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEmployees = async () => {
    try {
      const response = await api.get('/users/list/');
      if (response.data.success) {
        setEmployees(response.data.users || []);
      } else {
        Alert.alert('Erreur', response.data.error || 'Impossible de charger la liste des employés');
      }
    } catch (error: any) {
      console.error('Erreur chargement employés:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.error || 'Impossible de charger la liste des employés'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadEmployees();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Jamais';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Date invalide';
    }
  };

  const getRoleBadge = (employee: Employee) => {
    if (employee.is_superuser) {
      return { label: 'Super Admin', color: theme.colors.error[500], bg: theme.colors.error[100] };
    }
    if (employee.is_site_admin) {
      return { label: 'Admin Site', color: theme.colors.warning[500], bg: theme.colors.warning[100] };
    }
    if (employee.is_staff) {
      return { label: 'Staff', color: theme.colors.info[500], bg: theme.colors.info[100] };
    }
    return { label: 'Employé', color: theme.colors.success[500], bg: theme.colors.success[100] };
  };

  const renderEmployee = ({ item }: { item: Employee }) => {
    const role = getRoleBadge(item);
    const fullName = `${item.first_name} ${item.last_name}`.trim() || item.username;

    return (
      <TouchableOpacity
        style={[styles.employeeCard, !item.is_active && styles.inactiveCard]}
        onPress={() => {
          // Navigation vers les détails de l'employé (à implémenter si nécessaire)
          Alert.alert(
            fullName,
            `Email: ${item.email}\nTéléphone: ${item.telephone || 'Non renseigné'}\nPoste: ${item.poste || 'Non renseigné'}\nDernière connexion: ${formatDate(item.derniere_connexion || item.last_login)}`
          );
        }}
      >
        <View style={styles.employeeHeader}>
          <View style={styles.employeeInfo}>
            <View style={styles.avatarContainer}>
              <Ionicons
                name="person"
                size={24}
                color={item.is_active ? theme.colors.primary[500] : '#94a3b8'}
              />
            </View>
            <View style={styles.employeeDetails}>
              <Text style={[styles.employeeName, !item.is_active && styles.inactiveText]}>
                {fullName}
              </Text>
              <Text style={[styles.employeeUsername, !item.is_active && styles.inactiveText]}>
                @{item.username}
              </Text>
              {item.poste && (
                <Text style={styles.employeePoste}>{item.poste}</Text>
              )}
            </View>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: role.bg }]}>
            <Text style={[styles.roleText, { color: role.color }]}>{role.label}</Text>
          </View>
        </View>
        
        <View style={styles.employeeFooter}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.is_active ? theme.colors.success[500] : theme.colors.error[500] },
              ]}
            />
            <Text style={styles.statusText}>
              {item.is_active ? 'Actif' : 'Inactif'}
            </Text>
          </View>
          <Text style={styles.dateText}>
            Inscrit le {formatDate(item.date_joined)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text style={styles.loadingText}>Chargement des employés...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary[500]} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Liste des employés</Text>
          <Text style={styles.subtitle}>{employees.length} employé(s)</Text>
        </View>
        {canManageUsers && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddEmployee' as never)}
          >
            <Ionicons name="person-add" size={24} color={theme.colors.primary[500]} />
          </TouchableOpacity>
        )}
      </View>

      {employees.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#94a3b8" />
          <Text style={styles.emptyText}>Aucun employé trouvé</Text>
          {canManageUsers && (
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => navigation.navigate('AddEmployee' as never)}
            >
              <Text style={styles.addFirstButtonText}>Ajouter le premier employé</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={employees}
          renderItem={renderEmployee}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary[500]]}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  listContent: {
    padding: 16,
  },
  employeeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  employeeInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  employeeUsername: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  employeePoste: {
    fontSize: 13,
    color: '#94a3b8',
  },
  inactiveText: {
    color: '#94a3b8',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  employeeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#64748b',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    marginBottom: 24,
  },
  addFirstButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmployeeListScreen;

