import React from "react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../../data/mockData";
import "./FeedCard.css";

function FeedCard({ item }) {
  const navigate = useNavigate();
  const typeLabel = item.type === "offer" ? "📋 Offer" : "📝 Need";

  const handleClick = () => {
    if (item.id) {
      if (item.type === "need") {
        navigate(`/needs/${item.id}`);
      } else if (item.type === "offer") {
        navigate(`/offers/${item.id}`);
      }
    }
  };

  return (
    <div className="feed-item clickable" onClick={handleClick}>
      <div className="feed-item-content">
        <div className="feed-item-image">
          {item.image ? (
            <img src={item.image} alt={item.title} className="feed-image" />
          ) : (
            <div className="feed-image-placeholder">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z"
                  stroke="#999"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="placeholder-text">No Image</span>
            </div>
          )}
        </div>
        <div className="feed-item-body">
          <div className="feed-item-header">
            <div className="feed-item-type">
              <span className={`type-badge type-${item.type}`}>
                {typeLabel}
              </span>
            </div>
            <span className="feed-item-time">
              {formatDate(item.created_at)}
            </span>
          </div>
          <h3 className="feed-item-title">{item.title}</h3>
          <p className="feed-item-description">{item.description}</p>
          {item.duration && (
            <div className="feed-item-honey">
              <span className="honey-icon-small">🍯</span>
              <span className="honey-value-small">
                {(() => {
                  // Parse duration to get hours
                  const durationStr = item.duration || "";
                  const match = durationStr.match(/(\d+)/);
                  return match ? match[1] : "0";
                })()}
              </span>
              <span className="honey-label-small">hour(s)</span>
            </div>
          )}
          <div className="feed-item-footer">
            <div className="feed-item-meta">
              <span className="feed-item-author">
                by {item.user?.username || "Unknown"}
              </span>
              {item.location && (
                <span className="feed-item-location">📍 {item.location}</span>
              )}
            </div>
            {item.tags && item.tags.length > 0 && (
              <div className="feed-item-tags">
                {item.tags.map((tag) => (
                  <span key={tag.id || tag} className="tag">
                    {tag.name || tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeedCard;
