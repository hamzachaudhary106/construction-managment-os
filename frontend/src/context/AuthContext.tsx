import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  is_staff: boolean;
  company?: number | null;
  company_name?: string | null;
  company_code?: string | null;
  client_id?: number | null;
  client_name?: string | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
   isClient: boolean;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await client.get('/auth/me/');
      setUser(res.data);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    client
      .get('/auth/me/')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    await client.post('/auth/token/', { username, password });
    await refreshUser();
  };

  const logout = () => {
    client.post('/auth/logout/').catch(() => {});
    setUser(null);
    window.location.href = '/login';
  };

  const isAdmin = user?.role === 'admin' || user?.is_staff === true;
  const isClient = !!user && !isAdmin && (user.role === 'client' || !!user.client_id);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isClient, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
