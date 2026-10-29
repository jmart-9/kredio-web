import { create } from 'zustand';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  countryCode: string;
  login: (userData: User, token: string, countryCode?: string) => void;
  logout: () => void;
  setCountryCode: (code: string) => void;
  hasPermission: (permissionCode: string) => boolean;
}

// Inicializar desde localStorage
const storedUser = localStorage.getItem('kredio_user');
const storedToken = localStorage.getItem('kredio_token');
const initialUser: User | null = storedUser ? JSON.parse(storedUser) : null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialUser,
  token: storedToken,
  countryCode: localStorage.getItem('kredio_country') || 'SV',

  login: (userData: User, token: string, countryCode: string = 'SV') => {
    console.log('💾 Guardando en localStorage:', { userData, token: token.substring(0, 20) + '...' });
    
    localStorage.setItem('kredio_token', token);
    localStorage.setItem('kredio_user', JSON.stringify(userData));
    localStorage.setItem('kredio_country', countryCode);
    
    set({ user: userData, token, countryCode });
  },

  logout: () => {
    console.log('🚪 Cerrando sesión...');
    localStorage.removeItem('kredio_token');
    localStorage.removeItem('kredio_user');
    localStorage.removeItem('kredio_country');
    set({ user: null, token: null, countryCode: 'SV' });
  },

  setCountryCode: (code: string) => {
    localStorage.setItem('kredio_country', code);
    set({ countryCode: code });
  },

  hasPermission: (permissionCode: string) => {
    const { user } = get();
    if (!user || !user.permissions) return false;
    if (user.permissions.includes('GLOBAL:MANAGE')) return true;
    return user.permissions.includes(permissionCode);
  },
}));