import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/user/', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else if (response.status === 401) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8000/api/auth/logout/', {
        method: 'POST',
        credentials: 'include',
      });
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="auth-container">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="page-container">
      <div className="home-container">
      <div className="welcome-section">
        <h1>Welcome to The Hive</h1>
        <p className="subtitle">Hello, {user.username}! 👋</p>
      </div>

      <div className="user-info">
        <div className="user-info-item">
          <span className="user-info-label">Username:</span>
          <span className="user-info-value">{user.username}</span>
        </div>
        <div className="user-info-item">
          <span className="user-info-label">Email:</span>
          <span className="user-info-value">{user.email || 'Not provided'}</span>
        </div>
        <div className="user-info-item">
          <span className="user-info-label">Status:</span>
          <span className="user-info-value">Active</span>
        </div>
      </div>

      <div className="actions-grid">
        <a href="#" className="action-card">
          <h3>📊 Dashboard</h3>
          <p>View your analytics</p>
        </a>
        <a href="#" className="action-card">
          <h3>⚙️ Settings</h3>
          <p>Manage preferences</p>
        </a>
        <a href="#" className="action-card">
          <h3>📝 Profile</h3>
          <p>Edit your profile</p>
        </a>
      </div>

      <div className="logout-section">
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </div>
      </div>
    </div>
  );
}

export default Home;

