import React, { useState } from "react";
import "./FeedSearch.css";

function FeedSearch({ onSearch, onClear }) {
  const [searchText, setSearchText] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTextChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    onSearch({
      text: value,
      location: searchLocation,
    });
  };

  const handleLocationChange = (e) => {
    const value = e.target.value;
    setSearchLocation(value);
    onSearch({
      text: searchText,
      location: value,
    });
  };

  const handleClear = () => {
    setSearchText("");
    setSearchLocation("");
    setIsExpanded(false);
    onClear();
  };

  const hasActiveFilters = searchText || searchLocation;

  return (
    <div className="feed-search-container">
      <div className="feed-search-main">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-text-input"
            placeholder="Search by text, tags..."
            value={searchText}
            onChange={handleTextChange}
            onFocus={() => setIsExpanded(true)}
          />
          {hasActiveFilters && (
            <button
              type="button"
              className="clear-search-button"
              onClick={handleClear}
              title="Clear all filters"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="button"
          className="expand-search-button"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse filters" : "More filters"}
        >
          {isExpanded ? "−" : "+"}
        </button>
      </div>

      {isExpanded && (
        <div className="feed-search-filters">
          <div className="search-filter-group">
            <label htmlFor="location-search">Location:</label>
            <input
              type="text"
              id="location-search"
              className="search-filter-input"
              placeholder="Search by location..."
              value={searchLocation}
              onChange={handleLocationChange}
            />
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="active-filters">
          {searchText && (
            <span className="filter-chip">
              Text: "{searchText}"
              <button
                type="button"
                className="filter-chip-remove"
                onClick={() => {
                  setSearchText("");
                  onSearch({
                    text: "",
                    location: searchLocation,
                  });
                }}
              >
                ×
              </button>
            </span>
          )}
          {searchLocation && (
            <span className="filter-chip">
              Location: "{searchLocation}"
              <button
                type="button"
                className="filter-chip-remove"
                onClick={() => {
                  setSearchLocation("");
                  onSearch({
                    text: searchText,
                    location: "",
                  });
                }}
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default FeedSearch;
