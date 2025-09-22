import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jasman_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const originalRequest = error.config;

      if (originalRequest.url.includes('/auth/token') || 
          originalRequest.url.includes('/auth/login-face')) {
        return Promise.reject(error);
      }

      localStorage.removeItem('jasman_auth_token');
      localStorage.removeItem('jasman_user_data');
      
      window.dispatchEvent(new Event('sessionExpired'));
      
      return Promise.reject(new Error('SESSION_EXPIRED'));
    }
    return Promise.reject(error);
  }
);

export default api;