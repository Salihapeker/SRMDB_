import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API from '../services/api';
import Badge from '../components/Badge';
import Skeleton from '../components/Skeleton';
import './Badges.css';

const Badges = () => {
  const [allBadges, setAllBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unlocked', 'locked'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'watching', 'social', 'collection', 'special'

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const [availableRes, userRes] = await Promise.all([
        API.get('/api/badges/available'),
        API.get('/api/badges/user')
      ]);

      setAllBadges(availableRes.data.badges || []);
      setUserBadges(userRes.data.badges || []);
      setStats(userRes.data.stats || {});
    } catch (error) {
      console.error('Badge fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgesWithStatus = () => {
    const unlockedIds = userBadges.map(b => b.id);
    return allBadges.map(badge => ({
      ...badge,
      unlocked: unlockedIds.includes(badge.id),
      unlockedAt: userBadges.find(b => b.id === badge.id)?.unlockedAt
    }));
  };

  const filteredBadges = getBadgesWithStatus().filter(badge => {
    if (filter === 'unlocked' && !badge.unlocked) return false;
    if (filter === 'locked' && badge.unlocked) return false;
    if (categoryFilter !== 'all' && badge.category !== categoryFilter) return false;
    return true;
  });

  const unlockedCount = getBadgesWithStatus().filter(b => b.unlocked).length;
  const totalCount = allBadges.length;
  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  return (
    <div className="badges-page">
      <motion.div 
        className="badges-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1>🏆 Rozetlerim</h1>
        <p className="badges-subtitle">Başarılarını keşfet ve yeni rozetler kazan!</p>
        
        <div className="badges-progress">
          <div className="progress-info">
            <span className="progress-text">{unlockedCount} / {totalCount} Rozet</span>
            <span className="progress-percent">{progressPercent.toFixed(1)}%</span>
          </div>
          <div className="progress-bar">
            <motion.div 
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
        </div>

        <div className="badges-stats">
          <div className="stat-card">
            <span className="stat-icon">🎬</span>
            <span className="stat-value">{stats.totalWatched || 0}</span>
            <span className="stat-label">İzlenen</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✍️</span>
            <span className="stat-value">{stats.totalReviews || 0}</span>
            <span className="stat-label">Yorum</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💕</span>
            <span className="stat-value">{stats.partnerWatched || 0}</span>
            <span className="stat-label">Birlikte</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🔥</span>
            <span className="stat-value">{stats.currentStreak || 0}</span>
            <span className="stat-label">Seri</span>
          </div>
        </div>
      </motion.div>

      <div className="badges-filters">
        <div className="filter-group">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tümü
          </button>
          <button 
            className={`filter-btn ${filter === 'unlocked' ? 'active' : ''}`}
            onClick={() => setFilter('unlocked')}
          >
            Açılanlar
          </button>
          <button 
            className={`filter-btn ${filter === 'locked' ? 'active' : ''}`}
            onClick={() => setFilter('locked')}
          >
            Kilitli
          </button>
        </div>

        <div className="filter-group">
          <button 
            className={`filter-btn ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            Tüm Kategoriler
          </button>
          <button 
            className={`filter-btn ${categoryFilter === 'watching' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('watching')}
          >
            🎬 İzleme
          </button>
          <button 
            className={`filter-btn ${categoryFilter === 'social' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('social')}
          >
            👥 Sosyal
          </button>
          <button 
            className={`filter-btn ${categoryFilter === 'collection' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('collection')}
          >
            📚 Koleksiyon
          </button>
          <button 
            className={`filter-btn ${categoryFilter === 'special' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('special')}
          >
            ⭐ Özel
          </button>
        </div>
      </div>

      <div className="badges-content">
        {loading ? (
          <div className="badges-grid">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} height="120px" />
            ))}
          </div>
        ) : (
          <motion.div 
            className="badges-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {filteredBadges.map((badge, index) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Badge badge={badge} unlocked={badge.unlocked} />
              </motion.div>
            ))}
            {filteredBadges.length === 0 && (
              <div className="no-badges">
                <p>Bu filtrelemelerde rozet bulunamadı.</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Badges;
