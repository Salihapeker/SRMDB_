import React, { useState } from 'react';
import { motion } from 'framer-motion';
import API from '../services/api';
import Badge from '../components/Badge';
import './Profile.css';

const Profile = ({ user, setUser }) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(user?.profilePicture || '');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Dosya boyutu 5MB\'dan küçük olmalıdır.');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Lütfen geçerli bir resim dosyası seçin.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setPreviewUrl(base64);

      try {
        setUploading(true);
        const response = await API.put('/api/users/profile-picture', {
          profilePicture: base64
        });

        setUser({ ...user, profilePicture: response.data.profilePicture });
        alert('Profil fotoğrafı başarıyla güncellendi!');
      } catch (error) {
        console.error('Profile picture upload error:', error);
        alert('Profil fotoğrafı yüklenirken bir hata oluştu.');
        setPreviewUrl(user?.profilePicture || '');
      } finally {
        setUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const stats = user?.stats || {};
  const badges = user?.badges || [];
  const recentBadges = badges
    .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
    .slice(0, 6);

  const libraryStats = {
    watched: user?.library?.watched?.length || 0,
    watchlist: user?.library?.watchlist?.length || 0,
    favorites: user?.library?.favorites?.length || 0,
    watchedTogether: user?.library?.watchedTogether?.length || 0,
  };

  return (
    <div className="profile-page">
      <motion.div 
        className="profile-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-picture-section">
            <div className="profile-picture-wrapper">
              {previewUrl ? (
                <img src={previewUrl} alt={user?.name} className="profile-picture" />
              ) : (
                <div className="profile-picture-placeholder">
                  {user?.name?.charAt(0).toUpperCase() || '👤'}
                </div>
              )}
              {uploading && (
                <div className="upload-overlay">
                  <div className="upload-spinner"></div>
                </div>
              )}
            </div>
            <label htmlFor="profile-upload" className="upload-btn">
              📷 Fotoğraf Değiştir
            </label>
            <input
              id="profile-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </div>

          <div className="profile-info">
            <h1 className="profile-name">{user?.name}</h1>
            <p className="profile-username">@{user?.username}</p>
            <p className="profile-email">{user?.email}</p>
            
            {user?.partner && (
              <div className="profile-partner">
                <span className="partner-icon">💕</span>
                <span className="partner-name">Partner: {user.partner.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="profile-stats">
          <h2>📊 İstatistikler</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-icon">🎬</span>
              <span className="stat-value">{stats.totalWatched || libraryStats.watched}</span>
              <span className="stat-label">İzlenen</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">⭐</span>
              <span className="stat-value">{libraryStats.favorites}</span>
              <span className="stat-label">Favori</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📝</span>
              <span className="stat-value">{libraryStats.watchlist}</span>
              <span className="stat-label">İzlenecek</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">💕</span>
              <span className="stat-value">{stats.partnerWatched || libraryStats.watchedTogether}</span>
              <span className="stat-label">Birlikte</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">✍️</span>
              <span className="stat-value">{stats.totalReviews || 0}</span>
              <span className="stat-label">Yorum</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🔥</span>
              <span className="stat-value">{stats.currentStreak || 0}</span>
              <span className="stat-label">Seri</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🏆</span>
              <span className="stat-value">{badges.length}</span>
              <span className="stat-label">Rozet</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">⚡</span>
              <span className="stat-value">{stats.longestStreak || 0}</span>
              <span className="stat-label">En Uzun Seri</span>
            </div>
          </div>
        </div>

        {/* Recent Badges */}
        {recentBadges.length > 0 && (
          <div className="profile-badges">
            <div className="section-header">
              <h2>🏆 Son Kazanılan Rozetler</h2>
              <a href="/badges" className="view-all-link">Tümünü Gör →</a>
            </div>
            <div className="badges-preview">
              {recentBadges.map(badge => (
                <Badge key={badge.id} badge={badge} unlocked={true} size="small" />
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Profile;
