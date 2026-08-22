import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  org: string;
  role: string;
  connectedReposCount: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (customUser?: Partial<UserProfile>) => void;
  logout: () => void;
}

const DEFAULT_USER: UserProfile = {
  id: 'usr_solar_77',
  username: 'dasbidyendu',
  name: 'Bidyendu Das',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  org: 'Shaswati2005 / AutoPatch-CI Team',
  role: 'DevOps Lead & Maintainer',
  connectedReposCount: 3,
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('autopatch_auth_user');
      return saved ? JSON.parse(saved) : DEFAULT_USER; // Default logged in for smooth developer experience
    } catch {
      return DEFAULT_USER;
    }
  });

  const login = (customUser?: Partial<UserProfile>) => {
    const newUser = { ...DEFAULT_USER, ...customUser };
    setUser(newUser);
    try {
      localStorage.setItem('autopatch_auth_user', JSON.stringify(newUser));
    } catch { /* storage fallback */ }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('autopatch_auth_user');
    } catch { /* storage fallback */ }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
