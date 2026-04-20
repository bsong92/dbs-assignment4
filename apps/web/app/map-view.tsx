"use client";

import { MapContainer, TileLayer, CircleMarker, Circle, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Earthquake = {
  id: string;
  magnitude: number;
  place: string;
  lat: number;
  lng: number;
  depth_km: number;
  occurred_at: string;
  usgs_url: string;
};

type UserLocation = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  radius_km: number;
  min_magnitude: number;
};

interface MapViewProps {
  earthquakes: Earthquake[];
  userLocations: UserLocation[];
}

function getMagnitudeColor(magnitude: number): string {
  if (magnitude >= 6.0) return "#ef4444";
  if (magnitude >= 5.0) return "#f97316";
  if (magnitude >= 4.0) return "#eab308";
  if (magnitude >= 2.0) return "#22c55e";
  return "#6b7280";
}

function getMagnitudeRadius(magnitude: number): number {
  return Math.max(4, Math.min(14, magnitude * 2));
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function MapView({ earthquakes, userLocations }: MapViewProps) {

  return (
    <div className="rounded-xl overflow-hidden border border-amber-600/20">
      <MapContainer center={[20, 0]} zoom={2} style={{ height: "600px", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* User location watch zones */}
        {userLocations.map((loc) => (
          <Circle
            key={loc.id}
            center={[loc.lat, loc.lng]}
            radius={loc.radius_km * 1000}
            color="rgb(59, 130, 246)"
            fillColor="rgb(59, 130, 246)"
            fillOpacity={0.15}
            weight={2}
          >
            <Popup>
              <div className="text-sm">
                <strong>{loc.label}</strong>
                <p className="text-xs text-gray-600">{loc.radius_km}km radius</p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Earthquakes */}
        {earthquakes.map((eq) => (
          <CircleMarker
            key={eq.id}
            center={[eq.lat, eq.lng]}
            radius={getMagnitudeRadius(eq.magnitude)}
            color={getMagnitudeColor(eq.magnitude)}
            fillColor={getMagnitudeColor(eq.magnitude)}
            fillOpacity={0.8}
            weight={2}
          >
            <Popup>
              <div className="text-sm max-w-xs">
                <div className="font-bold mb-1">M{eq.magnitude.toFixed(1)} — {eq.place}</div>
                <p className="text-xs text-gray-600 mb-2">
                  {timeAgo(eq.occurred_at)} · {eq.depth_km.toFixed(0)}km deep
                </p>
                <a
                  href={eq.usgs_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  View on USGS →
                </a>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
