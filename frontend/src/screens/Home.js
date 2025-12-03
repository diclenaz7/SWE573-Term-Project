import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/common/header";
import "./Home.css";
import { BASE_URL } from "../constants";
import { getAuthHeaders, removeToken } from "../utils/auth";
import { mockFeed, mockOffers, mockNeeds, formatDate } from "../data/mockData";

function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${BASE_URL}/api/auth/user/`, {
        method: "GET",
        headers: headers,
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Response data fetchUser", data);
        setUser(data);
      } else if (response.status === 401) {
        removeToken();
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const headers = getAuthHeaders();
      await fetch(`${BASE_URL}/api/auth/logout/`, {
        method: "POST",
        headers: headers,
        credentials: "include",
      });
      removeToken();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      removeToken();
      setUser(null);
    }
  };

  const handleGetStarted = () => {
    navigate("/register");
  };

  // Filter feed items based on active tab
  const filteredFeed = useMemo(() => {
    if (!user) return [];

    switch (activeTab) {
      case "Offers":
        return mockOffers.map((offer) => ({ ...offer, type: "offer" }));
      case "Needs":
        return mockNeeds.map((need) => ({ ...need, type: "need" }));
      case "All":
      default:
        return mockFeed;
    }
  }, [activeTab, user]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="auth-container">Loading...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header user={user} onLogout={handleLogout} onMenuToggle={() => {}} />
      <div className="home-layout">
        <div className="main-content">
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-content">
              <h1 className="hero-title">Welcome to The Hive</h1>
              <p className="hero-description">
                {user
                  ? `Hello, ${user.username}! Connect with your community and make a difference.`
                  : "A community platform where neighbors help neighbors. Share services, request help, and build stronger connections."}
              </p>
              {!user && (
                <button className="hero-cta" onClick={handleGetStarted}>
                  Get Started
                </button>
              )}
            </div>
          </section>

          {/* Tabs and Map View - Only visible when logged in */}
          {user && (
            <>
              <section className="tabs-section">
                <div className="tabs">
                  <button
                    className={`tab ${activeTab === "All" ? "active" : ""}`}
                    onClick={() => setActiveTab("All")}
                  >
                    All
                  </button>
                  <button
                    className={`tab ${activeTab === "Offers" ? "active" : ""}`}
                    onClick={() => setActiveTab("Offers")}
                  >
                    Offers
                  </button>
                  <button
                    className={`tab ${activeTab === "Needs" ? "active" : ""}`}
                    onClick={() => setActiveTab("Needs")}
                  >
                    Needs
                  </button>
                </div>
              </section>

              <section className="map-view-section">
                <div className="map-view-placeholder">
                  <p className="map-view-label">Map View</p>
                  <p className="map-view-note">Map integration coming soon</p>
                </div>
              </section>

              {/* Feed Section */}
              <section className="feed-section">
                <h2 className="feed-title">Feed</h2>
                <div className="feed-content">
                  {filteredFeed.length === 0 ? (
                    <div className="feed-item">
                      <p className="feed-empty-message">
                        No items to display yet. Check back soon!
                      </p>
                    </div>
                  ) : (
                    filteredFeed.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="feed-item"
                      >
                        <div className="feed-item-header">
                          <div className="feed-item-type">
                            <span className={`type-badge type-${item.type}`}>
                              {item.type === "offer" ? "📋 Offer" : "📝 Need"}
                            </span>
                          </div>
                          <span className="feed-item-time">
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                        <h3 className="feed-item-title">{item.title}</h3>
                        <p className="feed-item-description">
                          {item.description}
                        </p>
                        <div className="feed-item-footer">
                          <div className="feed-item-meta">
                            <span className="feed-item-author">
                              by {item.user.username}
                            </span>
                            {item.location && (
                              <span className="feed-item-location">
                                📍 {item.location}
                              </span>
                            )}
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <div className="feed-item-tags">
                              {item.tags.map((tag) => (
                                <span key={tag.id} className="tag">
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
