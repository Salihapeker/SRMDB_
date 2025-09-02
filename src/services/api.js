import axios from "axios";

const API = axios.create({
  baseURL: "https://srmdb.onrender.com",
  withCredentials: true,
  timeout: 15000,
});

// Request interceptor
API.interceptors.request.use(
  (config) => {
    console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`);

    // Specific timeouts for different endpoints
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
  (response) => response,
  async (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout:", error.config?.url);
      error.message = "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.";
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      error.response?.data?.message === "Token gerekli"
    ) {
      try {
        const refreshResponse = await API.post("/api/auth/refresh");
        console.log("Token yenilendi:", refreshResponse.data);
        return API.request(error.config); // Yeniden dene
      } catch (refreshError) {
        console.error("Token yenileme hatası:", refreshError);
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
