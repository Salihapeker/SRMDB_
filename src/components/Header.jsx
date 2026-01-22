import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const Header = ({ user, onLogout }) => {
  const location = useLocation();
  
  return (
    <header className="main-header">
      <div className="header-container">
        {/* Logo */}
        <Link to="/" className="logo">
          <span className="logo-icon">🎬</span>
          <span className="logo-text">SRMDB</span>
        </Link>
        
        {/* Navigation */}
        <nav className="main-nav">
          <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
            Ana Sayfa
          </Link>
          <Link to="/library" className={location.pathname === '/library' ? 'active' : ''}>
            Kütüphane
          </Link>
          <Link to="/recommendations" className={location.pathname === '/recommendations' ? 'active' : ''}>
            ✨ AI Öneriler
          </Link>
        </nav>
        
        {/* User Section */}
        <div className="user-section">
          {user ? (
            <div className="user-menu">
              <span className="user-avatar">👤</span>
              <span className="user-name">{user.username || user.name}</span>
              <button onClick={onLogout} className="logout-btn">Çıkış</button>
            </div>
          ) : (
            <Link to="/login" className="login-btn">Giriş Yap</Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
