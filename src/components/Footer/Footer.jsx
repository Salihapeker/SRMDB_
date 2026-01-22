import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__grid">
          {/* Brand */}
          <div className="footer__brand">
            <span className="footer__logo">🎬 SRMDB</span>
            <p className="footer__tagline">Film ve dizi tutkunları için sosyal platform</p>
          </div>
          
          {/* Links */}
          <div className="footer__links">
            <h4>Keşfet</h4>
            <Link to="/dashboard">Popüler Filmler</Link>
            <Link to="/library">Kütüphanem</Link>
            <Link to="/recommendations">AI Öneriler</Link>
          </div>
          
          <div className="footer__links">
            <h4>Hesap</h4>
            <Link to="/profile">Profilim</Link>
            <Link to="/settings">Ayarlar</Link>
            <Link to="/badges">Rozetler</Link>
          </div>
          
          {/* Social */}
          <div className="footer__social">
            <h4>Bizi Takip Et</h4>
            <div className="footer__social-icons">
              <a href="#" aria-label="Twitter">𝕏</a>
              <a href="#" aria-label="Instagram">📷</a>
              <a href="#" aria-label="GitHub">💻</a>
            </div>
          </div>
        </div>
        
        <div className="footer__bottom">
          <p>© 2024 SRMDB. Tüm hakları saklıdır.</p>
          <p>Made with ❤️ by Salih</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
