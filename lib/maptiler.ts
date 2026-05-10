/**
 * MapTiler Cloud URLs (tiles + geocoding). Keys are passed in by callers — typically from `publicEnv`.
 */

export const MAPTILER_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'

/** Leaflet XYZ template for MapTiler Streets raster (256px tiles). */
export function mapTilerRasterTilesUrl(apiKey: string): string {
  return `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${encodeURIComponent(apiKey)}`
}

/** MapTiler Forward Geocoding API URL. */
export function mapTilerGeocodeUrl(
  query: string,
  apiKey: string,
  options: { limit?: number; types?: string } = {}
): string {
  const limit = options.limit ?? 10
  const types = options.types ? `&types=${options.types}` : ""
  return `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${encodeURIComponent(apiKey)}&limit=${limit}${types}`
}
