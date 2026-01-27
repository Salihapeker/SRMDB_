import React from "react";
import { Link } from "react-router-dom";
import "./HeaderFooter.css";

const Footer = () => {
    return (
        <footer className="site-footer">
            <div className="footer-inner">
                <div className="footer-top">
                    <div className="footer-brand">
                        <h3>SRMDB</h3>
                        <p>Film ve dizi dünyasını keşfedin. Kişiselleştirilmiş öneriler ve geniş kütüphane.</p>
                    </div>

                    <div className="footer-section">
                        <h4>Hızlı Bağlantılar</h4>
                        <div className="footer-links-col">
                            <Link to="/recommendations">Öneriler</Link> <br />
                            <Link to="/library">Kütüphane</Link> <br />
                            <Link to="/settings">Ayarlar</Link>
                        </div>
                    </div>

                    <div className="footer-section">
                        <h4>Topluluk</h4>
                        <div className="footer-social-links">
                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a> <br />
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a> <br />
                            <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© {new Date().getFullYear()} SRMDB. Tüm hakları saklıdır.</p>
                    <div className="footer-links">
                        <Link to="/about">Hakkında</Link>
                        <Link to="/privacy">Gizlilik</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;