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
      const apiKey = process.env.REACT_APP_TMDB_API_KEY;
      if (!apiKey) {
        throw new Error('TMDB API anahtarı bulunamadı.');
      }

      // TMDB API çağrısı
      const tmdbResponse = await fetchWithTimeout(
        `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=tr-TR&append_to_response=credits`,
        {},
        10000 // 10 saniye timeout
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
      setWatchedStatus(reviewResponse.data.watchedStatus || {
        user: false,
        partner: false,
        together: false,
      });

      // Ortalama puan hesapla
      if (reviewResponse.data.userReview?.rating && reviewResponse.data.partnerReview?.rating) {
        const avg = ((reviewResponse.data.userReview.rating + reviewResponse.data.partnerReview.rating) / 2).toFixed(1);
        setAverageRating(avg);
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
    if (
      typeof id === 'string' &&
      typeof type === 'string' &&
      id.trim() !== '' &&
      type.trim() !== '' &&
      ['movie', 'tv'].includes(type) &&
      !isNaN(id)
    ) {
      fetchMovieDetail();
    } else {
      console.error('Geçersiz ID veya type:', { id, type });
      setErrorMessage('Geçersiz film/dizi ID veya tipi.');
      setLoading(false);
    }
  }, [id, type, fetchMovieDetail]);

  const handleSaveReview = async () => {
    if (!watchedStatus.user && !watchedStatus.together) {
      toast.error('Puan ve yorum için önce izlendi olarak işaretleyin!');
      return;
    }
    
    if (!userReview.rating || userReview.rating < 1 || userReview.rating > 5) {
      toast.error('Lütfen 1-5 arasında puan verin!');
      return;
    }

    try {
      console.log('Saving review:', userReview);
      const response = await API.post(`/api/reviews/${type}/${id}`, {
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
      });

      toast.success('Değerlendirmeniz kaydedildi!');
      setUserReview({
        rating: response.data.userReview.rating,
        comment: response.data.userReview.comment,
      });

      if (response.data.partnerReview) {
        setPartnerReview(response.data.partnerReview);
        const avg = ((response.data.userReview.rating + response.data.partnerReview.rating) / 2).toFixed(1);
        setAverageRating(avg);
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
          <h3>Değerlendirmen</h3>
          
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
              onChange={(e) => setUserReview(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Bu film/dizi hakkında ne düşünüyorsun?"
              rows="4"
              aria-label="Yorum yaz"
            />
          </div>

          <button onClick={handleSaveReview} className="save-review-btn">
            💾 Değerlendirmeyi Kaydet
          </button>
        </div>
      )}

      {user?.partner?.name && partnerReview && (
        <div className="partner-review">
          <h3>{user.partner.name || user.partner.username || 'Partner'}'in Değerlendirmesi</h3>
          
          <div className="partner-rating">
            <StarRating rating={partnerReview.rating} readonly />
            <span>({partnerReview.rating}/5)</span>
          </div>
          
          {partnerReview.comment && (
            <div className="partner-comment">
              <p>"{partnerReview.comment}"</p>
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
    </div>
  );
};

export default MovieDetail;