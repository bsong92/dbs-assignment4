import { createClient } from "@supabase/supabase-js";

const USGS_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
const POLL_INTERVAL_MS = 60_000;
const RETENTION_DAYS = 30;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function poll() {
  const start = new Date().toISOString();
  console.log(`[${start}] poll start`);

  try {
    const res = await fetch(USGS_URL);
    if (!res.ok) throw new Error(`USGS returned ${res.status}`);

    const data = await res.json();
    const features = data.features ?? [];

    const earthquakes = features
      .filter((f) => f.properties.mag !== null)
      .map((f) => ({
        id: f.id,
        magnitude: f.properties.mag,
        place: f.properties.place,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        depth_km: f.geometry.coordinates[2],
        occurred_at: new Date(f.properties.time).toISOString(),
        source_updated_at: new Date(f.properties.updated).toISOString(),
        ingested_at: new Date().toISOString(),
        usgs_url: f.properties.url,
      }));

    const { error: upsertError, count } = await supabase
      .from("earthquakes")
      .upsert(earthquakes, { onConflict: "id", count: "exact" });

    if (upsertError) throw upsertError;

    // Retention: delete rows older than RETENTION_DAYS
    const cutoff = new Date(
      Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const { error: deleteError } = await supabase
      .from("earthquakes")
      .delete()
      .lt("occurred_at", cutoff);

    if (deleteError) console.error("retention delete error:", deleteError.message);

    console.log(
      `[${new Date().toISOString()}] poll done: ${features.length} fetched, ${count ?? earthquakes.length} upserted`
    );
  } catch (err) {
    console.error(`[${new Date().toISOString()}] poll failed:`, err.message);
  }

  setTimeout(poll, POLL_INTERVAL_MS);
}

poll();
