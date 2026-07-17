import { create } from 'zustand';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  countryCode: string;
  login: (userData: User, token: string, countryCode?: string) => void;
  logout: () => void;
  setCountryCode: (code: string) => void;
  hasPermission: (permissionCode: string) => boolean; // ✅ AGREGADO
}

const storedUser = localStorage.getItem('kredio_user');
const initialUser: User | null = storedUser ? JSON.parse(storedUser) : null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialUser,
  token: localStorage.getItem('kredio_token'),
  countryCode: localStorage.getItem('kredio_country') || 'SV',
  
  login: (userData, token, countryCode = 'SV') => {
    localStorage.setItem('kredio_token', token);
    localStorage.setItem('kredio_user', JSON.stringify(userData));
    localStorage.setItem('kredio_country', countryCode);
    set({ user: userData, token, countryCode });
  },
  
  logout: () => {
    localStorage.removeItem('kredio_token');
    localStorage.removeItem('kredio_user');
    localStorage.removeItem('kredio_country');
    set({ user: null, token: null, countryCode: 'SV' });
  },
  
  setCountryCode: (code) => {
    localStorage.setItem('kredio_country', code);
    set({ countryCode: code });
  },

  // ✅ FUNCIÓN MÁGICA PARA VERIFICAR PERMISOS
  hasPermission: (permissionCode: string) => {
    const { user } = get();
    if (!user || !user.permissions) return false;
    
    // Si el usuario tiene el permiso comodín (ej. Admin Global), permite todo
    if (user.permissions.includes('GLOBAL:MANAGE')) return true;
    
    return user.permissions.includes(permissionCode);
  }
}));