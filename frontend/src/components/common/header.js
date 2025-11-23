import React from "react";
import { Link } from "react-router-dom";
import "./header.css";
import { useNavigate } from "react-router-dom";

function Header({ user, onLogout }) {
  const navigate = useNavigate();
  return (
    <header className="home-header">
      <nav className="home-nav">
        <span className="logo">🐝 The Hive</span>
        {user ? (
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        ) : (
          <button
            to="/login"
            className="logout-btn"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        )}
      </nav>
    </header>
  );
}

export default Header;
