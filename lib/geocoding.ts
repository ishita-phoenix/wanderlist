/**
 * Client-side geocoding helpers (MapTiler when configured, else Nominatim).
 */

import { publicEnv } from "@/lib/env-public"
import { mapTilerGeocodeUrl } from "@/lib/maptiler"

/** Bounding box for Photon / bounded search: minLon, minLat, maxLon, maxLat (WGS84). */
export type CityBoundingBox = {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
}

/** City bbox from Nominatim (for Photon `bbox` + deduping search to the selected city). */
export async function geocodeCityBoundingBox(
  city: string,
  country: string
): Promise<CityBoundingBox | null> {
  const q = `${city}, ${country}`.trim()
  const nom = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "Wanderlist/1.0 (https://github.com/)",
      },
    }
  )
  if (!nom.ok) return null
  const rows = await nom.json()
  const row = rows?.[0]
  if (!row) return null
  const bb = row.boundingbox as string[] | undefined
  if (bb && bb.length >= 4) {
    const south = Number(bb[0])
    const north = Number(bb[1])
    const west = Number(bb[2])
    const east = Number(bb[3])
    if ([south, north, west, east].every(Number.isFinite)) {
      return { minLon: west, minLat: south, maxLon: east, maxLat: north }
    }
  }
  const lat = Number(row.lat)
  const lon = Number(row.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const d = 0.18
  return {
    minLon: lon - d,
    minLat: lat - d,
    maxLon: lon + d,
    maxLat: lat + d,
  }
}

/** City center [lat, lng] for default map view. */
export async function geocodeCityCenter(city: string, country: string): Promise<[number, number] | null> {
  const key = publicEnv.mapTilerKey
  if (key) {
    const res = await fetch(mapTilerGeocodeUrl(`${city}, ${country}`, key, { limit: 1 }))
    if (res.ok) {
      const data = await res.json()
      const center = data?.features?.[0]?.center
      if (center?.length >= 2) return [Number(center[1]), Number(center[0])]
    }
  }
  const nom = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(`${city}, ${country}`)}`
  )
  if (!nom.ok) return null
  const rows = await nom.json()
  if (!rows?.[0]) return null
  return [Number(rows[0].lat), Number(rows[0].lon)]
}
