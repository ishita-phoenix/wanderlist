import type { Activity } from "@/app/page"
import { resolvedApiUrl } from "@/lib/resolved-api-url"

export type PopularitySource = "foursquare" | "foursquare_listing" | "client_stars"

type PopularityApiResponse = {
  popularityScore: number
  source: string
  foursquareRating?: number | null
}

/** Prefer client rating stars for scaling when numeric rating is unusable */
const DEFAULT_STAR_RATING = 4.2

function clampClientRatingStars(rating: unknown): number {
  const r = Number(rating)
  if (!Number.isFinite(r) || r <= 0) return DEFAULT_STAR_RATING
  return Math.max(0, Math.min(5, r))
}

/**
 * True when `popularityScore` was resolved and should not be blindly recomputed.
 * We treat explicit `0` without a source as “unset” (bad API / stale data) so callers can enrich again.
 */
export function activityHasStoredPopularity(activity: Activity): boolean {
  const s = activity.popularityScore
  if (typeof s !== "number" || !Number.isFinite(s)) return false
  if (s > 0) return true
  return Boolean(activity.popularitySource)
}

/**
 * When the card already came from Foursquare search/discover, `rating` here is FSQ÷2 on a 0–5★ style scale,
 * derived from Places `rating` (~0–10). Map back to 0–100 without another API round-trip.
 * Returns null when FSQ omitted a usable rating — caller should POST `/popularity/` instead.
 */
function scoreFromEmbeddedFoursquareListing(activity: Activity): number | null {
  const r = Number(activity.rating)
  if (!Number.isFinite(r) || r <= 0) return null
  return Math.min(100, Math.max(0, Math.round(r * 20)))
}

/**
 * Saving a place: resolve `popularityScore` from Django → Foursquare Places star-like `rating` when configured,
 * else scale the activity's star column (clientRating, 0–5) into 0–100.
 */
export async function enrichActivityWithPopularity(
  activity: Activity,
  city: string,
  country: string,
  signal?: AbortSignal
): Promise<Activity> {
  if (activityHasStoredPopularity(activity)) {
    return activity
  }

  if (String(activity.id || "").startsWith("fsq-")) {
    const embedded = scoreFromEmbeddedFoursquareListing(activity)
    if (embedded !== null) {
      return {
        ...activity,
        popularityScore: embedded,
        popularitySource: "foursquare_listing",
      }
    }
  }

  const clientRating = clampClientRatingStars(activity.rating)

  try {
    const res = await fetch(resolvedApiUrl("/popularity/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: activity.name,
        city,
        country: country || "",
        lat: activity.lat ?? null,
        lng: activity.lng ?? null,
        clientRating,
      }),
      signal,
    })
    const data = (await res.json().catch(() => ({}))) as Partial<PopularityApiResponse>
    const score =
      typeof data.popularityScore === "number" && Number.isFinite(data.popularityScore)
        ? data.popularityScore
        : Math.min(100, Math.max(0, Math.round(clientRating * 20)))

    const src = data.source === "foursquare" ? "foursquare" : "client_stars"

    return {
      ...activity,
      popularityScore: score,
      popularitySource: src,
    }
  } catch {
    return {
      ...activity,
      popularityScore: Math.min(100, Math.max(0, Math.round(clientRating * 20))),
      popularitySource: "client_stars",
    }
  }
}
