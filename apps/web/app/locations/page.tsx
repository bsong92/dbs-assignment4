"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

type Location = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  radius_km: number;
  min_magnitude: number;
};

export default function LocationsPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radiusKm, setRadiusKm] = useState("250");
  const [minMag, setMinMag] = useState("0");
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchLocations = useCallback(async () => {
    const res = await fetch("/api/locations");
    if (res.ok) setLocations(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
    if (isLoaded && isSignedIn) fetchLocations();
  }, [isLoaded, isSignedIn, router, fetchLocations]);

  function useMyLocation() {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(4));
        setLng(pos.coords.longitude.toFixed(4));
        if (!label) setLabel("My Location");
        setGeoLoading(false);
      },
      () => {
        setError("Could not get location. Please enter coordinates manually.");
        setGeoLoading(false);
      }
    );
  }

  async function addLocation(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius_km: parseFloat(radiusKm),
        min_magnitude: parseFloat(minMag),
      }),
    });
    if (res.ok) {
      setLabel(""); setLat(""); setLng(""); setRadiusKm("250"); setMinMag("0");
      await fetchLocations();
    } else {
      const { error: msg } = await res.json();
      setError(msg ?? "Failed to save location");
    }
    setSaving(false);
  }

  async function deleteLocation(id: string) {
    await fetch(`/api/locations/${id}`, { method: "DELETE" });
    setLocations((prev) => prev.filter((l) => l.id !== id));
  }

  if (!isLoaded || loading) {
    return <div className="text-gray-400 py-20 text-center">Loading…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-1">My Locations</h1>
      <p className="text-gray-400 text-base mb-8">
        Earthquakes near these locations will appear at the top of your feed.
      </p>

      {/* Add form */}
      <form onSubmit={addLocation} className="bg-gray-900 rounded-xl p-6 mb-8 space-y-4">
        <h2 className="font-semibold text-xl">Add a location</h2>

        <div>
          <label className="block text-base text-gray-400 mb-1">Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Chicago"
            required
            className="w-full bg-gray-800 rounded px-3 py-2 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-base text-gray-400 mb-1">Latitude</label>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="41.8781"
              required
              type="number"
              step="any"
              className="w-full bg-gray-800 rounded px-3 py-2 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-base text-gray-400 mb-1">Longitude</label>
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="-87.6298"
              required
              type="number"
              step="any"
              className="w-full bg-gray-800 rounded px-3 py-2 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={useMyLocation}
          disabled={geoLoading}
          className="text-base text-orange-400 hover:text-orange-300 disabled:opacity-50 transition-colors"
        >
          {geoLoading ? "Getting location…" : "📍 Use my current location"}
        </button>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-base text-gray-400 mb-1">Radius (km)</label>
            <input
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value)}
              type="number"
              min="50"
              max="5000"
              className="w-full bg-gray-800 rounded px-3 py-2 text-base text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-base text-gray-400 mb-1">Min magnitude</label>
            <input
              value={minMag}
              onChange={(e) => setMinMag(e.target.value)}
              type="number"
              min="0"
              max="10"
              step="0.5"
              className="w-full bg-gray-800 rounded px-3 py-2 text-base text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-base">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium py-3 rounded text-base transition-colors"
        >
          {saving ? "Saving…" : "Add location"}
        </button>
      </form>

      {/* Saved locations */}
      {locations.length === 0 ? (
        <p className="text-gray-500 text-base text-center py-8">
          No locations saved yet. Add one above to get a personalized feed.
        </p>
      ) : (
        <ul className="space-y-3">
          {locations.map((loc) => (
            <li key={loc.id} className="bg-gray-900 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-base">{loc.label}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)} · {loc.radius_km} km radius · M{loc.min_magnitude}+
                </p>
              </div>
              <button
                onClick={() => deleteLocation(loc.id)}
                className="text-gray-500 hover:text-red-400 transition-colors text-base"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
