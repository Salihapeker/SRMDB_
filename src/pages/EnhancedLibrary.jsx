import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import './EnhancedLibrary.css';

const EnhancedLibrary = ({ user, removeFromLibrary, addToLibrary }) => {
  const navigate = useNavigate();
  const [libraryItems, setLibraryItems] = useState({
    favorites: [],
    watchlist: [],
    disliked: [],
    watched: [],
  });
  const [partnerLibrary, setPartnerLibrary] = useState(null);
  const [sharedLibrary, setSharedLibrary] = useState({
    favorites: [],
    watchlist: [],
    watched: [],
    compatibility: [],
  });
  const [activeView, setActiveView] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAllLibraries = useCallback(async () => {
    try {
      console.log('📚 Fetching libraries...');
      setLoading(true);
      setError('');

      const personalResponse = await API.get('/api/library');
      if (!personalResponse.data) {
        throw new Error('Kütüphane verisi alınamadı.');
      }

      // Yinelenen watched kayıtlarını filtrele
      const uniqueWatched = personalResponse.data.watched
        ? personalResponse.data.watched.filter(
            (item, index, self) =>
              index === self.findIndex((t) => t.id === item.id && t.watchedDate === item.watchedDate)
          )
        : [];

      // Partner yoksa watchedTogether flagını kaldır
      const cleanedWatched = user?.partner 
        ? uniqueWatched 
        : uniqueWatched.map(item => ({
            ...item,
            watchedTogether: false
          }));

      setLibraryItems({
        favorites: personalResponse.data.favorites || [],
        watchlist: personalResponse.data.watchlist || [],
        disliked: personalResponse.data.disliked || [],
        watched: cleanedWatched,
      });

      if (user?.partner?.name) {
        try {
          const partnerResponse = await API.get('/api/library/partner');
          const partnerUniqueWatched = partnerResponse.data.watched
            ? partnerResponse.data.watched.filter(
                (item, index, self) =>
                  index === self.findIndex((t) => t.id === item.id && t.watchedDate === item.watchedDate)
              )
            : [];
          setPartnerLibrary({
            favorites: partnerResponse.data.favorites || [],
            watchlist: partnerResponse.data.watchlist || [],
            watched: partnerUniqueWatched,
            disliked: partnerResponse.data.disliked || [],
          });

          const sharedResponse = await API.get('/api/library/shared');
          const sharedUniqueWatched = sharedResponse.data.watched
            ? sharedResponse.data.watched.filter(
                (item, index, self) =>
                  index === self.findIndex((t) => t.id === item.id && t.watchedDate === item.watchedDate)
              )
            : [];
          setSharedLibrary({
            favorites: sharedResponse.data.favorites || [],
            watchlist: sharedResponse.data.watchlist || [],
            watched: sharedUniqueWatched,
            compatibility: sharedResponse.data.compatibility || [],
          });
        } catch (partnerError) {
          console.error('Partner kütüphanesi alınamadı:', partnerError);
          setPartnerLibrary({
            favorites: [],
            watchlist: [],
            watched: [],
            disliked: [],
          });
        }
      } else {
        // Partner yoksa partner kütüphanesini temizle
        setPartnerLibrary(null);
        setSharedLibrary({
          favorites: [],
          watchlist: [],
          watched: [],
          compatibility: [],
        });
      }
    } catch (err) {
      console.error('Kütüphane hatası:', err);
      setError(err.response?.data?.message || 'Kütüphane yüklenemedi. Ağ bağlantınızı kontrol edin.');
      if (err.response?.status === 401) {
        navigate('/login', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      fetchAllLibraries();
      const interval = setInterval(fetchAllLibraries, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchAllLibraries]);

  const handleAddToLibrary = useCallback(async (category, item) => {
    if (!item || !item.id) {
      console.error('Geçersiz içerik:', item);
      setError('İçerik eklenemedi: Geçersiz veri.');
      return;
    }
    try {
      const newLibrary = await addToLibrary(category, item);
      setLibraryItems(newLibrary);
    } catch (err) {
      setError(err.response?.data?.message || `İçerik ${category}'e eklenemedi.`);
    }
  }, [addToLibrary]);

  const handleRemove = useCallback(async (category, item) => {
    try {
      const newLibrary = await removeFromLibrary(category, item);
      setLibraryItems(newLibrary);
      fetchAllLibraries(); // Kütüphaneyi yenile
    } catch (err) {
      setError(err.response?.data?.message || 'Silme işlemi başarısız.');
    }
  }, [removeFromLibrary, fetchAllLibraries]);

  // İzlenme kaldırma fonksiyonu - tüm ilgili kategorilerden kaldırır
  const handleRemoveFromWatched = useCallback(async (movie) => {
    try {
      await API.post(`/api/watched/${movie.type || 'movie'}/${movie.id}`, {
        watchedType: 'remove',
        movieData: movie,
      });
      await fetchAllLibraries();
    } catch (error) {
      console.error('İzlenme kaldırma hatası:', error);
      setError(error.response?.data?.message || 'İzlenme durumu kaldırılamadı.');
    }
  }, [fetchAllLibraries]);

  const handleMarkAsWatched = useCallback(async (movie, watchedType = 'user') => {
    try {
      const movieData = {
        id: movie.id.toString(),
        title: movie.title || movie.name,
        poster_path: movie.poster_path,
        release_date: movie.release_date || movie.first_air_date,
        vote_average: movie.vote_average,
        type: movie.type || 'movie',
      };
      await API.post(`/api/watched/${movie.type || 'movie'}/${movie.id}`, {
        watchedType,
        movieData,
      });
      await fetchAllLibraries();
    } catch (error) {
      console.error('İzlendi işaretlenirken hata:', error);
      setError(error.response?.data?.message || 'İzlenme durumu güncellenemedi.');
    }
  }, [fetchAllLibraries]);

  const MovieCard = ({ movie, category, showPartnerRating = false, showSharedStatus = false }) => {
    const isWatched = libraryItems.watched?.some((w) => w.id === movie.id) || false;
    const partnerWatched = partnerLibrary?.watched?.some((w) => w.id === movie.id) || false;
    // Partner yoksa watchedTogether gösterme
    const watchedTogether = user?.partner ? (movie.watchedTogether || false) : false;

    const averageRating =
      showSharedStatus && movie.userRating && movie.partnerRating
        ? ((movie.userRating + movie.partnerRating) / 2).toFixed(1)
        : null;

    const getWatchedEmoji = () => {
      if (watchedTogether && user?.partner) return '💕';
      if (isWatched) return '👤';
      if (partnerWatched && user?.partner) return '👥';
      return '';
    };

    return (
      <div
        className="enhanced-movie-card"
        onClick={() => navigate(`/${movie.type || 'movie'}/${movie.id}`)}
      >
        <div className="card-poster">
          {movie.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
              alt={movie.title || movie.name}
              onError={(e) => (e.target.src = '/placeholder.jpg')}
            />
          ) : (
            <div className="poster-placeholder">Poster Yok</div>
          )}
          <div className="watch-badges">
            {isWatched && <span className="badge watched-user">👤</span>}
            {partnerWatched && user?.partner?.name && <span className="badge watched-partner">👥</span>}
            {watchedTogether && user?.partner && <span className="badge watched-together">{getWatchedEmoji()}</span>}
          </div>
          {movie.userRating && (
            <div className="rating-badge user-rating">
              <span>⭐ {movie.userRating}/5</span>
            </div>
          )}
          {showPartnerRating && movie.partnerRating && user?.partner && (
            <div className="rating-badge partner-rating">
              <span>👥 {movie.partnerRating}/5</span>
            </div>
          )}
          {averageRating && user?.partner && (
            <div className="rating-badge average-rating">
              <span>📊 {averageRating}/5</span>
            </div>
          )}
        </div>
        <div className="card-info">
          <h4>{movie.title || movie.name}</h4>
          <p className="release-year">
            {movie.release_date?.split('-')[0] || movie.first_air_date?.split('-')[0] || 'Bilinmiyor'}
          </p>
          <p className="imdb-rating">🎬 {movie.vote_average?.toFixed(1) || 'N/A'}/10</p>
          {showPartnerRating && movie.partnerRating && user?.partner && (
            <div className="partner-rating">
              <span>👥 {user.partner.name || 'Partner'}: ⭐ {movie.partnerRating}/5</span>
            </div>
          )}
          {movie.compatibilityScore && user?.partner && (
            <div className="compatibility-score">
              <span>💕 %{movie.compatibilityScore}</span>
            </div>
          )}
          {(movie.userComment || (showSharedStatus && movie.partnerComment && user?.partner)) && (
            <div className="comment-preview">
              {movie.userComment && <p>"{movie.userComment.slice(0, 60)}..."</p>}
              {showSharedStatus && movie.partnerComment && user?.partner && <p>👥 "{movie.partnerComment.slice(0, 60)}..."</p>}
            </div>
          )}
        </div>
        <div className="card-actions">
          {category === 'watched' ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFromWatched(movie);
                }}
                className="remove-btn"
                title="İzlenmedi Yap (Tüm Listelerden Kaldır)"
              >
                ❌
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToLibrary('favorites', movie);
                }}
                className="btn-favorite"
                title="Favori"
              >
                ❤️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToLibrary('disliked', movie);
                }}
                className="btn-dislike"
                title="Beğenmedim"
              >
                👎
              </button>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(category, movie);
              }}
              className="remove-btn"
              title="Kaldır"
            >
              🗑️
            </button>
          )}
          
          {category === 'watchlist' && !isWatched && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsWatched(movie, 'user');
                }}
                className="mark-watched-btn"
                title="İzledim"
              >
                ✅
              </button>
              {user?.partner?.name && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsWatched(movie, 'together');
                  }}
                  className="mark-watched-btn"
                  title="Birlikte İzledik"
                >
                  💕
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="enhanced-library-container">Yükleniyor...</div>;
  if (error) return <div className="enhanced-library-container error-message">{error}</div>;

  const { favorites = [], watchlist = [], disliked = [], watched = [] } = libraryItems;

  // Partner olmadığında watched together içerikleri filtrele
  const displayedWatched = user?.partner 
    ? watched 
    : watched.filter(item => !item.watchedTogether);

  return (
    <div className="enhanced-library-container">
      <div className="library-header">
        <h1>🎞️ Gelişmiş Kütüphane</h1>
        {user?.partner?.name && (
          <p className="partner-info">👥 Partner: {user.partner.name || user.partner.username}</p>
        )}
      </div>

      <div className="view-toggle">
        <button
          className={`toggle-btn ${activeView === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveView('personal')}
        >
          👤 Kişisel
        </button>
        {user?.partner?.name && partnerLibrary && (
          <>
            <button
              className={`toggle-btn ${activeView === 'partner' ? 'active' : ''}`}
              onClick={() => setActiveView('partner')}
            >
              👥 {user.partner.name || user.partner.username}
            </button>
            <button
              className={`toggle-btn ${activeView === 'shared' ? 'active' : ''}`}
              onClick={() => setActiveView('shared')}
            >
              💕 Ortak
            </button>
          </>
        )}
      </div>

      {activeView === 'personal' && (
        <div className="personal-library">
          <section className="library-section">
            <h3>📌 İzlenecekler ({watchlist.length})</h3>
            <div className="movie-grid">
              {watchlist.length > 0 ? (
                watchlist.map((movie) => (
                  <MovieCard
                    key={`watchlist-${movie.id}`}
                    movie={movie}
                    category="watchlist"
                  />
                ))
              ) : (
                <div className="empty-section">
                  <p>İzlenecek yok.</p>
                  <button onClick={() => navigate('/dashboard')} className="cta-btn">
                    🔍 Keşfet
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="library-section">
            <h3>✅ İzlenenler ({displayedWatched.length})</h3>
            <div className="movie-grid">
              {displayedWatched.length > 0 ? (
                displayedWatched.map((movie) => (
                  <MovieCard
                    key={`watched-${movie.id}-${movie.watchedDate}`}
                    movie={movie}
                    category="watched"
                  />
                ))
              ) : (
                <div className="empty-section">
                  <p>İzlenen yok.</p>
                </div>
              )}
            </div>
          </section>

          <section className="library-section">
            <h3>⭐ Favoriler ({favorites.length})</h3>
            <div className="movie-grid">
              {favorites.length > 0 ? (
                favorites.map((movie) => (
                  <MovieCard
                    key={`favorites-${movie.id}`}
                    movie={movie}
                    category="favorites"
                  />
                ))
              ) : (
                <div className="empty-section">
                  <p>Favori yok.</p>
                </div>
              )}
            </div>
          </section>

          <section className="library-section">
            <h3>👎 Beğenilmeyenler ({disliked.length})</h3>
            <div className="movie-grid">
              {disliked.length > 0 ? (
                disliked.map((movie) => (
                  <MovieCard
                    key={`disliked-${movie.id}`}
                    movie={movie}
                    category="disliked"
                  />
                ))
              ) : (
                <div className="empty-section">
                  <p>Beğenilmeyen yok.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {activeView === 'partner' && user?.partner?.name && partnerLibrary && (
        <div className="partner-library">
          <div className="partner-stats">
            <h3>{user.partner.name || user.partner.username}'in İstatistikleri</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-number">{partnerLibrary.favorites?.length || 0}</span>
                <span className="stat-label">Favori</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{partnerLibrary.watched?.length || 0}</span>
                <span className="stat-label">İzlenen</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{partnerLibrary.disliked?.length || 0}</span>
                <span className="stat-label">Beğenilmeyen</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">
                  {partnerLibrary.favorites?.length > 0
                    ? (
                        partnerLibrary.favorites.reduce(
                          (acc, f) => acc + (f.userRating || 0),
                          0
                        ) / partnerLibrary.favorites.length
                      ).toFixed(1)
                    : '0'}
                </span>
                <span className="stat-label">Ort. Puan</span>
              </div>
            </div>
          </div>

          <section className="library-section">
            <h3>📌 {user.partner.name || user.partner.username}'in İzlenecekleri</h3>
            <div className="movie-grid">
              {partnerLibrary.watchlist?.length > 0 ? (
                partnerLibrary.watchlist.map((movie) => (
                  <MovieCard
                    key={`partner-watchlist-${movie.id}`}
                    movie={movie}
                    category="watchlist"
                    showPartnerRating={true}
                  />
                ))
              ) : (
                <div className="empty-section">
                  <p>İzlenecek yok.</p>
                </div>
              )}
            </div>
          </section>

          <section className="library-section">
            <h3>✅ {user.partner.name || user.partner.username}'in İzlenenleri</h3>
            <div className="movie-grid">
              {partnerLibrary.watched?.length > 0 ? (
                partnerLibrary.watched.map((movie) => (
                  <MovieCard
                    key={`partner-watched-${movie.id}-${movie.watchedDate}`}
                    movie={movie}
                    category="watched"
                    showPartnerRating={true}
                  />
                ))
              ) : (
                <div className="empty-section">
                  <p>İzlenen yok.</p>
                </div>
              )}
            </div>
          </section>

          <section className="library-section">
            <h3>⭐ {user.partner.name || user.partner.username}'in Favorileri</h3>
            <div className="movie-grid">
              {partnerLibrary.favorites?.length > 0 ? (
                partnerLibrary.favorites.map((movie) => (
                  <div key={`partner-fav-${movie.id}`} className="partner-movie-card">
                    <MovieCard
                      movie={movie}
                      category="favorites"
                      showPartnerRating={true}
                    />
                    <div className="partner-badge">👥 Partner Favorisi</div>
                  </div>
                ))
              ) : (
                <div className="empty-section">
                  <p>Favori yok.</p>
                </div>
              )}
            </div>
          </section>

          <section className="library-section">
            <h3>👎 {user.partner.name || user.partner.username}'in Beğenmedikleri</h3>
            <div className="movie-grid">
              {partnerLibrary.disliked?.length > 0 ? (
                partnerLibrary.disliked.map((movie) => (
                  <MovieCard
                    key={`partner-disliked-${movie.id}`}
                    movie={movie}
                    category="disliked"
                    showPartnerRating={true}
                  />
                ))
              ) : (
                <div className="empty-section">
                  <p>Beğenilmeyen yok.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {activeView === 'shared' && user?.partner?.name && (
        <div className="shared-library">
          <div className="shared-stats">
            <h3>💕 Ortak İstatistikler</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-number">{sharedLibrary.favorites?.length || 0}</span>
                <span className="stat-label">Ortak Favori</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{sharedLibrary.watched?.length || 0}</span>
                <span className="stat-label">Birlikte İzlenen</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">
                  {sharedLibrary.watched?.length > 0
                    ? (
                        sharedLibrary.watched.reduce(
                          (acc, m) =>
                            acc + ((m.userRating || 0) + (m.partnerRating || 0)) / 2,
                          0
                        ) / sharedLibrary.watched.length
                      ).toFixed(1)
                    : '0'}
                </span>
                <span className="stat-label">Ort. Puan</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">
                  {sharedLibrary.compatibility?.length
                    ? Math.round(
                        sharedLibrary.compatibility.reduce(
                          (acc, c) => acc + c.score,
                          0
                        ) / sharedLibrary.compatibility.length
                      )
                    : 0}
                  %
                </span>
                <span className="stat-label">Ort. Uyumluluk</span>
              </div>
            </div>
          </div>

          <section className="library-section">
            <h3>📌 Ortak İzlenecekler</h3>
            <div className="movie-grid">
              {sharedLibrary.watchlist?.length > 0 ? (
                sharedLibrary.watchlist.map((movie) => (
                  <MovieCard
                    key={`shared-watchlist-${movie.id}`}
                    movie={movie}
                    category="watchlist"
                    showPartnerRating={true}
                    showSharedStatus={true}
                  />
                ))
              ) : (
                <div className="empty-section">
                  <p>Ortak izlenecek yok.</p>
                  <button onClick={() => navigate('/recommendations')} className="cta-btn">
                    🤖 Öneri Al
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="library-section">
            <h3>👫 Birlikte İzlenenler</h3>
            <div className="movie-grid">
              {sharedLibrary.watched?.length > 0 ? (
                sharedLibrary.watched.map((movie) => (
                  <div key={`together-${movie.id}-${movie.watchedDate}`} className="together-movie-card">
                    <MovieCard
                      movie={movie}
                      category="watched"
                      showPartnerRating={true}
                      showSharedStatus={true}
                    />
                    <div className="together-badge">
                      💕{' '}
                      {movie.watchedDate
                        ? new Date(movie.watchedDate).toLocaleDateString('tr-TR')
                        : 'Birlikte İzlendi'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-section">
                  <p>Birlikte izlenen yok.</p>
                  <button onClick={() => navigate('/recommendations')} className="cta-btn">
                    🤖 Öneri Al
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="library-section">
            <h3>💕 Ortak Favoriler</h3>
            <div className="movie-grid">
              {sharedLibrary.favorites?.length > 0 ? (
                sharedLibrary.favorites.map((movie) => (
                  <MovieCard
                    key={`shared-fav-${movie.id}`}
                    movie={movie}
                    category="favorites"
                    showPartnerRating={true}
                    showSharedStatus={true}
                  />
                ))
              ) : (
                <div className="empty-section">
                  <p>Ortak favori yok.</p>
                </div>
              )}
            </div>
          </section>

          {sharedLibrary.compatibility?.length > 0 && (
            <section className="library-section">
              <h3>📊 Uyumluluk Analizi</h3>
              <div className="compatibility-analysis">
                {sharedLibrary.compatibility.slice(0, 5).map((comp, index) => (
                  <div key={`comp-${index}`} className="compatibility-item">
                    <div className="compatibility-movie">
                      <img
                        src={
                          comp.movie.poster_path
                            ? `https://image.tmdb.org/t/p/w92${comp.movie.poster_path}`
                            : '/placeholder.jpg'
                        }
                        alt={comp.movie.title || comp.movie.name}
                      />
                      <span>{comp.movie.title || comp.movie.name}</span>
                    </div>
                    <div className="compatibility-score">
                      <div className="score-bar">
                        <div
                          className="score-fill"
                          style={{ width: `${comp.score}%` }}
                        ></div>
                      </div>
                      <span>{comp.score}% Uyumlu</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="quick-actions" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
        <button onClick={() => navigate('/dashboard')} className="action-btn" style={{ padding: '10px 15px', borderRadius: '20px', background: 'linear-gradient(90deg, #4a90e2, #ff7eb3)', color: 'white', border: 'none', cursor: 'pointer', transition: 'transform 0.2s' }}>
          🔍
        </button>
        <button onClick={() => navigate('/recommendations')} className="action-btn" style={{ padding: '10px 15px', borderRadius: '20px', background: 'linear-gradient(90deg, #ff7eb3, #4a90e2)', color: 'white', border: 'none', cursor: 'pointer', transition: 'transform 0.2s' }}>
          🤖
        </button>
        {user?.partner?.name && (
          <button onClick={() => setActiveView('shared')} className="action-btn" style={{ padding: '10px 15px', borderRadius: '20px', background: 'linear-gradient(90deg, #6b48ff, #ff4d94)', color: 'white', border: 'none', cursor: 'pointer', transition: 'transform 0.2s' }}>
            💕
          </button>
        )}
      </div>
    </div>
  );
};

export default EnhancedLibrary;