# Earthquake Tracker — System Architecture

## Overview
A multi-service real-time earthquake monitoring system. A background worker polls the USGS Earthquake Feed every 60 seconds, writes to Supabase, and a Next.js frontend displays updates live via Supabase Realtime. Users authenticate with Clerk and save locations to get personalized, filtered earthquake feeds.

## Data Flow
```
USGS Earthquake API (free, no key)
        ↓ polls every 60s
apps/worker/  →  Railway (Node.js long-running process)
        ↓ upserts via SUPABASE_SERVICE_ROLE_KEY
Supabase (Postgres + Realtime on earthquakes table)
        ↓ WebSocket push on INSERT/UPDATE
apps/web/  →  Vercel (Next.js App Router + Tailwind)
        ↑ Clerk auth, API routes for user data
```

## Monorepo Structure
```
dbs-assignment4/
  CLAUDE.md              ← this file
  AGENTS.md              ← same content for Codex/other agents
  apps/
    web/                 ← Next.js + Tailwind → deploys to Vercel
    worker/              ← Node.js script → deploys to Railway
```

## Services

### apps/worker/ (Railway)
- Node.js script, no HTTP server, no framework
- Polls `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson` every 60s
- Uses recursive `setTimeout` (not `setInterval`) to prevent poll overlap
- Upserts into `earthquakes` table using `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- Deletes earthquakes older than 30 days on each poll (retention)
- Logs: poll start, count fetched, count upserted, errors (never crashes)

### apps/web/ (Vercel)
- Next.js App Router, TypeScript, Tailwind CSS
- Auth: Clerk (`@clerk/nextjs`)
- Database reads: Supabase anon key for public `earthquakes` table
- User data: API routes (`/api/locations`) protected by Clerk, using service role key
- Realtime: `supabase.channel('earthquakes')` subscription for live feed updates

## Database (Supabase)

### earthquakes table
- `id` text PRIMARY KEY — USGS event ID
- `magnitude` double precision
- `place` text
- `lat`, `lng` double precision
- `depth_km` double precision
- `occurred_at` timestamptz
- `source_updated_at` timestamptz
- `ingested_at` timestamptz DEFAULT now()
- `usgs_url` text
- RLS: public read | Realtime: enabled | Index: occurred_at DESC

### user_locations table
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `user_id` text NOT NULL — Clerk user ID
- `label` text NOT NULL
- `lat`, `lng` double precision NOT NULL
- `radius_km` double precision DEFAULT 250
- `min_magnitude` double precision DEFAULT 0
- `created_at` timestamptz DEFAULT now()
- RLS: disabled — enforced at API route layer | Index: user_id

## Auth Pattern
Clerk handles authentication. `user_locations` is accessed only through Next.js API routes that verify Clerk session server-side and use the Supabase service role key. The `earthquakes` table is publicly readable with the anon key — no auth required to see earthquakes.

## Environment Variables

| Platform | Variable | Purpose |
|---|---|---|
| Vercel | NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| Vercel | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY | Public read access (earthquakes) |
| Vercel | SUPABASE_SERVICE_ROLE_KEY | API routes write user_locations |
| Vercel | NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk frontend key |
| Vercel | CLERK_SECRET_KEY | Clerk server-side key |
| Railway | SUPABASE_URL | Worker database connection |
| Railway | SUPABASE_SERVICE_ROLE_KEY | Worker bypasses RLS to upsert |

## Key Concepts
- **Worker uses service role key** — it's infrastructure, not a user. RLS would block it with the anon key.
- **Frontend uses anon key** — for public earthquake reads only. User data goes through API routes.
- **Upsert with onConflict: 'id'** — same earthquake updated many times; insert if new, update if exists.
- **Realtime INSERT vs UPDATE** — handled separately in the client to avoid duplicates in local state.
- **Haversine distance** — computed client-side to filter earthquakes near user's saved locations.
