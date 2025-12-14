import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Header from "../components/common/header";
import { BASE_URL } from "../constants";
import { getAuthHeaders } from "../utils/auth";
import "./MapView.css";

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Custom icon for offers (light blue)
const offerIcon = new L.DivIcon({
  className: "custom-marker-icon offer-marker",
  html: `<div style="background-color: #60B4FF; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

// Custom icon for needs (purple)
const needIcon = new L.DivIcon({
  className: "custom-marker-icon need-marker",
  html: `<div style="background-color: #9333FF; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

// Component to handle map zoom and pan
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

function MapView() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filters, setFilters] = useState(["offers", "needs"]);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.006]); // Default to NYC
  const [mapZoom, setMapZoom] = useState(10);
  const mapRef = useRef(null);

  useEffect(() => {
    fetchUser();
    getUserLocation();
  }, []);

  useEffect(() => {
    fetchMapData();
  }, [filters]);

  // Fix map size after component mounts
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    }
  }, [loading]);

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
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
          setMapZoom(12);
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    }
  };

  const fetchMapData = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/map-view/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ filters }),
      });

      if (response.ok) {
        const data = await response.json();
        setOffers(data.offers || []);
        setNeeds(data.needs || []);
      } else {
        console.error("Failed to fetch map data");
      }
    } catch (error) {
      console.error("Error fetching map data:", error);
    }
  };

  const handleMarkerClick = (item) => {
    setSelectedItem(item);
  };

  const handleSeeDetails = () => {
    if (selectedItem) {
      if (selectedItem.type === "offer") {
        navigate(`/offers/${selectedItem.id}`);
      } else {
        navigate(`/needs/${selectedItem.id}`);
      }
    }
  };

  const toggleFilter = (filter) => {
    if (filters.includes(filter)) {
      if (filters.length > 1) {
        setFilters(filters.filter((f) => f !== filter));
      }
    } else {
      setFilters([...filters, filter]);
    }
  };

  const allItems = [...offers, ...needs];

  if (loading) {
    return (
      <div className="page-container">
        <div className="auth-container">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="page-container"
      style={{ height: "100vh", overflow: "hidden" }}
    >
      <Header
        user={user}
        onLogout={() => navigate("/")}
        onMenuToggle={() => {}}
      />
      <div className="map-view-container">
        {/* Filter Controls */}
        <div className="map-filters">
          <button
            className={`filter-button ${
              filters.includes("offers") ? "active" : ""
            }`}
            onClick={() => toggleFilter("offers")}
          >
            Offers
          </button>
          <button
            className={`filter-button ${
              filters.includes("needs") ? "active" : ""
            }`}
            onClick={() => toggleFilter("needs")}
          >
            Needs
          </button>
        </div>

        {/* Map */}
        <div className="map-wrapper" id="map-wrapper">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: "100%", width: "100%", minHeight: "400px" }}
            ref={mapRef}
            whenReady={(map) => {
              // Force map to update when ready
              setTimeout(() => {
                if (map.target) {
                  map.target.invalidateSize();
                }
              }, 100);
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={mapCenter} zoom={mapZoom} />

            {/* Render offer markers */}
            {filters.includes("offers") &&
              offers.map((offer) => (
                <Marker
                  key={`offer-${offer.id}`}
                  position={[offer.latitude, offer.longitude]}
                  icon={offerIcon}
                  eventHandlers={{
                    click: () => handleMarkerClick(offer),
                  }}
                >
                  <Popup>
                    <div className="marker-popup">
                      <h3>{offer.title}</h3>
                      <p className="marker-type">Offer</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Render need markers */}
            {filters.includes("needs") &&
              needs.map((need) => (
                <Marker
                  key={`need-${need.id}`}
                  position={[need.latitude, need.longitude]}
                  icon={needIcon}
                  eventHandlers={{
                    click: () => handleMarkerClick(need),
                  }}
                >
                  <Popup>
                    <div className="marker-popup">
                      <h3>{need.title}</h3>
                      <p className="marker-type">Need</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>

        {/* Bottom Info Card */}
        {selectedItem && (
          <div className="map-info-card">
            <div className="info-card-content">
              <h3 className="info-card-title">{selectedItem.title}</h3>
              <p className="info-card-type">
                {selectedItem.type === "offer" ? "Offer" : "Need"}
              </p>
              <p className="info-card-description">
                {selectedItem.description.length > 100
                  ? `${selectedItem.description.substring(0, 100)}...`
                  : selectedItem.description}
              </p>
              {selectedItem.location && (
                <p className="info-card-location">📍 {selectedItem.location}</p>
              )}
              <button className="see-details-button" onClick={handleSeeDetails}>
                See Details →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapView;
