import axios from 'axios';

export const AUTH_EXPIRED_EVENT = 'app-treino:auth-expired';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('app-treino:token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('app-treino:token')) {
      localStorage.removeItem('app-treino:token');
      localStorage.removeItem('app-treino:user');
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error, fallback = 'Não foi possível concluir a operação.') {
  if (error.code === 'ECONNABORTED') return 'A API demorou para responder.';
  if (!error.response) return 'Não foi possível conectar à API.';
  return error.response.data?.message || fallback;
}

export default api;

