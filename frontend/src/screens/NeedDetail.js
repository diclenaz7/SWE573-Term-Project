import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/common/header";
import "./NeedDetail.css";
import { BASE_URL } from "../constants";
import { getAuthHeaders, getToken, removeToken } from "../utils/auth";

function NeedDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [need, setNeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    image: null,
    duration: "1",
  });
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  // Common category tags
  const commonTags = [
    "art",
    "drawing",
    "craft",
    "gardening",
    "tutoring",
    "repairs",
    "childcare",
    "cooking",
  ];

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchNeed();
    }
  }, [user, id]);

  useEffect(() => {
    if (need && isEditing) {
      // Initialize form data when entering edit mode
      // Parse duration to extract number
      let durationValue = "1";
      if (need.duration) {
        const durationMatch = need.duration.match(/(\d+)/);
        if (durationMatch) {
          durationValue = durationMatch[1];
        }
      }

      setFormData({
        title: need.title || "",
        description: need.description || "",
        location: need.location || "",
        image: null,
        duration: durationValue,
      });
      setSelectedTags(need.tags ? need.tags.map((tag) => tag.name) : []);
      if (need.image) {
        setImagePreview(need.image);
      }
    }
  }, [need, isEditing]);

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
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    }
  };

  const fetchNeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${BASE_URL}/api/needs/${id}/`, {
        method: "GET",
        headers: headers,
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setNeed(data);
      } else if (response.status === 404) {
        setError("Need not found");
      } else {
        setError("Failed to load need details");
      }
    } catch (error) {
      console.error("Error fetching need:", error);
      setError("Failed to load need details");
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

  const handleProfileClick = () => {
    if (need?.user?.id) {
      navigate(`/profile/${need.user.id}`);
    }
  };

  const handleMessage = () => {
    if (need?.id) {
      // Navigate to messages page with need conversation
      navigate(`/messages?conversation=need_${need.id}`);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({
      title: "",
      description: "",
      location: "",
      image: null,
    });
    setSelectedTags([]);
    setTagInput("");
    setImagePreview(null);
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        image: file,
      }));

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleAddTag = (tag) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setSelectedTags(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      handleAddTag(tagInput.trim().toLowerCase());
      setTagInput("");
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Validate form data before proceeding
      if (!formData.title || !formData.description) {
        setError("Title and description are required");
        setSubmitting(false);
        return;
      }

      const token = getToken();
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      console.log("formData state:", formData);
      console.log("selectedTags:", selectedTags);

      let body;
      let contentType;

      // If there's an image, use FormData, otherwise use JSON
      if (formData.image) {
        // Use FormData when image is present
        const formDataToSend = new FormData();
        formDataToSend.append("title", formData.title || "");
        formDataToSend.append("description", formData.description || "");
        formDataToSend.append("location", formData.location || "");

        // Duration is required
        const hours = parseInt(formData.duration) || 1;
        formDataToSend.append(
          "duration",
          `${hours} ${hours === 1 ? "Hour" : "Hours"}`
        );

        // Add tags
        selectedTags.forEach((tag) => {
          formDataToSend.append("tags", tag);
        });

        formDataToSend.append("image", formData.image);
        body = formDataToSend;
        // Don't set Content-Type for FormData - browser will set it with boundary
        contentType = null;
      } else {
        // Use JSON when no image
        headers["Content-Type"] = "application/json";
        // Duration is required
        const hours = parseInt(formData.duration) || 1;
        body = JSON.stringify({
          title: formData.title || "",
          description: formData.description || "",
          location: formData.location || "",
          tags: selectedTags,
          duration: `${hours} ${hours === 1 ? "Hour" : "Hours"}`,
        });
        contentType = "application/json";
      }

      console.log("Request body type:", formData.image ? "FormData" : "JSON");
      console.log(
        "Request body:",
        formData.image ? "FormData (see entries below)" : body
      );

      const response = await fetch(`${BASE_URL}/api/needs/${id}/`, {
        method: "PUT",
        headers: headers,
        body: body,
        credentials: "include",
      });

      if (response.ok) {
        const updatedNeed = await response.json();
        console.log("updatedNeed", updatedNeed);
        setNeed(updatedNeed);
        setIsEditing(false);
        setFormData({
          title: "",
          description: "",
          location: "",
          image: null,
          duration: "1",
        });
        setSelectedTags([]);
        setTagInput("");
        setImagePreview(null);
      } else {
        const errorData = await response.json();
        setError(
          errorData.message || "Failed to update need. Please try again."
        );
      }
    } catch (error) {
      console.error("Error updating need:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isOwner = user && need && user.username === need.user?.username;
  console.log("isOwner", isOwner);
  console.log("need", need);
  console.log("user", user);

  if (loading) {
    return (
      <div className="page-container">
        <Header user={user} onLogout={handleLogout} onMenuToggle={() => {}} />
        <div className="need-detail-layout">
          <div className="need-detail-content">
            <div className="need-detail-container">
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !need) {
    return (
      <div className="page-container">
        <Header user={user} onLogout={handleLogout} onMenuToggle={() => {}} />
        <div className="need-detail-layout">
          <div className="need-detail-content">
            <div className="need-detail-container">
              <p className="error-message">{error || "Need not found"}</p>
              <button className="back-button" onClick={() => navigate("/")}>
                ← Back to Feed
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header user={user} onLogout={handleLogout} onMenuToggle={() => {}} />
      <div className="need-detail-layout">
        <div className="need-detail-content">
          <button className="back-button" onClick={() => navigate("/")}>
            ← Back to Feed
          </button>
          <div className="need-detail-container">
            {isEditing ? (
              <div className="need-edit-form">
                <h2 className="form-title">Edit Need</h2>
                <form onSubmit={handleUpdateSubmit} className="need-form">
                  {error && <div className="error-message">{error}</div>}

                  <div className="form-group">
                    <label htmlFor="edit-title">Title:</label>
                    <input
                      type="text"
                      id="edit-title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter need title"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-description">Description:</label>
                    <textarea
                      id="edit-description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows="5"
                      placeholder="Describe what you need in detail"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-category">Category:</label>
                    <div className="category-input-container">
                      <input
                        type="text"
                        id="edit-category"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={handleTagInputKeyPress}
                        placeholder="Type and press Enter to add tags"
                        className="tag-input"
                      />
                      <div className="common-tags">
                        {commonTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className={`tag-button ${
                              selectedTags.includes(tag) ? "selected" : ""
                            }`}
                            onClick={() => handleAddTag(tag)}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      {selectedTags.length > 0 && (
                        <div className="selected-tags">
                          {selectedTags.map((tag) => (
                            <span key={tag} className="tag-chip">
                              {tag}
                              <button
                                type="button"
                                className="tag-remove"
                                onClick={() => handleRemoveTag(tag)}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-location">Location:</label>
                    <input
                      type="text"
                      id="edit-location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Enter location"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-duration">Duration (Hours) *:</label>
                    <div className="duration-input-container">
                      <input
                        type="number"
                        id="edit-duration"
                        name="duration"
                        value={formData.duration}
                        onChange={handleInputChange}
                        min="1"
                        step="1"
                        required
                        className="duration-input"
                        placeholder="1"
                      />
                      <span className="duration-unit">hour(s)</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-image">Image:</label>
                    <div className="image-upload-container">
                      <input
                        type="file"
                        id="edit-image"
                        name="image"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="file-input"
                      />
                      <label htmlFor="edit-image" className="upload-button">
                        {need.image ? "Change Image" : "Upload"}
                      </label>
                      {formData.image && (
                        <span className="file-name">{formData.image.name}</span>
                      )}
                    </div>
                    {imagePreview && (
                      <div className="image-preview-container">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="image-preview"
                        />
                        <button
                          type="button"
                          className="remove-image-button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, image: null }));
                            setImagePreview(need.image || null);
                            const fileInput =
                              document.getElementById("edit-image");
                            if (fileInput) {
                              fileInput.value = "";
                            }
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="edit-form-actions">
                    <button
                      type="button"
                      className="cancel-button"
                      onClick={handleCancelEdit}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="update-button"
                      disabled={submitting}
                    >
                      {submitting ? "Updating..." : "Update Need"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                {need.image && (
                  <div className="need-detail-image">
                    <img src={need.image} alt={need.title} />
                  </div>
                )}
                <div className="need-detail-header">
                  <h1 className="need-detail-title">{need.title}</h1>
                  {isOwner && (
                    <button className="edit-button" onClick={handleEdit}>
                      Edit
                    </button>
                  )}
                </div>
                <div className="need-detail-poster">
                  <span className="need-detail-poster-label">Posted by: </span>
                  <button
                    className="need-detail-poster-link"
                    onClick={handleProfileClick}
                  >
                    {need.user?.username || "Unknown"}
                  </button>
                </div>
                <div className="need-detail-description">
                  <p>{need.description}</p>
                </div>
                {need.duration && (
                  <div className="need-detail-honey">
                    <span className="honey-icon-detail">🍯</span>
                    <div className="honey-info-detail">
                      <span className="honey-label-detail">Honey Value</span>
                      <span className="honey-value-detail">
                        {(() => {
                          // Parse duration to get hours
                          const durationStr = need.duration || "";
                          const match = durationStr.match(/(\d+)/);
                          return match ? match[1] : "0";
                        })()}
                      </span>
                      <span className="honey-unit-detail">hour(s)</span>
                    </div>
                  </div>
                )}
                {need.tags && need.tags.length > 0 && (
                  <div className="need-detail-tags">
                    {need.tags.map((tag) => (
                      <span key={tag.id} className="need-detail-tag">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
                {need.location && (
                  <div className="need-detail-location">
                    <span className="need-detail-location-label">
                      Location:{" "}
                    </span>
                    <span className="need-detail-location-value">
                      {need.location}
                    </span>
                  </div>
                )}
                {need.latitude && need.longitude && (
                  <div className="need-detail-map">
                    <div className="map-view-placeholder">
                      <p className="map-view-label">Map View</p>
                      <p className="map-view-note">
                        Map integration coming soon
                      </p>
                    </div>
                  </div>
                )}
                <div className="need-detail-actions">
                  {!isOwner && (
                    <button className="message-button" onClick={handleMessage}>
                      Message
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NeedDetail;
