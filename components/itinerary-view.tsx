"use client"

import { Itinerary, CityList } from "@/app/page"
import { ArrowLeft, Clock, MapPin, Copy, Check, ChevronLeft, ChevronRight, Car } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useRef } from "react"
import dynamic from "next/dynamic"

const ItineraryMap = dynamic(
  () => import("@/components/itinerary-map").then((m) => m.ItineraryMap),
  { ssr: false }
)

interface ItineraryViewProps {
  itinerary: Itinerary
  city: CityList
  onBack: () => void
}

export function ItineraryView({ itinerary, city, onBack }: ItineraryViewProps) {
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const planRef = useRef<HTMLDivElement>(null)

  const currentDay = itinerary.days[currentDayIndex]
  const totalDays = itinerary.days.length

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
  }

  const handleCopyPlan = () => {
    const planText = itinerary.days
      .map((day, index) => {
        const dayHeader = `Day ${index + 1} - ${formatDate(day.date)}\n${"=".repeat(30)}`
        const activities = day.activities
          .map(
            (activity) =>
              `${activity.startTime} - ${activity.endTime}: ${activity.name}\n  📍 ${activity.address}\n  ⏱️ Duration: ${activity.duration}`
          )
          .join("\n\n")
        return `${dayHeader}\n\n${activities}`
      })
      .join("\n\n\n")

    navigator.clipboard.writeText(planText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const goToPreviousDay = () => {
    setCurrentDayIndex((prev) => Math.max(0, prev - 1))
  }

  const goToNextDay = () => {
    setCurrentDayIndex((prev) => Math.min(totalDays - 1, prev + 1))
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-[family-name:var(--font-handwritten)] text-lg">Back</span>
          </button>
          <div>
            <h1 className="font-[family-name:var(--font-handwritten)] text-3xl md:text-4xl text-primary">
              Your {city.name} Adventure
            </h1>
            {itinerary.aiSummary ? (
              <p className="mt-3 max-w-2xl text-sm md:text-base text-muted-foreground font-[family-name:var(--font-sans)] border-l-4 border-accent pl-4 py-1">
                {itinerary.aiSummary}
              </p>
            ) : null}
            <p className="font-[family-name:var(--font-serif)] text-muted-foreground">
              {formatDate(itinerary.startDate)} - {formatDate(itinerary.endDate)}
            </p>
          </div>
        </div>

        <Button
          onClick={handleCopyPlan}
          variant="outline"
          className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-[family-name:var(--font-serif)]"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy Full Plan
            </>
          )}
        </Button>
      </div>

      {/* Main Content */}
      <div className="relative bg-card rounded-sm shadow-xl border-2 border-border overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-2 left-8 w-16 h-6 bg-accent/40 transform -rotate-2 z-10" />
        <div className="absolute -top-2 right-12 w-14 h-6 bg-primary/30 transform rotate-3 z-10" />

        {/* Day Slider Header */}
        <div className="bg-secondary/30 border-b-2 border-border p-4">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={goToPreviousDay}
              disabled={currentDayIndex === 0}
              className="p-2 rounded-full bg-background border-2 border-border hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Day indicators */}
            <div className="flex items-center gap-2">
              {itinerary.days.map((day, index) => (
                <button
                  key={day.date}
                  onClick={() => setCurrentDayIndex(index)}
                  className={`
                    relative flex flex-col items-center px-4 py-2 rounded-sm transition-all
                    ${index === currentDayIndex 
                      ? "bg-primary text-primary-foreground shadow-lg scale-105" 
                      : "bg-background border-2 border-border hover:border-primary"
                    }
                  `}
                >
                  <span className="font-[family-name:var(--font-handwritten)] text-lg">
                    Day {index + 1}
                  </span>
                  <span className={`text-xs ${index === currentDayIndex ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  {index === currentDayIndex && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-primary" />
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={goToNextDay}
              disabled={currentDayIndex === totalDays - 1}
              className="p-2 rounded-full bg-background border-2 border-border hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Split View - Map and Plan */}
        <div className="flex flex-col lg:flex-row min-h-[500px]">
          {/* Left Side - Interactive Map */}
          <div className="lg:w-[55%] p-6 border-b-2 lg:border-b-0 lg:border-r-2 border-border">
            <ItineraryMap activities={currentDay.activities} />
          </div>

          {/* Right Side - Day Plan */}
          <div className="lg:w-[45%] p-6 bg-secondary/10" ref={planRef}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-[family-name:var(--font-serif)] text-xl text-foreground">
                {formatDate(currentDay.date)}
              </h2>
              <span className="font-[family-name:var(--font-handwritten)] text-lg text-accent">
                {currentDay.activities.length} stops
              </span>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-border" />

              <div className="space-y-4">
                {currentDay.activities.map((activity, index) => (
                  <div key={activity.id} className="relative">
                    {index > 0 &&
                      activity.travelMinutesFromPrev != null &&
                      activity.travelMinutesFromPrev > 0 && (
                        <div className="flex gap-4 mb-2 pl-12">
                          <div className="w-8 flex justify-center">
                            <div className="w-px h-6 bg-border" />
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-[family-name:var(--font-sans)]">
                            <Car className="w-3.5 h-3.5 shrink-0" />
                            ≈ {activity.travelMinutesFromPrev} min from previous stop
                          </p>
                        </div>
                      )}
                    <div className="relative flex gap-4 group">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shadow-md">
                        {index + 1}
                      </div>
                    </div>

                    {/* Activity Card */}
                    <div 
                      className="flex-1 bg-card rounded-sm border-2 border-border p-4 group-hover:border-primary/50 transition-colors"
                      style={{
                        transform: `rotate(${index % 2 === 0 ? '-0.3' : '0.3'}deg)`,
                      }}
                    >
                      {/* Time */}
                      <div className="flex items-center gap-2 text-sm text-primary font-medium mb-2">
                        <Clock className="w-4 h-4" />
                        <span>{activity.startTime} - {activity.endTime}</span>
                      </div>

                      {/* Activity Info */}
                      <h3 className="font-[family-name:var(--font-handwritten)] text-xl text-foreground">
                        {activity.name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {activity.address}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Duration: {activity.duration}
                      </p>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Copy Day Button */}
            <div className="mt-6 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const dayText = `Day ${currentDayIndex + 1} - ${formatDate(currentDay.date)}\n\n${currentDay.activities
                    .map(a => `${a.startTime} - ${a.endTime}: ${a.name}\n📍 ${a.address}`)
                    .join("\n\n")}`
                  navigator.clipboard.writeText(dayText)
                }}
                className="w-full font-[family-name:var(--font-serif)]"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Day {currentDayIndex + 1} Plan
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative footer */}
        <div className="absolute bottom-4 left-4 font-[family-name:var(--font-handwritten)] text-sm text-muted-foreground/50 transform -rotate-3">
          happy travels!
        </div>
      </div>
    </div>
  )
}
