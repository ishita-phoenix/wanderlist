"use client"

import { CityList, Activity } from "@/app/page"
import { ArrowLeft, Compass, Hammer, MapPin, Clock, Star, Trash2, Search, Plus, Heart, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContextMenuItem } from "@/components/ui/context-menu"
import { ListPaperContextMenu } from "@/components/list-paper-dropdown"
import { useCallback, useEffect, useRef, useState } from "react"
import { searchPlaces } from "@/lib/api"
import dynamic from "next/dynamic"

const CityMap = dynamic(() => import("@/components/city-map").then((m) => m.CityMap), { ssr: false })

interface CityListViewProps {
  city: CityList
  onDiscover: () => void
  onBuild: () => void
  onRemoveActivity: (activityId: string) => void
  onAddActivity: (activity: Activity) => void | Promise<void>
  onBack: () => void
  onDeleteList: () => void
}

async function getWikimediaThumb(name: string): Promise<string> {
  try {
    const slug = encodeURIComponent(name.replace(/ /g, "_"))
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`)
    if (res.ok) {
      const data = await res.json()
      return data?.thumbnail?.source || ""
    }
  } catch {}
  return ""
}

const STAMP_ANIM_CSS = `
@keyframes stamp-in {
  0% { transform: scale(2.5) rotate(-10deg); opacity: 0; }
  60% { transform: scale(0.9) rotate(2deg); opacity: 1; }
  100% { transform: scale(1) rotate(-4deg); opacity: 1; }
}
.stamp-badge {
  animation: stamp-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
`

function StampBadge({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div
      className="stamp-badge absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
      style={{ transform: "rotate(-4deg)" }}
    >
      <div
        style={{
          border: "3px solid #16a34a",
          borderRadius: "8px",
          padding: "4px 10px",
          color: "#16a34a",
          fontFamily: "'Courier New', monospace",
          fontWeight: 800,
          fontSize: "1.1rem",
          letterSpacing: "0.2em",
          opacity: 0.9,
          background: "rgba(255,255,255,0.85)",
          boxShadow: "0 0 0 1px #16a34a40",
          textTransform: "uppercase",
        }}
      >
        ✓ ADDED
      </div>
    </div>
  )
}

function resultRowKey(r: Activity, index: number): string {
  if (r.id) return r.id
  const lat = r.lat ?? 0
  const lng = r.lng ?? 0
  return `row-${lat.toFixed(5)}-${lng.toFixed(5)}-${(r.name || "").slice(0, 48)}-${index}`
}

function SearchResultCard({
  result,
  onAdd,
  alreadyAdded,
}: {
  result: Activity
  onAdd: (r: Activity) => void
  alreadyAdded: boolean
}) {
  const [stamped, setStamped] = useState(alreadyAdded)

  const handleAdd = () => {
    if (alreadyAdded || stamped) return
    setStamped(true)
    onAdd(result)
  }

  return (
    <div
      className="relative flex items-center gap-3 py-2.5 px-3 hover:bg-amber-50/90 cursor-pointer border-b border-amber-100/80 last:border-b-0 group"
      onClick={handleAdd}
      role="option"
    >
      <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-amber-200/90 bg-amber-50">
        <MapPin className="h-5 w-5 text-amber-600" aria-hidden />
        <StampBadge show={stamped} />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-[family-name:var(--font-sans)] font-semibold text-foreground leading-snug line-clamp-2">
          {result.name}
        </h4>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">{result.address}</p>
      </div>

      <Button
        size="sm"
        disabled={alreadyAdded || stamped}
        className={`rounded-full flex-shrink-0 transition-all ${
          alreadyAdded || stamped ? "bg-green-500 hover:bg-green-500" : "bg-primary hover:bg-primary/90"
        }`}
        onClick={(e) => {
          e.stopPropagation()
          handleAdd()
        }}
      >
        {alreadyAdded || stamped ? "✓" : <Plus className="w-4 h-4" />}
      </Button>
    </div>
  )
}

const SEARCH_DEBOUNCE_MS = 320

export function CityListView({
  city,
  onDiscover,
  onBuild,
  onRemoveActivity,
  onAddActivity,
  onBack,
  onDeleteList,
}: CityListViewProps) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchResults, setSearchResults] = useState<Activity[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set(city.activities.map((a) => a.id)))
  const searchRef = useRef<HTMLDivElement>(null)
  const searchAbortRef = useRef<AbortController | null>(null)
  const searchGenRef = useRef(0)

  useEffect(() => {
    setAddedIds(new Set(city.activities.map((a) => a.id)))
  }, [city.activities])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [])

  const runSearch = useCallback(
    async (term: string) => {
      const t = term.trim()
      if (t.length < 2) {
        setSearchResults([])
        setShowSearchResults(false)
        setSearchError(false)
        return
      }

      searchAbortRef.current?.abort()
      const ac = new AbortController()
      searchAbortRef.current = ac
      const gen = ++searchGenRef.current

      setIsSearching(true)
      setSearchError(false)
      setShowSearchResults(true)
      setSearchResults([])
      try {
        const results = await searchPlaces(city.name, city.country, t, { signal: ac.signal })
        if (gen !== searchGenRef.current) return
        setSearchResults(results)
        setShowSearchResults(true)
      } catch (e) {
        if ((e as Error).name === "AbortError") return
        if (gen !== searchGenRef.current) return
        setSearchResults([])
        setSearchError(true)
        setShowSearchResults(true)
      } finally {
        if (gen === searchGenRef.current) setIsSearching(false)
      }
    },
    [city.name, city.country]
  )

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      searchAbortRef.current?.abort()
      setSearchResults([])
      setShowSearchResults(false)
      setIsSearching(false)
      setSearchError(false)
      return
    }

    const id = window.setTimeout(() => {
      void runSearch(searchQuery)
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(id)
      searchAbortRef.current?.abort()
    }
  }, [searchQuery, runSearch])

  const handleAddFromSearch = (result: Activity) => {
    void (async () => {
      const id = result.id || `activity-${Date.now()}`
      const thumb = await getWikimediaThumb(result.name)
      const newActivity: Activity = {
        ...result,
        id,
        image: thumb || result.image || "",
      }
      onAddActivity(newActivity)
      setAddedIds((prev) => new Set(prev).add(newActivity.id))
    })()
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-[family-name:var(--font-sans)] text-base">Back to Board</span>
        </button>
      </div>

      <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-2xl overflow-hidden border border-amber-200/50">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="absolute -top-1 left-16 w-24 h-7 bg-gradient-to-r from-pink-200/90 to-pink-300/90 transform -rotate-2 z-10" />
        <div className="absolute -top-1 right-20 w-20 h-7 bg-gradient-to-r from-yellow-200/90 to-amber-300/90 transform rotate-3 z-10" />

        <div className="relative p-6 md:p-8 border-b-2 border-amber-200/60">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <ListPaperContextMenu
              menuLabel={city.name}
              trigger={
                <div className="cursor-default rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2">
                  <span className="sr-only">Right-click for list options including delete</span>
                  <h1 className="font-[family-name:var(--font-cursive)] text-4xl md:text-5xl text-primary">
                    {city.name}
                  </h1>
                  <p className="font-[family-name:var(--font-sans)] text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                    <MapPin className="w-4 h-4 shrink-0" />
                    {city.country}
                    <span className="text-primary font-medium">
                      · {city.activities.length} {city.activities.length === 1 ? "place" : "places"} saved
                    </span>
                  </p>
                </div>
              }
            >
              <ContextMenuItem
                variant="destructive"
                className="mx-0.5 cursor-pointer font-[family-name:var(--font-handwritten)] text-base focus:bg-red-50"
                onSelect={onDeleteList}
              >
                Delete this list
              </ContextMenuItem>
            </ListPaperContextMenu>

            <div className="flex gap-3">
              <Button
                onClick={onDiscover}
                variant="outline"
                className="group border-2 border-primary bg-transparent hover:bg-primary hover:text-primary-foreground font-[family-name:var(--font-sans)] px-5 py-5 rounded-full transition-all"
              >
                <Compass className="w-5 h-5 mr-2 group-hover:rotate-45 transition-transform duration-300" />
                Discover
              </Button>
              <Button
                onClick={onBuild}
                disabled={city.activities.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-[family-name:var(--font-sans)] px-5 py-5 rounded-full disabled:opacity-50 shadow-md"
              >
                <Hammer className="w-5 h-5 mr-2" />
                Build Itinerary
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row min-h-[550px]">
          <div className="flex-1 p-6 lg:border-r-2 border-amber-200/50">
            <div className="mb-6 relative" ref={searchRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {isSearching ? (
                    <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  )}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      if (!e.target.value) {
                        setShowSearchResults(false)
                        setSearchResults([])
                        setSearchError(false)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        void runSearch(searchQuery)
                      }
                    }}
                    placeholder={`Search places in ${city.name}…`}
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={showSearchResults}
                    className="w-full pl-12 pr-4 py-3 rounded-full border-2 border-amber-200 bg-white/80 font-[family-name:var(--font-sans)] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => void runSearch(searchQuery)}
                  disabled={!searchQuery.trim() || isSearching}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 shadow-sm shrink-0"
                >
                  Search
                </Button>
              </div>

              {showSearchResults && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border-2 border-amber-200 z-40 max-h-80 overflow-y-auto"
                  onMouseDown={(e) => e.stopPropagation()}
                  role="listbox"
                  aria-label="Search results"
                >
                  {isSearching && searchResults.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">Searching…</div>
                  ) : searchError ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Something went wrong. Check that the API is running, then try again.
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((result, index) => (
                      <SearchResultCard
                        key={resultRowKey(result, index)}
                        result={result}
                        onAdd={handleAddFromSearch}
                        alreadyAdded={addedIds.has(result.id)}
                      />
                    ))
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-muted-foreground font-[family-name:var(--font-sans)] text-sm">
                        No places found. Try another word (e.g. museum, park, café) or a landmark name.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {city.activities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div className="w-24 h-24 rounded-full bg-amber-100 border-4 border-amber-200/60 flex items-center justify-center mb-4">
                  <Heart className="w-12 h-12 text-amber-300" />
                </div>
                <h3 className="font-[family-name:var(--font-handwritten)] text-2xl text-muted-foreground mb-2">
                  No places saved yet
                </h3>
                <p className="font-[family-name:var(--font-sans)] text-muted-foreground/80 max-w-xs">
                  Search above or click <strong>Discover</strong> to find amazing places in {city.name}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="font-[family-name:var(--font-handwritten)] text-xl text-primary pb-2">
                  ✏️ My Saved Places ({city.activities.length})
                </h2>
                <div className="space-y-3">
                  {city.activities.map((activity, index) => (
                    <div
                      key={activity.id}
                      className={`
                        group relative flex items-start gap-4 p-4 rounded-lg transition-all cursor-pointer bg-white/85 border
                        ${selectedActivity?.id === activity.id
                          ? "ring-2 ring-primary shadow-lg border-primary/30"
                          : "hover:shadow-md border-amber-200/60 hover:border-primary/30"
                        }
                      `}
                      style={{ transform: `rotate(${index % 2 === 0 ? "-0.4" : "0.4"}deg)` }}
                      onClick={() => setSelectedActivity(activity)}
                    >
                      <div className="absolute -top-2 left-8 w-10 h-4 bg-yellow-200/80 transform -rotate-2" />

                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 border-white shadow-md bg-amber-50">
                        {activity.image ? (
                          <img
                            src={activity.image}
                            alt={activity.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.display = "none"
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-8 h-8 text-amber-300" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-[family-name:var(--font-handwritten)] text-xl text-foreground truncate">
                          {activity.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {activity.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                            {activity.rating}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2 font-[family-name:var(--font-sans)]">
                          {activity.address}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveActivity(activity.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 rounded-full bg-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:w-[45%] p-6 bg-gradient-to-br from-amber-100/40 to-orange-100/40">
            <h3 className="font-[family-name:var(--font-handwritten)] text-xl text-primary mb-4">
              📍 Map Preview
            </h3>
            <div className="h-[400px] lg:h-full min-h-[350px]">
              <CityMap city={city.name} country={city.country} activities={city.activities} />
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 font-[family-name:var(--font-handwritten)] text-lg text-primary/35 transform -rotate-6 hidden md:block">
          {city.name} adventures ✈
        </div>
      </div>

      <style jsx global>{STAMP_ANIM_CSS}</style>
    </div>
  )
}
