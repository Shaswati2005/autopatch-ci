import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  username: string;
  name: string;
  avatarUrl: string;
  org: string;
  publicRepos: number;
  token?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loginWithGitHub: () => void;
  setAuthToken: (token: string) => Promise<void>;
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  fetchUserRepos: () => Promise<any[]>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  loginWithGitHub: () => {},
  setAuthToken: async () => {},
  logout: () => {},
  authFetch: async () => new Response(),
  fetchUserRepos: async () => [],
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Only restore from localStorage if a real token was previously saved
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('autopatch_gh_token') || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('autopatch_user_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const API_BASE =
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL)) ||
    'http://localhost:8000';

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me?token=${authToken}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          const profile: UserProfile = {
            username: data.username,
            name: data.name,
            avatarUrl: data.avatar_url,
            org: data.org,
            publicRepos: data.public_repos,
            token: authToken,
          };
          setUser(profile);
          try {
            localStorage.setItem('autopatch_user_profile', JSON.stringify(profile));
          } catch { /* ignore */ }
          return;
        }
      }
      // If token invalid, clear session
      logout();
    } catch {
      // Offline/network fail
    }
  };

  useEffect(() => {
    if (token && !user) {
      fetchProfile(token);
    }
  }, [token]);

  const loginWithGitHub = () => {
    window.location.href = `${API_BASE}/api/auth/github/login`;
  };

  const setAuthToken = async (newToken: string) => {
    setToken(newToken);
    try {
      localStorage.setItem('autopatch_gh_token', newToken);
    } catch { /* ignore */ }
    await fetchProfile(newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('autopatch_gh_token');
      localStorage.removeItem('autopatch_user_profile');
    } catch { /* ignore */ }
  };

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    if (!token) {
      logout();
      return new Response(JSON.stringify({ detail: 'Unauthenticated' }), { status: 401 });
    }

    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    };

    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      logout();
    }
    return res;
  };

  const fetchUserRepos = async (): Promise<any[]> => {
    try {
      const res = await authFetch(`${API_BASE}/api/github/repos`);
      if (res.ok) {
        const data = await res.json();
        return data.repositories || [];
      }
    } catch { /* fallback */ }
    return [];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        loginWithGitHub,
        setAuthToken,
        logout,
        authFetch,
        fetchUserRepos,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
