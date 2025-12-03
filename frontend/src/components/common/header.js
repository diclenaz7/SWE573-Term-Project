import React from "react";
import { useNavigate } from "react-router-dom";
import "./header.css";

function Header({ user, onLogout, onMenuToggle }) {
  const navigate = useNavigate();

  const menuItems = [
    {
      label: "Create Offer",
      icon: "📋",
      onClick: () => navigate("/create-offer"),
    },
    {
      label: "Create Need",
      icon: "📝",
      onClick: () => navigate("/create-need"),
    },
    // {
    //   label: "In your area",
    //   icon: "📍",
    //   onClick: () => navigate("/in-your-area"),
    // },
    { label: "People", icon: "👥", onClick: () => navigate("/people") },
    {
      label: "Messages",
      icon: "💬",
      onClick: () => navigate("/messages"),
    },
    { label: "Settings", icon: "⚙️", onClick: () => navigate("/settings") },
  ];

  const handleProfileClick = () => {
    if (user) {
      // TODO: Navigate to profile page when implemented
      console.log("Navigate to profile");
    } else {
      navigate("/register");
    }
  };

  return (
    <header className="home-header">
      <nav className="home-nav">
        <div className="nav-left">
          <button
            className="hamburger-menu"
            onClick={onMenuToggle}
            aria-label="Menu"
          >
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
                  onClick={item.onClick}
                >
                  <span className="header-nav-item-icon">{item.icon}</span>
                  <span className="header-nav-item-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <button className="signup-profile-btn" onClick={handleProfileClick}>
          {user ? "Profile" : "Sign Up"}
        </button>
      </nav>
    </header>
  );
}

export default Header;
