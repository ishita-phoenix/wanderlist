"use client"

import { CityList, Activity, TravelPreferences } from "@/app/page"
import { ArrowLeft, Plus, Check, Clock, Star, MapPin, ChevronDown, ChevronUp, Sparkles, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { discoverPlaces } from "@/lib/api"

interface DiscoverPageProps {
  city: CityList
  preferences: TravelPreferences
  onAddActivity: (activity: Activity) => void | Promise<void>
  onBack: () => void
}

const categoryLabels: Record<string, string> = {
  food: "🍜 Food & Dining",
  museums: "🏛️ Museums",
  landmarks: "🗺️ Landmarks",
  nature: "🌿 Nature",
  nightlife: "🎶 Nightlife",
  shopping: "🛍️ Shopping",
  art: "🎨 Art & Culture",
  history: "📜 History",
  adventure: "🧗 Adventure",
  relaxation: "🧘 Relaxation",
}

// Skeleton card for loading state
function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="group"
      style={{ transform: `rotate(${(index % 5) - 2}deg)` }}
    >
      <div className="relative bg-white p-3 pb-4 rounded-sm shadow-xl border border-gray-200 animate-pulse">
        <div className="aspect-square bg-gray-200 rounded-sm mb-3" />
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 rounded w-4/5" />
          <div className="h-3 bg-gray-100 rounded w-3/5" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
          <div className="h-8 bg-gray-200 rounded mt-4" />
        </div>
      </div>
    </div>
  )
}

