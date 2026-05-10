"use client"

import { useEffect } from "react"
import { useMap } from "react-leaflet"
import L from "leaflet"

type Props = {
  positions: [number, number][]
  /** Zoom when there is only one marker */
  singlePointZoom?: number
}

export function MapFitBounds({ positions, singlePointZoom = 14 }: Props) {
  const map = useMap()
  const signature = positions.map((p) => `${p[0]},${p[1]}`).join("|")

  useEffect(() => {
    if (positions.length === 0) return
    const pts = positions.map((p) => L.latLng(p[0], p[1]))
    if (pts.length === 1) {
      map.setView(pts[0], singlePointZoom)
      return
    }
    map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 })
  }, [map, signature, singlePointZoom])

  return null
}
