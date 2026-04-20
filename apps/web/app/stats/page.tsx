"use client";

import { useEffect, useState } from "react";
import { createPublicClient } from "@/lib/supabase-client";

type Earthquake = {
  id: string;
  magnitude: number;
  place: string;
  occurred_at: string;
};

type MagnitudeRange = "< 2.0" | "2.0 - 3.9" | "4.0 - 4.9" | "5.0 - 5.9" | "6.0+";

export default function StatsPage() {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createPublicClient();

  useEffect(() => {
    const fetchEarthquakes = async () => {
      const { data } = await supabase
        .from("earthquakes")
        .select("id,magnitude,place,occurred_at")
        .order("occurred_at", { ascending: false });
      if (data) setEarthquakes(data as Earthquake[]);
      setLoading(false);
    };
    fetchEarthquakes();
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading stats…</div>;

  // Calculate stats
  const total = earthquakes.length;
  const largest = earthquakes.length > 0 ? earthquakes.reduce((max, eq) => eq.magnitude > max.magnitude ? eq : max) : null;

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
      <h1 className="text-3xl font-bold mb-8">Earthquake Statistics</h1>

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

      {/* Magnitude distribution */}
      <div className="bg-gray-900 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Magnitude Distribution</h2>
        <div className="space-y-3">
          {Object.entries(magDist).map(([range, count]) => {
            const percent = earthquakes.length > 0 ? (count / earthquakes.length) * 100 : 0;
            return (
              <div key={range}>
                <div className="flex justify-between text-sm mb-1">
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
        <h2 className="text-xl font-bold mb-4">Most Active Regions</h2>
        <ul className="space-y-2">
          {topRegions.map(([region, count], idx) => (
            <li key={region} className="flex items-center justify-between text-sm">
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
