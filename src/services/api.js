import axios from "axios";

// Backend URL'ini belirle
const getBaseURL = () => {
  if (process.env.NODE_ENV === "production") {
    return "https://srmdb.onrender.com"; // Render backend
  }

  return "http://localhost:5000"; // Development
};

const API = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  timeout: 30000, // Render için daha uzun timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
API.interceptors.request.use(
  (config) => {
    console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`);

    // Specific timeouts for different endpoints
    if (config.url?.includes("/api/library/")) {
      config.timeout = 45000; // Render için daha uzun
    } else if (config.url?.includes("/api/watched/")) {
      config.timeout = 50000;
    } else if (config.url?.includes("/api/partner/")) {
      config.timeout = 20000;
    } else if (config.url?.includes("/api/notifications")) {
      config.timeout = 15000;
    }

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
API.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.error("API Error:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
      origin: window.location.origin,
    });

    // Timeout hatası
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout:", error.config?.url);
      error.message = "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.";
      return Promise.reject(error);
    }

    // Network hatası
    if (error.code === "ERR_NETWORK") {
      console.error("Network error - possibly CORS or server down");
      error.message = "Bağlantı hatası. Sunucu ile iletişim kurulamıyor.";
      return Promise.reject(error);
    }

    // CORS hatası
    if (error.message?.includes("CORS")) {
      console.error("CORS error detected");
      error.message = "CORS hatası. Lütfen yönetici ile iletişime geçin.";
      return Promise.reject(error);
    }

    // 401 Unauthorized - token yenileme
    if (error.response?.status === 401 && error.response?.data?.expired) {
      try {
        console.log("Token expired, attempting refresh...");
        await API.post("/api/auth/refresh");
        return API.request(error.config);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        localStorage.removeItem("token"); // Varsa token'ı temizle
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // 500 Server Error
    if (error.response?.status >= 500) {
      error.message = "Sunucu hatası. Lütfen daha sonra tekrar deneyin.";
    }

    return Promise.reject(error);
  }
);

// API fonksiyonları için helper
export const handleApiError = (error) => {
  console.error("API Error Handler:", error);

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return "Bilinmeyen bir hata oluştu.";
};

export default API;
