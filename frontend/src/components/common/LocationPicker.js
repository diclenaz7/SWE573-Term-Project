import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LocationPicker.css";

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

function LocationPicker({ onLocationSelect, initialLat, initialLng }) {
  const [position, setPosition] = useState(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const [mapCenter, setMapCenter] = useState([40.7128, -74.006]); // Default to NYC
  const [address, setAddress] = useState("");

  const reverseGeocode = async (lat, lng) => {
    try {
      // Using Nominatim (OpenStreetMap's geocoding service)
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
        setAddress(data.display_name);
        onLocationSelect({
          latitude: lat,
          longitude: lng,
          address: data.display_name,
        });
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
    }
  };

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPos = [pos.coords.latitude, pos.coords.longitude];
          setMapCenter(userPos);
          if (!position) {
            setPosition(userPos);
            reverseGeocode(userPos[0], userPos[1]);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (position) {
      reverseGeocode(position[0], position[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPos = [pos.coords.latitude, pos.coords.longitude];
          setPosition(userPos);
          setMapCenter(userPos);
          reverseGeocode(userPos[0], userPos[1]);
        },
        (error) => {
          alert("Unable to get your location. Please select a location on the map.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className="location-picker-container">
      <div className="location-picker-controls">
        <button
          type="button"
          className="use-current-location-button"
          onClick={handleUseCurrentLocation}
        >
          📍 Use Current Location
        </button>
        <p className="location-picker-hint">
          Click on the map to select a location
        </p>
      </div>
      <div className="location-picker-map">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: "300px", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>
      {address && (
        <div className="selected-location">
          <strong>Selected Location:</strong> {address}
        </div>
      )}
    </div>
  );
}

export default LocationPicker;

