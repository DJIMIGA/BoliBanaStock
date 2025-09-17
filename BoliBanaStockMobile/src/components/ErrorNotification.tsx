import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppError, ErrorSeverity, ErrorType } from '../types/errors';
import theme from '../utils/theme';

interface ErrorNotificationProps {
  error: AppError;
  visible: boolean;
  onDismiss: () => void;
  onRetry?: () => void;
  onAction?: () => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  visible,
  onDismiss,
  onRetry,
  onAction,
  autoDismiss = true,
  autoDismissDelay = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(-screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const autoDismissTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      showNotification();
    } else {
      hideNotification();
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
      }
    };
  }, []);

  const showNotification = () => {
    setIsVisible(true);
    
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de la barre de progression
    if (autoDismiss) {
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: autoDismissDelay,
        useNativeDriver: false,
      }).start();

      // Auto-dismiss
      autoDismissTimer.current = setTimeout(() => {
        hideNotification();
      }, autoDismissDelay);
    }
  };

  const hideNotification = () => {
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }

    // Animation de sortie
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -screenWidth,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      onDismiss();
    });
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
    hideNotification();
  };

  const handleAction = () => {
    if (onAction) {
      onAction();
    }
    hideNotification();
  };

  const handleLongPress = () => {
    if (__DEV__) {
      Alert.alert(
        'Détails techniques (Dev)',
        `Type: ${error.type}\nSévérité: ${error.severity}\nMessage: ${error.technicalMessage}\nSource: ${error.source || 'Non spécifié'}\nTimestamp: ${error.timestamp.toLocaleString()}`,
        [
          { text: 'OK', style: 'default' },
          { text: 'Copier', onPress: () => console.log('Erreur complète:', error) },
        ]
      );
    }
  };

  if (!isVisible) return null;

  const getIconName = (): string => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return 'close-circle';
      case ErrorSeverity.HIGH:
        return 'warning';
      case ErrorSeverity.MEDIUM:
        return 'information-circle';
      case ErrorSeverity.LOW:
        return 'checkmark-circle';
      default:
        return 'alert-circle';
    }
  };

  const getIconColor = (): string => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return theme.colors.error[500];
      case ErrorSeverity.HIGH:
        return theme.colors.warning[500];
      case ErrorSeverity.MEDIUM:
        return theme.colors.info[500];
      case ErrorSeverity.LOW:
        return theme.colors.success[500];
      default:
        return theme.colors.neutral[500];
    }
  };

  const getBorderColor = (): string => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return theme.colors.error[500];
      case ErrorSeverity.HIGH:
        return theme.colors.warning[500];
      case ErrorSeverity.MEDIUM:
        return theme.colors.info[500];
      case ErrorSeverity.LOW:
        return theme.colors.success[500];
      default:
        return theme.colors.neutral[500];
    }
  };

  const getBackgroundColor = (): string => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return theme.colors.error[50];
      case ErrorSeverity.HIGH:
        return theme.colors.warning[50];
      case ErrorSeverity.MEDIUM:
        return theme.colors.info[50];
      case ErrorSeverity.LOW:
        return theme.colors.success[50];
      default:
        return theme.colors.neutral[50];
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
          backgroundColor: getBackgroundColor(),
          borderLeftColor: getBorderColor(),
        },
      ]}
    >
      {/* Barre de progression pour l'auto-dismiss */}
      {autoDismiss && (
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: getBorderColor(),
            },
          ]}
        />
      )}

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.iconContainer}
          onLongPress={handleLongPress}
          activeOpacity={0.7}
        >
          <Ionicons name={getIconName()} size={24} color={getIconColor()} />
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {error.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {error.userMessage}
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          {/* Bouton d'action personnalisé */}
          {error.actionRequired && onAction && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: getBorderColor() }]}
              onPress={handleAction}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Action</Text>
            </TouchableOpacity>
          )}

          {/* Bouton de retry */}
          {error.retryable && onRetry && (
            <TouchableOpacity
              style={[styles.retryButton, { borderColor: getBorderColor() }]}
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={16} color={getBorderColor()} />
            </TouchableOpacity>
          )}

          {/* Bouton de fermeture */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={hideNotification}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    minHeight: 80,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
    padding: 4,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  retryButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  closeButton: {
    padding: 4,
    borderRadius: 4,
  },
});

export default ErrorNotification;
