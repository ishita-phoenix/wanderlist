"use client"

import { CityList } from "@/app/page"
import { useState, useEffect, useRef } from "react"
import { Plus, X, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContextMenuItem } from "@/components/ui/context-menu"
import { ListPaperContextMenu, ListPaperMenuSeparator } from "@/components/list-paper-dropdown"
import { StampBorder, MagnetPin } from "@/components/stamp-overlay"

interface CityListsProps {
  cities: CityList[]
  onSelectCity: (city: CityList) => void
  onAddCity: (name: string, country: string) => void
  onRemoveCity: (cityId: string) => void
}

// Wikimedia image cache persisted to localStorage
const IMAGE_CACHE_KEY = "wanderlist-city-images"
const IMAGE_CACHE_KEY_LEGACY = "wanderlust-city-images"
const LOCAL_MAGNETS_BASE_PATH = "/magnets"

function getImageCache(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const next = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || "{}") as Record<
      string,
      string
    >
    const legacy = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY_LEGACY) || "{}") as Record<
      string,
      string
    >
    return { ...legacy, ...next }
  } catch {
    return {}
  }
}

function setImageCache(cache: Record<string, string>) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache))
    localStorage.removeItem(IMAGE_CACHE_KEY_LEGACY)
  } catch {}
}

function normalizeCityName(cityName: string): string {
  return cityName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function canLoadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = src
  })
}

async function fetchLocalMagnetImage(cityName: string): Promise<string> {
  const normalized = normalizeCityName(cityName)
  if (!normalized) return ""

  // Try a few common filename formats so adding new files is easy.
  const candidates = [
    `${LOCAL_MAGNETS_BASE_PATH}/${normalized}.png`,
    `${LOCAL_MAGNETS_BASE_PATH}/${normalized}.jpg`,
    `${LOCAL_MAGNETS_BASE_PATH}/${normalized}.jpeg`,
    `${LOCAL_MAGNETS_BASE_PATH}/${cityName.trim().toLowerCase()}.png`,
    `${LOCAL_MAGNETS_BASE_PATH}/${cityName.trim().toLowerCase()}.jpg`,
    `${LOCAL_MAGNETS_BASE_PATH}/${cityName.trim().toLowerCase()}.jpeg`,
  ]

  for (const candidate of candidates) {
    if (await canLoadImage(candidate)) return candidate
  }
  return ""
}

