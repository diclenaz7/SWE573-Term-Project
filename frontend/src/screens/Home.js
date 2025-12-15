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

  // Refs to track ongoing requests
  const fetchingOffersRef = React.useRef(false);
  const fetchingNeedsRef = React.useRef(false);

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

    const timeoutId = setTimeout(() => {
      fetchOffers();
      fetchNeeds();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilters, user]);

  // Safety mechanism: reset loading states if they're stuck for too long
  useEffect(() => {
    if (!user) return;

    const timeoutId = setTimeout(() => {
      if (loadingOffers || loadingNeeds) {
        console.warn("Loading states stuck, resetting...");
        setLoadingOffers(false);
        setLoadingNeeds(false);
      }
    }, 30000); // 30 second timeout

    return () => clearTimeout(timeoutId);
  }, [user, loadingOffers, loadingNeeds]);

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
    // Prevent duplicate requests
    if (fetchingOffersRef.current) {
      console.log("Offers fetch already in progress, skipping...");
      return;
    }

    fetchingOffersRef.current = true;
    setLoadingOffers(true);
    console.log("Fetching offers...");
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
      console.log("Fetching offers from:", url);

      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: "GET",
        headers: headers,
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log("Offers response status:", response.status);

      if (response.ok) {
        try {
          const data = await response.json();
          console.log("Offers data received:", data);
          setOffers(data.offers || []);
        } catch (jsonError) {
          console.error("Error parsing offers JSON:", jsonError);
          setOffers([]);
        }
      } else {
        console.error(
          "Failed to fetch offers",
          response.status,
          response.statusText
        );
        setOffers([]);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.error("Fetch offers timeout - request took too long");
      } else {
        console.error("Error fetching offers:", error);
      }
      setOffers([]);
    } finally {
      console.log("Setting loadingOffers to false");
      setLoadingOffers(false);
      fetchingOffersRef.current = false;
    }
  };

  const fetchNeeds = async () => {
    // Prevent duplicate requests
    if (fetchingNeedsRef.current) {
      console.log("Needs fetch already in progress, skipping...");
      return;
    }

    fetchingNeedsRef.current = true;
    setLoadingNeeds(true);
    console.log("Fetching needs...");
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
      console.log("Fetching needs from:", url);

      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: "GET",
        headers: headers,
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log("Needs response status:", response.status);

      if (response.ok) {
        try {
          const data = await response.json();
          console.log("Needs data received:", data);
          setNeeds(data.needs || []);
        } catch (jsonError) {
          console.error("Error parsing needs JSON:", jsonError);
          setNeeds([]);
        }
      } else {
        console.error(
          "Failed to fetch needs",
          response.status,
          response.statusText
        );
        setNeeds([]);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.error("Fetch needs timeout - request took too long");
      } else {
        console.error("Error fetching needs:", error);
      }
      setNeeds([]);
    } finally {
      console.log("Setting loadingNeeds to false");
      setLoadingNeeds(false);
      fetchingNeedsRef.current = false;
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
              <span className="hero-badge">
                Welcome to The Hive! Community powered time exchange
              </span>

              <h1 className="hero-title">
                Give an hour, get 🍯 <br /> Give 🍯, get an hour
              </h1>

              <p className="hero-description">
                {user
                  ? `Welcome back, ${user.username}. Your time matters, see how you can help others or use your honey today.`
                  : "The Hive is a community platform where neighbors help neighbors by exchanging time instead of money."}
              </p>

              <p className="hero-info">
                {!user ? (
                  <>
                    Offer your skills or request help for everyday needs or
                    special projects. Each hour is tracked as{" "}
                    <strong>HONEY 🍯</strong>.
                    <br />
                    You earn honey when you help, and spend it when you receive
                    help.
                  </>
                ) : null}
              </p>

              {!user && (
                <div className="hero-actions">
                  <button
                    className="hero-cta primary"
                    onClick={handleGetStarted}
                  >
                    Get Started
                  </button>
                </div>
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
