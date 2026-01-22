import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './Header.css';

const Header = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { path: '/dashboard', label: 'Ana Sayfa', icon: '🏠' },
    { path: '/library', label: 'Kütüphane', icon: '📚' },
    { path: '/recommendations', label: 'AI Öneriler', icon: '🎯' },
    { path: '/notifications', label: 'Bildirimler', icon: '🔔' },
  ];

  return (
    <motion.header 
      className={`main-header ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100 }}
    >
      <div className="header-container">
        {/* Logo */}
        <Link to="/dashboard" className="logo">
          <motion.div
            className="logo-icon"
            whileHover={{ scale: 1.15 }}
            transition={{ duration: 0.3 }}
          >
            🎬
          </motion.div>
          <span className="logo-text">SRMDB</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="main-nav desktop-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </motion.span>
              {location.pathname === item.path && (
                <motion.div
                  className="nav-indicator"
                  layoutId="nav-indicator"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="user-section">
          {user ? (
            <div className="user-menu">
              <motion.div
                className="user-avatar"
                whileHover={{ scale: 1.1, boxShadow: '0 0 25px rgba(229, 9, 20, 0.6)' }}
                onClick={() => navigate('/settings')}
              >
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt={user.name} />
                ) : (
                  <span>👤</span>
                )}
              </motion.div>
              <span className="user-name">{user.name}</span>
              <motion.button
                className="logout-btn"
                onClick={onLogout}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(229, 9, 20, 0.2)' }}
                whileTap={{ scale: 0.95 }}
              >
                Çıkış
              </motion.button>
            </div>
          ) : (
            <motion.button
              className="login-btn"
              onClick={() => navigate('/login')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Giriş Yap
            </motion.button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            className="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
