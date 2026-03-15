'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import useAuthStore from '@/store/authStore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { user, isAuthenticated, isLoading, refreshUser } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && !user) {
      refreshUser().then(() => setInitialized(true));
    } else {
      setInitialized(true);
    }
  }, [user, refreshUser]);

  const value = {
    user,
    isAuthenticated,
    isLoading: isLoading || !initialized,
    isSuperior: user?.roleLevel <= 5 || user?.isAdmin,
    isSubordinate: user?.roleLevel >= 7,
    isAdmin: user?.isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
