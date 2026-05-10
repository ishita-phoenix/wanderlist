"use client"

import { CityList, Itinerary, TravelPreferences } from "@/app/page"
import { ArrowLeft, Calendar, Clock, Sparkles, MapPin, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { buildItinerary as buildItineraryApi } from "@/lib/api"

interface BuildItineraryProps {
  city: CityList
  preferences: TravelPreferences
  onBuild: (itinerary: Itinerary) => void
  onBack: () => void
}

const categoryEmoji: Record<string, string> = {
  food: "🍜",
  museums: "🏛️",
  landmarks: "🗺️",
  nature: "🌿",
  nightlife: "🎶",
  shopping: "🛍️",
  art: "🎨",
  history: "📜",
  adventure: "🧗",
  relaxation: "🧘",
}

export function BuildItinerary({ city, preferences, onBuild, onBack }: BuildItineraryProps) {
  const today = new Date()
  const defaultStart = today.toISOString().split("T")[0]
  const defaultEnd = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [wakeTime, setWakeTime] = useState("09:00")
  const [sleepTime, setSleepTime] = useState("22:00")
  const [isBuilding, setIsBuilding] = useState(false)

  const calculateDays = () => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  const generateItinerary = async () => {
    setIsBuilding(true)
    try {
      const itinerary = await buildItineraryApi({
        city: city.name,
        country: city.country,
        startDate,
        endDate,
        wakeTime,
        sleepTime,
        activities: city.activities,
        preferences,
      })
      onBuild(itinerary)
    } catch (error) {
      console.error("Failed to build itinerary", error)
      const msg = error instanceof Error ? error.message : "Unknown error"
      alert(
        `${msg}\n\nTip: use npm run dev (starts Django + Next). Frontend only: npm run dev:next plus npm run dev:api in another terminal.`
      )
    } finally {
      setIsBuilding(false)
    }
  }

  const numDays = calculateDays()
  const isValid = startDate && endDate && startDate <= endDate && city.activities.length > 0

  // Active preferences
  const activePrefs = Object.entries(preferences)
    .filter(([, v]) => v)
    .map(([k]) => k)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-[family-name:var(--font-handwritten)] text-lg">Back to {city.name}</span>
        </button>
      </div>

      {/* Scrapbook Card */}
      <div className="relative bg-card rounded-sm shadow-xl border-2 border-border overflow-hidden">
        {/* Decorative washi tape */}
        <div className="absolute -top-2 left-8 w-16 h-6 bg-accent/40 transform -rotate-2 z-10" />
        <div className="absolute -top-2 right-12 w-14 h-6 bg-primary/30 transform rotate-3 z-10" />
        <div className="absolute top-20 -right-4 w-8 h-24 bg-secondary/50 transform rotate-12" />

        {/* Header */}
        <div className="relative bg-secondary/30 p-6 md:p-8 border-b-2 border-border">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            <div>
              <h1 className="font-[family-name:var(--font-handwritten)] text-3xl md:text-4xl text-primary">
                Build Your Itinerary
              </h1>
              <p className="font-[family-name:var(--font-sans)] text-muted-foreground mt-1">
                {city.name}, {city.country} · {city.activities.length} places queued
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 md:p-8 space-y-8">
          {/* Travel Dates */}
          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-sans)] text-xl text-foreground font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Travel Dates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-[family-name:var(--font-handwritten)] text-lg text-muted-foreground">
                  From
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-sm border-2 border-border bg-background font-[family-name:var(--font-sans)] text-base focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="font-[family-name:var(--font-handwritten)] text-lg text-muted-foreground">
                  To
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-4 py-3 rounded-sm border-2 border-border bg-background font-[family-name:var(--font-sans)] text-base focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
            {numDays > 0 && (
              <p className="font-[family-name:var(--font-handwritten)] text-xl text-accent">
                🗓 {numDays} {numDays === 1 ? "day" : "days"} of adventure!
              </p>
            )}
          </div>

          {/* Daily Schedule */}
          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-sans)] text-xl text-foreground font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Daily schedule
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-[family-name:var(--font-handwritten)] text-lg text-muted-foreground">
                  Wake up ☀️
                </label>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-sm border-2 border-border bg-background font-[family-name:var(--font-sans)] text-base focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="font-[family-name:var(--font-handwritten)] text-lg text-muted-foreground">
                  Bedtime 🌙
                </label>
                <input
                  type="time"
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-sm border-2 border-border bg-background font-[family-name:var(--font-sans)] text-base focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Active Preferences */}
          {activePrefs.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-[family-name:var(--font-sans)] text-xl text-foreground font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                Your Interests (Priority Boost)
              </h2>
              <div className="flex flex-wrap gap-2">
                {activePrefs.map((pref) => (
                  <span
                    key={pref}
                    className="px-3 py-1.5 bg-accent/20 border border-accent/40 rounded-full text-sm font-medium text-foreground flex items-center gap-1"
                  >
                    {categoryEmoji[pref] || "✦"} {pref}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground font-[family-name:var(--font-sans)]">
                Interest matches get a boost; famous places rank higher thanks to popularity scores (Foursquare when
                configured, otherwise the stars on the card scaled to 0–100).
              </p>
            </div>
          )}

          {/* Queued Places */}
          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-sans)] text-xl text-foreground font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Your Places ({city.activities.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {city.activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="px-3 py-1.5 bg-secondary rounded-full border border-border flex items-center gap-2"
                >
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <span className="font-[family-name:var(--font-handwritten)] text-base text-foreground flex items-center gap-2 flex-wrap">
                    {categoryEmoji[activity.category] || ""} {activity.name}
                    {typeof activity.popularityScore === "number" ? (
                      <span className="text-[10px] font-[family-name:var(--font-sans)] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        pop {Math.round(activity.popularityScore)}
                      </span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-secondary/50 border-2 border-border rounded-sm p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="font-[family-name:var(--font-sans)] text-sm text-muted-foreground">
              <p className="font-semibold mb-2">How your itinerary is built:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>
                  Popularity comes from Foursquare Places star-like ratings (server key in{" "}
                  <code className="text-xs">backend/.env</code>) when you save; otherwise we scale the stars already on
                  the card (0–5) to 0–100.
                </li>
                <li>
                  Each day gets a greedy schedule from OpenRouteService matrix travel (when configured) plus dwell
                  times from each place&apos;s duration string.
                </li>
                <li>Optional OpenAI on the backend can still add a short trip summary paragraph.</li>
              </ul>
            </div>
          </div>

          {/* Build Button */}
          <Button
            onClick={generateItinerary}
            disabled={!isValid || isBuilding}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-[family-name:var(--font-sans)] text-lg py-6 rounded-sm shadow-lg disabled:opacity-50 transition-all"
          >
            {isBuilding ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-3" />
                Building Your Perfect Trip...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate My Itinerary ✈︎
              </>
            )}
          </Button>

          {city.activities.length === 0 && (
            <p className="text-center text-destructive font-[family-name:var(--font-handwritten)] text-lg">
              Please add some places to your list first! 📍
            </p>
          )}
        </div>

        {/* Decorative footer */}
        <div className="absolute bottom-4 left-4 font-[family-name:var(--font-handwritten)] text-sm text-muted-foreground/50 transform -rotate-3">
          planning magic happens here ✨
        </div>
      </div>
    </div>
  )
}