async function fetchWikimediaImage(cityName: string): Promise<string> {
  const cache = getImageCache()
  if (cache[cityName]) return cache[cityName]

  try {
    const slug = encodeURIComponent(cityName.replace(/ /g, "_"))
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`)
    if (res.ok) {
      const data = await res.json()
      const url = data?.thumbnail?.source || data?.originalimage?.source || ""
      if (url) {
        const updated = { ...getImageCache(), [cityName]: url }
        setImageCache(updated)
        return url
      }
    }
  } catch {}
  return ""
}

async function fetchCityImage(cityName: string): Promise<string> {
  const localImage = await fetchLocalMagnetImage(cityName)
  if (localImage) return localImage
  return fetchWikimediaImage(cityName)
}

// Pin colors for magnets
const PIN_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"]

// Different magnet shapes for variety
const magnetShapes = [
  "rounded-lg",
  "rounded-2xl",
  "rounded-[40%]",
  "rounded-t-3xl rounded-b-lg",
  "rounded-lg rounded-tr-3xl",
  "rounded-xl",
]

// Newspaper cutout letter component
function CutoutLetter({ char, index }: { char: string; index: number }) {
  const styles = [
    "bg-amber-100 text-amber-900 font-serif",
    "bg-rose-100 text-rose-900 font-sans font-bold",
    "bg-orange-100 text-orange-900 font-serif italic",
    "bg-yellow-100 text-yellow-900 font-mono",
    "bg-stone-200 text-stone-800 font-serif font-bold",
    "bg-red-100 text-red-900 font-sans",
  ]

  if (char === " ") return <span className="w-3" />

  const style = styles[index % styles.length]
  const rotation = ((index * 7) % 9) - 4

  return (
    <span
      className={`inline-block px-1.5 py-0.5 ${style} shadow-sm text-base md:text-lg uppercase border border-black/10`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {char}
    </span>
  )
}

function CutoutText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`inline-flex flex-wrap gap-0.5 justify-center ${className}`}>
      {text.split("").map((char, i) => (
        <CutoutLetter key={i} char={char} index={i} />
      ))}
    </span>
  )
}

// Individual magnet with dynamic Wikimedia image
function CityMagnet({
  city,
  index,
  isHovered,
  onHover,
  onLeave,
  onClick,
  onRemoveCity,
}: {
  city: CityList
  index: number
  isHovered: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
  onRemoveCity: (cityId: string) => void
}) {
  const [image, setImage] = useState<string>("")
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const mounted = useRef(true)

  const rotation = ([-8, 5, -3, 7, -5, 4, -6, 8, -4, 6])[index % 10]
  const shape = magnetShapes[index % magnetShapes.length]
  const pinColor = PIN_COLORS[index % PIN_COLORS.length]
  const isLocalMagnet = image.startsWith(`${LOCAL_MAGNETS_BASE_PATH}/`)

  useEffect(() => {
    mounted.current = true
    setImgLoaded(false)
    setImgError(false)
    fetchCityImage(city.name).then((url) => {
      if (mounted.current) setImage(url)
    })
    return () => { mounted.current = false }
  }, [city.name])

  return (
    <ListPaperContextMenu
      menuLabel={city.name}
      trigger={
        <div className="relative inline-block">
          <span className="sr-only">Right-click this magnet for list options</span>
          <button
            type="button"
            onClick={onClick}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            className="group relative focus:outline-none focus:ring-4 focus:ring-primary/40 rounded-lg transition-all duration-300"
            style={{
              transform: isHovered
                ? `scale(1.1) translateY(-10px) rotate(0deg)`
                : `rotate(${rotation}deg)`,
              transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Magnet pin at top */}
            <MagnetPin color={pinColor} />

            {/* Magnet Container */}
            <div
              className={`relative ${isLocalMagnet ? "inline-block" : `w-28 h-36 md:w-36 md:h-44 ${shape} overflow-hidden`}`}
              style={{
                boxShadow: isLocalMagnet
                  ? "none"
                  : isHovered
                    ? "6px 10px 24px rgba(0,0,0,0.45), 0 0 0 3px rgba(255,255,255,0.4)"
                    : "4px 5px 14px rgba(0,0,0,0.38)",
              }}
            >
              {/* Image or fallback */}
              {image && !imgError ? (
                <img
                  src={image}
                  alt={city.name}
                  className={`${isLocalMagnet ? "relative block w-auto h-auto max-w-28 md:max-w-36 max-h-36 md:max-h-44 object-contain" : "absolute inset-0 w-full h-full object-cover"} transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgError(true)}
                />
              ) : null}

              {/* Gradient fallback (shows while loading or on error) */}
              {!isLocalMagnet && (!image || imgError || !imgLoaded) && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center p-2"
                  style={{
                    background: `linear-gradient(135deg, ${city.color}dd, ${city.color}88)`,
                  }}
                >
                  <Globe className="w-8 h-8 text-white/60 mb-1" />
                  <span className="font-[family-name:var(--font-cursive)] text-xl text-white text-center leading-tight font-bold drop-shadow-sm">
                    {city.name}
                  </span>
                  <span className="text-xs text-white/70 uppercase tracking-wider mt-1">
                    {city.country}
                  </span>
                </div>
              )}

              {/* City name overlay at bottom */}
              {!isLocalMagnet && image && !imgError && imgLoaded && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 pt-4">
                  <p className="font-[family-name:var(--font-cursive)] text-sm text-white text-center leading-tight drop-shadow-md">
                    {city.name}
                  </p>
                </div>
              )}

              {!isLocalMagnet && (
                <>
                  {/* Stamp border overlay */}
                  <StampBorder color="rgba(255,255,255,0.75)" holeCount={10} />

                  {/* Glossy shine overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent pointer-events-none" />
                </>
              )}
            </div>

            {/* Activity count badge */}
            {city.activities.length > 0 && (
              <div className="absolute -top-1 -right-1 w-7 h-7 md:w-8 md:h-8 rounded-full bg-red-500 text-white text-xs md:text-sm font-bold flex items-center justify-center shadow-lg border-2 border-white z-20">
                {city.activities.length}
              </div>
            )}
          </button>
        </div>
      }
    >
      <ContextMenuItem
        className="mx-0.5 cursor-pointer font-[family-name:var(--font-handwritten)] text-base text-amber-950 focus:bg-amber-100/70"
        onSelect={() => onClick()}
      >
        Open list
      </ContextMenuItem>
      <ListPaperMenuSeparator />
      <ContextMenuItem
        variant="destructive"
        className="mx-0.5 cursor-pointer font-[family-name:var(--font-handwritten)] text-base focus:bg-red-50"
        onSelect={() => onRemoveCity(city.id)}
      >
        Delete list
      </ContextMenuItem>
    </ListPaperContextMenu>
  )
}

