import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/common/header";
import "./CreateNeed.css";
import { BASE_URL } from "../constants";
import { getAuthHeaders, getToken } from "../utils/auth";

function CreateNeed() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: [],
    location: "",
    image: null,
  });
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  // Common category tags TODO: Implement backend for these semantic tags
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

  React.useEffect(() => {
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
        setUser(data);
      } else {
        navigate("/login");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      navigate("/login");
    } finally {
      setLoading(false);
    }
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
      setFormData((prev) => ({
        ...prev,
        category: [...prev.category, tag],
      }));
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setSelectedTags(selectedTags.filter((tag) => tag !== tagToRemove));
    setFormData((prev) => ({
      ...prev,
      category: prev.category.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleTagInputKeyPress = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      handleAddTag(tagInput.trim().toLowerCase());
      setTagInput("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const token = getToken();
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      // Don't set Content-Type for FormData - browser will set it with boundary

      const formDataToSend = new FormData();

      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("location", formData.location);

      // Add tags
      formData.category.forEach((tag) => {
        formDataToSend.append("tags", tag);
      });

      if (formData.image) {
        formDataToSend.append("image", formData.image);
      }

      const response = await fetch(`${BASE_URL}/api/needs/`, {
        method: "POST",
        headers: headers,
        body: formDataToSend,
        credentials: "include",
      });

      if (response.ok) {
        navigate("/");
      } else {
        const errorData = await response.json();
        setError(
          errorData.message || "Failed to create need. Please try again."
        );
      }
    } catch (error) {
      console.error("Error creating need:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="auth-container">Loading...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header
        user={user}
        onLogout={() => navigate("/")}
        onMenuToggle={() => {}}
      />
      <div className="create-need-layout">
        <div className="create-need-content">
          <div className="need-form-container">
            <h2 className="form-title">Request Need</h2>
            <p className="form-subtitle">
              Request help or services from the community. Let others know what
              you need.
            </p>

            <form onSubmit={handleSubmit} className="need-form">
              {error && <div className="error-message">{error}</div>}

              <div className="form-group">
                <label htmlFor="title">Title:</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter need title"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description:</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="5"
                  placeholder="Describe what you need in detail"
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category:</label>
                <div className="category-input-container">
                  <input
                    type="text"
                    id="category"
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
                <label htmlFor="location">Location:</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Enter location"
                />
              </div>

              <div className="form-group">
                <label htmlFor="image">Image:</label>
                <div className="image-upload-container">
                  <input
                    type="file"
                    id="image"
                    name="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="file-input"
                  />
                  <label htmlFor="image" className="upload-button">
                    Upload
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
                        setImagePreview(null);
                        // Reset file input
                        const fileInput = document.getElementById("image");
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

              <button
                type="submit"
                className="post-need-button"
                disabled={submitting}
              >
                {submitting ? "Posting..." : "Post Need"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateNeed;
