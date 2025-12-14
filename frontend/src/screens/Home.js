import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/common/header";
import FeedCard from "../components/feed/FeedCard";
import FeedSearch from "../components/feed/FeedSearch";
import Map from "../components/common/Map";
import "./Home.css";
import { BASE_URL } from "../constants";
import { getAuthHeaders, removeToken } from "../utils/auth";

function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [offers, setOffers] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [loadingNeeds, setLoadingNeeds] = useState(false);
  const [mapOffers, setMapOffers] = useState([]);
  const [mapNeeds, setMapNeeds] = useState([]);
  const [searchFilters, setSearchFilters] = useState({
    text: "",
    location: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);

  // Initial load when user is set
  useEffect(() => {
    if (user) {
      fetchOffers();
      fetchNeeds();
      fetchMapData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Update map when tab changes
  useEffect(() => {
    if (user) {
      fetchMapData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  // Fetch offers and needs when search filters change (with debounce)
  useEffect(() => {
    if (!user) return;

    // Use a ref to track if this is the initial mount
    const timeoutId = setTimeout(() => {
      fetchOffers();
      fetchNeeds();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilters, user]);

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

  const fetchOffers = async () => {
    setLoadingOffers(true);
    try {
      const headers = getAuthHeaders();
      // Build query parameters
      const params = new URLSearchParams();
      params.append("status", "active");
      if (searchFilters.text && searchFilters.text.trim()) {
        params.append("search", searchFilters.text.trim());
      }
      if (searchFilters.location && searchFilters.location.trim()) {
        params.append("location", searchFilters.location.trim());
      }

      const url = `${BASE_URL}/api/offers/?${params.toString()}`;
      const response = await fetch(url, {
        method: "GET",
        headers: headers,
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setOffers(data.offers || []);
      } else {
        console.error("Failed to fetch offers", response.status);
        setOffers([]);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
      setOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  };

  const fetchNeeds = async () => {
    setLoadingNeeds(true);
    try {
      const headers = getAuthHeaders();
      // Build query parameters
      const params = new URLSearchParams();
      params.append("status", "open");
      if (searchFilters.text && searchFilters.text.trim()) {
        params.append("search", searchFilters.text.trim());
      }
      if (searchFilters.location && searchFilters.location.trim()) {
        params.append("location", searchFilters.location.trim());
      }

      const url = `${BASE_URL}/api/needs/?${params.toString()}`;
      const response = await fetch(url, {
        method: "GET",
        headers: headers,
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setNeeds(data.needs || []);
      } else {
        console.error("Failed to fetch needs", response.status);
        setNeeds([]);
      }
    } catch (error) {
      console.error("Error fetching needs:", error);
      setNeeds([]);
    } finally {
      setLoadingNeeds(false);
    }
  };

  const fetchMapData = async () => {
    try {
      // Determine filters based on activeTab
      let filters = [];
      if (activeTab === "All") {
        filters = ["offers", "needs"];
      } else if (activeTab === "Offers") {
        filters = ["offers"];
      } else if (activeTab === "Needs") {
        filters = ["needs"];
      }

      const response = await fetch(`${BASE_URL}/api/map-view/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ filters }),
      });

      if (response.ok) {
        const data = await response.json();
        setMapOffers(data.offers || []);
        setMapNeeds(data.needs || []);
      } else {
        console.error("Failed to fetch map data");
      }
    } catch (error) {
      console.error("Error fetching map data:", error);
    }
  };

  // Filter feed items based on active tab
  const filteredFeed = useMemo(() => {
    if (!user) return [];

    switch (activeTab) {
      case "Offers":
        return offers.map((offer) => ({ ...offer, type: "offer" }));
      case "Needs":
        return needs.map((need) => ({ ...need, type: "need" }));
      case "All":
      default:
        // Combine offers and needs, sort by created_at
        const allItems = [
          ...offers.map((offer) => ({ ...offer, type: "offer" })),
          ...needs.map((need) => ({ ...need, type: "need" })),
        ];
        return allItems.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
    }
  }, [activeTab, user, offers, needs]);

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
                <Map
                  offers={mapOffers}
                  needs={mapNeeds}
                  filters={
                    activeTab === "All"
                      ? ["offers", "needs"]
                      : activeTab === "Offers"
                      ? ["offers"]
                      : ["needs"]
                  }
                  height="400px"
                  showInfoCard={true}
                />
              </section>

              {/* Feed Section */}
              <section className="feed-section">
                <h2 className="feed-title">Feed</h2>
                <FeedSearch
                  onSearch={(filters) => {
                    setSearchFilters(filters);
                  }}
                  onClear={() => {
                    setSearchFilters({ text: "", location: "" });
                  }}
                />
                <div className="feed-content">
                  {loadingOffers || loadingNeeds ? (
                    <div className="feed-item">
                      <p className="feed-empty-message">Loading...</p>
                    </div>
                  ) : filteredFeed.length === 0 ? (
                    <div className="feed-item">
                      <p className="feed-empty-message">
                        No items to display yet. Check back soon!
                      </p>
                    </div>
                  ) : (
                    filteredFeed.map((item) => (
                      <FeedCard key={`${item.type}-${item.id}`} item={item} />
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
