# Wanderlist

Cute scrapbook-style trip planner with:
- Next.js frontend UI
- Django API backend
- Free map/search stack (OSM/Nominatim/Overpass/OpenRouteService)

## What is implemented

- City activity search using OpenStreetMap data (Overpass + Nominatim geocoding)
- Discover recommendations weighted by selected interests
- Itinerary generation based on:
  - trip dates
  - wake/sleep hours
  - activity duration
  - popularity/rating bias (higher rated places prioritized)
  - travel-time/proximity optimization
- Real map rendering with OSM tiles (`react-leaflet`)

## Free APIs Used

- [OpenStreetMap / Nominatim](https://nominatim.org/) (free with usage policy)
- [Overpass API](https://overpass-api.de/) (free OSM query endpoint)
- [OpenRouteService](https://openrouteservice.org/) (free tier key, optional but recommended)
- [Openverse](https://openverse.org/) for freely licensed images

## 1) Frontend setup (Next.js)

From project root:

```bash
npm install
cp .env.example .env.local
# Edit .env.local: set NEXT_PUBLIC_API_BASE_URL and optional NEXT_PUBLIC_MAPTILER_KEY (maps + geocoding)
npm run dev
```

App runs at: `http://localhost:3000`

**Env split:** browser keys (`NEXT_PUBLIC_*`) live in the **repo root** `.env` or `.env.local`. Django keys live in **`backend/.env`** only — Next.js never reads `backend/.env`.

## 2) Backend setup (Django)

Django’s entry point is **`backend/manage.py`** — always run `manage.py` commands from the **`backend/`** directory (or pass the path explicitly, e.g. `python backend/manage.py` from the repo root).

From project root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
cd backend
python manage.py migrate
python manage.py runserver 8000
```

API runs at: `http://127.0.0.1:8000`

Health check: `http://127.0.0.1:8000/api/health/`

## 3) OpenRouteService key (recommended)

Without ORS key, travel time uses a distance-based fallback estimate.

To enable better routing:
1. Create a free account at [openrouteservice.org](https://openrouteservice.org/)
2. Generate an API key
3. Put it in `backend/.env`:

```env
OPENROUTESERVICE_API_KEY=your_key_here
```

Restart Django server after changing env values.

## 3b) Optional Foursquare + MapTiler

- Add `FOURSQUARE_API_KEY` in `backend/.env` for richer place search data.
- Add `NEXT_PUBLIC_MAPTILER_KEY` in the **project root** `.env` or `.env.local` (see `.env.example`) for MapTiler basemaps and client geocoding — **not** in `backend/.env`.

If keys are missing:
- Search falls back to OSM (Overpass).
- Map tiles fall back to OpenStreetMap.

## 4) Notes for GitHub Pages hosting

GitHub Pages can host only static frontend files. Django API cannot run on GitHub Pages.

Deploy pattern:
- Host frontend on GitHub Pages (or Vercel/Netlify).
- Host Django backend separately (Render, Railway, Fly.io, etc.).
- Set `NEXT_PUBLIC_API_BASE_URL` in the frontend `.env` or `.env.local` to your deployed backend URL.

## 5) Attribution note

Some city magnet images currently use Wikimedia Commons image URLs in UI. For production, keep an attribution page and verify each asset license terms.
