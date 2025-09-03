import axios from "axios";

const API = axios.create({
  baseURL: "https://srmdb.onrender.com",
  withCredentials: true,
  timeout: 15000,
});

// Request interceptor - Token'ı header'a ekle
API.interceptors.request.use(
  (config) => {
    console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`);

    // LocalStorage'dan token al ve header'a ekle
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Timeout ayarları...
    if (config.url?.includes("/api/library/")) {
      config.timeout = 20000;
    } else if (config.url?.includes("/api/watched/")) {
      config.timeout = 25000;
    } else if (config.url?.includes("/api/partner/")) {
      config.timeout = 10000;
    } else if (config.url?.includes("/api/notifications")) {
      config.timeout = 8000;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
API.interceptors.response.use(
  (response) => {
    // Login/Register'da token'ı kaydet
    if (response.data?.token) {
      localStorage.setItem("token", response.data.token);
    }
    return response;
  },
  async (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout:", error.config?.url);
      error.message = "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.";
      return Promise.reject(error);
    }

    // 401 hatası - token geçersiz
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/register"
      ) {
        window.location.href = "/login";
      }
    }

    if (error.response?.status === 401 && error.response?.data?.expired) {
      try {
        await API.post("/api/auth/refresh");
        return API.request(error.config);
      } catch (refreshError) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
