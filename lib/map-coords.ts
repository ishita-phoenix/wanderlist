/**
 * Ensure Leaflet [lat, lng] order. Photon/OSM sometimes expose lon/lat swapped in bad data.
 */
export function normalizeLatLng(lat: number, lng: number): [number, number] | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const inLatRange = (v: number) => Math.abs(v) <= 90
  const inLngRange = (v: number) => Math.abs(v) <= 180

  if (inLatRange(lat) && inLngRange(lng)) return [lat, lng]
  if (inLatRange(lng) && inLngRange(lat)) return [lng, lat]
  return null
}
