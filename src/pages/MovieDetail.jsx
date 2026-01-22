import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../services/api';
import './MovieDetail.css';

const MovieDetail = ({ user, addToLibrary }) => {
  const { id, type } = useParams();
  const navigate = useNavigate();

  const [movieData, setMovieData] = useState(null);
  const [userReview, setUserReview] = useState({ rating: 0, comment: '' });
  const [partnerReview, setPartnerReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [watchedStatus, setWatchedStatus] = useState({
    user: false,
    partner: false,
    together: false,
  });
  const [averageRating, setAverageRating] = useState(null);
  const [jointReview, setJointReview] = useState({ rating: 0, comment: '' });
  const [activeTab, setActiveTab] = useState('my_review'); // 'my_review', 'partner_review', 'joint_review'
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);

  const fetchWithTimeout = async (url, options, timeout = 15000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        throw new Error('İstek zaman aşımına uğradı.');
      }
      throw error;
    }
  };

  const fetchMovieDetail = useCallback(async () => {
    const startTime = Date.now();
    console.log(`Fetching movie details for ${type}/${id}`);

    try {
      setLoading(true);
      const apiKey = process.env.REACT_APP_TMDB_API_KEY;
      if (!apiKey) {
        throw new Error('TMDB API anahtarı bulunamadı.');
      }

      // TMDB API çağrısı
      const tmdbResponse = await fetchWithTimeout(
        `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=tr-TR&append_to_response=credits,videos,watch/providers`,
        {},
        10000
      );

      if (!tmdbResponse.ok) {
        throw new Error(`TMDB API hatası: ${tmdbResponse.status}`);
      }

      const tmdbData = await tmdbResponse.json();

      // Backend API çağrısı
      const reviewResponse = await API.get(`/api/reviews/${type}/${id}`);

      setMovieData(tmdbData);
      setUserReview(reviewResponse.data.userReview || { rating: 0, comment: '' });
      setPartnerReview(reviewResponse.data.partnerReview || null);
      setJointReview(reviewResponse.data.jointReview || { rating: 0, comment: '' });

      setWatchedStatus(reviewResponse.data.watchedStatus || {
        user: false,
        partner: false,
        together: false,
      });

      // Ortalama puan hesapla
      const ratings = [];
      if (reviewResponse.data.userReview?.rating) ratings.push(reviewResponse.data.userReview.rating);
      if (reviewResponse.data.partnerReview?.rating) ratings.push(reviewResponse.data.partnerReview.rating);
      if (reviewResponse.data.jointReview?.rating) ratings.push(reviewResponse.data.jointReview.rating);

      if (ratings.length > 0) {
        const sum = ratings.reduce((a, b) => a + b, 0);
        setAverageRating((sum / ratings.length).toFixed(1));
      }

      // Fragman bulma (Youtube ve Type: Trailer/Teaser)
      const videos = tmdbData.videos?.results || [];
      const trailer = videos.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
      if (trailer) {
        setTrailerKey(trailer.key);
      }

    } catch (error) {
      console.error('Film detayları alınırken hata:', error.message);
      setErrorMessage(error.message || 'Veri yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      console.log(`Loading finished, süre: ${Date.now() - startTime}ms`);
      setLoading(false);
    }
  }, [id, type]);

  useEffect(() => {
    if (id && type) {
      fetchMovieDetail();
    }
  }, [id, type, fetchMovieDetail]);

  const handleSaveReview = async (isJoint = false) => {
    if (isJoint) {
      if (!watchedStatus.together) {
        toast.error('Ortak yorum için filmi "Birlikte İzledik" olarak işaretlemelisiniz!');
        return;
      }
      if (!jointReview.rating || jointReview.rating < 1 || jointReview.rating > 5) {
        toast.error('Lütfen 1-5 arasında puan verin!');
        return;
      }
    } else {
      if (!watchedStatus.user && !watchedStatus.together) {
        toast.error('Puan ve yorum için önce izlendi olarak işaretleyin!');
        return;
      }
      if (!userReview.rating || userReview.rating < 1 || userReview.rating > 5) {
        toast.error('Lütfen 1-5 arasında puan verin!');
        return;
      }
    }

    try {
      const endpoint = isJoint ? `/api/reviews/joint/${type}/${id}` : `/api/reviews/${type}/${id}`;
      const payload = isJoint ? {
        rating: jointReview.rating,
        comment: jointReview.comment
      } : {
        rating: userReview.rating,
        comment: userReview.comment,
        movieData: {
          id: movieData?.id?.toString(),
          title: movieData?.title || movieData?.name || 'Bilinmiyor',
          poster_path: movieData?.poster_path || '/placeholder.jpg',
          release_date: movieData?.release_date || movieData?.first_air_date || 'Bilinmiyor',
          vote_average: movieData?.vote_average || 0,
          type: type || 'movie',
        },
      };

      const response = await API.post(endpoint, payload);

      toast.success('Değerlendirmeniz kaydedildi!');

      if (isJoint) {
        // Joint response handling usually returns the updated reviews array or the review itself
        // Assuming backend returns { message, reviews: [...] }
        // We need to locally update state or fetch details again.
        // For simplicity in this specialized update:
        fetchMovieDetail();
      } else {
        setUserReview({
          rating: response.data.userReview.rating,
          comment: response.data.userReview.comment,
        });
        fetchMovieDetail();
      }

    } catch (error) {
      console.error('Değerlendirme hatası:', error);
      toast.error(error.response?.data?.message || 'Değerlendirme kaydedilemedi.');
    }
  };

  const updateWatchedStatus = async (status) => {
    try {
      console.log('Updating watched status:', status);
      const response = await API.post(`/api/watched/${type}/${id}`, {
        watchedType: status,
        movieData: {
          id: movieData?.id?.toString(),
          title: movieData?.title || movieData?.name || 'Bilinmiyor',
          poster_path: movieData?.poster_path || '/placeholder.jpg',
          release_date: movieData?.release_date || movieData?.first_air_date || 'Bilinmiyor',
          vote_average: movieData?.vote_average || 0,
          type: type || 'movie',
        },
      });

      setWatchedStatus(response.data.watchedStatus);
      toast.success('İzlenme durumu güncellendi!');
    } catch (error) {
      console.error('İzlenme durumu hatası:', error);
      toast.error(error.response?.data?.message || 'İzlenme durumu güncellenemedi.');
    }
  };

  const StarRating = ({ rating, onRatingChange, readonly = false }) => {
    return (
      <div className="star-rating" role="radiogroup" aria-label="Puanlama">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''} ${readonly ? 'readonly' : ''}`}
            onClick={() => !readonly && onRatingChange(star)}
            role="radio"
            aria-checked={star <= rating}
            aria-label={`${star} yıldız`}
            style={{ cursor: readonly ? 'default' : 'pointer' }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="detail-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Detaylar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="detail-container">
        <div className="error-state">
          <h3>Hata</h3>
          <p>{errorMessage}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="back-btn"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  if (!movieData) {
    return (
      <div className="detail-container">
        <div className="error-state">
          <h3>Film/Dizi bulunamadı</h3>
          <button
            onClick={() => navigate('/dashboard')}
            className="back-btn"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  const director = movieData.credits?.crew?.find(person => person.job === 'Director');
  const mainActors = movieData.credits?.cast?.slice(0, 5) || [];

  return (
    <div className="detail-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← Geri
      </button>

      <div className="detail-header">
        <div className="poster-section">
          {movieData.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w400${movieData.poster_path}`}
              alt={movieData.title || movieData.name || 'Bilinmiyor'}
              className="detail-poster"
              onError={(e) => (e.target.src = '/placeholder.jpg')}
            />
          ) : (
            <div className="poster-placeholder">Poster Yok</div>
          )}

          <div className="watched-indicators">
            {watchedStatus.user && <span className="watched-badge user">👤 İzledim</span>}
            {watchedStatus.partner && user?.partner?.name && (
              <span className="watched-badge partner">
                👥 {user.partner.name || user.partner.username || 'Partner'} İzledi
              </span>
            )}
            {watchedStatus.together && (
              <span className="watched-badge together">
                💕 Birlikte İzledik
              </span>
            )}
          </div>
          {trailerKey && (
            <button
              className="trailer-btn"
              onClick={() => setShowTrailer(true)}
            >
              ▶ Fragman İzle
            </button>
          )}
        </div>

        <div className="info-section">
          <h1>{movieData.title || movieData.name || 'Bilinmiyor'}</h1>
          {movieData.tagline && <p className="tagline">{movieData.tagline}</p>}

          <div className="basic-info">
            <span>📅 {movieData.release_date || movieData.first_air_date || 'Bilinmiyor'}</span>
            <span>⭐ IMDB: {movieData.vote_average?.toFixed(1) || 'N/A'}/10</span>
            <span>⏰ {movieData.runtime || movieData.episode_run_time?.[0] || 'Bilinmiyor'} dk</span>
            {movieData.genres && movieData.genres.length > 0 ? (
              <span>🎭 {movieData.genres.map(g => g.name).join(', ')}</span>
            ) : (
              <span>🎭 Tür Bilinmiyor</span>
            )}
          </div>

          {/* JustWatch / Nerede İzlenir */}
          {movieData['watch/providers']?.results?.TR?.flatrate && (
            <div className="providers-section">
              <h3>Nerede İzlenir?</h3>
              <div className="provider-list">
                {movieData['watch/providers'].results.TR.flatrate.map((provider) => (
                  <a
                    key={provider.provider_id}
                    href={movieData['watch/providers'].results.TR.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="provider-item"
                    title={`${provider.provider_name}'da izle`}
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                      alt={provider.provider_name}
                    />
                  </a>
                ))}
              </div>
              <a href={movieData['watch/providers'].results.TR.link} target="_blank" rel="noopener noreferrer" className="justwatch-link">
                JustWatch üzerinden tüm seçenekleri gör
              </a>
            </div>
          )}

          <div className="overview">
            <h3>Özet</h3>
            <p>{movieData.overview || 'Özet bulunamadı.'}</p>
          </div>

          <div className="credits">
            <h3>Yapım Ekibi</h3>
            {director ? (
              <p><strong>Yönetmen:</strong> {director.name}</p>
            ) : (
              <p><strong>Yönetmen:</strong> Bilinmiyor</p>
            )}
            {mainActors.length > 0 ? (
              <p><strong>Oyuncular:</strong> {mainActors.map(actor => actor.name).join(', ')}</p>
            ) : (
              <p><strong>Oyuncular:</strong> Bilinmiyor</p>
            )}
          </div>

          <div className="library-actions">
            <button
              onClick={() => addToLibrary("watchlist", movieData)}
              className="btn-watchlist"
            >
              📌 İzlenecekler
            </button>
            {(watchedStatus.user || watchedStatus.together) && (
              <>
                <button
                  onClick={() => addToLibrary("favorites", movieData)}
                  className="btn-favorite"
                >
                  ❤️ Favorilere Ekle
                </button>
                <button
                  onClick={() => addToLibrary("disliked", movieData)}
                  className="btn-dislike"
                >
                  👎 Beğenmedim
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="watched-actions">
        <h3>İzlenme Durumu</h3>
        <div className="watched-buttons">
          <button
            onClick={() => updateWatchedStatus('user')}
            className={`watched-btn ${watchedStatus.user ? 'active' : ''}`}
            aria-label="Kendi izleme durumunu işaretle"
          >
            👤 İzledim
          </button>

          {user?.partner?.name && (
            <button
              onClick={() => updateWatchedStatus('together')}
              className={`watched-btn ${watchedStatus.together ? 'active' : ''}`}
              aria-label="Birlikte izleme durumunu işaretle"
            >
              💕 Birlikte İzledik
            </button>
          )}

          <button
            onClick={() => updateWatchedStatus('remove')}
            className="watched-btn remove-watched"
          >
            🗑️ İzlenme Kaldır
          </button>
        </div>
      </div>

      {(watchedStatus.user || watchedStatus.together) && (
        <div className="review-section">
          <div className="review-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <button
              className={`tab-btn ${activeTab === 'my_review' ? 'active' : ''}`}
              onClick={() => setActiveTab('my_review')}
              style={{
                padding: '10px',
                borderBottom: activeTab === 'my_review' ? '2px solid var(--primary-color)' : 'none',
                background: 'none',
                color: activeTab === 'my_review' ? 'var(--primary-color)' : 'var(--text-color)',
                cursor: 'pointer',
                fontWeight: activeTab === 'my_review' ? 'bold' : 'normal'
              }}
            >
              📝 Benim Yorumum
            </button>
            {user?.partner && (
              <>
                <button
                  className={`tab-btn ${activeTab === 'partner_review' ? 'active' : ''}`}
                  onClick={() => setActiveTab('partner_review')}
                  style={{
                    padding: '10px',
                    borderBottom: activeTab === 'partner_review' ? '2px solid var(--primary-color)' : 'none',
                    background: 'none',
                    color: activeTab === 'partner_review' ? 'var(--primary-color)' : 'var(--text-color)',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'partner_review' ? 'bold' : 'normal'
                  }}
                >
                  👤 Partner
                </button>
                {watchedStatus.together && (
                  <button
                    className={`tab-btn ${activeTab === 'joint_review' ? 'active' : ''}`}
                    onClick={() => setActiveTab('joint_review')}
                    style={{
                      padding: '10px',
                      borderBottom: activeTab === 'joint_review' ? '2px solid #e91e63' : 'none',
                      background: 'none',
                      color: activeTab === 'joint_review' ? '#e91e63' : 'var(--text-color)',
                      cursor: 'pointer',
                      fontWeight: activeTab === 'joint_review' ? 'bold' : 'normal'
                    }}
                  >
                    💞 Ortak Yorum
                  </button>
                )}
              </>
            )}
          </div>

          {activeTab === 'my_review' && (
            <div className="user-review">
              <h3>Sizin Yorumunuz</h3>
              <div className="rating-input">
                <label>Puanın:</label>
                <StarRating
                  rating={userReview.rating}
                  onRatingChange={(rating) => setUserReview(prev => ({ ...prev, rating }))}
                />
                <span>({userReview.rating}/5)</span>
              </div>

              <div className="comment-input">
                <label>Yorumun:</label>
                <textarea
                  value={userReview.comment}
                  onChange={(e) =>
                    setUserReview(prev => ({ ...prev, comment: e.target.value }))
                  }
                  placeholder="Bu içerik hakkında ne düşünüyorsunuz?"
                  rows="4"
                />
              </div>
              <button onClick={() => handleSaveReview(false)} className="save-review-btn">
                💾 Kaydet
              </button>
            </div>
          )}

          {activeTab === 'partner_review' && user?.partner && (
            <div className="partner-review">
              <h3>{user.partner.name || user.partner.username}'in Yorumu</h3>
              {partnerReview ? (
                <>
                  <div className="partner-rating">
                    <StarRating rating={partnerReview.rating} readonly />
                    <span>({partnerReview.rating}/5)</span>
                  </div>
                  <p className="partner-comment">
                    "{partnerReview.comment || 'Yorum yok.'}"
                  </p>
                  <small className="review-date">
                    {new Date(partnerReview.createdAt).toLocaleDateString(
                      'tr-TR'
                    )}
                  </small>
                </>
              ) : (
                <p className="no-review">Partneriniz henüz değerlendirmedi.</p>
              )}
            </div>
          )}

          {activeTab === 'joint_review' && user?.partner && watchedStatus.together && (
            <div className="review-card joint-review" style={{ border: '1px solid #e91e63', padding: '15px', borderRadius: '10px', background: 'rgba(233, 30, 99, 0.05)' }}>
              <h3 style={{ color: '#e91e63' }}>💞 Ortak Yorumumuz</h3>
              <div className="rating-input">
                <label>Ortak Puanınız:</label>
                <StarRating
                  rating={jointReview.rating}
                  onRatingChange={(rating) => setJointReview(prev => ({ ...prev, rating }))}
                />
                <span>({jointReview.rating}/5)</span>
              </div>
              <div className="comment-input">
                <label>Ortak Yorumunuz:</label>
                <textarea
                  value={jointReview.comment}
                  onChange={(e) =>
                    setJointReview(prev => ({ ...prev, comment: e.target.value }))
                  }
                  placeholder="Birlikte izlediğiniz bu film hakkında ortak düşünceleriniz neler?"
                  rows="4"
                  style={{ borderColor: '#e91e63', width: '100%' }}
                />
              </div>
              <button onClick={() => handleSaveReview(true)} className="save-review-btn" style={{ backgroundColor: '#e91e63', borderColor: '#e91e63' }}>
                💞 Ortak Yorumu Kaydet
              </button>
            </div>
          )}
        </div>
      )}

      {user?.partner?.name && userReview.rating > 0 && partnerReview?.rating > 0 && (
        <div className="compatibility-score">
          <h3>Uyumluluk Skoru</h3>
          <div className="compatibility-meter">
            <div className="meter-bar">
              <div
                className="meter-fill"
                style={{ width: `${averageRating * 20}%` }}
              ></div>
            </div>
            <span>Ortalama Puan: {averageRating}/5 (%{Math.round(averageRating * 20)} Uyumlu)</span>
          </div>
        </div>
      )}
      {showTrailer && trailerKey && (
        <div className="modal-overlay" onClick={() => setShowTrailer(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowTrailer(false)}>✕</button>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetail;