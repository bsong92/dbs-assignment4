"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { createPublicClient } from "@/lib/supabase-client";
import { haversineKm } from "@/lib/haversine";

type Earthquake = {
  id: string;
  magnitude: number;
  place: string;
  lat: number;
  lng: number;
  depth_km: number;
  occurred_at: string;
  usgs_url: string;
  distanceKm?: number;
};

type UserLocation = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  radius_km: number;
  min_magnitude: number;
};

function magnitudeColor(mag: number) {
  if (mag >= 6.0) return { dot: "bg-red-500", badge: "bg-red-900/60 text-red-300 ring-red-700" };
  if (mag >= 5.0) return { dot: "bg-orange-500", badge: "bg-orange-900/60 text-orange-300 ring-orange-700" };
  if (mag >= 4.0) return { dot: "bg-yellow-500", badge: "bg-yellow-900/60 text-yellow-300 ring-yellow-700" };
  if (mag >= 2.0) return { dot: "bg-green-500", badge: "bg-green-900/60 text-green-300 ring-green-700" };
  return { dot: "bg-gray-500", badge: "bg-gray-800 text-gray-400 ring-gray-700" };
}

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function nearestLocation(eq: Earthquake, locations: UserLocation[]) {
  if (!locations.length) return null;
  let best: { label: string; distKm: number } | null = null;
  for (const loc of locations) {
    const d = haversineKm(eq.lat, eq.lng, loc.lat, loc.lng);
    if (!best || d < best.distKm) best = { label: loc.label, distKm: d };
  }
  return best;
}

function matchesLocationCriteria(eq: Earthquake, locations: UserLocation[]): UserLocation | null {
  if (!locations.length) return null;
  for (const loc of locations) {
    const dist = haversineKm(eq.lat, eq.lng, loc.lat, loc.lng);
    if (dist <= loc.radius_km && eq.magnitude >= loc.min_magnitude) return loc;
  }
  return null;
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900 rounded-xl px-5 py-4 animate-pulse">
      <div className="flex gap-4">
        <div className="w-16 h-16 bg-gray-800 rounded"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-800 rounded w-3/4"></div>
          <div className="h-3 bg-gray-800 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
}

