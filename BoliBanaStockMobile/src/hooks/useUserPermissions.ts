import { useState, useEffect } from 'react';
import { brandService } from '../services/api';

interface UserInfo {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  is_site_admin: boolean;
  est_actif: boolean;
  site_configuration_id: number | null;
  site_configuration_name: string | null;
  permission_level: string;
  can_manage_users: boolean;
  can_access_admin: boolean;
  can_manage_site: boolean;
  date_joined: string;
  last_login: string | null;
  derniere_connexion: string | null;
}

interface UserPermissions {
  can_manage_users: boolean;
  can_access_admin: boolean;
  can_manage_site: boolean;
  permission_level: string;
  role_display: string;
  access_scope: string;
}

interface UserStatus {
  is_active: boolean;
  permission_level: string;
  role_display: string;
  access_scope: string;
  can_manage_users: boolean;
  can_access_admin: boolean;
  can_manage_site: boolean;
  site_name: string | null;
}

interface UserActivity {
  last_login: string | null;
  derniere_connexion: string | null;
  date_joined: string;
  is_online: boolean;
  account_age_days: number;
}

interface UserPermissionsHook {
  userInfo: UserInfo | null;
  permissions: UserPermissions | null;
  status: UserStatus | null;
  activity: UserActivity | null;
  loading: boolean;
  error: string | null;
  isSuperuser: boolean;
  siteConfiguration: number | null;
  canDeleteBrand: (brand: any) => boolean;
  canEditBrand: (brand: any) => boolean;
  canDeleteCategory: (category: any) => boolean;
  canEditCategory: (category: any) => boolean;
  canCreateCategory: () => boolean;
  canManageUsers: boolean;
  canAccessAdmin: boolean;
  canManageSite: boolean;
  refreshUserInfo: () => Promise<void>;
}

export const useUserPermissions = (): UserPermissionsHook => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔧 useUserPermissions - Chargement des informations utilisateur...');
      
      // Utiliser la nouvelle API pour récupérer toutes les informations
      const response = await brandService.getUserInfo();
      
      if (response.success) {
        const { user, permissions: userPermissions, status: userStatus, activity: userActivity } = response.data;
        
        console.log('✅ useUserPermissions - Informations utilisateur chargées:', {
          user: user.username,
          permission_level: user.permission_level,
          site_configuration: user.site_configuration_id
        });
        
        setUserInfo(user);
        setPermissions(userPermissions);
        setStatus(userStatus);
        setActivity(userActivity);
      } else {
        throw new Error(response.error || 'Erreur lors du chargement des informations utilisateur');
      }
    } catch (error) {
      console.error('❌ useUserPermissions - Erreur lors du chargement des informations utilisateur:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
      
      // Fallback sur l'ancienne méthode si la nouvelle API échoue
      try {
        const user = await brandService.getCurrentUser();
        setUserInfo({
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username,
          is_active: user.is_active,
          is_staff: user.is_staff || false,
          is_superuser: user.is_superuser || false,
          is_site_admin: (user as any).is_site_admin || false,
          est_actif: user.is_active,
          site_configuration_id: user.site_configuration || null,
          site_configuration_name: null,
          permission_level: user.is_superuser ? 'superuser' : 'user',
          can_manage_users: user.is_superuser || (user as any).is_site_admin || false,
          can_access_admin: user.is_superuser || user.is_staff || false,
          can_manage_site: user.is_superuser || (user as any).is_site_admin || false,
          date_joined: user.date_joined,
          last_login: user.last_login,
          derniere_connexion: null,
        });
      } catch (fallbackError) {
        console.error('❌ useUserPermissions - Erreur fallback:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserInfo();
  }, []);

  const canDeleteBrand = (brand: any): boolean => {
    if (loading || !userInfo) {
      return false;
    }

    const localRule = userInfo.is_superuser
      ? true
      : userInfo.site_configuration_id
        ? brand.site_configuration === userInfo.site_configuration_id
        : brand.site_configuration === null;

    if (brand.can_delete !== undefined) {
      // Never grant more than local rules; server can only further restrict
      return Boolean(brand.can_delete) && localRule;
    }

    return localRule;
  };

  const canEditBrand = (brand: any): boolean => {
    if (loading || !userInfo) {
      return false;
    }

    const localRule = userInfo.is_superuser
      ? true
      : userInfo.site_configuration_id
        ? brand.site_configuration === userInfo.site_configuration_id
        : brand.site_configuration === null;

    if (brand.can_edit !== undefined) {
      return Boolean(brand.can_edit) && localRule;
    }

    return localRule;
  };

  const canDeleteCategory = (category: any): boolean => {
    if (loading || !userInfo) {
      return false;
    }

    const localRule = userInfo.is_superuser
      ? true
      : userInfo.site_configuration_id
        ? category.site_configuration === userInfo.site_configuration_id
        : category.site_configuration === null;

    if (category.can_delete !== undefined) {
      return Boolean(category.can_delete) && localRule;
    }

    return localRule;
  };

  const canEditCategory = (category: any): boolean => {
    if (loading || !userInfo) {
      return false;
    }

    const localRule = userInfo.is_superuser
      ? true
      : userInfo.site_configuration_id
        ? category.site_configuration === userInfo.site_configuration_id
        : category.site_configuration === null;

    if (category.can_edit !== undefined) {
      return Boolean(category.can_edit) && localRule;
    }

    return localRule;
  };

  const canCreateCategory = (): boolean => {
    if (loading || !userInfo) {
      return false;
    }
    
    // Seul le superuser peut créer des catégories
    return Boolean(userInfo.is_superuser);
  };

  return {
    userInfo,
    permissions,
    status,
    activity,
    loading,
    error,
    isSuperuser: userInfo?.is_superuser || false,
    siteConfiguration: userInfo?.site_configuration_id || null,
    canDeleteBrand,
    canEditBrand,
    canDeleteCategory,
    canEditCategory,
    canCreateCategory,
    canManageUsers: userInfo?.can_manage_users || false,
    canAccessAdmin: userInfo?.can_access_admin || false,
    canManageSite: userInfo?.can_manage_site || false,
    refreshUserInfo: loadUserInfo,
  };
};
