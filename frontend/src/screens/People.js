import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/common/header";
import "./People.css";
import { BASE_URL } from "../constants";
import { getAuthHeaders, removeToken } from "../utils/auth";

function People() {
  const [user, setUser] = useState(null);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPeople();
    }
  }, [user, searchQuery]);

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
        setUser(data);
      } else if (response.status === 401) {
        removeToken();
        setUser(null);
        navigate("/login");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeople = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const searchParam = searchQuery
        ? `?search=${encodeURIComponent(searchQuery)}`
        : "";
      const response = await fetch(`${BASE_URL}/api/people/${searchParam}`, {
        method: "GET",
        headers: headers,
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setPeople(data.people || []);
      } else if (response.status === 401) {
        removeToken();
        setUser(null);
        navigate("/login");
      } else {
        console.error("Failed to fetch people");
        setPeople([]);
      }
    } catch (error) {
      console.error("Error fetching people:", error);
      setPeople([]);
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
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      removeToken();
      setUser(null);
      navigate("/login");
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleSearchInputChange = (e) => {
    setSearchInput(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

  const handleProfileClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const getRankDisplay = (rank, rankDisplay) => {
    const rankMap = {
      newbee: "New Bee",
      worker: "Worker Bee",
      queen: "Queen Bee",
      drone: "Drone",
    };
    return rankDisplay || rankMap[rank] || "New Bee";
  };

  if (loading && !user) {
    return (
      <div className="page-container">
        <Header user={user} onLogout={handleLogout} />
        <div className="people-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header user={user} onLogout={handleLogout} />
      <div className="people-container">
        <div className="people-content">
          <div className="people-header">
            <h1 className="people-title">People</h1>
            <p className="people-subtitle">
              Discover members of The Hive community
            </p>
          </div>

          <div className="search-section">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-container">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by name, username, email, or bio..."
                  value={searchInput}
                  onChange={handleSearchInputChange}
                />
                {searchInput && (
                  <button
                    type="button"
                    className="clear-search-button"
                    onClick={handleClearSearch}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
                <button type="submit" className="search-button">
                  🔍
                </button>
              </div>
            </form>
            {searchQuery && (
              <div className="search-results-info">
                <span>
                  {people.length} {people.length === 1 ? "person" : "people"}{" "}
                  found
                  {searchQuery && ` for "${searchQuery}"`}
                </span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="people-loading">Loading people...</div>
          ) : people.length > 0 ? (
            <div className="people-list">
              {people.map((person) => (
                <div
                  key={person.id}
                  className="person-card"
                  onClick={() => handleProfileClick(person.id)}
                >
                  <div className="person-image-container">
                    {person.profile?.profile_image ? (
                      <img
                        src={person.profile.profile_image}
                        alt={person.full_name}
                        className="person-image"
                      />
                    ) : (
                      <div className="person-image-placeholder">
                        <span className="person-icon">👤</span>
                      </div>
                    )}
                  </div>
                  <div className="person-info">
                    <div className="person-header">
                      <h3 className="person-name">{person.full_name}</h3>
                    </div>
                    <div className="person-username">@{person.username}</div>
                    {person.profile?.bio && (
                      <p className="person-bio">{person.profile.bio}</p>
                    )}
                    <div className="person-stats">
                      <div className="person-stat">
                        <span className="stat-label">Offers:</span>
                        <span className="stat-value">{person.offer_count}</span>
                      </div>
                      <div className="person-stat">
                        <span className="stat-label">Needs:</span>
                        <span className="stat-value">{person.need_count}</span>
                      </div>
                      <div className="person-rank">
                        <span className="rank-star">★</span>
                        <span className="rank-text">
                          {getRankDisplay(
                            person.profile?.rank,
                            person.profile?.rank_display
                          )}{" "}
                          {person.profile?.reputation_score || 0}
                        </span>
                      </div>
                    </div>
                    {person.profile?.location && (
                      <div className="person-location">
                        📍 {person.profile.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="people-empty">
              <p className="empty-message">
                {searchQuery
                  ? `No people found matching "${searchQuery}"`
                  : "No people found"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default People;
