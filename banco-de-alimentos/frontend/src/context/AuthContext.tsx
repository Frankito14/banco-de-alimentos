import React, { createContext, useContext, useState, useEffect } from 'react';
import { LoginResponse, Usuario } from '../types';
import { api } from '../services/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      // Sin sesión previa: arrancar limpio en la pantalla de login
      setIsLoading(false);
      return;
    }

    // Si hay un token previo, validarlo de inmediato contra Keycloak / Backend
    fetch(`${BASE_URL}/api/v1/usuarios/me`, {
      headers: { Authorization: `Bearer ${savedToken}` }
    })
      .then(async (res) => {
        if (res.ok) {
          const user = await res.json();
          setToken(savedToken);
          setUsuario(user);
        } else {
          // Token vencido o inválido: limpiar sesión y forzar pantalla de login
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          setToken(null);
          setUsuario(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        setToken(null);
        setUsuario(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const applyAuthSession = (resp: LoginResponse) => {
    setToken(resp.token);
    setUsuario(resp.usuario);
    localStorage.setItem('token', resp.token);
    localStorage.setItem('usuario', JSON.stringify(resp.usuario));
  };

  const runAuthAction = async (authRequest: () => Promise<LoginResponse>) => {
    setIsLoading(true);
    try {
      const resp = await authRequest();
      applyAuthSession(resp);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) =>
    runAuthAction(() => api.login(email, password));

  const loginDemo = async (email: string) =>
    runAuthAction(() => api.loginDemo(email));

  const logout = () => {
    setUsuario(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        isAuthenticated: !!usuario && !!token,
        isLoading,
        login,
        loginDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
