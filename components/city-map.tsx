"use client"

import { Activity } from "@/app/page"
import L from "leaflet"
import { useEffect, useMemo, useState } from "react"
import { MapContainer, Marker, Popup } from "react-leaflet"
import { BasemapLayer } from "@/components/basemap-layer"
import { MapFitBounds } from "@/components/map-fit-bounds"
import { MapPlacePopupContent, mapPlacePopupClassName } from "@/components/map-place-popup"
import { geocodeCityCenter } from "@/lib/geocoding"
import { normalizeLatLng } from "@/lib/map-coords"

function mapPinIcon(index: number) {
  return L.divIcon({
    html: `<div style="width:30px;height:30px;border-radius:9999px;background:#1f5f5b;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25)">${index + 1}</div>`,
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  })
}

export function CityMap({
  city,
  country,
  activities,
}: {
  city: string
  country: string
  activities: Activity[]
}) {
  const [cityCenter, setCityCenter] = useState<[number, number] | null>(null)

  const mapped = useMemo(() => {
    const out: { activity: Activity; pos: [number, number] }[] = []
    for (const a of activities) {
      if (typeof a.lat !== "number" || typeof a.lng !== "number") continue
      const pos = normalizeLatLng(a.lat, a.lng)
      if (!pos) continue
      out.push({ activity: a, pos })
    }
    return out
  }, [activities])

  const positions = useMemo(() => mapped.map((m) => m.pos), [mapped])

  useEffect(() => {
    if (mapped.length > 0) return
    let cancelled = false
    void geocodeCityCenter(city, country).then((c) => {
      if (!cancelled && c) setCityCenter(c)
    })
    return () => {
      cancelled = true
    }
  }, [city, country, mapped.length])

  const center: [number, number] | null = mapped[0]?.pos ?? cityCenter

  if (!center) {
    return (
      <div className="h-full min-h-[300px] rounded-lg border-4 border-white bg-white overflow-hidden relative shadow-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading map for {city}...</p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-[300px] rounded-lg border-4 border-white bg-white overflow-hidden relative shadow-lg [&_.leaflet-container]:font-sans">
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <BasemapLayer />
        {positions.length > 0 ? <MapFitBounds positions={positions} singlePointZoom={14} /> : null}
        {mapped.map(({ activity, pos }, idx) => (
          <Marker key={activity.id} position={pos} icon={mapPinIcon(idx)}>
            <Popup className={mapPlacePopupClassName} minWidth={280} maxWidth={300}>
              <MapPlacePopupContent
                name={activity.name}
                address={activity.address}
                category={activity.category}
                duration={activity.duration}
                rating={activity.rating}
                image={activity.image}
                description={activity.description}
                pinLabel={`#${idx + 1}`}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