export function CityLists({ cities, onSelectCity, onAddCity, onRemoveCity }: CityListsProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCityName, setNewCityName] = useState("")
  const [newCountry, setNewCountry] = useState("")
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const handleAddCity = () => {
    if (newCityName.trim() && newCountry.trim()) {
      setAdding(true)
      setTimeout(() => {
        onAddCity(newCityName.trim(), newCountry.trim())
        setNewCityName("")
        setNewCountry("")
        setShowAddModal(false)
        setAdding(false)
      }, 300)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Header with cutout letters */}
      <div className="text-center mb-8">
        <div className="mb-4">
          <CutoutText text="My Travel Board" />
        </div>
        <p className="font-[family-name:var(--font-handwritten)] text-xl text-muted-foreground">
          click a magnet to see your saved places ✈︎
        </p>
      </div>

      {/* Fridge Background — metallic silver */}
      <div
        className="relative rounded-xl p-6 md:p-10 min-h-[600px] overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #ddd 0%, #aaa 20%, #c8c8c8 45%, #999 70%, #b8b8b8 100%)",
          boxShadow:
            "inset 0 2px 10px rgba(255,255,255,0.45), inset 0 -5px 10px rgba(0,0,0,0.18), 0 12px 48px rgba(0,0,0,0.28)",
        }}
      >
        {/* Brushed-metal texture */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(255,255,255,0.18) 2px,
              rgba(255,255,255,0.18) 3px
            )`,
          }}
        />

        {/* Fridge handle bar at top */}
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-3 rounded-full"
          style={{
            background: "linear-gradient(180deg, #bbb 0%, #888 50%, #bbb 100%)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.4)",
          }}
        />

        {/* Magnets Layout */}
        <div className="relative flex flex-wrap gap-6 md:gap-10 justify-center items-start py-8">
          {cities.map((city, index) => (
            <CityMagnet
              key={city.id}
              city={city}
              index={index}
              isHovered={hoveredCity === city.id}
              onHover={() => setHoveredCity(city.id)}
              onLeave={() => setHoveredCity(null)}
              onClick={() => onSelectCity(city)}
              onRemoveCity={onRemoveCity}
            />
          ))}

          {/* Add New City Button — blank postcard style */}
          <button
            onClick={() => setShowAddModal(true)}
            className="group relative focus:outline-none transition-all duration-300 hover:scale-105"
            style={{ transform: "rotate(-3deg)" }}
          >
            <MagnetPin color="#95a5a6" />
            <div
              className="w-28 h-36 md:w-36 md:h-44 rounded-lg bg-white/92 border-3 border-dashed border-stone-400 flex flex-col items-center justify-center gap-2 transition-all group-hover:border-primary group-hover:bg-amber-50/95"
              style={{ boxShadow: "3px 4px 12px rgba(0,0,0,0.22)" }}
            >
              <div className="w-12 h-12 rounded-full bg-stone-200 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                <Plus className="w-7 h-7 text-stone-500 group-hover:text-primary transition-colors" />
              </div>
              <span className="font-[family-name:var(--font-handwritten)] text-base text-stone-600 group-hover:text-primary transition-colors">
                New Destination
              </span>
            </div>
          </button>
        </div>

        {/* Decorative small round magnets */}
        {[
          { color: "#e74c3c", top: "5%", left: "2%", size: 22, rot: 12 },
          { color: "#f1c40f", bottom: "12%", left: "3%", size: 18, rot: -6 },
          { color: "#3498db", top: "8%", right: "4%", size: 26, rot: 3 },
          { color: "#2ecc71", bottom: "8%", right: "5%", size: 16, rot: -12 },
          { color: "#e91e63", top: "45%", left: "1%", size: 20, rot: 0 },
        ].map((dot, i) => (
          <div
            key={i}
            className="absolute hidden lg:block rounded-full"
            style={{
              width: dot.size,
              height: dot.size,
              background: dot.color,
              top: dot.top,
              bottom: dot.bottom,
              left: dot.left,
              right: dot.right,
              transform: `rotate(${dot.rot}deg)`,
              boxShadow: "2px 3px 6px rgba(0,0,0,0.3), inset 0 1px 3px rgba(255,255,255,0.4)",
            }}
          />
        ))}

        {/* Sticky note */}
        <div className="absolute bottom-5 left-5 transform -rotate-2 hidden lg:block">
          <div
            className="bg-yellow-200 p-3 shadow-md w-32 border-b-4 border-yellow-300"
            style={{ boxShadow: "2px 3px 8px rgba(0,0,0,0.22)" }}
          >
            <p className="font-[family-name:var(--font-handwritten)] text-xs text-yellow-900 leading-snug">
              don&apos;t forget to buy souvenirs! 🎁
            </p>
          </div>
        </div>

        {/* Postcard in corner */}
        <div className="absolute bottom-5 right-5 transform rotate-6 hidden xl:block">
          <div
            className="w-24 h-16 bg-white rounded shadow-md overflow-hidden"
            style={{ boxShadow: "2px 3px 8px rgba(0,0,0,0.25)" }}
          >
            <div className="h-full bg-gradient-to-br from-sky-200 to-cyan-300 flex items-center justify-center">
              <span className="font-[family-name:var(--font-cursive)] text-xs text-sky-800 text-center px-2">
                wish you were here!
              </span>
            </div>
          </div>
        </div>

        {/* Washi tape strips */}
        <div className="absolute top-0 left-[15%] w-24 h-5 bg-pink-300/50 transform -rotate-1 hidden md:block" style={{ backdropFilter: "blur(1px)" }} />
        <div className="absolute top-0 right-[20%] w-20 h-5 bg-blue-300/50 transform rotate-1 hidden md:block" style={{ backdropFilter: "blur(1px)" }} />
      </div>

      {/* Add City Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div
            className="bg-card rounded-xl shadow-2xl p-8 w-full max-w-md relative border border-border overflow-hidden"
            style={{ animation: "modal-stamp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          >
            {/* Decorative washi tape */}
            <div className="absolute -top-1 left-10 w-20 h-6 bg-amber-200/90 transform -rotate-2" />
            <div className="absolute -top-1 right-12 w-16 h-5 bg-rose-200/90 transform rotate-1" />

            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6 mt-4">
              <h2 className="font-[family-name:var(--font-cursive)] text-3xl text-primary">
                New Adventure ✈︎
              </h2>
              <p className="font-[family-name:var(--font-handwritten)] text-muted-foreground mt-2 text-lg">
                where shall we go next?
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="font-[family-name:var(--font-handwritten)] text-lg text-foreground block mb-2">
                  City Name
                </label>
                <input
                  type="text"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCity()}
                  placeholder="e.g., Barcelona"
                  className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background text-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-[family-name:var(--font-handwritten)] text-lg text-foreground block mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCity()}
                  placeholder="e.g., Spain"
                  className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background text-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-5 font-[family-name:var(--font-handwritten)] text-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCity}
                  disabled={!newCityName.trim() || !newCountry.trim() || adding}
                  className="flex-1 py-5 font-[family-name:var(--font-handwritten)] text-lg bg-primary hover:bg-primary/90"
                >
                  {adding ? "Adding..." : "Pin to Board 📌"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes modal-stamp {
          0% { transform: scale(0.6) rotate(-5deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
