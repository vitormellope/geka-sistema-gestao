import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { login as apiLogin, getMe } from '@/api/auth';
import type { User } from '@/types';
import { UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isVendedor: boolean;
  isOrcamentista: boolean;
  isProjetista: boolean;
  isGerente: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('geka_token')
  );
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
      localStorage.removeItem('geka_token');
      localStorage.removeItem('geka_user');
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, fetchUser]);

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    const newToken = data.access_token;
    localStorage.setItem('geka_token', newToken);
    setToken(newToken);
    const me = await getMe();
    setUser(me);
    localStorage.setItem('geka_user', JSON.stringify(me));
  };

  const logout = () => {
    localStorage.removeItem('geka_token');
    localStorage.removeItem('geka_user');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        login,
        logout,
        isVendedor: user?.role === UserRole.VENDEDOR,
        isOrcamentista: user?.role === UserRole.ORCAMENTISTA,
        isProjetista: user?.role === UserRole.PROJETISTA,
        isGerente: user?.role === UserRole.GERENTE,
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
