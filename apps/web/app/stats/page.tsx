"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { createPublicClient } from "@/lib/supabase-client";
import { haversineKm } from "@/lib/haversine";

type Earthquake = {
  id: string;
  magnitude: number;
  place: string;
  occurred_at: string;
  lat: number;
  lng: number;
  depth_km: number;
};

type UserLocation = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  radius_km: number;
  min_magnitude: number;
};

type MagnitudeRange = "< 2.0" | "2.0 - 3.9" | "4.0 - 4.9" | "5.0 - 5.9" | "6.0+";
type ClosestEarthquake = {
  earthquake: Earthquake;
  location: UserLocation;
  distance: number;
};

function findClosestEarthquake(
  earthquakes: Earthquake[],
  userLocations: UserLocation[]
): ClosestEarthquake | null {
  let closest: ClosestEarthquake | null = null;

  for (const earthquake of earthquakes) {
    for (const location of userLocations) {
      const distance = haversineKm(earthquake.lat, earthquake.lng, location.lat, location.lng);
      if (!closest || distance < closest.distance) {
        closest = { earthquake, location, distance };
      }
    }
  }

  return closest;
}

export default function StatsPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createPublicClient();
      const { data } = await supabase
        .from("earthquakes")
        .select("id,magnitude,place,occurred_at,lat,lng,depth_km")
        .order("occurred_at", { ascending: false });
      if (data) setEarthquakes(data as Earthquake[]);

      if (isSignedIn) {
        const res = await fetch("/api/locations");
        if (res.ok) {
          setUserLocations(await res.json());
        }
      }
      setLoading(false);
    };
    if (isLoaded) fetchData();
  }, [isLoaded, isSignedIn]);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading stats…</div>;

  // Calculate stats
  const total = earthquakes.length;
  const largest = earthquakes.length > 0 ? earthquakes.reduce((max, eq) => eq.magnitude > max.magnitude ? eq : max) : null;

  // Depth statistics
  const depths = earthquakes.map(eq => eq.depth_km);
  const avgDepth = depths.length > 0 ? (depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(1) : "—";
  const maxDepth = depths.length > 0 ? Math.max(...depths).toFixed(1) : "—";
  const minDepth = depths.length > 0 ? Math.min(...depths).toFixed(1) : "—";

  // Your locations stats (if logged in)
  let nearbyCount = 0;
  let matchedCount = 0;

  if (isSignedIn && userLocations.length > 0) {
    earthquakes.forEach(eq => {
      userLocations.forEach(loc => {
        const dist = haversineKm(eq.lat, eq.lng, loc.lat, loc.lng);
        if (dist <= loc.radius_km) {
          nearbyCount++;
          if (eq.magnitude >= loc.min_magnitude) {
            matchedCount++;
          }
        }
      });
    });
  }

  const closestEqCard =
    isSignedIn && userLocations.length > 0
      ? findClosestEarthquake(earthquakes, userLocations)
      : null;

  // Most active region (first 3 words of place name)
  const regions = new Map<string, number>();
  earthquakes.forEach((eq) => {
    const region = eq.place.split(",").pop()?.trim() || "Unknown";
    regions.set(region, (regions.get(region) || 0) + 1);
  });
  const topRegions = Array.from(regions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Magnitude distribution
  const magDist: Record<MagnitudeRange, number> = {
    "< 2.0": 0,
    "2.0 - 3.9": 0,
    "4.0 - 4.9": 0,
    "5.0 - 5.9": 0,
    "6.0+": 0,
  };
  earthquakes.forEach((eq) => {
    if (eq.magnitude < 2.0) magDist["< 2.0"]++;
    else if (eq.magnitude < 4.0) magDist["2.0 - 3.9"]++;
    else if (eq.magnitude < 5.0) magDist["4.0 - 4.9"]++;
    else if (eq.magnitude < 6.0) magDist["5.0 - 5.9"]++;
    else magDist["6.0+"]++;
  });

  const avgMagnitude = earthquakes.length > 0
    ? (earthquakes.reduce((sum, eq) => sum + eq.magnitude, 0) / earthquakes.length).toFixed(2)
    : "—";

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Earthquake Statistics</h1>
      <p className="text-purple-200 text-base font-semibold mb-8">
        Global seismic activity insights and trends.
      </p>

      {/* Top stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 rounded-xl p-6">
          <p className="text-xs text-gray-400 uppercase">Total (24h)</p>
          <p className="text-4xl font-bold text-white mt-2">{total}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6">
          <p className="text-xs text-gray-400 uppercase">Largest</p>
          <p className="text-4xl font-bold text-orange-400 mt-2">M{largest?.magnitude.toFixed(1)}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6">
          <p className="text-xs text-gray-400 uppercase">Average Mag</p>
          <p className="text-4xl font-bold text-white mt-2">M{avgMagnitude}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6">
          <p className="text-xs text-gray-400 uppercase">Most Active</p>
          <p className="text-xl font-bold text-blue-400 mt-2 truncate">{topRegions[0]?.[0] || "—"}</p>
        </div>
      </div>

      {/* Depth statistics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 rounded-xl p-6">
          <p className="text-xs text-gray-400 uppercase">Average Depth</p>
          <p className="text-3xl font-bold text-cyan-400 mt-2">{avgDepth} km</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6">
          <p className="text-xs text-gray-400 uppercase">Deepest</p>
          <p className="text-3xl font-bold text-red-400 mt-2">{maxDepth} km</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6">
          <p className="text-xs text-gray-400 uppercase">Shallowest</p>
          <p className="text-3xl font-bold text-green-400 mt-2">{minDepth} km</p>
        </div>
      </div>

      {/* Your locations stats */}
      {isSignedIn && userLocations.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Your Locations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Near your locations</p>
              <p className="text-3xl font-bold text-white">{nearbyCount}</p>
              <p className="text-xs text-gray-500">in last 24h</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Matched alerts</p>
              <p className="text-3xl font-bold text-orange-400">{matchedCount}</p>
              <p className="text-xs text-gray-500">above your threshold</p>
            </div>
            {closestEqCard ? (
              <div>
                <p className="text-sm text-gray-400 mb-1">Closest earthquake</p>
                <p className="text-2xl font-bold text-cyan-400">M{closestEqCard.earthquake.magnitude.toFixed(1)}</p>
                <p className="text-xs text-gray-500">{closestEqCard.distance.toFixed(0)}km from {closestEqCard.location.label}</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Magnitude distribution */}
      <div className="bg-gray-900 rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Magnitude Distribution</h2>
        <div className="space-y-3">
          {Object.entries(magDist).map(([range, count]) => {
            const percent = earthquakes.length > 0 ? (count / earthquakes.length) * 100 : 0;
            return (
              <div key={range}>
                <div className="flex justify-between text-base mb-1">
                  <span className="text-gray-300">M{range}</span>
                  <span className="text-gray-400">{count}</span>
                </div>
                <div className="w-full bg-gray-800 rounded h-2">
                  <div
                    className="bg-blue-600 h-2 rounded transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top regions */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4">Most Active Regions</h2>
        <ul className="space-y-2">
          {topRegions.map(([region, count], idx) => (
            <li key={region} className="flex items-center justify-between text-base">
              <span className="text-gray-300">
                {idx + 1}. {region}
              </span>
              <span className="text-blue-400 font-medium">{count} quakes</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
