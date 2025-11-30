import React, { useState, useEffect } from "react";
import Header from "../components/common/header";
import "./Home.css";
import { BASE_URL } from "../constants";
import { getAuthHeaders, removeToken } from "../utils/auth";

function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${BASE_URL}/api/auth/user/`, {
        method: "GET",
        headers: headers,
        credentials: "include", // Still include for Chrome compatibility
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Response data fetchUser", data);
        setUser(data);
      } else if (response.status === 401) {
        // Token might be invalid, clear it
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
        credentials: "include", // Still include for Chrome compatibility
      });
      // Clear token from localStorage
      removeToken();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      // Clear token even if request fails
      removeToken();
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="auth-container">Loading...</div>
      </div>
    );
  }

  console.log("User", user);
  return (
    <div className="page-container">
      <Header user={user} onLogout={handleLogout} />
      <div className="home-container">
        <div className="welcome-section">
          <h1>Welcome to The Hive</h1>
          {user ? (
            <p className="subtitle">Hello, {user.username}! 👋</p>
          ) : (
            <p className="subtitle">Please log in to continue</p>
          )}
        </div>

        {user && (
          <div className="user-info">
            <div className="user-info-item">
              <span className="user-info-label">Username:</span>
              <span className="user-info-value">{user.username}</span>
            </div>
            <div className="user-info-item">
              <span className="user-info-label">Email:</span>
              <span className="user-info-value">
                {user.email || "Not provided"}
              </span>
            </div>
            <div className="user-info-item">
              <span className="user-info-label">Status:</span>
              <span className="user-info-value">Active</span>
            </div>
          </div>
        )}

        <div className="actions-grid">
          <a href="#" className="action-card">
            <h3>📊 Dashboard</h3>
            <p>View your analytics</p>
          </a>
        </div>
      </div>
    </div>
  );
}

export default Home;
