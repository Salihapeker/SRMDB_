import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import API from '../services/api';
import './Notifications.css';

const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', { withCredentials: true });

const Notifications = ({ user }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [userResponse, systemResponse] = await Promise.all([
        API.get('/api/notifications'),
        API.get('/api/notifications/system'),
      ]);

      const combined = [
        ...userResponse.data.map(n => ({ ...n, category: 'partner' })),
        ...systemResponse.data.map(n => ({ ...n, category: 'system' })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setNotifications(combined);
    } catch (err) {
      console.error('Bildirimler alınırken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      socket.emit('join', user._id);
      socket.on('notificationUpdate', fetchNotifications);
      fetchNotifications();
      return () => socket.off('notificationUpdate');
    }
  }, [user]);

  const handleAccept = async (notificationId) => {
    try {
      const response = await API.post('/api/partner/accept', { notificationId });
      if (response.status === 200) {
        setNotifications(notifications.filter(n => n._id !== notificationId));
        window.location.reload(); // Improve with state management if needed
      }
    } catch (err) {
      console.error('Kabul hatası:', err);
    }
  };

  const handleReject = async (notificationId) => {
    try {
      await API.post('/api/partner/reject', { notificationId });
      setNotifications(notifications.filter(n => n._id !== notificationId));
    } catch (err) {
      console.error('Red hatası:', err);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await API.put(`/api/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => n._id === notificationId ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Okundu işaretleme hatası:', err);
    }
  };

  const getNotificationIcon = (notification) => {
    if (notification.category === 'partner') {
      switch (notification.type) {
        case 'partner_request': return '👥';
        case 'partner_accepted': return '💕';
        case 'partner_rejected': return '💔';
        default: return '📩';
      }
    } else {
      switch (notification.type) {
        case 'library_update': return '📚';
        case 'profile_update': return '👤';
        case 'system': return '⚙️';
        default: return '📢';
      }
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} gün önce`;
    if (hours > 0) return `${hours} saat önce`;
    if (minutes > 0) return `${minutes} dakika önce`;
    return 'Az önce';
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.category === filter;
  });

  if (loading) {
    return (
      <div className="notifications-container">
        <div className="loading-spinner">Bildirimler yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <h1>📬 Bildirimler</h1>
        <p className="subtitle">Tüm güncellemeler ve davetler burada görünür</p>
      </div>

      <div className="filter-tabs">
        <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          Tümü ({notifications.length})
        </button>
        <button className={`filter-tab ${filter === 'partner' ? 'active' : ''}`} onClick={() => setFilter('partner')}>
          Partner ({notifications.filter(n => n.category === 'partner').length})
        </button>
        <button className={`filter-tab ${filter === 'system' ? 'active' : ''}`} onClick={() => setFilter('system')}>
          Sistem ({notifications.filter(n => n.category === 'system').length})
        </button>
      </div>

      <div className="notifications-list">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div key={notification._id} className={`notification-card ${notification.category} ${!notification.read ? 'unread' : ''}`}>
              <div className="notification-icon">{getNotificationIcon(notification)}</div>
              <div className="notification-content">
                <div className="notification-header">
                  {notification.category === 'partner' && notification.from && (
                    <div className="sender-info">
                      {notification.from.profilePicture && (
                        <img src={notification.from.profilePicture} alt={`${notification.from.name} profil resmi`} className="sender-avatar" />
                      )}
                      <div className="sender-details">
                        <span className="sender-name">{notification.from.name || notification.from.username}</span>
                        <span className="sender-username">@{notification.from.username}</span>
                      </div>
                    </div>
                  )}
                  <div className="notification-time">{getTimeAgo(notification.createdAt)}</div>
                </div>
                <div className="notification-message">
                  {notification.category === 'partner' ? (
                    notification.type === 'partner_request' ? `Size partner davet gönderdi!` : notification.message
                  ) : (
                    notification.message
                  )}
                </div>
                {notification.relatedItem && (
                  <div className="related-item">
                    <div className="item-info">
                      {notification.relatedItem.poster_path && (
                        <img src={`https://image.tmdb.org/t/p/w92${notification.relatedItem.poster_path}`} alt={notification.relatedItem.title} className="item-poster" />
                      )}
                      <span className="item-title">{notification.relatedItem.title}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="notification-actions">
                {notification.type === 'partner_request' && notification.status === 'pending' && (
                  <>
                    <button onClick={() => handleAccept(notification._id)} className="action-btn accept">✅ Kabul Et</button>
                    <button onClick={() => handleReject(notification._id)} className="action-btn reject">❌ Reddet</button>
                  </>
                )}
                {!notification.read && (
                  <button onClick={() => handleMarkAsRead(notification._id)} className="action-btn mark-read">👁️ Okundu</button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="no-notifications">
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>Henüz bildirim yok</h3>
              <p>{filter === 'all' ? 'Şu an yeni bir bildirim yok. Daha sonra tekrar kontrol et!' : `${filter === 'partner' ? 'Partner' : 'Sistem'} bildirimi yok.`}</p>
              <button onClick={() => navigate('/dashboard')} className="cta-button">🏠 Ana Sayfaya Dön</button>
            </div>
          </div>
        )}
      </div>

      <div className="quick-actions">
        <button onClick={() => navigate('/dashboard')} className="quick-action-btn">🏠 Ana Sayfa</button>
        <button onClick={() => navigate('/settings')} className="quick-action-btn">⚙️ Ayarlar</button>
        <button onClick={() => navigate('/library')} className="quick-action-btn">📚 Kütüphane</button>
      </div>
    </div>
  );
};

export default Notifications;