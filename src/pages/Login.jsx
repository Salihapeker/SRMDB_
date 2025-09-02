import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "../App";
import API from "../services/api";
import "./Login.css";

const Login = ({ setUser }) => {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("Login attempt at:", new Date().toISOString(), "with:", {
      email,
    });

    if (!email || !password) {
      setError("E-posta ve şifre gereklidir.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await API.post("/api/auth/login", { email, password });
      console.log("Fetch response status:", response.status);
      console.log("Response from server:", response.data);

      if (response.status === 200 && response.data.user) {
        setUser(response.data.user);
        navigate("/dashboard", { replace: true });
      } else {
        setError(response.data.message || "Giriş başarısız. Tekrar deneyin.");
      }
    } catch (err) {
      console.error("Login error:", err);
      console.log("Fetch response status:", err.response?.status);
      console.log("Response from server:", err.response?.data);
      if (err.response?.status === 404) {
        setError("Bu e-posta ile kayıtlı kullanıcı bulunamadı.");
      } else if (err.response?.status === 401) {
        setError("Geçersiz e-posta veya şifre.");
      } else {
        setError("Sunucu ile bağlantı kurulamadı.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`login-container ${isDarkMode ? "dark-mode" : "light-mode"}`}
    >
      <h1>SRMDB Giriş</h1>
      <form onSubmit={handleLogin} className="login-form">
        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="login-input"
          disabled={loading}
          required
          aria-label="E-posta adresi"
        />
        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
          disabled={loading}
          required
          aria-label="Şifre"
        />
        {error && (
          <div
            className="error-message"
            style={{
              color: "#ff4d4d",
              marginTop: "10px",
              padding: "10px",
              backgroundColor: "rgba(255, 77, 77, 0.1)",
              borderRadius: "5px",
              border: "1px solid #ff4d4d",
            }}
          >
            {error}
          </div>
        )}
        <button
          type="submit"
          className="login-button"
          disabled={loading}
          style={{
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
        </button>
      </form>
      <p style={{ marginTop: "20px", color: isDarkMode ? "#ccc" : "#666" }}>
        Hesabınız yok mu?{" "}
        <Link
          to="/register"
          style={{
            color: isDarkMode ? "#ff7eb3" : "#ff4081",
            textDecoration: "none",
            fontWeight: "bold",
          }}
          onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
          onMouseOut={(e) => (e.target.style.textDecoration = "none")}
        >
          Kayıt Ol
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

export default Login;
