/**
 * Browser-only public config (`NEXT_PUBLIC_*`).
 * Set in the project root `.env` or `.env.local` (see `.env.example`).
 * Django secrets live in `backend/.env` — do not put `NEXT_PUBLIC_*` there; Next.js does not read backend env.
 */

export const publicEnv = {
  /**
   * Same-origin `/api` (default) is rewritten to Django by Next when not using static export (see next.config.mjs).
   * For `NEXT_STATIC_EXPORT=1`, set this to your live API, e.g. `https://your-server.example.com/api`.
   */
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    (process.env.NEXT_STATIC_EXPORT === "1" ? "http://127.0.0.1:8000/api" : "/api"),
  mapTilerKey:
    process.env.NEXT_PUBLIC_MAPTILER_KEY?.trim() ||
    process.env.NEXT_PUBLIC_MAPTILER_API_KEY?.trim() ||
    "",
} as const
