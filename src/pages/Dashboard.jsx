import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import debounce from "lodash.debounce";
import API from "../services/api";
import "./Dashboard.css";

// Varsayılan placeholder sabiti
const PLACEHOLDER_IMAGE = "/public/placeholder.jpg";

const API_KEY = process.env.REACT_APP_TMDB_API_KEY;

const Dashboard = ({
  user,
  setUser,
  addToLibrary,
  libraryItems,
  setLibraryItems,
}) => {
  const navigate = useNavigate();
  const [appName, setAppName] = useState("SRMDB");
  const [mediaType, setMediaType] = useState("movie");
  const [searchQuery, setSearchQuery] = useState("");
  const [year, setYear] = useState("");
  const [minRating, setMinRating] = useState("");
  const [genre, setGenre] = useState("");
  const [results, setResults] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [partnerInput, setPartnerInput] = useState("");
  const [partnerSearchResults, setPartnerSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [contentLoading, setContentLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState([]); // Yeni state

  // İstekleri çek
  const fetchSentRequests = useCallback(async () => {
    try {
      const response = await API.get("/api/partner/sent-requests");
      setSentRequests(response.data);
    } catch (error) {
      console.error("Giden istekler alınamadı:", error);
    }
  }, []);

  useEffect(() => {
    if (showModal) {
      fetchSentRequests();
    }
  }, [showModal, fetchSentRequests]);

  const SentRequestsSection = () => {
    if (sentRequests.length === 0) return null;

    return (
      <div className="sent-requests-section" style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
        <h4>📤 Gönderilen Bekleyen İstekler</h4>
        <div className="users-grid">
          {sentRequests.map((req) => (
            <div key={req._id} className="search-result-item" style={{ cursor: 'default' }}>
              <img
                src={req.to.profilePicture || PLACEHOLDER_IMAGE}
                alt={req.to.username}
                className="search-user-pic"
                onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
              />
              <div className="user-details">
                <span className="username">{req.to.username}</span>
                <span className="status-badge pending">⏳ Bekliyor</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleWatchedTogether = async (item) => {
    if (!user?.partner) {
      alert("Partneriniz yok, önce bir partner davet edin!");
      return;
    }
    try {
      const movieData = {
        id: item.id.toString(),
        title: item.title || item.name,
        poster_path: item.poster_path,
        release_date: item.release_date || item.first_air_date,
        vote_average: item.vote_average,
        type: item.type || mediaType,
      };

      const response = await API.post(
        `/api/watched/${item.type || mediaType}/${item.id}`,
        {
          watchedType: "together",
          movieData,
        }
      );

      if (response.status === 200 || response.status === 201) {
        if (setLibraryItems) {
          const libraryResponse = await API.get("/api/library");
          if (libraryResponse.status === 200) {
            setLibraryItems(libraryResponse.data);
          }
        }
        alert("Partnerle izleme eklendi!");
      }
    } catch (error) {
      console.error("Partnerle izleme hatası:", error);
      alert(error.response?.data?.message || "Partnerle izleme eklenemedi.");
    }
  };

  useEffect(() => {
    if (!setUser || typeof setUser !== "function") {
      console.error(
        "Dashboard: setUser prop is required and must be a function"
      );
      navigate("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await API.get("/api/auth/me");
        if (response.status === 200 && response.data.user) {
          setUser(response.data.user);
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Kullanıcı çekilemedi:", error);
        if (error.response?.status === 401) {
          navigate("/login");
        }
      }
    };

    if (!user) fetchUser();
  }, [navigate, user, setUser]);

  useEffect(() => {
    if (user && user.partner && user.partner.name) {
      const userInitial = user.name.charAt(0).toUpperCase();
      const partnerInitial = user.partner.name.charAt(0).toUpperCase();
      setAppName(`${userInitial}${partnerInitial}MDB`);
    } else {
      setAppName("SRMDB");
    }
  }, [user]);

  const fetchContent = useCallback(
    async (page = 1) => {
      try {
        setContentLoading(true);

        let url;
        let params = new URLSearchParams({
          api_key: API_KEY,
          language: "tr-TR",
          page: page.toString(),
        });

        if (searchQuery.trim()) {
          url = `https://api.themoviedb.org/3/search/${mediaType}`;
          params.append("query", searchQuery.trim());
          if (year) {
            params.append(
              mediaType === "movie" ? "year" : "first_air_date_year",
              year
            );
          }
        } else {
          url = `https://api.themoviedb.org/3/discover/${mediaType}`;
          params.append("sort_by", "popularity.desc");
          if (year) {
            params.append(
              mediaType === "movie"
                ? "primary_release_year"
                : "first_air_date_year",
              year
            );
          }
          if (minRating) {
            params.append("vote_average.gte", minRating);
          }
          if (genre) {
            params.append("with_genres", genre);
          }
        }

        const finalUrl = `${url}?${params.toString()}`;
        console.log("Fetching:", finalUrl);

        const response = await fetch(finalUrl);
        const data = await response.json();

        if (data.results) {
          let filteredResults = data.results;
          if (searchQuery.trim() && (minRating || genre)) {
            filteredResults = filteredResults.filter((item) => {
              const ratingMatch =
                !minRating || item.vote_average >= parseFloat(minRating);
              const genreMatch =
                !genre ||
                (item.genre_ids && item.genre_ids.includes(parseInt(genre)));
              return ratingMatch && genreMatch;
            });
          }
          setResults(filteredResults);
          setCurrentPage(data.page || 1);
          setTotalPages(Math.min(data.total_pages || 1, 500));
        } else {
          setResults([]);
          setCurrentPage(1);
          setTotalPages(1);
        }
      } catch (error) {
        console.error("İçerik alınırken hata oluştu:", error);
        setResults([]);
      } finally {
        setContentLoading(false);
      }
    },
    [mediaType, searchQuery, year, minRating, genre, API_KEY]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetchContent = useCallback(
    debounce((page = 1) => fetchContent(page), 500),
    [fetchContent]
  );

  useEffect(() => {
    setCurrentPage(1);
    if (searchQuery.trim()) {
      debouncedFetchContent(1);
    } else {
      fetchContent(1);
    }
  }, [searchQuery, debouncedFetchContent]);

  useEffect(() => {
    setCurrentPage(1);
    fetchContent(1);
  }, [mediaType, year, minRating, genre, fetchContent]);

  const handlePartnerSearch = useCallback(async () => {
    if (!partnerInput.trim()) {
      setPartnerSearchResults([]);
      setSelectedUser(null);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await API.get(
        `/api/users/search?query=${encodeURIComponent(partnerInput)}`
      );
      const filteredResults = response.data.filter(
        (u) => !u.hasPartner && u._id !== user?._id
      );
      setPartnerSearchResults(filteredResults);
      if (filteredResults.length > 0) {
        setSelectedUser(filteredResults[0]);
      } else {
        setSelectedUser(null);
      }
    } catch (error) {
      console.error("Partner arama hatası:", error);
      setPartnerSearchResults([]);
      setSelectedUser(null);
      alert("Kullanıcı aranırken hata oluştu.");
    } finally {
      setSearchLoading(false);
    }
  }, [partnerInput, user]);

  const handleInvitePartner = useCallback(async () => {
    if (!selectedUser) {
      alert("Lütfen bir kullanıcı seçin.");
      return;
    }

    try {
      setInviteLoading(true);
      const response = await API.post("/api/partner/request", {
        username: selectedUser.username,
      });

      if (response.status === 200) {
        setPartnerInput("");
        setPartnerSearchResults([]);
        setSelectedUser(null);
        alert(
          `${selectedUser.name || selectedUser.username}'e partner daveti gönderildi!`
        );
        fetchSentRequests(); // Listeyi güncelle
      }
    } catch (error) {
      console.error("Partner daveti gönderilirken hata:", error);
      alert(error.response?.data?.message || "Davet gönderilemedi.");
    } finally {
      setInviteLoading(false);
    }
  }, [selectedUser, fetchSentRequests]);

  const handlePageChange = useCallback(
    (newPage) => {
      if (newPage >= 1 && newPage <= totalPages && !contentLoading) {
        setCurrentPage(newPage);
        fetchContent(newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [totalPages, contentLoading, fetchContent]
  );

  const isInLibrary = useCallback(
    (item, category) => {
      return libraryItems[category]?.some(
        (libItem) => libItem.id.toString() === item.id.toString()
      );
    },
    [libraryItems]
  );

  const handleLibraryAction = useCallback(
    async (category, item) => {
      const isAlreadyInLibrary = isInLibrary(item, category);

      if (isAlreadyInLibrary) {
        navigate(`/${mediaType}/${item.id}`);
      } else {
        try {
          const movieData = {
            id: item.id.toString(),
            title: item.title || item.name,
            poster_path: item.poster_path,
            release_date: item.release_date || item.first_air_date,
            vote_average: item.vote_average || 0,
            type: item.type || mediaType,
            genre_ids: item.genre_ids || [],
            overview: item.overview || "",
            adult: item.adult || false,
            backdrop_path: item.backdrop_path || "",
            original_language: item.original_language || "en",
            original_title:
              item.original_title ||
              item.original_name ||
              item.title ||
              item.name,
            popularity: item.popularity || 0,
            video: item.video || false,
            vote_count: item.vote_count || 0,
          };

          console.log("Sending movie data:", movieData);

          const response = await API.post(`/api/library/${category}`, {
            movieData,
            item: movieData,
          });

          if (response.status === 200 || response.status === 201) {
            if (setLibraryItems) {
              const libraryResponse = await API.get("/api/library");
              if (libraryResponse.status === 200) {
                setLibraryItems(libraryResponse.data);
              }
            }
            console.log(`Successfully added to ${category}:`, movieData.title);
          }
        } catch (error) {
          console.error("Library action error:", error);
          if (error.response?.status === 400) {
            alert(error.response.data.message || "Geçersiz veri gönderildi");
          } else if (error.response?.status === 409) {
            alert("Bu içerik zaten listede");
          } else if (error.response?.status === 500) {
            alert("Sunucu hatası. Lütfen tekrar deneyin.");
          } else {
            alert("Bir hata oluştu. Lütfen tekrar deneyin.");
          }
        }
      }
    },
    [mediaType, navigate, setLibraryItems, isInLibrary]
  );

  // Memoized partner search results
  const memoizedPartnerSearchResults = useMemo(
    () => partnerSearchResults,
    [partnerSearchResults]
  );

  if (!user)
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );

  return (
    <div className="dashboard-container">
      <div className="header">
        <h1>
          {appName} Hoş geldin, {user.name}!
        </h1>
        <div className="user-info">
          <p>
            {user.email}{" "}
            {user.partner &&
              user.partner.name &&
              ` | Partner: ${user.partner.name}`}
          </p>
          {!user.partner && (
            <button
              onClick={() => setShowModal(true)}
              className="invite-partner-btn"
            >
              Partner Davet Et
            </button>
          )}
        </div>
        <div className="nav-buttons">
          <button onClick={() => navigate("/library")} className="nav-btn">
            Kütüphane
          </button>
          <button
            onClick={() => navigate("/recommendations")}
            className="nav-btn"
          >
            AI Önerileri
          </button>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal partner-search-modal">
            <h2>Partner Davet Et</h2>
            <div className="search-section">
              <div className="search-input-group">
                <input
                  type="text"
                  placeholder="Kullanıcı adı ara..."
                  value={partnerInput}
                  onChange={(e) => setPartnerInput(e.target.value)}
                  className="partner-search-input"
                  disabled={searchLoading || inviteLoading}
                />
                <button
                  onClick={handlePartnerSearch}
                  className="search-btn"
                  disabled={searchLoading || inviteLoading}
                >
                  {searchLoading ? "🔍 Aranıyor..." : "🔍 Ara"}
                </button>
              </div>
              {partnerInput.trim() &&
                memoizedPartnerSearchResults.length === 0 &&
                !searchLoading && (
                  <div className="no-users-found">
                    <p>❌ "{partnerInput}" ile eşleşen kullanıcı bulunamadı</p>
                    <small>
                      Kullanıcı adını tam olarak yazdığınızdan emin olun
                    </small>
                  </div>
                )}
            </div>

            {memoizedPartnerSearchResults.length > 0 && (
              <div className="partner-search-results">
                {/* ... existing search results ... */}
                <div className="users-grid">
                  {/* ... existing map ... */}
                  {memoizedPartnerSearchResults.map((foundUser) => (
                    <div
                      key={foundUser._id}
                      className={`search-result-item ${selectedUser?._id === foundUser._id ? "selected" : ""}`}
                      onClick={() => setSelectedUser(foundUser)}
                    >
                      <img
                        src={foundUser.profilePicture || PLACEHOLDER_IMAGE}
                        alt={foundUser.name || foundUser.username}
                        className="search-user-pic"
                        loading="lazy"
                        onError={(e) => {
                          if (e.target.src !== PLACEHOLDER_IMAGE) {
                            e.target.src = PLACEHOLDER_IMAGE;
                          }
                        }}
                      />
                      <div className="user-details">
                        <span className="username">{foundUser.username}</span>
                        <span className="name">
                          ({foundUser.name || "İsim Yok"})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedUser && !selectedUser.hasPartner && (
                  <div className="selected-user-confirmation">
                    <div className="confirmation-card">
                      <img
                        src={selectedUser.profilePicture || PLACEHOLDER_IMAGE}
                        alt={selectedUser.name || selectedUser.username}
                        className="confirmation-avatar"
                        loading="lazy"
                        onError={(e) => {
                          if (e.target.src !== PLACEHOLDER_IMAGE) {
                            e.target.src = PLACEHOLDER_IMAGE;
                          }
                        }}
                      />
                      <div className="confirmation-info">
                        <h4>{selectedUser.name || selectedUser.username}</h4>
                        <p>@{selectedUser.username}</p>
                        <small>
                          Bu kullanıcıya partner daveti göndermek istediğinizden
                          emin misiniz?
                        </small>
                      </div>
                      <button
                        className="send-invite-btn"
                        onClick={handleInvitePartner}
                        disabled={inviteLoading}
                      >
                        {inviteLoading ? "Gönderiliyor..." : "💌 Davet Gönder"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Yeni: Gönderilen İstekler Bölümü */}
            <SentRequestsSection />

            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowModal(false);
                  setPartnerInput("");
                  setPartnerSearchResults([]);
                  setSelectedUser(null);
                }}
                disabled={inviteLoading}
              >
                ❌ İptal
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="filters">
        <input
          type="text"
          placeholder="Film veya Dizi Ara"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Film veya Dizi Ara"
        />
        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value)}
          aria-label="Medya Türü Seçin"
        >
          <option value="movie">Film</option>
          <option value="tv">Dizi</option>
        </select>
        <input
          type="number"
          placeholder="Yıl"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          aria-label="Yapım Yılı"
        />
        <input
          type="number"
          placeholder="Min Puan (0-10)"
          step="0.1"
          min="0"
          max="10"
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          aria-label="Minimum Puan"
        />
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          aria-label="Tür Seçin"
        >
          <option value="">Tür Seçin</option>
          <option value="28">Aksiyon</option>
          <option value="35">Komedi</option>
          <option value="18">Dram</option>
          <option value="27">Korku</option>
          <option value="16">Animasyon</option>
          <option value="10749">Romantik</option>
          <option value="99">Belgesel</option>
          <option value="878">Bilim Kurgu</option>
          <option value="53">Gerilim</option>
          <option value="80">Suç</option>
          <option value="12">Macera</option>
          <option value="14">Fantastik</option>
        </select>
        <button
          onClick={() => {
            setCurrentPage(1);
            fetchContent(1);
          }}
          disabled={contentLoading}
        >
          {contentLoading ? "🔍..." : "🔍 Ara"}
        </button>
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1 || contentLoading}
            className="pagination-btn"
          >
            ⏮️ İlk
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || contentLoading}
            className="pagination-btn"
          >
            ◀️ Önceki
          </button>
          <div className="page-info">
            <span>
              Sayfa {currentPage} / {totalPages}
            </span>
            <small>({results.length} sonuç)</small>
          </div>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || contentLoading}
            className="pagination-btn"
          >
            Sonraki ▶️
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages || contentLoading}
            className="pagination-btn"
          >
            Son ⏭️
          </button>
        </div>
      )}

      {contentLoading ? (
        <div className="loading-container">
          <div className="loading-spinner">Yükleniyor...</div>
        </div>
      ) : (
        <div className="movie-list">
          {results.length > 0 ? (
            results.map((item) => {
              const isWatched = isInLibrary(item, "watched");
              const isInWatchlist = isInLibrary(item, "watchlist");
              const isFavorite = isInLibrary(item, "favorites");
              const isDisliked = isInLibrary(item, "disliked");
              const watchedItem = libraryItems.watched?.find(
                (w) => w.id.toString() === item.id.toString()
              );
              const isWatchedTogether =
                watchedItem?.watchedTogether &&
                (user?.partner ||
                  libraryItems.watchedTogether?.some(
                    (w) => w.id.toString() === item.id.toString()
                  ));

              return (
                <div
                  key={`${item.id}-${currentPage}`}
                  className="movie-item enhanced-movie-item"
                >
                  <div
                    className="poster-container"
                    onClick={() => navigate(`/${mediaType}/${item.id}`)}
                  >
                    {item.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                        alt={item.title || item.name}
                        loading="lazy"
                        onError={(e) => {
                          if (e.target.src !== PLACEHOLDER_IMAGE) {
                            e.target.src = PLACEHOLDER_IMAGE;
                          }
                        }}
                      />
                    ) : (
                      <div className="movie-placeholder">Poster Yok</div>
                    )}
                    <div className="library-badges">
                      {isFavorite && (
                        <span className="badge favorite" title="Favorilerimde">
                          ❤️
                        </span>
                      )}
                      {isDisliked && (
                        <span
                          className="badge disliked"
                          title="Beğenmediklerimde"
                        >
                          👎
                        </span>
                      )}
                      {isWatchedTogether && (
                        <span
                          className="badge watched-together"
                          title="Partnerle İzlendi"
                        >
                          💕
                        </span>
                      )}
                      {isWatched && !isWatchedTogether && (
                        <span className="badge watched" title="İzlendi">
                          ✅
                        </span>
                      )}
                      {isInWatchlist && (
                        <span
                          className="badge watchlist"
                          title="İzleneceklerde"
                        >
                          📌
                        </span>
                      )}
                    </div>
                    <div className="detail-overlay">
                      <span>👆 Detaylar</span>
                    </div>
                  </div>
                  <div className="movie-info">
                    <h3>{item.title || item.name}</h3>
                    <div className="movie-meta">
                      <span className="release-date">
                        📅{" "}
                        {item.release_date?.split("-")[0] ||
                          item.first_air_date?.split("-")[0] ||
                          "Bilinmiyor"}
                      </span>
                      <span className="rating">
                        ⭐ {item.vote_average?.toFixed(1) || "N/A"}/10
                      </span>
                      {item.genre_ids && item.genre_ids.length > 0 && (
                        <span className="genres">
                          🎭{" "}
                          {getGenreNames(item.genre_ids).slice(0, 2).join(", ")}
                        </span>
                      )}
                    </div>
                    <div className="quick-actions">
                      {!isWatched ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLibraryAction("watched", item);
                            }}
                            className="quick-btn small"
                            title="İzledim"
                          >
                            ✅
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLibraryAction("watchlist", item);
                            }}
                            className={`quick-btn small ${isInWatchlist ? "active" : ""}`}
                            title="İzlenecek"
                          >
                            {isInWatchlist ? "📌" : "📋"}
                          </button>
                          {user.partner && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWatchedTogether(item);
                              }}
                              className="quick-btn small together"
                              title="Partnerle İzle"
                            >
                              💕
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLibraryAction("favorites", item);
                            }}
                            className={`quick-btn small ${isFavorite ? "active" : ""}`}
                            title="Favori"
                          >
                            {isFavorite ? "❤️" : "🤍"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLibraryAction("disliked", item);
                            }}
                            className={`quick-btn small ${isDisliked ? "active" : ""}`}
                            title="Beğenmedim"
                          >
                            {isDisliked ? "👎" : "🤷"}
                          </button>
                        </>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/${mediaType}/${item.id}`);
                        }}
                        className="quick-btn small detail"
                        title="Detay"
                      >
                        ℹ️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-results">
              <h3>😕 İçerik yok</h3>
              <p>Farklı bir arama dene veya filtreleri değiştir</p>
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1 || contentLoading}
            className="pagination-btn"
          >
            ⏮️ İlk
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || contentLoading}
            className="pagination-btn"
          >
            ◀️ Önceki
          </button>
          <div className="page-info">
            <span>
              Sayfa {currentPage} / {totalPages}
            </span>
            <small>({results.length} sonuç)</small>
          </div>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || contentLoading}
            className="pagination-btn"
          >
            Sonraki ▶️
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages || contentLoading}
            className="pagination-btn"
          >
            Son ⏭️
          </button>
        </div>
      )}

      <div className="quick-suggestions">
        <h3>🚀 Hızlı Öneriler</h3>
        <div className="suggestion-buttons">
          <button
            onClick={() => navigate("/library")}
            className="suggestion-btn"
          >
            📚 Kütüphane
          </button>
          <button
            onClick={() => navigate("/recommendations")}
            className="suggestion-btn"
          >
            🤖 AI Önerileri
          </button>
          {user.partner && (
            <button
              onClick={() => navigate("/recommendations")}
              className="suggestion-btn"
            >
              💕 Ortak Öneriler
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const getGenreNames = (genreIds) => {
  const genreMap = {
    28: "Aksiyon",
    35: "Komedi",
    18: "Dram",
    27: "Korku",
    16: "Animasyon",
    10749: "Romantik",
    99: "Belgesel",
    878: "Bilim Kurgu",
    14: "Fantastik",
    53: "Gerilim",
    80: "Suç",
    12: "Macera",
    10402: "Müzik",
    9648: "Gizem",
    10751: "Aile",
    36: "Tarih",
    10752: "Savaş",
  };

  return genreIds.map((id) => genreMap[id] || "Diğer").filter(Boolean);
};

export default Dashboard;
