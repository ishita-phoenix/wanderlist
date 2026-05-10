import { Activity, CityList, Itinerary, TravelPreferences } from "@/app/page"
import { geocodeCityBoundingBox, type CityBoundingBox } from "@/lib/geocoding"
import { resolvedApiUrl } from "@/lib/resolved-api-url"

function apiHint(): string {
  return "Run npm run dev (starts Django on :8000 and Next together). Frontend-only npm run dev:next needs npm run dev:api separately."
}

function looksLikeProxyUnreachable(status: number, body: string): boolean {
  if (status >= 502) return true
  const t = body.slice(0, 800).toUpperCase()
  return t.includes("ECONNREFUSED") || t.includes("CONNECT FAILED") || body.includes("connect ECONNREFUSED")
}

function looksLikeAppendSlashCrash(body: string): boolean {
  return body.includes("APPEND_SLASH") && body.includes("RuntimeError")
}

type PostOptions = { signal?: AbortSignal; token?: string }

async function post<T>(path: string, payload: unknown, options?: PostOptions): Promise<T> {
  const url = resolvedApiUrl(path)
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (options?.token) headers.Authorization = `Token ${options.token}`
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: options?.signal,
    })
  } catch {
    throw new Error(`Cannot reach the planning API (${url}). ${apiHint()}`)
  }
  if (!res.ok) {
    const raw = await res.text().catch(() => "")
    if (looksLikeAppendSlashCrash(raw)) {
      throw new Error(
        `Planning API mismatch (trailing-slash / old Django server). Restart with: npm run dev — pulls latest Django routes. Raw: ${raw.slice(0, 120)}…`
      )
    }
    if (looksLikeProxyUnreachable(res.status, raw)) {
      throw new Error(`Planning API is not reachable (HTTP ${res.status}; Django may be stopped). ${apiHint()}`)
    }
    let msg = `API ${path} failed with ${res.status}`
    try {
      const j = JSON.parse(raw) as { detail?: unknown }
      if (j.detail != null) msg += `: ${typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail)}`
    } catch {
      if (raw.trim()) msg += `: ${raw.trim().slice(0, 200)}`
    }
    throw new Error(msg)
  }
  return res.json()
}

function normPlaceName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ")
}

