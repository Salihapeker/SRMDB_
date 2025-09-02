import React, { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useTheme } from "../App";
import API from "../services/api";
import "./Register.css";

const Register = ({ setUser }) => {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    profilePicture: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // setUser prop kontrolü
  if (!setUser || typeof setUser !== "function") {
    console.error("Register: setUser prop is required and must be a function");
    return <Navigate to="/login" replace />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError("Kullanici adi gereklidir.");
      return false;
    }
    if (formData.username.length < 3) {
      setError("Kullanici adi en az 3 karakter olmalidir.");
      return false;
    }
    if (!formData.name.trim()) {
      setError("Ad soyad gereklidir.");
      return false;
    }
    if (!formData.email.trim()) {
      setError("E-posta gereklidir.");
      return false;
    }
    if (!formData.password) {
      setError("Sifre gereklidir.");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Sifre en az 6 karakter olmalidir.");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Sifreler eslesmıyor.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Gecerli bir e-posta adresi girin.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      console.log("Kayit istegi gonderiliyor:", {
        username: formData.username,
        name: formData.name,
        email: formData.email,
      });

      // API service kullan
      const response = await API.post("/api/auth/register", {
        username: formData.username,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        profilePicture: formData.profilePicture,
      });

      console.log("Sunucu yaniti:", response.data);

      if (response.status === 201 && response.data.user) {
        setUser(response.data.user);
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Kayit hatasi:", error);

      if (error.response?.status === 400) {
        setError(error.response.data.message || "Kayit basarisiz");
      } else if (error.response?.status === 500) {
        setError("Sunucu hatasi. Lutfen tekrar deneyin.");
      } else {
        setError("Sunucu ile baglanti kurulamadi. Lutfen tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`register-container ${isDarkMode ? "dark-mode" : "light-mode"}`}
    >
      <h1>SRMDB Kayit Ol</h1>

      <form onSubmit={handleSubmit} className="register-form">
        <input
          type="text"
          name="username"
          placeholder="Kullanici Adi (Benzersiz)"
          value={formData.username}
          onChange={handleChange}
          className="register-input"
          disabled={loading}
          required
          aria-label="Kullanici adi"
        />
        <input
          type="text"
          name="name"
          placeholder="Ad Soyad"
          value={formData.name}
          onChange={handleChange}
          className="register-input"
          disabled={loading}
          required
          aria-label="Ad soyad"
        />
        <input
          type="email"
          name="email"
          placeholder="E-posta"
          value={formData.email}
          onChange={handleChange}
          className="register-input"
          disabled={loading}
          required
          aria-label="E-posta adresi"
        />
        <input
          type="password"
          name="password"
          placeholder="Sifre (en az 6 karakter)"
          value={formData.password}
          onChange={handleChange}
          className="register-input"
          disabled={loading}
          required
          aria-label="Sifre"
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Sifre Tekrar"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="register-input"
          disabled={loading}
          required
          aria-label="Sifre tekrari"
        />
        <input
          type="url"
          name="profilePicture"
          placeholder="Profil Fotografi URL (Opsiyonel)"
          value={formData.profilePicture}
          onChange={handleChange}
          className="register-input"
          disabled={loading}
          aria-label="Profil fotografi URL"
        />

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="register-button"
          disabled={loading}
          style={{
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Kayit Olunuyor..." : "Kayit Ol"}
        </button>
      </form>

      <p style={{ marginTop: "20px", color: isDarkMode ? "#ccc" : "#666" }}>
        Zaten hesabiniz var mi?{" "}
        <Link
          to="/login"
          style={{
            color: isDarkMode ? "#ff7eb3" : "#ff4081",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          Giris Yap
        </Link>
      </p>
      <div className="theme-toggle">
        <label className="theme-switch">
          <input
            type="checkbox"
            checked={isDarkMode}
            onChange={toggleDarkMode}
          />
          <span className="slider">
            <span className="slider-text">{isDarkMode ? "🌙" : "☀️"}</span>
          </span>
        </label>
      </div>
    </div>
  );
};

export default Register;
