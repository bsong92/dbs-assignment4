"use client";

import { useEffect, useState } from "react";
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
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radiusKm, setRadiusKm] = useState("250");
  const [minMag, setMinMag] = useState("0");
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRadius, setEditRadius] = useState("");
  const [editMinMag, setEditMinMag] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    let cancelled = false;

    async function loadLocations() {
      const res = await fetch("/api/locations");
      if (!cancelled && res.ok) {
        setLocations(await res.json());
      }
      if (!cancelled) {
        setLoading(false);
      }
    }

    void loadLocations();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, router]);

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

  async function geocodeAddress() {
    if (!address.trim()) return;
    setGeoLoading(true);
    setError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        setLat(parseFloat(data[0].lat).toFixed(4));
        setLng(parseFloat(data[0].lon).toFixed(4));
        if (!label) setLabel(address);
        setAddress("");
      } else {
        setError("Address not found. Try another search.");
      }
    } catch {
      setError("Could not search address. Please try again.");
    }
    setGeoLoading(false);
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
      const refreshed = await fetch("/api/locations");
      if (refreshed.ok) {
        setLocations(await refreshed.json());
      }
    } else {
      const { error: msg } = await res.json();
      setError(msg ?? "Failed to save location");
    }
    setSaving(false);
  }

  function startEditing(loc: Location) {
    setEditingId(loc.id);
    setEditRadius(loc.radius_km.toString());
    setEditMinMag(loc.min_magnitude.toString());
  }

  async function saveEdit() {
    if (!editingId) return;
    setEditSaving(true);
    const res = await fetch(`/api/locations/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        radius_km: parseFloat(editRadius),
        min_magnitude: parseFloat(editMinMag),
      }),
    });
    if (res.ok) {
      setLocations((prev) =>
        prev.map((l) =>
          l.id === editingId
            ? { ...l, radius_km: parseFloat(editRadius), min_magnitude: parseFloat(editMinMag) }
            : l
        )
      );
      setEditingId(null);
    }
    setEditSaving(false);
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
      <h1 className="text-3xl font-bold text-white mb-2">My Locations</h1>
      <p className="text-cyan-200 text-base font-semibold mb-8">
        Save your favorite places and track earthquakes nearby in real time.
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

        <div>
          <label className="block text-base text-gray-400 mb-1">Search by address</label>
          <div className="flex gap-2">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && geocodeAddress()}
              placeholder="e.g. Seoul, South Korea"
              className="flex-1 bg-gray-800 rounded px-3 py-2 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <button
              type="button"
              onClick={geocodeAddress}
              disabled={geoLoading || !address.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-base transition-colors"
            >
              {geoLoading ? "Searching…" : "🔍"}
            </button>
          </div>
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
            <li key={loc.id} className="bg-gray-900 rounded-xl px-5 py-4">
              {editingId === loc.id ? (
                <>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <p className="font-bold text-lg text-white">{loc.label}</p>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-500 hover:text-gray-400 transition-colors text-base"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Radius (km)</label>
                      <input
                        value={editRadius}
                        onChange={(e) => setEditRadius(e.target.value)}
                        type="number"
                        min="50"
                        max="5000"
                        className="w-full bg-gray-800 rounded px-3 py-2 text-base text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Min magnitude</label>
                      <input
                        value={editMinMag}
                        onChange={(e) => setEditMinMag(e.target.value)}
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        className="w-full bg-gray-800 rounded px-3 py-2 text-base text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={editSaving}
                        className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium py-2 rounded text-base transition-colors"
                      >
                        {editSaving ? "Saving…" : "Save"}
                      </button>
                      {confirmDeleteId === loc.id ? (
                        <>
                          <button
                            onClick={() => deleteLocation(loc.id)}
                            className="bg-red-600 hover:bg-red-500 text-white font-medium px-3 py-2 rounded text-base transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="bg-gray-700 hover:bg-gray-600 text-white font-medium px-3 py-2 rounded text-base transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(loc.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors px-3 py-2 rounded border border-gray-700"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <p className="font-bold text-lg text-white">{loc.label}</p>
                    <div className="flex gap-6">
                      <button
                        onClick={() => startEditing(loc)}
                        className="text-gray-500 hover:text-orange-400 transition-colors text-base shrink-0"
                      >
                        Edit
                      </button>
                      {confirmDeleteId === loc.id ? (
                        <>
                          <button
                            onClick={() => deleteLocation(loc.id)}
                            className="text-red-400 hover:text-red-300 transition-colors text-base shrink-0 font-medium"
                          >
                            Confirm delete?
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-gray-500 hover:text-gray-400 transition-colors text-base shrink-0"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(loc.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors text-base shrink-0"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                    <div>
                      <span className="text-gray-500">📍 Coordinates:</span>
                      <p>{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">📏 Radius:</span>
                      <p>{loc.radius_km} km</p>
                    </div>
                    <div>
                      <span className="text-gray-500">📊 Min Magnitude:</span>
                      <p>M{loc.min_magnitude}+</p>
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