/** Drop duplicate venues (same id, or same rounded coords + name). */
function dedupeSearchResults(items: Activity[]): Activity[] {
  const seenId = new Set<string>()
  const seenLoc = new Set<string>()
  const out: Activity[] = []
  for (const a of items) {
    if (a.id) {
      if (seenId.has(a.id)) continue
      seenId.add(a.id)
    }
    const lat = a.lat ?? NaN
    const lng = a.lng ?? NaN
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}|${normPlaceName(a.name || "")}`
    if (seenLoc.has(key)) continue
    seenLoc.add(key)
    out.push(a)
  }
  return out
}

/** After ranking: one hit per ~100m cell so nearby clutter (e.g. promenade vs bridge) does not stack. */
function dedupeSpatialAfterRank(items: Activity[], decimals = 3): Activity[] {
  const seen = new Set<string>()
  const out: Activity[] = []
  for (const a of items) {
    const lat = a.lat ?? NaN
    const lng = a.lng ?? NaN
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const cell = `${lat.toFixed(decimals)},${lng.toFixed(decimals)}`
    if (seen.has(cell)) continue
    seen.add(cell)
    out.push(a)
  }
  return out
}

function isPhotonNoise(osmKey: string, osmValue: string, query: string): boolean {
  const k = osmKey.toLowerCase()
  const v = osmValue.toLowerCase()
  const q = query.toLowerCase()
  if (["highway", "railway", "aerialway", "boundary", "source"].includes(k)) return true
  if (k === "waterway" && v !== "waterfall") return true
  if (k === "natural" && ["tree", "tree_row", "scrub", "wood", "coastline"].includes(v)) return true
  if (k === "landuse" && v !== "retail") return true
  if (
    k === "amenity" &&
    ["parking", "parking_space", "bicycle_parking", "toilets", "bench", "waste_basket"].includes(v)
  )
    return true
  if (k === "leisure" && (v === "promenade" || v === "slipway" || v === "track") && !q.includes(v)) return true
  return false
}

function passesNameGate(name: string, query: string, osmKey: string, osmValue: string): boolean {
  const nl = name.toLowerCase()
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (nl.includes(q)) return true
  const tokens = q.split(/\s+/).filter((t) => t.length > 1)
  if (tokens.length <= 1) return true

  const key = osmKey.toLowerCase()
  const val = osmValue.toLowerCase()
  const strongType =
    ["tourism", "historic", "natural"].includes(key) ||
    (key === "amenity" && ["museum", "theatre", "place_of_worship"].includes(val)) ||
    (key === "leisure" && ["park", "nature_reserve"].includes(val)) ||
    (key === "man_made" && val === "bridge")

  const hits = tokens.filter((t) => nl.includes(t)).length
  if (strongType && hits >= 1) return true
  return hits >= Math.ceil(tokens.length * 0.65)
}

function osmTypeBoost(a: Activity): number {
  const k = (a.osmKey || "").toLowerCase()
  const v = (a.osmValue || "").toLowerCase()
  let s = 0
  if (k === "tourism" && ["attraction", "museum", "viewpoint", "gallery", "artwork", "theme_park", "zoo"].includes(v))
    s += 38
  if (k === "historic") s += 34
  if (k === "amenity" && ["museum", "theatre", "library", "place_of_worship"].includes(v)) s += 30
  if (k === "natural" && ["peak", "waterfall", "beach"].includes(v)) s += 22
  if (k === "leisure" && ["park", "nature_reserve", "garden"].includes(v)) s += 16
  if (k === "man_made" && v === "bridge") s += 42
  if (k === "shop" || k === "building") s += 4
  if (k === "highway" || k === "railway" || k === "waterway") s -= 60
  if (k === "leisure" && ["promenade", "track", "pitch", "playground"].includes(v)) s -= 28
  if (k === "amenity" && ["parking", "bench", "toilets"].includes(v)) s -= 40
  return s
}

function pointInBbox(lon: number, lat: number, bbox: CityBoundingBox): boolean {
  return (
    lon >= bbox.minLon &&
    lon <= bbox.maxLon &&
    lat >= bbox.minLat &&
    lat <= bbox.maxLat
  )
}

function photonOsmToCategory(osmKey: string, osmValue: string): string {
  const k = `${osmKey}:${osmValue}`.toLowerCase()
  if (/(museum|gallery|artwork)/.test(k)) return "museums"
  if (/(restaurant|cafe|fast_food|bar|pub|food)/.test(k)) return "food"
  if (/(park|garden|forest|nature|beach)/.test(k)) return "nature"
  if (/(shop|mall|marketplace|department_store)/.test(k)) return "shopping"
  if (/(historic|castle|ruins|archaeological|monument|memorial)/.test(k)) return "history"
  return "landmarks"
}

const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Wanderlist/1.0 (https://github.com/)",
} as const

function nominatimClassToCategory(classType: string): string {
  const c = classType.toLowerCase()
  if (/(museum|gallery)/.test(c)) return "museums"
  if (/(restaurant|cafe|food|bar)/.test(c)) return "food"
  if (/(park|garden|nature)/.test(c)) return "nature"
  if (/(shop|mall|market)/.test(c)) return "shopping"
  if (/(historic|castle|heritage)/.test(c)) return "history"
  return "landmarks"
}

function nominatimRowToActivity(
  row: Record<string, unknown>,
  city: string,
  country: string,
  idx: number,
  bbox: CityBoundingBox | null
): Activity | null {
  const lat = Number(row.lat)
  const lng = Number(row.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (bbox && !pointInBbox(lng, lat, bbox)) return null
  const name = String(row.name || (String(row.display_name || "").split(",")[0] || "")).trim()
  if (!name) return null
  const pid = row.place_id != null ? `nom-${row.place_id}` : `nom-${idx}-${lat}-${lng}`
  const classType = `${row.class || ""}:${row.type || ""}`
  const cat = nominatimClassToCategory(classType)
  return {
    id: String(pid),
    name,
    description: `Place in ${city}.`,
    image: "",
    category: cat,
    duration: "1-2 hours",
    rating: 4.1,
    address: String(row.display_name || `${city}, ${country}`.trim()),
    lat,
    lng,
    osmKey: String(row.class || ""),
    osmValue: String(row.type || ""),
  }
}

/** Photon forward search inside a city bbox (browser → komoot public instance). */
async function searchPhotonWithBBox(
  city: string,
  country: string,
  query: string,
  bbox: CityBoundingBox,
  signal?: AbortSignal
): Promise<Activity[]> {
  const u = new URL("https://photon.komoot.io/api/")
  u.searchParams.set("q", query.trim())
  u.searchParams.set("limit", "45")
  u.searchParams.set("bbox", `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`)
  u.searchParams.set("lang", "en")
  let res: Response
  try {
    res = await fetch(u.toString(), { signal })
  } catch {
    return []
  }
  if (!res.ok) return []
  const data = (await res.json()) as {
    features?: Array<{
      geometry?: { type?: string; coordinates?: number[] }
      properties?: Record<string, string | number | undefined>
    }>
  }
  const features = data.features || []
  const out: Activity[] = []
  let idx = 0
  for (const feat of features) {
    if (feat.geometry?.type !== "Point") continue
    const coords = feat.geometry?.coordinates
    if (!coords || coords.length < 2) continue
    const lon = Number(coords[0])
    const lat = Number(coords[1])
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
    if (!pointInBbox(lon, lat, bbox)) continue
    const props = feat.properties || {}
    const name = String(props.name || "").trim()
    if (!name) continue
    const osmKey = String(props.osm_key || "")
    const osmVal = String(props.osm_value || "")
    if (isPhotonNoise(osmKey, osmVal, query.trim())) continue
    if (!passesNameGate(name, query.trim(), osmKey, osmVal)) continue

    const osmId = props.osm_id
    const osmType = String(props.osm_type || "x")
    const id =
      osmId != null && String(osmId) !== ""
        ? `photon-${osmType}-${osmId}`
        : `photon-${lon.toFixed(5)}-${lat.toFixed(5)}-${idx}`
    const cat = photonOsmToCategory(osmKey, osmVal)
    const street = String(props.street || "")
    const hn = String(props.housenumber || "")
    const line = [street, hn].filter(Boolean).join(" ").trim()
    const locality = String(props.city || props.town || props.village || props.locality || "")
    const addr =
      [line, locality, String(props.postcode || ""), country || String(props.country || "")]
        .filter(Boolean)
        .join(", ") || `${city}, ${country}`.trim()
    out.push({
      id,
      name,
      description: `Found in ${city}.`,
      image: "",
      category: cat,
      duration: "1-2 hours",
      rating: Math.min(5, 3.7 + (name.length % 13) / 10),
      address: addr,
      lat,
      lng: lon,
      osmKey,
      osmValue: osmVal,
    })
    idx += 1
  }
  return dedupeSearchResults(out)
}

/** Nominatim search restricted to viewbox (same bbox as Photon). */
async function searchNominatimInBbox(
  city: string,
  country: string,
  query: string,
  bbox: CityBoundingBox,
  signal?: AbortSignal
): Promise<Activity[]> {
  const viewbox = `${bbox.minLon},${bbox.maxLat},${bbox.maxLon},${bbox.minLat}`
  const u = new URL("https://nominatim.openstreetmap.org/search")
  u.searchParams.set("format", "jsonv2")
  u.searchParams.set("addressdetails", "1")
  u.searchParams.set("bounded", "1")
  u.searchParams.set("viewbox", viewbox)
  u.searchParams.set("limit", "20")
  u.searchParams.set("q", `${query} ${city}`.trim())
  let res: Response
  try {
    res = await fetch(u.toString(), { signal, headers: NOMINATIM_HEADERS })
  } catch {
    return []
  }
  if (!res.ok) return []
  const rows = (await res.json()) as Record<string, unknown>[]
  const out: Activity[] = []
  rows.forEach((row, idx) => {
    const a = nominatimRowToActivity(row, city, country, idx, bbox)
    if (!a) return
    if (isPhotonNoise(a.osmKey || "", a.osmValue || "", query)) return
    if (!passesNameGate(a.name, query, a.osmKey || "", a.osmValue || "")) return
    out.push(a)
  })
  return dedupeSearchResults(out)
}

/** Last-resort Nominatim free-text search (still biased by query including city). */
async function searchNominatimLoose(
  city: string,
  country: string,
  query: string,
  signal?: AbortSignal
): Promise<Activity[]> {
  const q = `${query}, ${city}, ${country}`.trim()
  const u = new URL("https://nominatim.openstreetmap.org/search")
  u.searchParams.set("format", "jsonv2")
  u.searchParams.set("addressdetails", "1")
  u.searchParams.set("limit", "15")
  u.searchParams.set("q", q)
  let res: Response
  try {
    res = await fetch(u.toString(), { signal, headers: NOMINATIM_HEADERS })
  } catch {
    return []
  }
  if (!res.ok) return []
  const rows = (await res.json()) as Record<string, unknown>[]
  const cityL = city.toLowerCase()
  const countryL = (country || "").toLowerCase()
  const out: Activity[] = []
  const qLower = query.trim().toLowerCase()
  const tokens = qLower.split(/\s+/).filter((t) => t.length > 1)

  rows.forEach((row, idx) => {
    const text = `${row.display_name || ""} ${row.name || ""}`.toLowerCase()
    if (cityL && !text.includes(cityL) && countryL && !text.includes(countryL)) return
    const imp = Number(row.importance ?? 0)
    if (tokens.length >= 2 && imp < 0.2 && !String(row.name || "").toLowerCase().includes(qLower)) return

    const a = nominatimRowToActivity(row, city, country, idx, null)
    if (!a) return
    if (isPhotonNoise(a.osmKey || "", a.osmValue || "", query)) return
    if (!passesNameGate(a.name, query, a.osmKey || "", a.osmValue || "")) return
    out.push(a)
  })
  return dedupeSearchResults(out)
}

/** Rank like a maps picker: landmark-type OSM tags + exact / phrase name match first. */
function rankByQueryRelevance(query: string, items: Activity[]): Activity[] {
  const q = query.trim().toLowerCase()
  if (!q || !items.length) return items
  const tokens = q.split(/\s+/).filter((t) => t.length > 1)

  const score = (a: Activity) => {
    const name = (a.name || "").toLowerCase()
    const addr = (a.address || "").toLowerCase()
    let s = osmTypeBoost(a) + a.rating * 0.12

    if (name === q) s += 140
    else if (name.startsWith(q)) s += 110
    else if (name.includes(q)) s += 85

    let nameHits = 0
    for (const t of tokens) {
      if (name.includes(t)) {
        nameHits += 1
        s += 14
      } else if (addr.includes(t)) {
        s += 2
      }
    }
    if (tokens.length >= 2 && nameHits < tokens.length) {
      s -= (tokens.length - nameHits) * 18
    }
    if (tokens[0] && name.startsWith(tokens[0])) s += 12
    return s
  }

  return [...items].sort((a, b) => score(b) - score(a))
}

const DEFAULT_DISCOVER_QUERIES = [
  "museum",
  "landmark",
  "historic",
  "park",
  "restaurant",
  "viewpoint",
]

/**
 * When the backend discover endpoint is empty or unavailable, aggregate
 * several city-scoped Photon searches (via searchPlaces).
 */
async function discoverFromSearchFallback(
  city: string,
  country: string,
  preferences: TravelPreferences,
  limit: number
): Promise<Activity[]> {
  const active = (Object.entries(preferences) as [keyof TravelPreferences, boolean][])
    .filter(([, v]) => v)
    .map(([k]) => k)

  const queries =
    active.length > 0
      ? [
          ...active.map((k) => String(k)),
          ...active.map((k) => `${k} ${city}`),
          ...DEFAULT_DISCOVER_QUERIES,
        ]
      : [...DEFAULT_DISCOVER_QUERIES, `things to do ${city}`]

  const seen = new Set<string>()
  const out: Activity[] = []

  for (const q of queries) {
    if (out.length >= limit) break
    try {
      const batch = await searchPlaces(city, country, q)
      for (const a of batch) {
        const key = `${a.lat?.toFixed(5)}-${a.lng?.toFixed(5)}-${a.name}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push(a)
        if (out.length >= limit) break
      }
    } catch {
      continue
    }
  }

  return out.sort((a, b) => b.rating - a.rating).slice(0, limit)
}

