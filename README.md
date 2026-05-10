# Wanderlist

Scrapbook-style trip planner: pick interests, build city boards, discover places, and generate day-by-day schedules from Django—with **per-account saves** (lists, preferences, itinerary sync to the server).

## What it does

- **Profile** — Toggle travel interests (food, museums, nature, etc.); used when ranking discover results and boosting itinerary picks.
- **City boards** — Create lists per destination and **search** for venues inside the city (browser-side Photon + Nominatim, bounded by city bbox).
- **Discover** — Curated suggestions from the Django **`/discover/`** API when online (Photon/Nominatim-backed aggregation server-side); otherwise similar fallback logic runs in the client.
- **Save places** — Optional **`/popularity/`** scoring (Foursquare-style ratings when configured; otherwise scales star ratings to a 0–100 score).
- **Build itinerary** — Sends your queued places and dates to Django **`/build/`**, which packs days using wake/sleep windows, visit durations, **popularity + interest** bias, travel times (**OpenRouteService** matrix when a key is set, otherwise **haversine** estimates), and fixed gaps between stops.
- **Maps** — Leaflet map views with OpenStreetMap tiles by default; optional **MapTiler** for nicer basemaps/geocoding.

## Accounts & data

- **Register / sign in / sign out** — Django users + **token auth**; the SPA stores the token and sends `Authorization: Token …` on **`/state/`** only.
- **Saved state** — One JSON blob per user (preferences, city lists, itinerary). Works out of the box with SQLite locally; on Render, add **PostgreSQL** + **`DATABASE_URL`** if you need data to survive redeploys.

## Stack

| Layer | Tech |
|--------|------|
| UI | Next.js (App Router), React, Tailwind, shadcn-style UI |
| API | Django + Django REST Framework |
| Auth | `rest_framework.authtoken` |

## Local development

From the **repo root** (starts Django on `:8000` and Next on `:3000`; Next proxies **`/api`** to Django in dev):

```bash
npm install
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
cp .env.example .env.local
cd backend && python manage.py migrate && cd ..
npm run dev
```

Open **`http://localhost:3000`**. API directly: **`http://127.0.0.1:8000/api/`** — health check: **`GET /api/health/`**.

**Environment:** Browser-facing vars (`NEXT_PUBLIC_*`) belong in **`.env.local`** at the repo root. Django secrets (`DJANGO_*`, optional API keys) belong in **`backend/.env`** only.

For frontend-only dev (two terminals): **`npm run dev:api`** and **`npm run dev:next`**.

## Optional backend keys (`backend/.env`)

| Variable | Effect if set |
|----------|----------------|
| `OPENROUTESERVICE_API_KEY` | Driving/walking **duration matrix** between stops for itinerary routing |
| `FOURSQUARE_API_KEY` | Stronger discover data + server popularity lookups |
| `OPENAI_API_KEY` | Short “why visit” hints on discover cards and an optional itinerary summary paragraph |

If these are omitted, the app still runs using free geospatial fallbacks and heuristic ratings.

## Frontend-only map key (repo root `.env.local`)

| Variable | Effect |
|----------|--------|
| `NEXT_PUBLIC_MAPTILER_KEY` | MapTiler tiles / geocoding helpers in the browser |

Without it, maps use **OSM** raster tiles.

## Deploying (Render)

This repo includes a **`render.yaml`** blueprint idea: separate **web** services for the Django API and the Next.js app, with **`BACKEND_URL`** wiring Next’s server-side **`/api`** rewrite to Django. Set **`DATABASE_URL`** on the backend service when using Render Postgres. Details vary by dashboard—see **`docs/postgresql-on-render.md`** for attaching Postgres.

Any static host only needs a built Next export **and** a public API URL via **`NEXT_PUBLIC_API_BASE_URL`**; you don’t need GitHub Pages if everything lives on Render.

## Attribution

Place imagery may come from Wikimedia, Openverse, Foursquare photos, or OSM-related services—check respective licenses before production reuse.
