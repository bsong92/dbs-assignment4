"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { createPublicClient } from "@/lib/supabase-client";
import { haversineKm } from "@/lib/haversine";

const MapView = dynamic(() => import("./map-view"), { ssr: false });

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

const imageCache = new Map<string, string>();

async function fetchEarthquakeImage(magnitude: number, earthquakeId: string): Promise<string> {
  // Cache per earthquake ID (unique image per quake, not just by magnitude)
  const cacheKey = `eq_${earthquakeId}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  try {
    const response = await fetch(`/api/earthquake-image?mag=${magnitude}&id=${encodeURIComponent(earthquakeId)}`);
    if (response.ok) {
      const data = await response.json();
      imageCache.set(cacheKey, data.url);
      return data.url;
    }
  } catch (error) {
    console.error("Failed to fetch earthquake image:", error);
  }
  return "";
}

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

interface EarthquakeCardProps {
  eq: Earthquake;
  colors: ReturnType<typeof magnitudeColor>;
  near: { label: string; distKm: number } | null;
}

function EarthquakeCard({ eq, colors, near }: EarthquakeCardProps) {
  const [imageUrl, setImageUrl] = useState<string>("");

  useEffect(() => {
    fetchEarthquakeImage(eq.magnitude, eq.id).then(setImageUrl);
  }, [eq.magnitude, eq.id]);

  const bgStyle: React.CSSProperties = imageUrl
    ? {
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        backgroundImage: "linear-gradient(135deg, #1a4d6d 0%, #2a7a9d 40%, #1a3a4a 100%)",
      };

  return (
    <li>
      <a
        href={eq.usgs_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-4 rounded-xl px-6 py-5 transition-all group border border-amber-600/20 hover:border-amber-500/40 overflow-hidden relative"
        style={bgStyle}
      >
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/70 to-black/60"></div>

        {/* Magnitude badge */}
        <div className={`shrink-0 text-center rounded-lg px-3 py-2 font-black text-xl ring-2 min-w-[4.5rem] shadow-lg relative z-10 ${colors.badge}`}>
          M{eq.magnitude.toFixed(1)}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 relative z-10">
          <p className="font-bold text-lg truncate text-white drop-shadow-md" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
            {eq.place}
          </p>
          <p className="text-sm text-gray-200 mt-1 font-medium drop-shadow-md" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
            {timeAgo(eq.occurred_at)} · {eq.depth_km.toFixed(0)} km deep
            {near && (
              <span className="ml-2 text-amber-300 font-semibold">
                · {Math.round(near.distKm)} km from {near.label}
              </span>
            )}
          </p>
        </div>

        <span className="text-gray-300 group-hover:text-gray-200 text-lg shrink-0 relative z-10 font-bold">↗</span>
      </a>
    </li>
  );
}

function MagnitudeLegend() {
  return (
    <div className="bg-gradient-to-r from-gray-900/80 to-blue-900/40 rounded-xl p-4 mb-6 border border-cyan-500/20 glow-cyan">
      <p className="text-base font-semibold text-cyan-300 mb-3">📊 Magnitude Scale</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="flex items-center gap-2 cursor-help" title="Micro: Barely felt, detected only by instruments">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-gray-500 to-gray-600 shadow-lg"></div>
          <span className="text-sm text-gray-300">M &lt; 2.0</span>
        </div>
        <div className="flex items-center gap-2 cursor-help" title="Minor: Often felt but rarely causes damage. May rattle dishes and windows.">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/50"></div>
          <span className="text-sm text-green-300">2.0 - 3.9</span>
        </div>
        <div className="flex items-center gap-2 cursor-help" title="Light: Felt by most people. Minor damage possible. Furniture may shift.">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/50"></div>
          <span className="text-sm text-yellow-300">4.0 - 4.9</span>
        </div>
        <div className="flex items-center gap-2 cursor-help" title="Moderate: Strong shaking felt by everyone. Moderate damage. Buildings may suffer cracks.">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/50"></div>
          <span className="text-sm text-orange-300">5.0 - 5.9</span>
        </div>
        <div className="flex items-center gap-2 cursor-help" title="Strong/Major: Violent shaking. Severe damage. Many buildings destroyed. Landslides possible.">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/50"></div>
          <span className="text-sm text-red-300">6.0+</span>
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
  const [viewMode, setViewMode] = useState<"global" | "locations" | "map">("global");
  const [minMagnitude, setMinMagnitude] = useState(0);
  const [sortBy, setSortBy] = useState<"recent" | "magnitude" | "distance">("recent");
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  const [supabase] = useState(() => createPublicClient());

  useEffect(() => {
    let cancelled = false;

    async function loadEarthquakes() {
      const { data } = await supabase
        .from("earthquakes")
        .select("id,magnitude,place,lat,lng,depth_km,occurred_at,usgs_url")
        .order("occurred_at", { ascending: false })
        .limit(100);

      if (!cancelled && data) {
        setEarthquakes(data as Earthquake[]);
        setLastUpdate(new Date());
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    void loadEarthquakes();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;

    async function loadLocations() {
      if (!isSignedIn) {
        if (!cancelled) {
          setUserLocations([]);
          setSelectedLocationIds([]);
        }
        return;
      }

      const res = await fetch("/api/locations");
      if (!cancelled && res.ok) {
        const locations = (await res.json()) as UserLocation[];
        setUserLocations(locations);
        setSelectedLocationIds((prev) => (prev.length > 0 ? prev : locations.map((loc) => loc.id)));
      }
    }

    void loadLocations();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    let cancelled = false;

    async function syncNotificationPermission() {
      if (!(isSignedIn && userLocations.length > 0 && typeof window !== "undefined" && "Notification" in window)) {
        if (!cancelled) setNotifEnabled(false);
        return;
      }

      if (Notification.permission === "granted") {
        if (!cancelled) setNotifEnabled(true);
        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) setNotifEnabled(false);
        return;
      }

      const perm = await Notification.requestPermission();
      if (!cancelled) setNotifEnabled(perm === "granted");
    }

    void syncNotificationPermission();

    return () => {
      cancelled = true;
    };
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
        <div className="bg-gradient-to-br from-amber-900/40 via-transparent to-orange-900/30 rounded-2xl p-8 mb-8 border border-amber-600/30 glow-amber">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent mb-2">
            Track Live Earthquakes Worldwide
          </h2>
          <p className="text-lg text-amber-100 mb-6">Save locations, get instant alerts, and stay informed about seismic activity near you.</p>
          <div className="flex gap-3">
            <Link href="/sign-up" className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-lg transition-all shadow-lg shadow-amber-500/50">
              Start Tracking Free
            </Link>
            <Link href="/sign-in" className="px-6 py-3 bg-cyan-900/40 hover:bg-cyan-900/60 text-cyan-200 font-medium rounded-lg transition-colors border border-cyan-500/30">
              Sign In
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {viewMode === "locations" ? "Earthquakes Near Your Locations" : "Global Earthquake Feed"}
          </h1>
          <p className={`text-base mt-2 font-semibold ${
            viewMode === "locations"
              ? "text-gray-300"
              : "text-amber-200"
          }`}>
            {viewMode === "locations"
              ? userLocations.length > 0
                ? `Filtering by ${userLocations.length} saved location${userLocations.length > 1 ? "s" : ""}`
                : "Add locations to personalize your feed"
              : "Real-time seismic activity from around the world"}
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
          <button
            onClick={() => setViewMode("map")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "map"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Map
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
      <div className="bg-gradient-to-r from-cyan-900/30 via-gray-900/40 to-blue-900/30 rounded-xl p-4 mb-6 border border-cyan-500/30 glow-cyan">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-cyan-300 mb-2">
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

      {/* Map or Feed */}
      {viewMode === "map" ? (
        <MapView earthquakes={displayed} userLocations={userLocations} />
      ) : (
        <ul className="space-y-2">
          {displayed.map((eq) => (
            <EarthquakeCard key={eq.id} eq={eq} colors={magnitudeColor(eq.magnitude)} near={nearestLocation(eq, userLocations)} />
          ))}
        </ul>
      )}
    </div>
  );
}