export type SearchPlacesOptions = {
  signal?: AbortSignal
}

/**
 * City-scoped place search entirely in the browser (Photon + Nominatim fallbacks).
 * Django is not involved — only used for persisted user state elsewhere.
 */
export async function searchPlaces(
  city: string,
  country: string,
  query: string,
  options?: SearchPlacesOptions
): Promise<Activity[]> {
  const signal = options?.signal
  const trimmed = query.trim()
  if (!trimmed) return []

  const bbox = await geocodeCityBoundingBox(city, country)
  let items: Activity[] = []
  if (bbox) {
    items = await searchPhotonWithBBox(city, country, trimmed, bbox, signal)
    if (!items.length) {
      items = await searchNominatimInBbox(city, country, trimmed, bbox, signal)
    }
  }
  if (!items.length) {
    items = await searchNominatimLoose(city, country, trimmed, signal)
  }

  if (!items.length) return []
  const merged = dedupeSearchResults(items)
  const ranked = rankByQueryRelevance(trimmed, merged)
  const spaced = dedupeSpatialAfterRank(ranked, 3)
  return spaced.slice(0, 8)
}

export async function registerAccount(payload: {
  email: string
  password: string
  name?: string
}): Promise<{ token: string; userId: string; email: string; name: string }> {
  return post("/auth/register/", payload)
}

