import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../App";
import API, { authHelpers } from "../services/api";
import "./ProfileMenu.css";

function ProfileMenu({ user, setUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Helper to get initials
  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleClickOutside = useCallback((e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setIsOpen(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    console.log("⚡ Hızlı çıkış yapılıyor (Optimistic UI)...");

    // 1. API çağrısını arka planda başlat (bekleme yapma)
    API.post("/api/auth/logout").catch((error) => {
      console.warn("⚠️ Arka plan çıkış hatası (önemsiz):", error);
    });

    // 2. Anında yerel veriyi temizle
    authHelpers.clearAuth();

    // 3. Anında state'i sıfırla
    if (setUser && typeof setUser === "function") {
      setUser(null);
    }

    // 4. Anında Login sayfasına yönlendir
    navigate("/login", { replace: true });
  }, [setUser, navigate]);

  const navigateToPage = useCallback(
    (path) => {
      setIsOpen(false);
      navigate(path);
    },
    [navigate]
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  if (!user) {
    return null;
  }

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        onClick={handleToggle}
        className="profile-button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {user.profilePicture ? (
          <img
            src={user.profilePicture}
            alt="Profil"
            className="profile-pic-button"
          />
        ) : (
          <div className="profile-placeholder-initials">
            {getInitials(user.name || user.username)}
          </div>
        )}
        <span className="profile-name">{user.name || "Profil"}</span>
        <span className="dropdown-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu" role="menu">
          <div className="dropdown-header">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="Profil"
                className="profile-pic-menu"
              />
            ) : (
              <div className="profile-pic-placeholder-large">
                {getInitials(user.name || user.username)}
              </div>
            )}
            <h4>{user.name}</h4>
            <p>@{user.username}</p>
            {user.partner && (
              <p>
                Partner:{" "}
                {user.partner.name || user.partner.username || user.partner}
              </p>
            )}
          </div>

          <MenuButton onClick={() => navigateToPage("/dashboard")}>
            🏠 Dashboard
          </MenuButton>
          <MenuButton onClick={() => navigateToPage("/library")}>
            📚 Kütüphane
          </MenuButton>
          <MenuButton onClick={() => navigateToPage("/notifications")}>
            🔔 Bildirimler
          </MenuButton>
          <MenuButton onClick={() => navigateToPage("/recommendations")}>
            🤖 AI Önerileri
          </MenuButton>
          <MenuButton onClick={() => navigateToPage("/settings")}>
            ⚙️ Ayarlar
          </MenuButton>

          <hr className="menu-divider" />

          <MenuButton onClick={toggleDarkMode}>
            {isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </MenuButton>

          <hr className="menu-divider" />

          <button onClick={handleLogout} className="logout-btn">
            🚪 Çıkış Yap
          </button>
        </div>
      )}
    </div>
  );
}

// Menu button component
const MenuButton = memo(({ onClick, children }) => (
  <button onClick={onClick} className="menu-button">
    {children}
  </button>
));

MenuButton.displayName = "MenuButton";

export default memo(ProfileMenu);
