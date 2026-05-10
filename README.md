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

### Troubleshooting: “Planning API is not reachable (HTTP 502)”

That means **Next.js is running but Django is not** on `127.0.0.1:8000`, so the dev **`/api` proxy** has nothing to talk to.

1. Use **`npm run dev`** from the repo root (starts **both**). Don’t run only **`npm run dev:next`** unless Django is already up (`npm run dev:api` in another terminal).
2. On a **new machine**, create the venv and migrate **before** `npm run dev`:
   ```bash
   python3 -m venv .venv
   .venv/bin/pip install -r backend/requirements.txt
   cd backend && ../.venv/bin/python manage.py migrate && cd ..
   ```
   On Windows, use `.venv\Scripts\pip` and `.venv\Scripts\python` instead of `.venv/bin/…`.
3. Confirm Django responds: open **`http://127.0.0.1:8000/api/health/`** — you should see `{"ok": true}`.

`npm run dev:api` uses **`scripts/dev-api.cjs`**, which prefers **`.venv`** Python when present, then **`python3` / `python`** on your PATH.

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

Blueprint **`render.yaml`**: **backend** service + **Next** service. The Next **build** sets **`NEXT_PUBLIC_API_BASE_URL`** from **`BACKEND_URL`** (`https://…onrender.com/api`) so the **browser calls Django over HTTPS from any device** (no reliance on same-host `/api` rewrites in production). Django enables **`CORS_ALLOW_ALL_ORIGINS`** for that cross-origin traffic.

If you created services manually (no Blueprint), set on the **frontend** service at **build** time:  
`NEXT_PUBLIC_API_BASE_URL=https://<your-backend-name>.onrender.com/api`

Set **`DATABASE_URL`** on the backend when using Render Postgres — see **`docs/postgresql-on-render.md`**.

## Attribution

Place imagery may come from Wikimedia, Openverse, Foursquare photos, or OSM-related services—check respective licenses before production reuse.