export async function loginAccount(payload: {
  email: string
  password: string
}): Promise<{ token: string; userId: string; email: string; name: string }> {
  return post("/auth/login/", payload)
}

export async function logoutAccount(token: string): Promise<void> {
  await post<{ ok: boolean }>("/auth/logout/", {}, { token })
}

export async function discoverPlaces(
  city: string,
  country: string,
  preferences: TravelPreferences
): Promise<Activity[]> {
  try {
    const data = await post<{ results: Activity[] }>("/discover/", {
      city,
      country,
      interests: preferences,
      limit: 12,
    })
    if (data.results?.length) return data.results
  } catch {
    // Offline aggregation below.
  }
  return discoverFromSearchFallback(city, country, preferences, 12)
}

export async function buildItinerary(payload: {
  city: string
  country: string
  startDate: string
  endDate: string
  wakeTime: string
  sleepTime: string
  activities: Activity[]
  preferences?: TravelPreferences
}): Promise<Itinerary> {
  return post<Itinerary>("/build/", payload)
}

export async function loadUserState(token: string): Promise<{
  userId: string
  preferences?: TravelPreferences
  cityLists?: CityList[]
  itinerary?: Itinerary | null
}> {
  try {
    const res = await fetch(resolvedApiUrl("/state/"), {
      headers: { Authorization: `Token ${token}` },
    })
    if (!res.ok) {
      return { userId: "", cityLists: [], itinerary: null }
    }
    return res.json()
  } catch {
    return { userId: "", cityLists: [], itinerary: null }
  }
}

export async function saveUserState(
  payload: {
    userId: string
    preferences: TravelPreferences
    cityLists: CityList[]
    itinerary: Itinerary | null
  },
  token: string
): Promise<void> {
  try {
    await fetch(resolvedApiUrl("/state/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // Keep UI usable when backend is unavailable.
  }
}

