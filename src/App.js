import React, {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
  Suspense, // Eklendi
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import "./components/LightRays.css";
import "./styles/theme-red.css";
import "./App.css";
import API, { authHelpers } from "./services/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Login = React.lazy(() => import("./pages/Login"));
const Register = React.lazy(() => import("./pages/Register"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Header = React.lazy(() => import("./components/Header/Header"));
const LightRays = React.lazy(() => import("./components/LightRays"));
const AIRecommendations = React.lazy(() => import("./pages/AIRecommendations"));
const MovieDetail = React.lazy(() => import("./pages/MovieDetail"));
const EnhancedLibrary = React.lazy(() => import("./pages/EnhancedLibrary"));
const Notifications = React.lazy(() => import("./pages/Notifications"));
const PersonDetail = React.lazy(() => import("./pages/PersonDetail"));

// Theme Context
const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      isDarkMode ? "dark" : "light"
    );
    document.documentElement.setAttribute(
      "data-mobile",
      isMobile ? "true" : "false"
    );
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode, isMobile]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        isMobile,
        theme: isDarkMode ? "dark" : "light",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

function AppContent() {
  const [user, setUser] = useState(null);
  const [libraryItems, setLibraryItems] = useState({
    watched: [],
    watchlist: [],
    favorites: [],
    disliked: [],
  });
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isMobile } = useTheme();
  // const navigate = useNavigate(); // Removed unused variable

  const updateUser = useCallback((newUser) => {
    setUser(newUser);
    setIsAuthenticated(!!newUser);
  }, []);

  const createSystemNotification = useCallback(
    async (type, message, relatedItem = null) => {
      try {
        await API.post("/api/notifications/system", {
          type,
          message,
          relatedItem,
        });
      } catch (error) {
        console.error("System notification error:", error);
      }
    },
    []
  );

  const checkUserSession = useCallback(async () => {
    try {
      console.log("🔐 User session kontrol ediliyor...");
      const response = await API.get("/api/auth/me");
      if (!response.data?.user) throw new Error("User data not found");

      let userData = response.data.user;
      if (userData.partner && typeof userData.partner === "object") {
        userData.partner = {
          id: userData.partner._id || userData.partner.id,
          name: userData.partner.name,
          username: userData.partner.username,
          profilePicture: userData.partner.profilePicture,
        };
      }

      setUser(userData);
      setIsAuthenticated(true);
      console.log(
        "✅ User loaded:",
        userData.email,
        "Partner:",
        userData.partner?.name
      );

      const libraryResponse = await API.get("/api/library");
      setLibraryItems(
        libraryResponse.data || {
          watched: [],
          watchlist: [],
          favorites: [],
          disliked: [],
        }
      );
      console.log("✅ Library loaded successfully");
    } catch (error) {
      console.log(
        "❌ Session check failed:",
        error.response?.status,
        error.message
      );
      if (error.response?.status === 401) {
        authHelpers.clearAuth(); // authHelpers burada kullanılıyor
      }
      setUser(null);
      setIsAuthenticated(false);
      setLibraryItems({
        watched: [],
        watchlist: [],
        favorites: [],
        disliked: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  const addToLibrary = useCallback(
    async (category, item) => {
      if (!item || !item.id) {
        console.error("❌ Invalid item:", item);
        toast.error("Geçersiz içerik: Veri eksik.");
        return;
      }

      try {
        const movieData = {
          id: item.id.toString(),
          title: item.title || item.name,
          poster_path: item.poster_path,
          release_date: item.release_date || item.first_air_date,
          vote_average: item.vote_average,
          type: item.type || "movie",
        };

        console.log("📤 Gönderilen veri:", movieData);
        const response = await API.post(`/api/library/${category}`, {
          movieData,
        });

        const newLibrary = response.data.library || {
          watched: [],
          watchlist: [],
          favorites: [],
          disliked: [],
        };

        setLibraryItems(newLibrary);

        try {
          await createSystemNotification(
            "library_update",
            `"${movieData.title}" ${category} listesine eklendi`,
            movieData
          );
        } catch (notifError) {
          console.warn("⚠️ Notification gönderilemedi:", notifError.message);
        }

        console.log(
          `✅ Added to ${category}:`,
          movieData.title || movieData.name
        );
        toast.success(`Başarıyla ${category} listesine eklendi!`);
        return newLibrary;
      } catch (err) {
        console.error(
          `❌ Add to ${category} error:`,
          err.response?.data?.message || err.message
        );

        if (err.response?.status === 409) {
          toast.error("Bu içerik zaten listede!");
        } else if (err.response?.status === 400) {
          toast.error(err.response.data.message || "Geçersiz istek");
        } else if (err.code === "ECONNABORTED") {
          toast.error("İstek zaman aşımına uğradı. Lütfen tekrar deneyin.");
        } else if (err.response?.status === 401) {
          toast.error("Oturum süresi doldu. Lütfen tekrar giriş yapın.");
          checkUserSession();
        } else {
          toast.error("Ekleme işlemi başarısız. Lütfen tekrar deneyin.");
        }
        throw err;
      }
    },
    [createSystemNotification, checkUserSession]
  );

  const removeFromLibrary = useCallback(
    async (category, item) => {
      try {
        const response = await API.delete(
          `/api/library/${category}/${item.id}`
        );

        const newLibrary = response.data.library || {
          watched: [],
          watchlist: [],
          favorites: [],
          disliked: [],
        };

        setLibraryItems(newLibrary);

        try {
          await createSystemNotification(
            "library_update",
            `"${item.title || item.name}" ${category} listesinden kaldırıldı`,
            item
          );
        } catch (notifError) {
          console.warn("⚠️ Notification gönderilemedi:", notifError.message);
        }

        console.log(`✅ Removed from ${category}:`, item.title || item.name);
        toast.success(`Başarıyla ${category} listesinden kaldırıldı!`);
        return newLibrary;
      } catch (err) {
        console.error(
          `❌ Remove from ${category} error:`,
          err.response?.data?.message || err.message
        );

        if (err.code === "ECONNABORTED") {
          toast.error("İstek zaman aşımına uğradı. Lütfen tekrar deneyin.");
        } else if (err.response?.status === 401) {
          toast.error("Oturum süresi doldu. Lütfen tekrar giriş yapın.");
          checkUserSession();
        } else {
          toast.error("Silme işlemi başarısız. Lütfen tekrar deneyin.");
        }
        throw err;
      }
    },
    [createSystemNotification, checkUserSession]
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>SRMDB Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="app-container">
      <ToastContainer
        position={isMobile ? "bottom-center" : "top-right"}
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        style={isMobile ? { bottom: "80px" } : {}}
      />

      <LightRays
        raysOrigin="top-center"
        raysColor="#e50914"
        raysSpeed={1}
        lightSpread={1}
        rayLength={2}
        pulsating={true}
        fadeDistance={1.0}
        saturation={1.0}
        followMouse={!isMobile}
        mouseInfluence={isMobile ? 0 : 0.1}
        noiseAmount={0.0}
        distortion={0.0}
        className="light-rays-background"
      />

      {isAuthenticated && user && (
        <Header 
          user={user} 
          onLogout={async () => {
            try {
              await API.post("/api/auth/logout");
            } catch (error) {
              console.warn("Logout API error:", error);
            }
            authHelpers.clearAuth();
            updateUser(null);
          }}
        />
      )}

      <Suspense fallback={
        <div className="loading-container">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p>Yükleniyor...</p>
          </div>
        </div>
      }>
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login setUser={updateUser} />
              )
            }
          />
          <Route
            path="/register"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Register setUser={updateUser} />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute user={user}>
                <Dashboard
                  user={user}
                  addToLibrary={addToLibrary}
                  removeFromLibrary={removeFromLibrary}
                  setUser={updateUser}
                  libraryItems={libraryItems}
                  setLibraryItems={setLibraryItems}
                />
              </PrivateRoute>
            }
          />
          <Route
            path="/library"
            element={
              <PrivateRoute user={user}>
                <EnhancedLibrary
                  user={user}
                  removeFromLibrary={removeFromLibrary}
                  addToLibrary={addToLibrary}
                  libraryItems={libraryItems}
                />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute user={user}>
                <Settings
                  user={user}
                  setUser={updateUser}
                  createSystemNotification={createSystemNotification}
                />
              </PrivateRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <PrivateRoute user={user}>
                <Notifications user={user} />
              </PrivateRoute>
            }
          />
          <Route
            path="/recommendations"
            element={
              <PrivateRoute user={user}>
                <AIRecommendations
                  user={user}
                  addToLibrary={addToLibrary}
                  libraryItems={libraryItems}
                />
              </PrivateRoute>
            }
          />
          <Route
            path="/person/:id"
            element={
              <PrivateRoute user={user}>
                <PersonDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/:type/:id"
            element={
              <PrivateRoute user={user}>
                <MovieDetail user={user} addToLibrary={addToLibrary} />
              </PrivateRoute>
            }
          />
          <Route
            path="/"
            element={
              <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
            }
          />
          <Route
            path="*"
            element={
              <div className="error-404">
                <h1>404 - Sayfa Bulunamadı</h1>
                <p>Aradığınız sayfa mevcut değil.</p>
                <button
                  onClick={() =>
                  (window.location.href = isAuthenticated
                    ? "/dashboard"
                    : "/login")
                  }
                  className="btn-primary"
                >
                  Ana Sayfaya Dön
                </button>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </main>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
