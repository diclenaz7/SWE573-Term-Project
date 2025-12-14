import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Map.css";

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
    if (center && zoom) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom]);
  return null;
}

function Map({ 
  offers = [], 
  needs = [], 
  filters = ["offers", "needs"],
  height = "400px",
  showInfoCard = true,
  singleItem = null, // For detail pages - single offer or need
  onMarkerClick = null
}) {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState(singleItem);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.006]); // Default to NYC
  const [mapZoom, setMapZoom] = useState(10);
  const mapRef = useRef(null);

  useEffect(() => {
    if (singleItem) {
      setSelectedItem(singleItem);
      if (singleItem.latitude && singleItem.longitude) {
        const lat = typeof singleItem.latitude === 'string' ? parseFloat(singleItem.latitude) : singleItem.latitude;
        const lng = typeof singleItem.longitude === 'string' ? parseFloat(singleItem.longitude) : singleItem.longitude;
        setMapCenter([lat, lng]);
        setMapZoom(14);
      }
    } else {
      getUserLocation();
    }
  }, [singleItem]);

  // Update map when offers/needs change
  useEffect(() => {
    if (!singleItem && (offers.length > 0 || needs.length > 0)) {
      // Calculate center based on all markers
      const allItems = [
        ...offers.filter(o => o.latitude && o.longitude),
        ...needs.filter(n => n.latitude && n.longitude)
      ];
      
      if (allItems.length > 0) {
        const avgLat = allItems.reduce((sum, item) => sum + parseFloat(item.latitude), 0) / allItems.length;
        const avgLng = allItems.reduce((sum, item) => sum + parseFloat(item.longitude), 0) / allItems.length;
        setMapCenter([avgLat, avgLng]);
        setMapZoom(12);
      }
    }
  }, [offers, needs, singleItem]);

  // Fix map size after component mounts
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    }
  }, []);

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

  const handleMarkerClick = (item) => {
    setSelectedItem(item);
    if (onMarkerClick) {
      onMarkerClick(item);
    }
  };

  const handleSeeDetails = () => {
    if (selectedItem) {
      if (selectedItem.type === "offer" || (singleItem && !selectedItem.type)) {
        navigate(`/offers/${selectedItem.id}`);
      } else {
        navigate(`/needs/${selectedItem.id}`);
      }
    }
  };

  // Filter items based on filters prop
  const filteredOffers = filters.includes("offers") ? offers : [];
  const filteredNeeds = filters.includes("needs") ? needs : [];

  return (
    <div className="map-component-container" style={{ height }}>
      <div className="map-wrapper-inline" style={{ height }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
          whenReady={(map) => {
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
          {filteredOffers.map((offer) => {
            if (!offer.latitude || !offer.longitude) return null;
            return (
              <Marker
                key={`offer-${offer.id}`}
                position={[parseFloat(offer.latitude), parseFloat(offer.longitude)]}
                icon={offerIcon}
                eventHandlers={{
                  click: () => handleMarkerClick({ ...offer, type: "offer" }),
                }}
              >
                <Popup>
                  <div className="marker-popup">
                    <h3>{offer.title}</h3>
                    <p className="marker-type">Offer</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Render need markers */}
          {filteredNeeds.map((need) => {
            if (!need.latitude || !need.longitude) return null;
            return (
              <Marker
                key={`need-${need.id}`}
                position={[parseFloat(need.latitude), parseFloat(need.longitude)]}
                icon={needIcon}
                eventHandlers={{
                  click: () => handleMarkerClick({ ...need, type: "need" }),
                }}
              >
                <Popup>
                  <div className="marker-popup">
                    <h3>{need.title}</h3>
                    <p className="marker-type">Need</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Single item marker for detail pages */}
          {singleItem && singleItem.latitude && singleItem.longitude && (
            <Marker
              position={[
                typeof singleItem.latitude === 'string' ? parseFloat(singleItem.latitude) : singleItem.latitude,
                typeof singleItem.longitude === 'string' ? parseFloat(singleItem.longitude) : singleItem.longitude
              ]}
              icon={singleItem.type === "offer" || !singleItem.type ? offerIcon : needIcon}
            >
              <Popup>
                <div className="marker-popup">
                  <h3>{singleItem.title}</h3>
                  <p className="marker-type">{singleItem.type === "offer" || !singleItem.type ? "Offer" : "Need"}</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Bottom Info Card - only show if not single item and showInfoCard is true */}
      {showInfoCard && selectedItem && !singleItem && (
        <div className="map-info-card-inline">
          <div className="info-card-content">
            <h3 className="info-card-title">{selectedItem.title}</h3>
            <p className="info-card-type">
              {selectedItem.type === "offer" ? "Offer" : "Need"}
            </p>
            <p className="info-card-description">
              {selectedItem.description && selectedItem.description.length > 100
                ? `${selectedItem.description.substring(0, 100)}...`
                : selectedItem.description || ""}
            </p>
            {selectedItem.location && (
              <p className="info-card-location">📍 {selectedItem.location}</p>
            )}
            <button
              className="see-details-button"
              onClick={handleSeeDetails}
            >
              See Details →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Map;

