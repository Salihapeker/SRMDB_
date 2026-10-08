import axios from "axios";

const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://srmdb.onrender.com"
      : "http://localhost:5000"),
  withCredentials: true, // Cookie'leri gönder
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
API.interceptors.request.use(
  (config) => {
    console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`);

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
    } else if (config.url?.includes("/api/ai/")) {
      config.timeout = 60000; // AI işlemleri için 60 saniye
    }

    // Token'ı header'a ekle (Cookie sorunu için yedek)
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    // Login/Register'da token'ı localStorage'a kaydet (opsiyonel)
    if (
      (response.config.url.includes("/api/auth/login") ||
        response.config.url.includes("/api/auth/register")) &&
      response.data?.token
    ) {
      console.log("💾 Token saved to localStorage");
      localStorage.setItem("token", response.data.token);
      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
    }

    console.log(
      `✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`
    );
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Render'ın ücretsiz sunucusu bir süre boşta kalınca uyuyor ve ilk istekte
    // uyanması 30-60 sn sürebiliyor. Zaman aşımı/ağ hatasında bir kez,
    // daha uzun süre bekleyerek tekrar dene.
    if (
      (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK") &&
      originalRequest &&
      !originalRequest._wakeRetry &&
      (originalRequest.method || "get").toLowerCase() === "get"
    ) {
      originalRequest._wakeRetry = true;
      originalRequest.timeout = 70000;
      console.warn("😴 Sunucu uyanıyor olabilir, tekrar deneniyor:", originalRequest.url);
      return API(originalRequest);
    }

    if (error.code === "ECONNABORTED") {
      console.error("⏱️ Request timeout:", error.config?.url);
      error.message = "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.";
      return Promise.reject(error);
    }

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

    if (status === 401) {
      console.log("🔒 401 Unauthorized - Clearing auth data");
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (error.response?.data?.expired && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          console.log("🔄 Attempting token refresh...");
          await API.post("/api/auth/refresh");
          console.log("✅ Token refreshed, retrying request");
          return API.request(originalRequest);
        } catch (refreshError) {
          console.error("❌ Token refresh failed:", refreshError);
        }
      }

      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/register" &&
        !url?.includes("/auth/")
      ) {
        console.log("🚪 Redirecting to login page");
        window.location.href = "/login";
      }
    }

    if (status === 403) {
      error.message = "Bu işlem için yetkiniz bulunmuyor.";
    }
    if (status === 404) {
      error.message = "İstenen kaynak bulunamadı.";
    }
    if (status >= 500) {
      error.message = "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.";
    }
    if (status === 429) {
      error.message =
        "Çok fazla istek gönderildi. Lütfen bekleyip tekrar deneyin.";
    }

    return Promise.reject(error);
  }
);

export const checkAPIHealth = async () => {
  try {
    const response = await API.get("/api/health");
    console.log("✅ API Health check passed:", response.data);
    return true;
  } catch (error) {
    console.error("❌ API Health check failed:", error.message);
    return false;
  }
};

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
