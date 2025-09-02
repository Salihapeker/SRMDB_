import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../App";
import debounce from "lodash.debounce";
import API from "../services/api";
import "./Settings.css";

// Varsayılan placeholder sabiti (ağ isteği yerine veri URL'si)
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23ccc'/%3E%3Ctext x='50' y='50' font-size='14' text-anchor='middle' alignment-baseline='middle' fill='%23666'%3EProfil Resmi Yok%3C/text%3E%3C/svg%3E";

function Settings({ user, setUser, createSystemNotification }) {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [libraryVisibility, setLibraryVisibility] = useState("visible");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(!user);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  const compressImage = useCallback((file, maxWidth, maxHeight, quality) => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      reader.readAsDataURL(file);
    });
  }, []);

  useEffect(() => {
    if (!setUser || typeof setUser !== "function") {
      console.error(
        "Settings: setUser prop is required and must be a function"
      );
      navigate("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        setIsLoadingUser(true);
        const response = await API.get("/api/auth/me");
        if (response.status === 200 && response.data.user) {
          setUser(response.data.user);
          setUsername(response.data.user.username || "");
          setName(response.data.user.name || "");
          setEmail(response.data.user.email || "");
          setProfilePic(response.data.user.profilePicture || PLACEHOLDER_IMAGE);
          setLibraryVisibility(
            response.data.user.libraryVisibility || "visible"
          );
          setIsImageLoaded(false);
        } else {
          navigate("/login");
        }
      } catch (err) {
        console.error("Kullanıcı yükleme hatası:", err);
        setError("Kullanıcı bilgileri yüklenemedi.");
        navigate("/login");
      } finally {
        setIsLoadingUser(false);
      }
    };

    if (!user) {
      fetchUser();
    } else {
      setUsername(user.username || "");
      setName(user.name || "");
      setEmail(user.email || "");
      setProfilePic(user.profilePicture || PLACEHOLDER_IMAGE);
      setLibraryVisibility(user.libraryVisibility || "visible");
      setIsImageLoaded(false);
      setIsLoadingUser(false);
    }
  }, [user, setUser, navigate]);

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setIsUploading(true);
        setIsImageLoaded(false);
        const compressedImage = await compressImage(file, 300, 300, 0.7);
        setProfilePic(compressedImage);
        setIsImageLoaded(true);
        setIsUploading(false);
      } catch (err) {
        console.error("Resim sıkıştırma hatası:", err);
        setError("Resim yüklenirken hata oluştu.");
        setIsUploading(false);
        setIsImageLoaded(false);
        setProfilePic(PLACEHOLDER_IMAGE);
      }
    }
  };

  const handleProfilePicRemove = () => {
    setProfilePic(PLACEHOLDER_IMAGE);
    setIsImageLoaded(false);
  };

  const validatePassword = () => {
    if (password && password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return false;
    }
    if (password && password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return false;
    }
    return true;
  };

  const handleSaveChanges = async () => {
    if (!validatePassword()) return;

    const updateData = {};
    let hasChanges = false;

    if (username && username !== user?.username) {
      updateData.username = username;
      hasChanges = true;
    }
    if (name && name !== user?.name) {
      updateData.name = name;
      hasChanges = true;
    }
    if (email && email !== user?.email) {
      updateData.email = email;
      hasChanges = true;
    }
    if (password) {
      updateData.password = password;
      hasChanges = true;
    }
    if (profilePic !== (user?.profilePicture || PLACEHOLDER_IMAGE)) {
      updateData.profilePicture = profilePic;
      hasChanges = true;
    }
    if (libraryVisibility !== (user?.libraryVisibility || "visible")) {
      updateData.libraryVisibility = libraryVisibility;
      hasChanges = true;
    }

    if (!hasChanges) {
      setSuccess("Değişiklik yapılmadı.");
      return;
    }

    try {
      const response = await API.put("/api/user/update", updateData);
      setUser(response.data.user);
      if (createSystemNotification) {
        await createSystemNotification(
          "profile_update",
          "Profil bilgileriniz güncellendi"
        );
      }
      setSuccess("Değişiklikler kaydedildi!");
      setError("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Güncelleme hatası:", err);
      if (err.response?.status === 401) {
        navigate("/login");
      } else {
        setError(err.response?.data?.message || "Güncelleme başarısız.");
        setSuccess("");
      }
    }
  };

  const handleViewUserProfile = useCallback(async (username) => {
    try {
      const response = await API.get(`/api/users/profile/${username}`);
      setUserProfile(response.data.profile);
      setShowUserProfile(true);
    } catch (error) {
      console.error("Profil alınamadı:", error);
      setError("Profil bilgileri alınamadı.");
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query.trim() || query.length < 2) {
        setSearchResults([]);
        setSelectedUser(null);
        return;
      }

      try {
        setSearchLoading(true);
        const response = await API.get(
          `/api/users/search?query=${encodeURIComponent(query)}`
        );
        const filteredResults = response.data.filter(
          (u) => !u.hasPartner && u._id !== user?._id
        );
        setSearchResults(filteredResults);
        if (filteredResults.length > 0) setSelectedUser(filteredResults[0]);
        setError("");
      } catch (err) {
        console.error("Kullanıcı arama hatası:", err);
        setError("Kullanıcılar bulunamadı.");
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500),
    [user]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleUserSelect = useCallback((foundUser) => {
    if (foundUser.hasPartner) {
      setError("Bu kullanıcı zaten bir partneri var.");
      return;
    }
    setSelectedUser(foundUser);
    setError("");
  }, []);

  const handleSendInvite = useCallback(async () => {
    if (!selectedUser) {
      setError("Önce bir kullanıcı seçin.");
      return;
    }

    try {
      setInviteLoading(true);
      const response = await API.post("/api/partner/request", {
        username: selectedUser.username,
      });
      if (response.data && response.data.message === "already_invited") {
        setNotificationMessage(
          `⚠️ ${selectedUser.name || selectedUser.username}'e daha önce davet gönderildi!`
        );
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000); // 3 saniye sonra gizle
      } else {
        setSuccess(
          `${selectedUser.name || selectedUser.username}'e davet gönderildi!`
        );
        setNotificationMessage(
          `✅ ${selectedUser.name || selectedUser.username}'e davet gönderildi!`
        );
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000); // 3 saniye sonra gizle
      }
      setError("");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedUser(null);
    } catch (err) {
      console.error("Davet gönderme hatası:", err);
      if (err.response?.data?.message === "already_invited") {
        setNotificationMessage(
          `⚠️ ${selectedUser.name || selectedUser.username}'e daha önce davet gönderildi!`
        );
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000); // 3 saniye sonra gizle
      } else {
        setError(err.response?.data?.message || "Davet gönderilemedi.");
        setSuccess("");
      }
    } finally {
      setInviteLoading(false);
    }
  }, [selectedUser]);

  const handleWithdrawInvite = useCallback(async () => {
    if (!selectedUser) {
      setError("Önce bir kullanıcı seçin.");
      return;
    }

    try {
      setInviteLoading(true);
      const response = await API.delete(
        `/api/partner/request/${encodeURIComponent(selectedUser.username)}`
      );
      if (response.data.success) {
        setSuccess(
          `Davet ${selectedUser.name || selectedUser.username}'den geri çekildi!`
        );
        setNotificationMessage(
          `✅ Davet ${selectedUser.name || selectedUser.username}'den geri çekildi!`
        );
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedUser(null);
      }
    } catch (err) {
      console.error("Davet geri çekme hatası:", err);
      setError(err.response?.data?.message || "Davet geri çekilemedi.");
      setSuccess("");
    } finally {
      setInviteLoading(false);
    }
  }, [selectedUser]);

  const handleRemovePartner = useCallback(async () => {
    const confirmMessage = `
      Partneri kaldırmak istediğinizden emin misiniz?
      
      ⚠️ DİKKAT: 
      • Partner bağlantısı kaldırılacak
      • Ortak izlediklerinizin kayıtları korunacak 
      • Aynı partneri tekrar eklerseniz geçmiş veriler geri gelecek
      
      Devam etmek istiyor musunuz?
    `;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await API.delete("/api/user/partner?preserve=true");
      if (response.data.success) {
        setUser(response.data.user);
        setSuccess(
          "Partner bağlantısı kaldırıldı. Geçmiş verileriniz korundu."
        );
        setError("");
        if (createSystemNotification) {
          await createSystemNotification(
            "partner_update",
            "Partner bağlantınız sonlandırıldı. Ortak izleme geçmişiniz korundu."
          );
        }
      }
    } catch (err) {
      console.error("Partner kaldırma hatası:", err);
      setError(err.response?.data?.message || "Partner kaldırılamadı.");
      setSuccess("");
    }
  }, [setUser, createSystemNotification]);

  if (isLoadingUser) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Kullanıcı yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>⚙️ Ayarlar</h2>
        <p className="settings-subtitle">
          Hesap ve gizlilik ayarlarınızı yönetin
        </p>
      </div>

      <div className="message-container">
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="success-message" role="status">
            {success}
          </p>
        )}
        {showNotification && (
          <div className="notification-toast">{notificationMessage}</div>
        )}
      </div>

      <div className="theme-section">
        <h3>🎨 Görünüm</h3>
        <div className="theme-toggle">
          <label className="theme-switch">
            <input
              type="checkbox"
              checked={isDarkMode}
              onChange={toggleDarkMode}
            />
            <span className="slider">
              <span className="slider-text">
                {isDarkMode ? "🌙 Karanlık" : "☀️ Açık"}
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="profile-pic-section">
        <h3>📷 Profil Fotoğrafı</h3>
        {isUploading ? (
          <div className="profile-pic-placeholder">Yükleniyor...</div>
        ) : profilePic ? (
          <img
            src={profilePic}
            alt="Profil"
            className="profile-pic"
            loading="lazy"
            onLoad={() => setIsImageLoaded(true)}
            onError={(e) => {
              if (e.target.src !== PLACEHOLDER_IMAGE) {
                e.target.src = PLACEHOLDER_IMAGE;
                e.target.alt = "Profil Resmi Yok";
              }
            }}
          />
        ) : (
          <div className="profile-pic-placeholder">Profil Resmi Yok</div>
        )}

        <label htmlFor="profile-pic-upload" className="profile-pic-label">
          📤 Profil Fotoğrafı Yükle
        </label>
        <input
          id="profile-pic-upload"
          type="file"
          accept="image/*"
          onChange={handleProfilePicChange}
          className="profile-pic-input"
        />

        {profilePic && profilePic !== PLACEHOLDER_IMAGE && (
          <button className="remove-pic" onClick={handleProfilePicRemove}>
            🗑️ Fotoğrafı Kaldır
          </button>
        )}
      </div>

      <div className="settings-form">
        <h3>👤 Kullanıcı Bilgileri</h3>

        <label>
          Kullanıcı Adı:
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Yeni kullanıcı adınız"
          />
        </label>

        <label>
          Ad Soyad:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Yeni adınız"
          />
        </label>

        <label>
          E-posta:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Yeni e-posta adresiniz"
          />
        </label>

        <label>
          Yeni Şifre:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Yeni şifre (boş bırakabilirsiniz)"
          />
        </label>

        {password && (
          <label>
            Şifre Tekrar:
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifre tekrarı"
            />
          </label>
        )}
      </div>

      <div className="privacy-section">
        <h3>🔐 Gizlilik Ayarları</h3>
        <div className="privacy-option">
          <label className="privacy-label">
            <span>📚 Kütüphane Görünürlüğü:</span>
            <select
              value={libraryVisibility}
              onChange={(e) => setLibraryVisibility(e.target.value)}
              className="privacy-select"
            >
              <option value="visible">👥 Partnerle Paylaş</option>
              <option value="hidden">🔒 Gizli Tut</option>
            </select>
          </label>
          <p className="privacy-description">
            {libraryVisibility === "visible"
              ? "Partneriniz kütüphanenizi görebilir ve ortak öneriler alabilir."
              : "Kütüphaneniz gizli kalır, partner göremez."}
          </p>
        </div>
      </div>

      <button onClick={handleSaveChanges} className="save-button">
        💾 Değişiklikleri Kaydet
      </button>

      <div className="partner-section">
        <h3>👥 Partner Yönetimi</h3>
        {user?.partner ? (
          <div className="current-partner">
            <div className="partner-info">
              <img
                src={user.partner.profilePicture || PLACEHOLDER_IMAGE}
                alt={user.partner.name || user.partner.username}
                className="partner-avatar"
                loading="lazy"
                onError={(e) => {
                  if (e.target.src !== PLACEHOLDER_IMAGE) {
                    e.target.src = PLACEHOLDER_IMAGE;
                    e.target.alt = "Profil Resmi Yok";
                  }
                }}
              />
              <div className="partner-details">
                <p className="partner-name">
                  {user.partner.name || user.partner.username}
                </p>
                <p className="partner-username">@{user.partner.username}</p>
              </div>
            </div>
            <button
              className="remove-partner-btn"
              onClick={handleRemovePartner}
            >
              💔 Partneri Kaldır
            </button>
          </div>
        ) : (
          <div className="partner-search">
            <div className="search-input-group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kullanıcı adı ara..."
                className="search-input"
              />
              {searchLoading && (
                <div className="search-loading">🔍 Aranıyor...</div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                <h4>👥 Bulunan Kullanıcılar:</h4>
                {searchResults.map((foundUser) => (
                  <div
                    key={foundUser._id}
                    className={`search-result-item ${selectedUser?._id === foundUser._id ? "selected" : ""}`}
                  >
                    <div
                      className="user-info-clickable"
                      onClick={() => handleUserSelect(foundUser)}
                    >
                      <img
                        src={foundUser.profilePicture || PLACEHOLDER_IMAGE}
                        alt={foundUser.name || foundUser.username}
                        className="search-user-pic"
                        loading="lazy"
                        onError={(e) => {
                          if (e.target.src !== PLACEHOLDER_IMAGE) {
                            e.target.src = PLACEHOLDER_IMAGE;
                            e.target.alt = "Profil Resmi Yok";
                          }
                        }}
                      />
                      <div className="user-details">
                        <span className="username">{foundUser.username}</span>
                        <span className="name">
                          ({foundUser.name || "İsim Yok"})
                        </span>
                        <div className="user-stats">
                          <span>👁️ {foundUser.stats?.watchedCount || 0}</span>
                          <span>⭐ {foundUser.stats?.favoritesCount || 0}</span>
                          <span>
                            📝 {foundUser.stats?.averageRating || "0.0"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button
                        className="profile-preview-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewUserProfile(foundUser.username);
                        }}
                      >
                        👤 Profil
                      </button>
                      {selectedUser?._id === foundUser._id && (
                        <>
                          <button
                            className="invite-btn-final"
                            onClick={handleSendInvite}
                            disabled={inviteLoading}
                          >
                            {inviteLoading
                              ? "Gönderiliyor..."
                              : "💌 Davet Gönder"}
                          </button>
                          <button
                            className="withdraw-invite-btn"
                            onClick={handleWithdrawInvite}
                            disabled={inviteLoading}
                          >
                            {inviteLoading
                              ? "Geri Çekiliyor..."
                              : "⛔ Daveti Geri Çek"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showUserProfile && userProfile && (
              <div className="modal-overlay">
                <div className="modal user-profile-modal">
                  <div className="profile-header">
                    <img
                      src={userProfile.profilePicture || PLACEHOLDER_IMAGE}
                      alt={userProfile.name || userProfile.username}
                      className="profile-picture-large"
                      loading="lazy"
                      onError={(e) => {
                        if (e.target.src !== PLACEHOLDER_IMAGE) {
                          e.target.src = PLACEHOLDER_IMAGE;
                          e.target.alt = "Profil Resmi Yok";
                        }
                      }}
                    />
                    <div className="profile-info">
                      <h2>{userProfile.name || userProfile.username}</h2>
                      <p className="profile-username">
                        @{userProfile.username}
                      </p>
                      <p className="join-date">
                        Katılım:{" "}
                        {new Date(
                          userProfile.stats.joinDate
                        ).toLocaleDateString("tr-TR")}
                      </p>
                      {userProfile.hasPartner && (
                        <span className="partner-badge">💕 Partner Var</span>
                      )}
                    </div>
                  </div>

                  <div className="profile-stats">
                    <div className="stat-item">
                      <span className="stat-number">
                        {userProfile.stats.watchedCount}
                      </span>
                      <span className="stat-label">İzlenen</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">
                        {userProfile.stats.favoritesCount}
                      </span>
                      <span className="stat-label">Favori</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">
                        {userProfile.stats.averageRating}
                      </span>
                      <span className="stat-label">Ort. Puan</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">
                        {userProfile.stats.watchlistCount}
                      </span>
                      <span className="stat-label">İzlenecek</span>
                    </div>
                  </div>

                  {userProfile.recentlyWatched &&
                    userProfile.recentlyWatched.length > 0 && (
                      <div className="recently-watched-preview">
                        <h4>Son İzlenenler</h4>
                        <div className="recent-movies">
                          {userProfile.recentlyWatched
                            .slice(0, 5)
                            .map((movie) => (
                              <div key={movie.id} className="recent-movie">
                                <img
                                  src={
                                    movie.poster_path
                                      ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
                                      : PLACEHOLDER_IMAGE
                                  }
                                  alt={movie.title || movie.name}
                                  className="recent-movie-poster"
                                  loading="lazy"
                                  onError={(e) => {
                                    if (e.target.src !== PLACEHOLDER_IMAGE) {
                                      e.target.src = PLACEHOLDER_IMAGE;
                                      e.target.alt = "Resim Yok";
                                    }
                                  }}
                                />
                                <span className="recent-movie-title">
                                  {movie.title || movie.name}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                  <div className="profile-actions">
                    {!userProfile.hasPartner && (
                      <button
                        className="invite-from-profile-btn"
                        onClick={() => {
                          setSelectedUser({
                            username: userProfile.username,
                            name: userProfile.name,
                            profilePicture:
                              userProfile.profilePicture || PLACEHOLDER_IMAGE,
                            _id: userProfile._id,
                          });
                          setShowUserProfile(false);
                          handleSendInvite();
                        }}
                        disabled={inviteLoading}
                      >
                        {inviteLoading
                          ? "Gönderiliyor..."
                          : "💌 Partner Daveti Gönder"}
                      </button>
                    )}
                    <button
                      className="close-profile-btn"
                      onClick={() => setShowUserProfile(false)}
                    >
                      ❌ Kapat
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="quick-navigation">
        <h3>🚀 Hızlı Erişim</h3>
        <div className="quick-nav-buttons">
          <button
            onClick={() => navigate("/dashboard")}
            className="quick-action-button"
          >
            🏠 Ana Sayfa
          </button>
          <button
            onClick={() => navigate("/library")}
            className="quick-action-button"
          >
            📚 Kütüphane
          </button>
          <button
            onClick={() => navigate("/notifications")}
            className="quick-action-button"
          >
            📬 Bildirimler
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
