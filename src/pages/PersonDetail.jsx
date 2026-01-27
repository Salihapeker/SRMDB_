import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAI } from '../context/AIContext';
import './PersonDetail.css';

const PersonDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { setContext } = useAI();
    const [person, setPerson] = useState(null);
    const [credits, setCredits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPersonData = async () => {
            try {
                setLoading(true);
                const apiKey = process.env.REACT_APP_TMDB_API_KEY;
                const options = {
                    method: 'GET',
                    headers: {
                        accept: 'application/json'
                    }
                };

                // Fetch Person Details
                const personRes = await fetch(
                    `https://api.themoviedb.org/3/person/${id}?api_key=${apiKey}&language=tr-TR`,
                    options
                );
                const personData = await personRes.json();

                // Fetch Combined Credits (Movies + TV)
                const creditRes = await fetch(
                    `https://api.themoviedb.org/3/person/${id}/combined_credits?api_key=${apiKey}&language=tr-TR`,
                    options
                );
                const creditData = await creditRes.json();

                setPerson(personData);

                // Update AI Context
                setContext({
                    type: 'Kişi',
                    id: id,
                    title: personData.name
                });

                // Sort by popularity and remove duplicates/missing posters if wanted
                const sortedCredits = (creditData.cast || [])
                    .filter(item => item.poster_path)
                    .sort((a, b) => b.popularity - a.popularity);

                setCredits(sortedCredits);
            } catch (error) {
                console.error("Person data fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPersonData();
        }
    }, [id, setContext]);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (!person) return null;

    return (
        <div className="person-detail-container">
            <button className="back-btn" onClick={() => navigate(-1)}>
                ← Geri
            </button>

            <div className="person-header">
                <div className="person-photo-section">
                    {person.profile_path ? (
                        <img
                            src={`https://image.tmdb.org/t/p/w500${person.profile_path}`}
                            alt={person.name}
                            className="person-photo"
                        />
                    ) : (
                        <div className="poster-placeholder">Fotoğraf Yok</div>
                    )}
                </div>

                <div className="person-info-section">
                    <h1>{person.name}</h1>

                    <div className="person-stats">
                        {person.birthday && (
                            <span className="stat-badge">🎂 {new Date(person.birthday).toLocaleDateString('tr-TR')}</span>
                        )}
                        {person.place_of_birth && (
                            <span className="stat-badge">📍 {person.place_of_birth}</span>
                        )}
                        <span className="stat-badge">⭐ Popülarite: {person.popularity?.toFixed(0)}</span>
                    </div>

                    <div className="biography">
                        <h3>Biyografi</h3>
                        <p>{person.biography || "Biyografi bulunamadı."}</p>
                    </div>
                </div>
            </div>

            <div className="filmography-section">
                <h2>Filmografi ({credits.length})</h2>
                <div className="filmography-grid">
                    {credits.map((item) => (
                        <div
                            key={`${item.id}-${item.media_type}`}
                            className="film-card"
                            onClick={() => navigate(`/${item.media_type}/${item.id}`)}
                        >
                            <img
                                src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                                alt={item.title || item.name}
                                className="film-poster"
                                loading="lazy"
                            />
                            <div className="film-info">
                                <h4>{item.title || item.name}</h4>
                                {item.character && <span className="character-name">{item.character}</span>}
                                <span>{item.release_date || item.first_air_date ? new Date(item.release_date || item.first_air_date).getFullYear() : '-'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PersonDetail;
