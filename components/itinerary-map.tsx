"use client"

import { ScheduledActivity } from "@/app/page"
import L from "leaflet"
import { useMemo } from "react"
import { Marker, MapContainer, Popup, Polyline } from "react-leaflet"
import { BasemapLayer } from "@/components/basemap-layer"
import { MapFitBounds } from "@/components/map-fit-bounds"
import { MapPlacePopupContent, mapPlacePopupClassName } from "@/components/map-place-popup"
import { normalizeLatLng } from "@/lib/map-coords"

function numberedIcon(index: number) {
  return L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:9999px;background:#1f5f5b;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25)">${index + 1}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  })
}

function centerFromActivities(mapped: { pos: [number, number] }[]): [number, number] {
  if (!mapped.length) return [0, 0]
  const lat = mapped.reduce((s, a) => s + a.pos[0], 0) / mapped.length
  const lng = mapped.reduce((s, a) => s + a.pos[1], 0) / mapped.length
  return [lat, lng]
}

export function ItineraryMap({ activities }: { activities: ScheduledActivity[] }) {
  const mapped = useMemo(() => {
    const out: { activity: ScheduledActivity; pos: [number, number] }[] = []
    for (const a of activities) {
      if (typeof a.lat !== "number" || typeof a.lng !== "number") continue
      const pos = normalizeLatLng(a.lat, a.lng)
      if (!pos) continue
      out.push({ activity: a, pos })
    }
    return out
  }, [activities])

  const positions = useMemo(() => mapped.map((m) => m.pos), [mapped])
  const route: [number, number][] = positions

  if (!mapped.length) {
    return (
      <div className="h-full min-h-[400px] rounded-sm border-2 border-border bg-card flex items-center justify-center">
        <p className="text-muted-foreground">Map available once places include coordinates.</p>
      </div>
    )
  }

  const center = centerFromActivities(mapped)

  return (
    <div className="h-full min-h-[400px] rounded-sm border-2 border-border overflow-hidden [&_.leaflet-container]:font-sans">
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <BasemapLayer />
        <MapFitBounds positions={positions} singlePointZoom={14} />
        <Polyline positions={route} pathOptions={{ color: "#1f5f5b", weight: 4, dashArray: "8 6" }} />
        {mapped.map(({ activity, pos }, idx) => (
          <Marker key={activity.id} position={pos} icon={numberedIcon(idx)}>
            <Popup className={mapPlacePopupClassName} minWidth={280} maxWidth={300}>
              <MapPlacePopupContent
                name={activity.name}
                address={activity.address}
                category={activity.category}
                duration={activity.duration}
                rating={activity.rating}
                image={activity.image}
                description={activity.description}
                scheduleLine={`${activity.startTime} – ${activity.endTime}`}
                pinLabel={`Stop ${idx + 1}`}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
