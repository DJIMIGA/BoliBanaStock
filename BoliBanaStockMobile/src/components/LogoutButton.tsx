import React from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { AppDispatch } from '../store';

interface LogoutButtonProps {
  onLogout?: () => void;
  style?: any;
  iconSize?: number;
  iconColor?: string;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({
  onLogout,
  style,
  iconSize = 24,
  iconColor = '#dc2626'
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: () => {
            // Utiliser l'action Redux pour la déconnexion
            dispatch(logout());
            // Appeler le callback personnalisé si fourni
            if (onLogout) {
              onLogout();
            }
            // La redirection se fait automatiquement via Redux
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={style} onPress={handleLogout}>
      <Ionicons name="log-out-outline" size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
};

export default LogoutButton; 