function MagnitudeLegend() {
  return (
    <div className="bg-gray-900 rounded-xl p-4 mb-6">
      <p className="text-base font-semibold text-gray-300 mb-3">📊 Magnitude Scale</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gray-500"></div>
          <span className="text-sm text-gray-400">M &lt; 2.0</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-green-500"></div>
          <span className="text-sm text-gray-400">2.0 - 3.9</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-yellow-500"></div>
          <span className="text-sm text-gray-400">4.0 - 4.9</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-orange-500"></div>
          <span className="text-sm text-gray-400">5.0 - 5.9</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-red-500"></div>
          <span className="text-sm text-gray-400">6.0+</span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isLoaded, isSignedIn } = useUser();
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"global" | "locations">("global");
  const [minMagnitude, setMinMagnitude] = useState(0);
  const [sortBy, setSortBy] = useState<"recent" | "magnitude" | "distance">("recent");
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  const supabase = createPublicClient();

  const fetchLocations = useCallback(async () => {
    if (!isSignedIn) return;
    const res = await fetch("/api/locations");
    if (res.ok) setUserLocations(await res.json());
  }, [isSignedIn]);

  const fetchEarthquakes = useCallback(async () => {
    const { data } = await supabase
      .from("earthquakes")
      .select("id,magnitude,place,lat,lng,depth_km,occurred_at,usgs_url")
      .order("occurred_at", { ascending: false })
      .limit(100);
    if (data) {
      setEarthquakes(data as Earthquake[]);
      setLastUpdate(new Date());
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchEarthquakes();
  }, [fetchEarthquakes]);

  useEffect(() => {
    if (isLoaded) fetchLocations();
  }, [isLoaded, fetchLocations]);

  useEffect(() => {
    if (userLocations.length > 0 && selectedLocationIds.length === 0) {
      setSelectedLocationIds(userLocations.map((loc) => loc.id));
    }
  }, [userLocations]);

  useEffect(() => {
    if (isSignedIn && userLocations.length > 0 && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        setNotifEnabled(true);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          setNotifEnabled(perm === "granted");
        });
      }
    }
  }, [isSignedIn, userLocations.length]);

  useEffect(() => {
    const channel = supabase
      .channel("earthquakes-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "earthquakes" },
        (payload) => {
          const eq = payload.new as Earthquake;
          setEarthquakes((prev) => {
            const updated = [eq, ...prev];
            return updated.slice(0, 100);
          });
          setLastUpdate(new Date());

          if (notifEnabled && userLocations.length > 0) {
            const matchedLoc = matchesLocationCriteria(eq, userLocations);
            if (matchedLoc && "Notification" in window) {
              new Notification(`⚡ Earthquake M${eq.magnitude.toFixed(1)} near ${matchedLoc.label}`, {
                body: `${eq.place} · ${eq.depth_km.toFixed(0)} km deep`,
                icon: "🌍",
                tag: eq.id,
              });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "earthquakes" },
        (payload) => {
          setEarthquakes((prev) =>
            prev.map((eq) => (eq.id === (payload.new as Earthquake).id ? (payload.new as Earthquake) : eq))
          );
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter based on view mode and magnitude
  const activeLocations = userLocations.filter((loc) => selectedLocationIds.includes(loc.id));
  let filtered = (viewMode === "locations" && activeLocations.length > 0
    ? earthquakes.filter((eq) =>
        activeLocations.some(
          (loc) =>
            haversineKm(eq.lat, eq.lng, loc.lat, loc.lng) <= loc.radius_km &&
            eq.magnitude >= loc.min_magnitude
        )
      )
    : earthquakes).filter((eq) => eq.magnitude >= minMagnitude);

  // Sort
  if (sortBy === "magnitude") {
    filtered = [...filtered].sort((a, b) => b.magnitude - a.magnitude);
  } else if (sortBy === "distance" && viewMode === "locations" && userLocations.length > 0) {
    filtered = [...filtered].sort((a, b) => {
      const distA = Math.min(...userLocations.map((loc) => haversineKm(a.lat, a.lng, loc.lat, loc.lng)));
      const distB = Math.min(...userLocations.map((loc) => haversineKm(b.lat, b.lng, loc.lat, loc.lng)));
      return distA - distB;
    });
  }
  // "recent" is default (already sorted by occurred_at DESC from query)

  const displayed = filtered.slice(0, 50);

  return (
    <div>
      {/* Hero section (only show when signed out or on first view) */}
      {!isSignedIn && !loading && (
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-xl p-8 mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">Track Live Earthquakes</h2>
          <p className="text-lg text-gray-300 mb-4">Save your favorite locations and get instant alerts when earthquakes occur nearby.</p>
          <div className="flex gap-3">
            <a href="/sign-up" className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors">
              Sign up free
            </a>
            <a href="/sign-in" className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors">
              Sign in
            </a>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {viewMode === "locations" ? "Earthquakes Near Your Locations" : "Global Earthquake Feed"}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {viewMode === "locations"
              ? userLocations.length > 0
                ? `Filtering by ${userLocations.length} saved location${userLocations.length > 1 ? "s" : ""}`
                : "Add locations to personalize your feed"
              : "All earthquakes worldwide"}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0 mt-1">
          {isSignedIn && userLocations.length > 0 && (
            <div
              className={`px-2 py-1 rounded ${
                notifEnabled ? "bg-green-900/30 text-green-400" : "bg-gray-800 text-gray-500"
              }`}
            >
              {notifEnabled ? "🔔 Alerts on" : "🔕 Alerts off"}
            </div>
          )}
          {lastUpdate && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live · {timeAgo(lastUpdate.toISOString())}
            </div>
          )}
        </div>
      </div>

      {/* View toggle (only show if signed in with locations) */}
      {isSignedIn && userLocations.length > 0 && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setViewMode("global")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "global"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Live Feed
          </button>
          <button
            onClick={() => setViewMode("locations")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "locations"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Near My Locations
          </button>
        </div>
      )}

      {/* Location filter (only show in "Near My Locations" view) */}
      {viewMode === "locations" && userLocations.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => {
              if (selectedLocationIds.length === userLocations.length) {
                setSelectedLocationIds([]);
              } else {
                setSelectedLocationIds(userLocations.map((loc) => loc.id));
              }
            }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedLocationIds.length === userLocations.length
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            All Locations
          </button>
          {userLocations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => {
                setSelectedLocationIds((prev) =>
                  prev.includes(loc.id) ? prev.filter((id) => id !== loc.id) : [...prev, loc.id]
                );
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedLocationIds.includes(loc.id)
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              📍 {loc.label}
            </button>
          ))}
        </div>
      )}

      {/* Magnitude legend */}
      {!loading && earthquakes.length > 0 && <MagnitudeLegend />}

      {/* Filters: Magnitude slider + Sort */}
      <div className="bg-gray-900 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              🔍 Minimum Magnitude
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="7"
                step="0.1"
                value={minMagnitude}
                onChange={(e) => setMinMagnitude(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-white font-semibold min-w-[3rem]">M{minMagnitude.toFixed(1)}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              📊 Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "recent" | "magnitude" | "distance")}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none"
            >
              <option value="recent">Recent</option>
              <option value="magnitude">Magnitude (Strongest First)</option>
              {viewMode === "locations" && userLocations.length > 0 && (
                <option value="distance">Distance (Closest First)</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Empty state: No saved locations */}
      {isSignedIn && viewMode === "locations" && userLocations.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-5xl mb-3">📍</p>
          <p className="text-lg font-medium text-white">No locations saved yet</p>
          <p className="text-gray-400 mt-2 mb-6">Save your favorite places to see earthquakes near them in real time.</p>
          <a href="/locations" className="inline-block px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors">
            Add a location
          </a>
        </div>
      )}

      {/* Empty state: No matching earthquakes */}
      {displayed.length === 0 && !loading && userLocations.length > 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🌬️</p>
          <p className="font-medium text-white">No earthquakes match your filters</p>
          <p className="text-sm text-gray-400 mt-2">Try lowering the magnitude threshold or adjusting your location radius in </p>
          {viewMode === "locations" && (
            <a href="/locations" className="text-orange-400 hover:text-orange-300 font-medium">My Locations</a>
          )}
        </div>
      )}

      {/* Loading state with skeleton cards */}
      {loading && (
        <div className="space-y-2">
          <div className="py-4">
            <p className="text-gray-500 text-sm mb-4">Loading earthquakes…</p>
          </div>
          {[...Array(5)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Feed */}
      <ul className="space-y-2">
        {displayed.map((eq) => {
          const colors = magnitudeColor(eq.magnitude);
          const near = nearestLocation(eq, userLocations);
          return (
            <li key={eq.id}>
              <a
                href={eq.usgs_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-gray-900 hover:bg-gray-800 rounded-xl px-5 py-4 transition-colors group"
              >
                {/* Magnitude badge */}
                <div className={`shrink-0 text-center rounded-lg px-3 py-1.5 font-bold text-lg ring-1 min-w-[4rem] ${colors.badge}`}>
                  M{eq.magnitude.toFixed(1)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-base truncate text-white">{eq.place}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {timeAgo(eq.occurred_at)} · {eq.depth_km.toFixed(0)} km deep
                    {near && (
                      <span className="ml-2 text-orange-400">
                        · {Math.round(near.distKm)} km from {near.label}
                      </span>
                    )}
                  </p>
                </div>

                <span className="text-gray-600 group-hover:text-gray-400 text-xs shrink-0">↗</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
