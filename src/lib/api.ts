import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ AGREGAR ESTE INTERCEPTOR - Agrega el token a TODAS las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kredio_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔑 Token enviado:', token.substring(0, 20) + '...');
  } else {
    console.warn('⚠️ No hay token en localStorage');
  }
  return config;
});

// Interceptor para manejar errores 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('❌ Token inválido o expirado');
      localStorage.removeItem('kredio_token');
      localStorage.removeItem('kredio_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;