import React from "react";
import { useNavigate } from "react-router-dom";
import "./header.css";

function Header({ user, onLogout, onMenuToggle }) {
  const navigate = useNavigate();

  const menuItems = [
    {
      label: "Feed",
      icon: "🍯",
      onClick: () => navigate("/"),
    },
    {
      label: "Create Offer",
      icon: "➕",
      onClick: () => navigate("/create-offer"),
    },
    {
      label: "Create Need",
      icon: "➕",
      onClick: () => navigate("/create-need"),
    },
    // {
    //   label: "In your area",
    //   icon: "📍",
    //   onClick: () => navigate("/in-your-area"),
    // },
    //{ label: "People", icon: "👥", onClick: () => navigate("/people") },
    {
      label: "People",
      icon: "👥",
      onClick: () => navigate("/people"),
    },
    {
      label: "Messages",
      icon: "💬",
      onClick: () => navigate("/messages"),
    },
    //{ label: "Settings", icon: "⚙️", onClick: () => navigate("/settings") },
  ];

  const handleProfileClick = () => {
    if (user) {
      navigate("/profile");
    } else {
      navigate("/register");
    }
  };

  return (
    <header className="home-header">
      <nav className="home-nav">
        <div className="nav-left">
          <button className="logo" onClick={() => navigate("/")}>
            <span className="bee-icon">🐝</span>
            <span className="logo-text">THE HIVE</span>
          </button>
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
