import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { formatRoleLabel } from '../utils/formatters';

export interface UserProfile {
  id: string;
  phone?: string;
  name?: string;
  role?: string;
  roles?: string[];
  activeSubscriptionId?: string | null;
  createdAt?: string;
}

export interface UserOrganization {
  id: string;
  name: string;
  type?: string;
  role?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  activeRole: string;
  availableRoles: string[];
  organizations: UserOrganization[];
  activeOrganization: UserOrganization | null;
  canAccessPortfolio: boolean;
  loading: boolean;
  switchRole: (role: string) => void;
  switchOrganization: (orgId: string | null) => void;
  login: (token: string, userData: UserProfile) => void;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  getRolePersianLabel: (role?: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_ROLES = ['PROJECT_OWNER'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('hooshyar_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeRole, setActiveRole] = useState<string>(() => {
    return localStorage.getItem('hooshyar_active_role') || 'PROJECT_OWNER';
  });

  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<UserOrganization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Determine available roles for the current user
  const availableRoles = React.useMemo(() => {
    const roleSet = new Set<string>();
    if (user?.role) roleSet.add(user.role.toUpperCase());
    if (Array.isArray(user?.roles)) {
      user.roles.forEach(r => roleSet.add(r.toUpperCase()));
    }
    if (roleSet.size === 0) {
      DEFAULT_ROLES.forEach(r => roleSet.add(r));
    }
    return Array.from(roleSet);
  }, [user]);

  // Sync active role if current is invalid
  useEffect(() => {
    if (availableRoles.length > 0 && !availableRoles.includes(activeRole.toUpperCase())) {
      const fallback = availableRoles[0];
      setActiveRole(fallback);
      localStorage.setItem('hooshyar_active_role', fallback);
    }
  }, [availableRoles, activeRole]);

  // Fetch current user and organizations
  const refreshAuth = useCallback(async () => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch user profile
      const meRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });

      if (meRes.ok) {
        const data = await meRes.json();
        const userData: UserProfile = data.user || data;
        setUser(userData);
        localStorage.setItem('hooshyar_user', JSON.stringify(userData));

        if (userData.role && !localStorage.getItem('hooshyar_active_role')) {
          setActiveRole(userData.role.toUpperCase());
          localStorage.setItem('hooshyar_active_role', userData.role.toUpperCase());
        }
      } else if (meRes.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('hooshyar_user');
        setToken(null);
        setUser(null);
      }

      // 2. Fetch enterprise organizations
      const orgRes = await fetch('/api/enterprise/organizations', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });

      if (orgRes.ok) {
        const orgData = await orgRes.json();
        if (Array.isArray(orgData)) {
          setOrganizations(orgData);
          if (orgData.length > 0 && !activeOrganization) {
            setActiveOrganization(orgData[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to refresh auth state:', err);
    } finally {
      setLoading(false);
    }
  }, [activeOrganization]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const switchRole = useCallback((role: string) => {
    const upper = role.toUpperCase();
    setActiveRole(upper);
    localStorage.setItem('hooshyar_active_role', upper);
  }, []);

  const switchOrganization = useCallback((orgId: string | null) => {
    if (!orgId) {
      setActiveOrganization(null);
      return;
    }
    const found = organizations.find(o => o.id === orgId);
    if (found) {
      setActiveOrganization(found);
    }
  }, [organizations]);

  const login = useCallback((newToken: string, userData: UserProfile) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('hooshyar_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    if (userData.role) {
      setActiveRole(userData.role.toUpperCase());
      localStorage.setItem('hooshyar_active_role', userData.role.toUpperCase());
    }
    refreshAuth();
  }, [refreshAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('hooshyar_user');
    localStorage.removeItem('hooshyar_active_role');
    setToken(null);
    setUser(null);
    setOrganizations([]);
    setActiveOrganization(null);
    setActiveRole('PROJECT_OWNER');
  }, []);

  // Portfolio visibility condition:
  // Visible if user is ADMIN / SUPER_ADMIN, or activeRole is ADMIN, or has organizations
  const canAccessPortfolio = React.useMemo(() => {
    const roleUpper = (activeRole || user?.role || '').toUpperCase();
    const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN';
    const hasOrgs = organizations.length > 0;
    return isAdmin || hasOrgs;
  }, [activeRole, user?.role, organizations]);

  const getRolePersianLabel = useCallback((role?: string) => {
    return formatRoleLabel(role || activeRole);
  }, [activeRole]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        activeRole,
        availableRoles,
        organizations,
        activeOrganization,
        canAccessPortfolio,
        loading,
        switchRole,
        switchOrganization,
        login,
        logout,
        refreshAuth,
        getRolePersianLabel
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
