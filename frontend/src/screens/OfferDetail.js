import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/common/header";
import "./OfferDetail.css";
import { BASE_URL } from "../constants";
import { getAuthHeaders, getToken, removeToken } from "../utils/auth";

function OfferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    image: null,
    frequency: "",
    duration: "1",
    durationUnit: "Hour",
    minPeople: "",
    maxPeople: "",
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
      fetchOffer();
    }
  }, [user, id]);

  useEffect(() => {
    if (offer && isEditing) {
      // Parse duration to extract number and unit
      let durationValue = "1";
      let durationUnitValue = "Hour";
      if (offer.duration) {
        const durationMatch = offer.duration.match(/(\d+)\s*(\w+)/);
        if (durationMatch) {
          durationValue = durationMatch[1];
          durationUnitValue = durationMatch[2];
        } else {
          durationValue = offer.duration;
        }
      }

      // Initialize form data when entering edit mode
      setFormData({
        title: offer.title || "",
        description: offer.description || "",
        location: offer.location || "",
        image: null,
        frequency: offer.frequency || "",
        duration: durationValue,
        durationUnit: durationUnitValue,
        minPeople: offer.min_people || "",
        maxPeople: offer.max_people || "",
      });
      setSelectedTags(offer.tags ? offer.tags.map((tag) => tag.name) : []);
      if (offer.image) {
        setImagePreview(offer.image);
      }
    }
  }, [offer, isEditing]);

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

  const fetchOffer = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${BASE_URL}/api/offers/${id}/`, {
        method: "GET",
        headers: headers,
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setOffer(data);
      } else if (response.status === 404) {
        setError("Offer not found");
      } else {
        setError("Failed to load offer details");
      }
    } catch (error) {
      console.error("Error fetching offer:", error);
      setError("Failed to load offer details");
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
    if (offer?.user?.id) {
      navigate(`/profile/${offer.user.id}`);
    }
  };

  const handleMessage = () => {
    if (offer?.id) {
      // Navigate to messages page with offer conversation
      navigate(`/messages?conversation=offer_${offer.id}`);
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
      frequency: "",
      duration: "1",
      durationUnit: "Hour",
      minPeople: "",
      maxPeople: "",
    });
    setSelectedTags([]);
    setTagInput("");
    setImagePreview(null);
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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

      let body;
      let contentType;

      // If there's an image, use FormData, otherwise use JSON
      if (formData.image) {
        // Use FormData when image is present
        const formDataToSend = new FormData();
        formDataToSend.append("title", formData.title || "");
        formDataToSend.append("description", formData.description || "");
        formDataToSend.append("location", formData.location || "");
        if (formData.frequency) {
          formDataToSend.append("frequency", formData.frequency);
        }
        if (formData.duration) {
          formDataToSend.append(
            "duration",
            `${formData.duration} ${formData.durationUnit}`
          );
        }
        if (formData.minPeople) {
          formDataToSend.append("minPeople", formData.minPeople);
        }
        if (formData.maxPeople) {
          formDataToSend.append("maxPeople", formData.maxPeople);
        }

        // Add tags
        selectedTags.forEach((tag) => {
          formDataToSend.append("tags", tag);
        });

        formDataToSend.append("image", formData.image);
        body = formDataToSend;
        contentType = null;
      } else {
        // Use JSON when no image
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({
          title: formData.title || "",
          description: formData.description || "",
          location: formData.location || "",
          tags: selectedTags,
          frequency: formData.frequency || "",
          duration: formData.duration
            ? `${formData.duration} ${formData.durationUnit}`
            : "",
          minPeople: formData.minPeople ? parseInt(formData.minPeople) : null,
          maxPeople: formData.maxPeople ? parseInt(formData.maxPeople) : null,
        });
        contentType = "application/json";
      }

      const response = await fetch(`${BASE_URL}/api/offers/${id}/`, {
        method: "PUT",
        headers: headers,
        body: body,
        credentials: "include",
      });

      if (response.ok) {
        const updatedOffer = await response.json();
        setOffer(updatedOffer);
        setIsEditing(false);
        setFormData({
          title: "",
          description: "",
          location: "",
          image: null,
          frequency: "",
          duration: "1",
          durationUnit: "Hour",
          minPeople: "",
          maxPeople: "",
        });
        setSelectedTags([]);
        setTagInput("");
        setImagePreview(null);
      } else {
        const errorData = await response.json();
        setError(
          errorData.message || "Failed to update offer. Please try again."
        );
      }
    } catch (error) {
      console.error("Error updating offer:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isOwner = user && offer && user.username === offer.user?.username;

  if (loading) {
    return (
      <div className="page-container">
        <Header user={user} onLogout={handleLogout} onMenuToggle={() => {}} />
        <div className="offer-detail-layout">
          <div className="offer-detail-content">
            <div className="offer-detail-container">
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="page-container">
        <Header user={user} onLogout={handleLogout} onMenuToggle={() => {}} />
        <div className="offer-detail-layout">
          <div className="offer-detail-content">
            <div className="offer-detail-container">
              <p className="error-message">{error || "Offer not found"}</p>
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
      <div className="offer-detail-layout">
        <div className="offer-detail-content">
          <button className="back-button" onClick={() => navigate("/")}>
            ← Back to Feed
          </button>
          <div className="offer-detail-container">
            {isEditing ? (
              <div className="offer-edit-form">
                <h2 className="form-title">Edit Offer</h2>
                <form onSubmit={handleUpdateSubmit} className="offer-form">
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
                      placeholder="Enter offer title"
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
                      placeholder="Describe what you're offering in detail"
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
                    <label htmlFor="edit-frequency">Frequency:</label>
                    <select
                      id="edit-frequency"
                      name="frequency"
                      value={formData.frequency}
                      onChange={handleInputChange}
                      className="frequency-select"
                    >
                      <option value="">Choose ▼</option>
                      <option value="one-time">One-time</option>
                      <option value="weekly">Weekly</option>
                      <option value="bi-weekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="on-demand">On-demand</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-duration">Duration:</label>
                    <div className="duration-input-container">
                      <input
                        type="number"
                        id="edit-duration"
                        name="duration"
                        value={formData.duration}
                        onChange={handleInputChange}
                        min="1"
                        className="duration-input"
                      />
                      <span className="duration-unit">hour</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Number of People:</label>
                    <div className="people-count-container">
                      <div className="people-input-wrapper">
                        <label
                          htmlFor="edit-minPeople"
                          className="people-input-label"
                        >
                          Min
                        </label>
                        <input
                          type="number"
                          id="edit-minPeople"
                          name="minPeople"
                          value={formData.minPeople}
                          onChange={handleInputChange}
                          min="1"
                          placeholder="1"
                          className="people-count-input"
                        />
                      </div>
                      <span className="people-separator">-</span>
                      <div className="people-input-wrapper">
                        <label
                          htmlFor="edit-maxPeople"
                          className="people-input-label"
                        >
                          Max
                        </label>
                        <input
                          type="number"
                          id="edit-maxPeople"
                          name="maxPeople"
                          value={formData.maxPeople}
                          onChange={handleInputChange}
                          min={formData.minPeople || "1"}
                          placeholder="5"
                          className="people-count-input"
                        />
                      </div>
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
                        {offer.image ? "Change Image" : "Upload"}
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
                            setImagePreview(offer.image || null);
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
                      {submitting ? "Updating..." : "Update Offer"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                {offer.image && (
                  <div className="offer-detail-image">
                    <img src={offer.image} alt={offer.title} />
                  </div>
                )}
                <div className="offer-detail-header">
                  <h1 className="offer-detail-title">{offer.title}</h1>
                  {isOwner && (
                    <button className="edit-button" onClick={handleEdit}>
                      Edit
                    </button>
                  )}
                </div>
                <div className="offer-detail-poster">
                  <span className="offer-detail-poster-label">Posted by: </span>
                  <button
                    className="offer-detail-poster-link"
                    onClick={handleProfileClick}
                  >
                    {offer.user?.username || "Unknown"}
                  </button>
                </div>
                <div className="offer-detail-description">
                  <p>{offer.description}</p>
                </div>
                {offer.duration && (
                  <div className="offer-detail-honey">
                    <span className="honey-icon-detail">🍯</span>
                    <div className="honey-info-detail">
                      <span className="honey-label-detail">Honey Value</span>
                      <span className="honey-value-detail">
                        {(() => {
                          // Parse duration to get hours
                          const durationStr = offer.duration || "";
                          const match = durationStr.match(/(\d+)/);
                          return match ? match[1] : "0";
                        })()}
                      </span>
                      <span className="honey-unit-detail">hour(s)</span>
                    </div>
                  </div>
                )}
                {offer.tags && offer.tags.length > 0 && (
                  <div className="offer-detail-tags">
                    {offer.tags.map((tag) => (
                      <span key={tag.id} className="offer-detail-tag">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
                {offer.location && (
                  <div className="offer-detail-location">
                    <span className="offer-detail-location-label">
                      Location:{" "}
                    </span>
                    <span className="offer-detail-location-value">
                      {offer.location}
                    </span>
                  </div>
                )}
                {(offer.frequency || offer.duration) && (
                  <div className="offer-detail-meta">
                    {offer.frequency && (
                      <div className="offer-detail-meta-item">
                        <span className="offer-detail-meta-label">
                          Frequency:{" "}
                        </span>
                        <span className="offer-detail-meta-value">
                          {offer.frequency}
                        </span>
                      </div>
                    )}
                    {offer.duration && (
                      <div className="offer-detail-meta-item">
                        <span className="offer-detail-meta-label">
                          Duration:{" "}
                        </span>
                        <span className="offer-detail-meta-value">
                          {offer.duration}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {(offer.min_people || offer.max_people) && (
                  <div className="offer-detail-meta">
                    {offer.min_people && (
                      <div className="offer-detail-meta-item">
                        <span className="offer-detail-meta-label">
                          Min People:{" "}
                        </span>
                        <span className="offer-detail-meta-value">
                          {offer.min_people}
                        </span>
                      </div>
                    )}
                    {offer.max_people && (
                      <div className="offer-detail-meta-item">
                        <span className="offer-detail-meta-label">
                          Max People:{" "}
                        </span>
                        <span className="offer-detail-meta-value">
                          {offer.max_people}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {offer.is_reciprocal && (
                  <div className="offer-detail-reciprocal">
                    <span>🔄 Open to receiving help in return</span>
                  </div>
                )}
                {offer.latitude && offer.longitude && (
                  <div className="offer-detail-map">
                    <div className="map-view-placeholder">
                      <p className="map-view-label">Map View</p>
                      <p className="map-view-note">
                        Map integration coming soon
                      </p>
                    </div>
                  </div>
                )}
                <div className="offer-detail-actions">
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

export default OfferDetail;
