"use client"

import { useMap } from "react-leaflet"
import { useEffect, useRef, useState } from "react"
import { TileLayer } from "react-leaflet"
import type { Layer } from "leaflet"
import { MAPTILER_TILE_ATTRIBUTION, mapTilerRasterTilesUrl } from "@/lib/maptiler"

type MaptilerLayerInstance = Layer & {
  remove: () => Layer
  on: (type: string, fn: () => void) => MaptilerLayerInstance
}

/**
 * MapTiler basemap: English vector when WebGL loads; raster tiles underneath until then or on failure.
 */
export function MapTilerEnglishBasemap({ apiKey }: { apiKey: string }) {
  const map = useMap()
  const layerRef = useRef<MaptilerLayerInstance | null>(null)
  const [vectorReady, setVectorReady] = useState(false)
  const [vectorFailed, setVectorFailed] = useState(false)

  useEffect(() => {
    setVectorReady(false)
    setVectorFailed(false)
  }, [apiKey])

  useEffect(() => {
    if (!apiKey || vectorFailed) return

    let cancelled = false

    void (async () => {
      try {
        const [{ MaptilerLayer }, { Language, MapStyle }] = await Promise.all([
          import("@maptiler/leaflet-maptilersdk"),
          import("@maptiler/sdk"),
        ])
        if (cancelled) return

        const layer = new MaptilerLayer({
          apiKey,
          style: MapStyle.STREETS,
          language: Language.ENGLISH,
        }) as MaptilerLayerInstance

        layer.on("ready", () => {
          if (!cancelled) {
            setVectorReady(true)
            map.invalidateSize()
          }
        })

        layer.addTo(map)
        layerRef.current = layer
      } catch (err) {
        console.error("MapTiler vector basemap failed:", err)
        if (!cancelled) setVectorFailed(true)
      }
    })()

    return () => {
      cancelled = true
      if (layerRef.current) {
        try {
          layerRef.current.remove()
        } catch {
          /* ignore */
        }
        layerRef.current = null
      }
    }
  }, [map, apiKey, vectorFailed])

  const showRaster = !vectorReady || vectorFailed

  return (
    <>
      {showRaster && (
        <TileLayer
          attribution={MAPTILER_TILE_ATTRIBUTION}
          url={mapTilerRasterTilesUrl(apiKey)}
          crossOrigin
        />
      )}
    </>
  )
}
