import React from "react";
import { useNavigate } from "react-router-dom";
import "./header.css";

function Header({ user, onLogout, onMenuToggle }) {
  const navigate = useNavigate();

  const menuItems = [
    { label: "Offer Service", icon: "📋" },
    { label: "Request Need", icon: "📝" },
    { label: "In your area", icon: "📍" },
    { label: "People", icon: "👥" },
    { label: "Community Activity / Forum", icon: "💬" },
    { label: "Settings", icon: "⚙️" },
  ];

  const handleProfileClick = () => {
    if (user) {
      // TODO: Navigate to profile page when implemented
      console.log("Navigate to profile");
    } else {
      navigate("/register");
    }
  };

  const handleItemClick = (item) => {
    // TODO: Implement navigation for each item
    console.log(`Clicked: ${item.label}`);
  };

  return (
    <header className="home-header">
      <nav className="home-nav">
        <div className="nav-left">
          <button className="hamburger-menu" onClick={onMenuToggle} aria-label="Menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className="logo">
            <span className="bee-icon">🐝</span>
            <span className="logo-text">THE HIVE</span>
          </div>
        </div>
        {user && (
          <div className="nav-center">
            <div className="header-nav">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  className="header-nav-item"
                  onClick={() => handleItemClick(item)}
                >
                  <span className="header-nav-item-icon">{item.icon}</span>
                  <span className="header-nav-item-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          className="signup-profile-btn"
          onClick={handleProfileClick}
        >
          {user ? "Profile" : "Sign Up"}
        </button>
      </nav>
    </header>
  );
}

export default Header;
