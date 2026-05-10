"use client"

import type { ReactNode } from "react"

const hand = "font-[family-name:var(--font-handwritten)]"
const cursive = "font-[family-name:var(--font-cursive)]"

export function MapPlacePopupContent({
  name,
  address,
  category,
  duration,
  rating,
  image,
  description,
  scheduleLine,
  pinLabel,
}: {
  name: string
  address?: string
  category?: string
  duration?: string
  rating?: number
  image?: string
  description?: string
  /** e.g. itinerary time range */
  scheduleLine?: string
  pinLabel?: ReactNode
}) {
  const hasMeta = Boolean(category || duration || (rating != null && rating > 0))

  return (
    <div className={`w-[min(288px,78vw)] ${hand} text-amber-950/95`}>
      {image ? (
        <div className="relative mb-2 overflow-hidden rounded-xl border-2 border-amber-200/80 bg-amber-50/50 shadow-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            className="h-28 w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-amber-900/25 to-transparent" />
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <h3 className={`${cursive} text-xl leading-tight text-primary`}>{name}</h3>
        {pinLabel ? (
          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{pinLabel}</span>
        ) : null}
      </div>

      {scheduleLine ? (
        <p className={`mt-1 text-sm text-teal-900/90 ${hand}`}>{scheduleLine}</p>
      ) : null}

      {hasMeta ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {category ? (
            <span className="rounded-md border border-amber-300/60 bg-amber-100/80 px-2 py-0.5 text-xs text-amber-950/90">
              {category}
            </span>
          ) : null}
          {duration ? (
            <span className="rounded-md border border-sky-200/70 bg-sky-50/90 px-2 py-0.5 text-xs text-sky-950/85">
              {duration}
            </span>
          ) : null}
          {rating != null && rating > 0 ? (
            <span className="rounded-md border border-rose-200/70 bg-rose-50/90 px-2 py-0.5 text-xs text-rose-950/85">
              ★ {rating.toFixed(1)}
            </span>
          ) : null}
        </div>
      ) : null}

      {address ? (
        <p className={`mt-2 text-sm leading-snug text-stone-700 ${hand}`}>{address}</p>
      ) : null}

      {description ? (
        <p className={`mt-2 line-clamp-4 text-sm leading-snug text-stone-600 ${hand}`}>{description}</p>
      ) : null}
    </div>
  )
}

/** Leaflet popup wrapper styling — scrapbook / washi tape vibe */
export const mapPlacePopupClassName = [
  "[&_.leaflet-popup-content-wrapper]:rounded-2xl",
  "[&_.leaflet-popup-content-wrapper]:border-2",
  "[&_.leaflet-popup-content-wrapper]:border-amber-200/90",
  "[&_.leaflet-popup-content-wrapper]:bg-gradient-to-br",
  "[&_.leaflet-popup-content-wrapper]:from-amber-50",
  "[&_.leaflet-popup-content-wrapper]:via-white",
  "[&_.leaflet-popup-content-wrapper]:to-sky-50/80",
  "[&_.leaflet-popup-content-wrapper]:shadow-lg",
  "[&_.leaflet-popup-content]:m-0",
  "[&_.leaflet-popup-content]:p-3",
  "[&_.leaflet-popup-tip]:border-t-amber-200/90",
  "[&_.leaflet-popup-close-button]:text-amber-900/70",
  "[&_.leaflet-popup-close-button]:hover:text-amber-950",
].join(" ")
