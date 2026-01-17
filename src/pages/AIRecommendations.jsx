import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import './AIRecommendations.css';

const AIRecommendations = ({ user, addToLibrary, libraryItems }) => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [partnerRecommendations, setPartnerRecommendations] = useState([]);
  const [sharedRecommendations, setSharedRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('personal');

  // Kişisel öneriler (TMDB tabanlı)
  const fetchPersonalRecommendations = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await API.post('/api/ai/recommendations', { type: 'personal' });
      console.log('Personal Recommendations Response:', response.data);
      setRecommendations(response.data.recommendations || []);
    } catch (error) {
      console.error('Kişisel öneriler alınırken hata:', error);
      setError('Kişisel öneriler yüklenemedi. Daha fazla film değerlendirin.');
    } finally {
      setLoading(false);
    }
  };

  // Partner önerileri
  const fetchPartnerRecommendations = async () => {
    if (!user.partner) return;
    try {
      setLoading(true);
      setError('');
      const response = await API.post('/api/ai/recommendations', { type: 'partner' });
      console.log('Partner Recommendations Response:', response.data);
      setPartnerRecommendations(response.data.recommendations || []);
    } catch (error) {
      console.error('Partner önerileri alınırken hata:', error);
      setError('Partner önerileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  // Ortak öneriler
  const fetchSharedRecommendations = async () => {
    if (!user.partner) return;
    try {
      setLoading(true);
      setError('');
      const response = await API.post('/api/ai/recommendations', { type: 'shared' });
      console.log('Shared Recommendations Response:', response.data);
      setSharedRecommendations(response.data.recommendations || []);
    } catch (error) {
      console.error('Ortak öneriler alınırken hata:', error);
      setError('Ortak öneriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  // Tab değişimi
  useEffect(() => {
    switch (activeTab) {
      case 'personal':
        fetchPersonalRecommendations();
        break;
      case 'partner':
        fetchPartnerRecommendations();
        break;
      case 'shared':
        fetchSharedRecommendations();
        break;
      default:
        break;
    }
  }, [activeTab, user.partner, fetchPartnerRecommendations, fetchSharedRecommendations]);

  // Öneri kartı
  const RecommendationCard = ({ item, reason }) => {
    const isWatched = Array.isArray(libraryItems?.watched)
      ? libraryItems.watched.some((w) => w.id === item.id)
      : false;

    if (!item || !item.id) {
      console.warn('RecommendationCard: Geçersiz item verisi', { item });
      return <div className="recommendation-card">Öneri verisi eksik</div>;
    }

    return (
      <div className="recommendation-card" onClick={() => navigate(`/${item.type || 'movie'}/${item.id}`)}>
        {item.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
            alt={item.title || item.name}
            className="recommendation-poster"
          />
        ) : (
          <div className="poster-placeholder">Poster Yok</div>
        )}
        <div className="recommendation-info">
          <h4>{item.title || item.name}</h4>
          <p className="recommendation-year">
            {item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0] || 'Bilinmiyor'}
          </p>
          <p className="recommendation-rating">⭐ {item.vote_average?.toFixed(1) || 'N/A'}/10</p>
          {reason && (
            <div className="recommendation-reason">
              <span className="reason-tag">🎯 {reason}</span>
            </div>
          )}
          <div className="recommendation-actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                addToLibrary('watchlist', item);
              }}
              className="btn-small"
              title="İzleneceklere Ekle"
            >
              📌
            </button>
            {isWatched && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToLibrary('favorites', item);
                  }}
                  className="btn-small"
                  title="Favorilere Ekle"
                >
                  ❤️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToLibrary('disliked', item);
                  }}
                  className="btn-small"
                  title="Beğenmedim"
                >
                  👎
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ai-recommendations-container">
      <div className="recommendations-header">
        <h1>🎬 Film & Dizi Önerileri</h1>
        <p className="recommendations-subtitle">
          Favorilerinize göre özel öneriler
        </p>
      </div>

      <div className="recommendation-tabs">
        <button
          className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          👤 Kişisel Öneriler
        </button>
        {user.partner && (
          <>
            <button
              className={`tab-btn ${activeTab === 'partner' ? 'active' : ''}`}
              onClick={() => setActiveTab('partner')}
            >
              👥 Partner İçin
            </button>
            <button
              className={`tab-btn ${activeTab === 'shared' ? 'active' : ''}`}
              onClick={() => setActiveTab('shared')}
            >
              💕 Ortak Öneriler
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="ai-loading">
            <div className="loading-spinner"></div>
            <p>Öneriler hazırlanıyor...</p>
          </div>
        </div>
      ) : error ? (
        <div className="error-state">
          <h3>😕 Öneriler yüklenemedi</h3>
          <p>{error}</p>
          <button onClick={() => setActiveTab(activeTab)} className="cta-btn">
            Tekrar Dene
          </button>
        </div>
      ) : (
        <div className="recommendations-content">
          {activeTab === 'personal' && (
            <div className="recommendations-grid">
              {recommendations.length > 0 ? (
                recommendations.map((rec, index) => (
                  <RecommendationCard
                    key={`personal-${index}`}
                    item={rec.movie}
                    reason={rec.reason}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <h3>🎬 Henüz kişisel önerimiz yok</h3>
                  <p>Daha fazla film/dizi değerlendir, önerilerimiz gelişsin!</p>
                  <button onClick={() => navigate('/dashboard')} className="cta-btn">
                    Film/Dizi Keşfet
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'partner' && user.partner && (
            <div className="recommendations-grid">
              {partnerRecommendations.length > 0 ? (
                partnerRecommendations.map((rec, index) => (
                  <RecommendationCard
                    key={`partner-${index}`}
                    item={rec.movie}
                    reason={`Partner için ${rec.reason}`}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <h3>👥 Partner için henüz önerimiz yok</h3>
                  <p>Partner daha fazla film/dizi değerlendirin!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'shared' && user.partner && (
            <div className="shared-recommendations">
              {sharedRecommendations.length > 0 ? (
                <>
                  <div className="shared-intro">
                    <h3>💕 İkinizin de Beğeneceği Filmler</h3>
                    <p>Ortak beğenilerinize göre hazırlandı</p>
                  </div>
                  <div className="recommendations-grid">
                    {sharedRecommendations.map((rec, index) => (
                      <RecommendationCard
                        key={`shared-${index}`}
                        item={rec.movie}
                        reason={rec.reason}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <h3>💕 Ortak öneri için daha fazla veri gerekli</h3>
                  <p>İkiniz de daha fazla film/dizi değerlendirin!</p>
                  <div className="stats-hint">
                    <p>İdeal öneri için:</p>
                    <ul>
                      <li>En az 5 ortak değerlendirme</li>
                      <li>Farklı türlerden filmler</li>
                      <li>Yorum ve yıldız puanları</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="recommendation-tips">
        <h4>💡 Daha İyi Öneriler İçin:</h4>
        <div className="tips-grid">
          <div className="tip-card">
            <span className="tip-icon">⭐</span>
            <p>Filmleri 1-5 yıldız ile değerlendir</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">💬</span>
            <p>Yorum yaz, ne sevdiğini anlat</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">🎭</span>
            <p>Farklı türlerden filmler izle</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon">👥</span>
            <p>Partnerle birlikte değerlendirin</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIRecommendations;