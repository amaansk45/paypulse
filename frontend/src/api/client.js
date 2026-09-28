import axios from 'axios';

// Helper to determine if a hostname is a local address or LAN IP
const isLocalOrPrivateIp = (host) => {
  if (!host) return true;
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return true;
  // Standard private LAN IP ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host)) return true;
  return false;
};

export const getApiBaseUrl = () => {
  // 1. Build-time environment variable (from Vite .env or Vercel dashboard)
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim()) {
    return import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
  }

  // 2. User-configured custom API URL stored in browser localStorage
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('paypulse_api_base_url');
    if (customUrl && customUrl.trim()) {
      return customUrl.trim().replace(/\/+$/, '');
    }

    const host = window.location.hostname;
    // 3. If running locally or on local Wi-Fi (for mobile phone testing)
    if (isLocalOrPrivateIp(host)) {
      return `http://${host}:8000`;
    }

    // 4. If deployed on Vercel or cloud domain:
    // Do NOT return http://${host}:8000 because it causes Mixed Content blocks on HTTPS
    // and port 8000 is not open on Vercel.
    return '';
  }

  return 'http://127.0.0.1:8000';
};

export const setCustomApiUrl = (url) => {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('paypulse_api_base_url');
    } else {
      localStorage.setItem('paypulse_api_base_url', url.trim().replace(/\/+$/, ''));
    }
  }
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach JWT access token & dynamically sync baseURL
api.interceptors.request.use(
  (config) => {
    // Dynamically update baseURL in case user configured it
    const currentBase = getApiBaseUrl();
    if (currentBase) {
      config.baseURL = currentBase;
    }
    const token = localStorage.getItem('paypulse_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle network errors and auto-refresh expired JWT tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle Network Error (connection refused, server down, mixed content, wrong URL)
    if (error.message === 'Network Error' || !error.response) {
      const currentBase = getApiBaseUrl();
      const message = currentBase
        ? `Cannot connect to backend API server at ${currentBase}. Please verify the server is running and CORS is enabled.`
        : `Backend API server is not configured. Please click 'Settings' at the bottom to configure your Backend URL.`;

      const customError = new Error(message);
      customError.isNetworkError = true;
      customError.originalError = error;
      return Promise.reject(customError);
    }

    // Handle 404 when API base URL is missing on cloud host (e.g. Vercel)
    if (error.response?.status === 404 && !getApiBaseUrl()) {
      const message = "Backend API server is not configured. Please click 'Settings' at the bottom to enter your live Backend URL.";
      const customError = new Error(message);
      customError.isNetworkError = true;
      customError.originalError = error;
      return Promise.reject(customError);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('paypulse_refresh_token');

      if (refreshToken) {
        try {
          const currentBase = getApiBaseUrl();
          const refreshUrl = currentBase ? `${currentBase}/api/auth/refresh/` : '/api/auth/refresh/';
          const res = await axios.post(refreshUrl, {
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
