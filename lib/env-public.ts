/**
 * Browser-only public config (`NEXT_PUBLIC_*`).
 * Set in the project root `.env` or `.env.local` (see `.env.example`).
 * Django secrets live in `backend/.env` — do not put `NEXT_PUBLIC_*` there; Next.js does not read backend env.
 */

export const publicEnv = {
  /**
   * - Local dev: omit → `/api` (Next rewrites to Django via next.config.mjs + BACKEND_URL / localhost).
   * - Production (e.g. Render): set at build to `https://your-django-service.onrender.com/api` so every
   *   browser talks to Django directly (CORS on Django). Same-origin `/api` proxy is unreliable across machines if rewrites baked wrong.
   */
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    (process.env.NEXT_STATIC_EXPORT === "1" ? "http://127.0.0.1:8000/api" : "/api"),
  mapTilerKey:
    process.env.NEXT_PUBLIC_MAPTILER_KEY?.trim() ||
    process.env.NEXT_PUBLIC_MAPTILER_API_KEY?.trim() ||
    "",
} as const
