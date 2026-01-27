import React, { Suspense } from "react";
import { Link } from "react-router-dom";
import "./HeaderFooter.css";

// Lazy load ProfileMenu to avoid circular dependencies or heavy load if not needed immediately
// Although for Header it's better to be eager if it's always shown, but sticking to pattern
const ProfileMenu = React.lazy(() => import("./ProfileMenu"));

const Header = ({ user, setUser }) => {
    return (
        <header className="site-header">
            <div className="header-inner">
                <div className="brand">
                    <Link to="/">SRMDB</Link>
                </div>
                <nav className="header-nav" aria-label="Ana navigasyon">
                    <Link to="/dashboard">Ana Sayfa</Link>
                    <Link to="/library">Kütüphane</Link>
                    <Link to="/recommendations">Öneriler</Link>
                </nav>

                <div className="header-profile">
                    {user ? (
                        <Suspense fallback={<div className="profile-placeholder-loading">...</div>}>
                            <ProfileMenu user={user} setUser={setUser} />
                        </Suspense>
                    ) : (
                        <div className="auth-links">
                            <Link to="/login" className="nav-link">Giriş Yap</Link>
                            <Link to="/register" className="btn-register">Kayıt Ol</Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;