// Activity card with Wikimedia image fallback
function ActivityCard({
  activity,
  index,
  isPreferred,
  isAdded,
  isExpanded,
  onExpand,
  onAdd,
}: {
  activity: Activity
  index: number
  isPreferred: boolean
  isAdded: boolean
  isExpanded: boolean
  onExpand: () => void
  onAdd: (a: Activity) => void
}) {
  const [image, setImage] = useState(activity.image || "")
  const [addedAnim, setAddedAnim] = useState(isAdded)

  useEffect(() => {
    if (!image && activity.name) {
      // Try Wikimedia
      fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(activity.name.replace(/ /g, "_"))}`
      )
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          const url = data?.thumbnail?.source || ""
          if (url) setImage(url)
        })
        .catch(() => {})
    }
  }, [activity.name, image])

  const handleAdd = () => {
    if (isAdded || addedAnim) return
    setAddedAnim(true)
    onAdd(activity)
  }

  return (
    <div
      className="group"
      style={{ transform: `rotate(${(index % 5) - 2}deg)` }}
    >
      {/* Polaroid Frame */}
      <div className="relative bg-white p-3 pb-4 rounded-sm shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-200">
        {/* Preference indicator */}
        {isPreferred && (
          <div className="absolute -top-2 -right-2 z-10 bg-accent text-accent-foreground px-2 py-0.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            For You
          </div>
        )}

        {/* Photo */}
        <div className="relative aspect-square overflow-hidden rounded-sm bg-gray-100">
          {image ? (
            <img
              src={image}
              alt={activity.name}
              className="w-full h-full object-cover"
              onError={() => setImage("")}
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #e8dcc8, #d4c4a0)" }}
            >
              <MapPin className="w-10 h-10 text-amber-600/60" />
              <span className="text-xs text-amber-700/60 text-center px-2 font-medium">{activity.name}</span>
            </div>
          )}

          {/* Category badge */}
          <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded-full text-xs">
            {categoryLabels[activity.category] || activity.category}
          </div>

          {/* Rating */}
          <div className="absolute top-2 right-2 bg-white/90 text-foreground px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {activity.rating.toFixed(1)}
          </div>
        </div>

        {/* Polaroid Caption */}
        <div className="mt-3">
          <h3 className="font-[family-name:var(--font-handwritten)] text-xl text-gray-800 leading-tight">
            {activity.name}
          </h3>

          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {activity.duration}
            </span>
            {activity.address && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{activity.address.split(",")[0]}</span>
              </span>
            )}
          </div>

          {(activity.aiTip || activity.description) && (
            <div className="mt-2">
              {activity.aiTip ? (
                <p className="text-sm text-primary/90 font-[family-name:var(--font-sans)] font-medium">
                  {activity.aiTip}
                </p>
              ) : null}
              {activity.description ? (
                <>
                  <p
                    className={`text-sm text-gray-600 font-[family-name:var(--font-sans)] mt-1 ${
                      isExpanded ? "" : "line-clamp-2"
                    }`}
                  >
                    {activity.description}
                  </p>
                  <button
                    onClick={onExpand}
                    className="text-primary text-sm mt-1 flex items-center gap-1 hover:underline font-medium"
                  >
                    {isExpanded ? (
                      <>Show less <ChevronUp className="w-3 h-3" /></>
                    ) : (
                      <>Read more <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>
                </>
              ) : null}
            </div>
          )}

          {/* Add Button */}
          <Button
            onClick={handleAdd}
            disabled={isAdded || addedAnim}
            className={`w-full mt-4 rounded-sm font-[family-name:var(--font-sans)] transition-all ${
              isAdded || addedAnim
                ? "bg-green-500 hover:bg-green-500 text-white"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            }`}
          >
            {isAdded || addedAnim ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Added to List
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add to My List
              </>
            )}
          </Button>
        </div>

        {/* Polaroid shadow */}
        <div className="absolute -bottom-1 left-1 right-1 h-2 bg-black/10 rounded-b-sm blur-sm -z-10" />
      </div>
    </div>
  )
}

export function DiscoverPage({ city, preferences, onAddActivity, onBack }: DiscoverPageProps) {
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null)
  const [addedActivities, setAddedActivities] = useState<Set<string>>(
    new Set(city.activities.map((a) => a.id))
  )
  const [filter, setFilter] = useState<string>("all")
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const fetchDiscover = async () => {
    setIsLoading(true)
    setLoadError(false)
    try {
      const data = await discoverPlaces(city.name, city.country, preferences)
      setActivities(data)
      setLoadError(data.length === 0)
    } catch {
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDiscover()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.name, city.country])

  // Sort: preference-matched first, then by rating
  const sortedActivities = [...activities].sort((a, b) => {
    const aMatch = preferences[a.category as keyof TravelPreferences] ? 1 : 0
    const bMatch = preferences[b.category as keyof TravelPreferences] ? 1 : 0
    if (aMatch !== bMatch) return bMatch - aMatch
    return b.rating - a.rating
  })

  const filteredActivities =
    filter === "all"
      ? sortedActivities
      : sortedActivities.filter((a) => a.category === filter)

  const handleAddActivity = (activity: Activity) => {
    onAddActivity(activity)
    setAddedActivities(new Set(addedActivities).add(activity.id))
  }

  const availableCategories = [...new Set(activities.map((a) => a.category))]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-[family-name:var(--font-handwritten)] text-lg">Back to {city.name}</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-[family-name:var(--font-handwritten)] text-4xl md:text-5xl text-primary">
                Discover {city.name}
              </h1>
              <Sparkles className="w-8 h-8 text-accent" />
            </div>
            <p className="font-[family-name:var(--font-sans)] text-muted-foreground text-base mt-1">
              Curated by your travel personality · sorted by popularity &amp; interest match
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={fetchDiscover}
              disabled={isLoading}
              className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border-2 border-border hover:border-primary text-muted-foreground hover:text-primary transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              All
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                  filter === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {categoryLabels[cat] || cat}
                {preferences[cat as keyof TravelPreferences] && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Polaroid Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      ) : loadError ? (
        <div className="text-center py-20 max-w-md mx-auto">
          <p className="font-[family-name:var(--font-handwritten)] text-2xl text-muted-foreground mb-2">
            No suggestions yet
          </p>
          <p className="text-muted-foreground font-[family-name:var(--font-sans)] text-sm mb-6">
            Try selecting interests on your profile, or add places from the city search. You can also refresh — we pull from OpenStreetMap and popular place data when available.
          </p>
          <Button onClick={fetchDiscover} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredActivities.map((activity, index) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              index={index}
              isPreferred={!!preferences[activity.category as keyof TravelPreferences]}
              isAdded={addedActivities.has(activity.id)}
              isExpanded={expandedActivity === activity.id}
              onExpand={() => setExpandedActivity(expandedActivity === activity.id ? null : activity.id)}
              onAdd={handleAddActivity}
            />
          ))}
        </div>
      )}

      {!isLoading && !loadError && filteredActivities.length === 0 && (
        <div className="text-center py-16">
          <p className="font-[family-name:var(--font-handwritten)] text-2xl text-muted-foreground">
            No activities in this category yet ✦
          </p>
        </div>
      )}
    </div>
  )
}
