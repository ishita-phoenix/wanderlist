"use client"

import { TileLayer } from "react-leaflet"
import { MapTilerEnglishBasemap } from "@/components/maptiler-basemap"
import { publicEnv } from "@/lib/env-public"
import { OSM_RASTER_TILE_URL, OSM_TILE_ATTRIBUTION } from "@/lib/osm"

/** MapTiler (English vector + raster) when `NEXT_PUBLIC_MAPTILER_KEY` is set; otherwise OSM. */
export function BasemapLayer() {
  const key = publicEnv.mapTilerKey
  if (key) return <MapTilerEnglishBasemap apiKey={key} />
  return <TileLayer attribution={OSM_TILE_ATTRIBUTION} url={OSM_RASTER_TILE_URL} />
}
