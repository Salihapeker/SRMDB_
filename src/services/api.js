import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
  timeout: 15000, // 15 saniye timeout
});

// Request interceptor
API.interceptors.request.use(
  (config) => {
    console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`);
    
    // Specific timeouts for different endpoints
    if (config.url?.includes('/api/library/')) {
      config.timeout = 20000; // Library operations - 20 saniye
    } else if (config.url?.includes('/api/watched/')) {
      config.timeout = 25000; // Watch together operations - 25 saniye
    } else if (config.url?.includes('/api/partner/')) {
      config.timeout = 10000; // Partner operations - 10 saniye
    } else if (config.url?.includes('/api/notifications')) {
      config.timeout = 8000; // Notifications - 8 saniye
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - DÜZELTME: axios yerine API kullan
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Timeout error handling
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.config?.url);
      error.message = 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && error.response?.data?.expired) {
      try {
        // Refresh token isteği
        await API.post('/api/auth/refresh');
        // Orijinal isteği tekrar dene
        return API.request(error.config);
      } catch (refreshError) {
        // Refresh başarısız, login'e yönlendir
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default API;