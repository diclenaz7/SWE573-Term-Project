import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LocationSearch.css";

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Component to handle map clicks
function LocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      map.setView(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

function LocationSearch({ onLocationSelect, initialLocation = null }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.006]); // Default to NYC
  const [mapPosition, setMapPosition] = useState(
    initialLocation && initialLocation.latitude && initialLocation.longitude
      ? [initialLocation.latitude, initialLocation.longitude]
      : null
  );
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (initialLocation && initialLocation.latitude && initialLocation.longitude) {
      setMapCenter([initialLocation.latitude, initialLocation.longitude]);
      setMapPosition([initialLocation.latitude, initialLocation.longitude]);
      setSearchQuery(initialLocation.address || "");
    }
  }, [initialLocation]);

  useEffect(() => {
    // Get user's current location on mount
    if (navigator.geolocation && !initialLocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPos = [pos.coords.latitude, pos.coords.longitude];
          setMapCenter(userPos);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Handle clicks outside results dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const searchLocations = async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      // Using Nominatim (OpenStreetMap's geocoding service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            "User-Agent": "TheHiveApp/1.0",
          },
        }
      );
      const data = await response.json();
      setSearchResults(data || []);
      setShowResults(true);
    } catch (error) {
      console.error("Error searching locations:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If query is cleared, clear results
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(query);
    }, 500);
  };

  const handleSelectLocation = (location) => {
    const locationData = {
      address: location.display_name,
      latitude: parseFloat(location.lat),
      longitude: parseFloat(location.lon),
    };
    setSelectedLocation(locationData);
    setSearchQuery(location.display_name);
    setMapCenter([locationData.latitude, locationData.longitude]);
    setMapPosition([locationData.latitude, locationData.longitude]);
    setShowResults(false);
    onLocationSelect(locationData);
  };

  const handleMapClick = (lat, lng) => {
    reverseGeocode(lat, lng);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            "User-Agent": "TheHiveApp/1.0",
          },
        }
      );
      const data = await response.json();
      if (data.display_name) {
        const locationData = {
          address: data.display_name,
          latitude: lat,
          longitude: lng,
        };
        setSelectedLocation(locationData);
        setSearchQuery(data.display_name);
        onLocationSelect(locationData);
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          handleMapClick(lat, lng);
        },
        (error) => {
          alert("Unable to get your location. Please search for a location or click on the map.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className="location-search-container">
      <div className="location-search-input-wrapper">
        <input
          type="text"
          className="location-search-input"
          placeholder="Search for a location..."
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true);
            }
          }}
        />
        {isSearching && (
          <span className="location-search-loading">Searching...</span>
        )}
        <button
          type="button"
          className="use-current-location-button-small"
          onClick={handleUseCurrentLocation}
          title="Use current location"
        >
          📍
        </button>
        
        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="location-search-results" ref={resultsRef}>
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="location-search-result-item"
                onClick={() => handleSelectLocation(result)}
              >
                <div className="location-result-name">{result.display_name}</div>
                {result.address && (
                  <div className="location-result-details">
                    {result.address.city || result.address.town || result.address.village || ""}
                    {result.address.country && `, ${result.address.country}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map for manual selection */}
      <div className="location-search-map">
        <p className="location-picker-hint">
          Or click on the map to select a location
        </p>
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: "300px", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker
            position={mapPosition}
            setPosition={(pos) => {
              setMapPosition(pos);
              handleMapClick(pos[0], pos[1]);
            }}
          />
        </MapContainer>
      </div>

      {/* Selected Location Display */}
      {selectedLocation && (
        <div className="selected-location-display">
          <strong>Selected Location:</strong> {selectedLocation.address}
        </div>
      )}
    </div>
  );
}

export default LocationSearch;

