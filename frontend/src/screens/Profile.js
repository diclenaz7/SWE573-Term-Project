import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/common/header";
import FeedCard from "../components/feed/FeedCard";
import "./Profile.css";
import { BASE_URL } from "../constants";
import { getAuthHeaders, removeToken } from "../utils/auth";

function Profile() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState("");
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user || userId) {
      fetchProfile();
    }
  }, [user, userId]);

  useEffect(() => {
    if (profile) {
      setEditedBio(profile.bio || "");
      if (profile.profile_image) {
        setProfileImagePreview(profile.profile_image);
      }
      if (!loading) {
        setLoading(false);
      }
    }
  }, [profile]);

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
        if (!userId) {
          navigate("/login");
        }
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
      if (!userId) {
        setLoading(false);
      }
    }
  };

  const fetchProfile = async () => {
    try {
      const headers = getAuthHeaders();
      const url = userId
        ? `${BASE_URL}/api/profile/${userId}/`
        : `${BASE_URL}/api/profile/`;
      const response = await fetch(url, {
        method: "GET",
        headers: headers,
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setLoading(false);
      } else if (response.status === 401) {
        removeToken();
        setUser(null);
        navigate("/login");
      } else if (response.status === 404) {
        navigate("/profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedBio(profile?.bio || "");
    setProfileImageFile(null);
    if (profile?.profile_image) {
      setProfileImagePreview(profile.profile_image);
    } else {
      setProfileImagePreview(null);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("auth_token");

      // Use FormData if we have an image, otherwise use JSON
      let body;
      let headers = {};

      if (profileImageFile) {
        // Use FormData for image upload
        body = new FormData();
        body.append("bio", editedBio);
        body.append("profile_image", profileImageFile);
        // Don't set Content-Type header when using FormData - browser will set it with boundary
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      } else {
        // Use JSON if no image
        body = JSON.stringify({ bio: editedBio });
        headers = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      const response = await fetch(`${BASE_URL}/api/profile/`, {
        method: "PATCH",
        headers: headers,
        body: body,
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setIsEditing(false);
        setProfileImageFile(null);
      } else {
        const errorData = await response.json();
        alert(
          `Failed to update profile: ${errorData.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getRankDisplay = () => {
    if (!profile) return "";
    const rankMap = {
      newbee: "New Bee",
      worker: "Worker Bee",
      queen: "Queen Bee",
      drone: "Drone",
    };
    return rankMap[profile.rank] || profile.rank_display || "New Bee";
  };

  if (loading) {
    return (
      <div className="page-container">
        <Header user={user} onLogout={handleLogout} />
        <div className="profile-loading">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="page-container">
        <Header user={user} onLogout={handleLogout} />
        <div className="profile-error">Failed to load profile</div>
      </div>
    );
  }

  const fullName = profile.user?.full_name || profile.user?.username || "User";
  const username = profile.user?.username;

  return (
    <div className="page-container">
      <Header user={user} onLogout={handleLogout} />
      <div className="profile-container">
        <div className="profile-content">
          <div className="profile-section">
            <div className="profile-info">
              <div className="profile-left">
                <div className="profile-name">
                  <h2 className="profile-section-title">
                    {fullName}
                    {profile.is_own_profile && !isEditing && (
                      <>
                        <button
                          className="edit-button"
                          onClick={handleEdit}
                          title="Edit profile"
                        >
                          🖊️
                        </button>
                        <button
                          className="logout-button"
                          onClick={handleLogout}
                          title="Logout"
                        >
                          Logout
                        </button>
                      </>
                    )}
                  </h2>
                  {username && (
                    <div className="profile-username">@{username}</div>
                  )}
                </div>
                <div className="profile-rank">
                  ★ {getRankDisplay()} {profile.reputation_score}
                </div>
                {profile.honey_balance && (
                  <div className="profile-honey-balance">
                    <div className="honey-balance-item">
                      <span className="honey-icon">🍯</span>
                      <div className="honey-info">
                        <span className="honey-label">Total Honey</span>
                        <span className="honey-value">
                          {profile.honey_balance.total_honey}
                        </span>
                      </div>
                    </div>
                    <div className="honey-balance-item">
                      <span className="honey-icon">✨</span>
                      <div className="honey-info">
                        <span className="honey-label">Usable Honey</span>
                        <span className="honey-value usable">
                          {profile.honey_balance.usable_honey}
                        </span>
                      </div>
                    </div>
                    {profile.honey_balance.provisioned_honey > 0 && (
                      <div className="honey-balance-item provisioned">
                        <span className="honey-icon">🔒</span>
                        <div className="honey-info">
                          <span className="honey-label">Provisioned</span>
                          <span className="honey-value">
                            {profile.honey_balance.provisioned_honey}
                          </span>
                          <span className="honey-unit">hours</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="profile-bio-section">
                  {isEditing && profile.is_own_profile ? (
                    <textarea
                      className="bio-input"
                      value={editedBio}
                      onChange={(e) => setEditedBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  ) : (
                    <div className="bio-text">
                      {profile.bio || "No bio yet."}
                    </div>
                  )}
                </div>
              </div>

              <div className="profile-right">
                <div className="profile-image-container">
                  {isEditing && profile.is_own_profile ? (
                    <div className="profile-image-edit">
                      <label
                        htmlFor="profile-image-input"
                        className="image-upload-label"
                      >
                        {profileImagePreview ? (
                          <img
                            src={profileImagePreview}
                            alt="Profile"
                            className="profile-image"
                          />
                        ) : (
                          <div className="profile-image-placeholder">
                            <span className="person-icon">👤</span>
                          </div>
                        )}
                      </label>
                      <input
                        id="profile-image-input"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="image-input"
                      />
                    </div>
                  ) : (
                    <div className="profile-image-display">
                      {profile.profile_image ? (
                        <img
                          src={profile.profile_image}
                          alt="Profile"
                          className="profile-image"
                        />
                      ) : (
                        <div className="profile-image-placeholder">
                          <span className="person-icon">👤</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isEditing && profile.is_own_profile && (
              <div className="profile-edit-actions">
                <button
                  className="save-button"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  className="cancel-button"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="profile-offers-section">
            <h2 className="section-title">My Offers</h2>
            {profile.offers && profile.offers.length > 0 ? (
              <div className="feed-cards-container">
                {profile.offers.map((offer) => (
                  <FeedCard key={offer.id} item={{ ...offer, type: "offer" }} />
                ))}
              </div>
            ) : (
              <p className="empty-message">No offers yet.</p>
            )}
          </div>

          <div className="profile-needs-section">
            <h2 className="section-title">My Needs</h2>
            {profile.needs && profile.needs.length > 0 ? (
              <div className="feed-cards-container">
                {profile.needs.map((need) => (
                  <FeedCard key={need.id} item={{ ...need, type: "need" }} />
                ))}
              </div>
            ) : (
              <p className="empty-message">No needs yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
