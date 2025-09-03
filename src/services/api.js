import axios from "axios";

const API = axios.create({
  baseURL: "https://srmdb.onrender.com",
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Token'ı header'a ekle
API.interceptors.request.use(
  (config) => {
    console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`);

    // LocalStorage'dan token al ve header'a ekle
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("🔑 Token added to request");
    } else {
      console.log("⚠️ No token found in localStorage");
    }

    // Endpoint bazlı timeout ayarları
    if (config.url?.includes("/api/library/")) {
      config.timeout = 20000;
    } else if (config.url?.includes("/api/watched/")) {
      config.timeout = 25000;
    } else if (config.url?.includes("/api/partner/")) {
      config.timeout = 10000;
    } else if (config.url?.includes("/api/notifications")) {
      config.timeout = 8000;
    } else if (config.url?.includes("/api/auth/")) {
      config.timeout = 10000;
    }

    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
API.interceptors.response.use(
  (response) => {
    // Login/Register'da token'ı kaydet
    if (response.data?.token) {
      console.log("💾 Token saved to localStorage");
      localStorage.setItem("token", response.data.token);

      // User data'yı da kaydet
      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
    }

    // Success response log
    console.log(
      `✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`
    );

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Timeout error handling
    if (error.code === "ECONNABORTED") {
      console.error("⏱️ Request timeout:", error.config?.url);
      error.message = "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.";
      return Promise.reject(error);
    }

    // Network error handling
    if (error.code === "ERR_NETWORK") {
      console.error("🌐 Network error:", error.message);
      error.message =
        "Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.";
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const url = originalRequest?.url;

    console.error(
      `❌ ${originalRequest?.method?.toUpperCase()} ${url} - ${status}`,
      error.response?.data
    );

    // 401 Unauthorized handling
    if (status === 401) {
      console.log("🔒 401 Unauthorized - Clearing auth data");

      // Auth data'yı temizle
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Refresh token denemesi (eğer varsa)
      if (error.response?.data?.expired && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          console.log("🔄 Attempting token refresh...");
          const refreshResponse = await API.post("/api/auth/refresh");

          if (refreshResponse.data?.token) {
            localStorage.setItem("token", refreshResponse.data.token);
            originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;

            console.log("✅ Token refreshed, retrying request");
            return API.request(originalRequest);
          }
        } catch (refreshError) {
          console.error("❌ Token refresh failed:", refreshError);
        }
      }

      // Login sayfasına yönlendir (sadece auth sayfalarında değilsek)
      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/register" &&
        !url?.includes("/auth/")
      ) {
        console.log("🚪 Redirecting to login page");
        window.location.href = "/login";
      }
    }

    // 403 Forbidden
    if (status === 403) {
      console.error("🚫 Access forbidden");
      error.message = "Bu işlem için yetkiniz bulunmuyor.";
    }

    // 404 Not Found
    if (status === 404) {
      console.error("🔍 Resource not found");
      if (!error.response?.data?.message) {
        error.message = "İstenen kaynak bulunamadı.";
      }
    }

    // 500 Server Error
    if (status >= 500) {
      console.error("🚨 Server error");
      error.message = "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.";
    }

    // 429 Too Many Requests
    if (status === 429) {
      console.error("⏰ Rate limit exceeded");
      error.message =
        "Çok fazla istek gönderildi. Lütfen bekleyip tekrar deneyin.";
    }

    return Promise.reject(error);
  }
);

// API health check function
export const checkAPIHealth = async () => {
  try {
    const response = await axios.get("https://srmdb.onrender.com/api/health", {
      timeout: 5000,
    });
    console.log("✅ API Health check passed:", response.data);
    return true;
  } catch (error) {
    console.error("❌ API Health check failed:", error.message);
    return false;
  }
};

// Auth helper functions
export const authHelpers = {
  isAuthenticated: () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    return !!(token && user);
  },

  getToken: () => localStorage.getItem("token"),

  getUser: () => {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  clearAuth: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    console.log("🧹 Auth data cleared");
  },
};

export default API;
