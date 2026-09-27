import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('paypulse_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to auto-refresh expired JWT access tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('paypulse_refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/api/auth/refresh/`, {
            refresh: refreshToken,
          });

          if (res.data?.access) {
            const newAccessToken = res.data.access;
            localStorage.setItem('paypulse_access_token', newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, clear session and send to login
          localStorage.removeItem('paypulse_access_token');
          localStorage.removeItem('paypulse_refresh_token');
          localStorage.removeItem('paypulse_user');
          window.location.href = '/login?session_expired=1';
        }
      } else {
        localStorage.removeItem('paypulse_access_token');
        localStorage.removeItem('paypulse_user');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
