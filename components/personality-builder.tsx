"use client"

import { TravelPreferences } from "@/app/page"
import { useState } from "react"
import { Check, Utensils, Landmark, TreePine, PartyPopper, ShoppingBag, Palette, BookOpen, Mountain, Sparkles, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PersonalityBuilderProps {
  preferences: TravelPreferences
  setPreferences: (prefs: TravelPreferences) => void
  onComplete: () => void
}

const preferenceItems = [
  { key: "food" as keyof TravelPreferences, label: "Food & Dining", icon: Utensils, description: "Local cuisine, restaurants, street food" },
  { key: "museums" as keyof TravelPreferences, label: "Museums", icon: Building2, description: "Art, science, and history museums" },
  { key: "landmarks" as keyof TravelPreferences, label: "Landmarks", icon: Landmark, description: "Famous monuments and attractions" },
  { key: "nature" as keyof TravelPreferences, label: "Nature", icon: TreePine, description: "Parks, gardens, and natural sites" },
  { key: "nightlife" as keyof TravelPreferences, label: "Nightlife", icon: PartyPopper, description: "Bars, clubs, and evening entertainment" },
  { key: "shopping" as keyof TravelPreferences, label: "Shopping", icon: ShoppingBag, description: "Markets, boutiques, and malls" },
  { key: "art" as keyof TravelPreferences, label: "Art & Culture", icon: Palette, description: "Galleries, theaters, and performances" },
  { key: "history" as keyof TravelPreferences, label: "History", icon: BookOpen, description: "Historical sites and heritage" },
  { key: "adventure" as keyof TravelPreferences, label: "Adventure", icon: Mountain, description: "Hiking, sports, and thrills" },
  { key: "relaxation" as keyof TravelPreferences, label: "Relaxation", icon: Sparkles, description: "Spas, beaches, and peaceful spots" },
]

export function PersonalityBuilder({ preferences, setPreferences, onComplete }: PersonalityBuilderProps) {
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set())

  const togglePreference = (key: keyof TravelPreferences) => {
    // Add animation
    setAnimatingItems((prev) => new Set(prev).add(key))
    setTimeout(() => {
      setAnimatingItems((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }, 600)

    setPreferences({
      ...preferences,
      [key]: !preferences[key],
    })
  }

  const selectedCount = Object.values(preferences).filter(Boolean).length

  return (
    <div className="max-w-4xl mx-auto">
      {/* Newspaper Header */}
      <div className="text-center mb-8 pt-4">
        <div className="inline-block">
          <div className="border-t-4 border-b border-foreground pt-2 pb-1 px-8">
            <h1 className="font-[family-name:var(--font-cursive)] text-4xl md:text-5xl tracking-tight text-foreground">
              The Travel Chronicle
            </h1>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground tracking-widest uppercase">
            <span>Est. 2024</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span>Vol. I, No. 1</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span>Your Journey Begins</span>
          </div>
        </div>
      </div>

      {/* Main Content - Newspaper Style */}
      <div className="relative bg-card rounded-sm shadow-xl border border-border p-6 md:p-10">
        {/* Decorative tape */}
        <div className="absolute -top-3 left-8 w-16 h-6 bg-secondary/80 transform -rotate-2" />
        <div className="absolute -top-3 right-12 w-14 h-6 bg-accent/30 transform rotate-3" />

        {/* Headline */}
        <div className="mb-8 border-b-2 border-foreground pb-4">
          <h2 className="font-[family-name:var(--font-cursive)] text-2xl md:text-3xl text-foreground leading-tight">
            Tell Us What Makes Your Heart Wander
          </h2>
          <p className="font-[family-name:var(--font-handwritten)] text-xl text-muted-foreground mt-2">
            Check off the experiences that call to your adventurous spirit
          </p>
        </div>

        {/* Checklist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {preferenceItems.map((item, index) => {
            const Icon = item.icon
            const isChecked = preferences[item.key]
            const isAnimating = animatingItems.has(item.key)
            
            return (
              <button
                key={item.key}
                onClick={() => togglePreference(item.key)}
                className={`
                  group relative flex items-start gap-4 p-4 rounded-sm border-2 text-left transition-all duration-300
                  ${isChecked 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 bg-transparent"
                  }
                  ${isAnimating ? "scale-[1.02]" : ""}
                `}
                style={{
                  transform: `rotate(${index % 2 === 0 ? '-0.5' : '0.5'}deg)`,
                }}
              >
                {/* Checkbox */}
                <div 
                  className={`
                    relative w-6 h-6 flex-shrink-0 border-2 rounded-sm transition-all duration-300
                    ${isChecked 
                      ? "bg-primary border-primary" 
                      : "border-foreground/40 bg-transparent group-hover:border-primary"
                    }
                  `}
                >
                  <Check 
                    className={`
                      absolute inset-0 w-full h-full p-0.5 text-primary-foreground transition-all duration-300
                      ${isChecked ? "opacity-100 scale-100" : "opacity-0 scale-50"}
                      ${isAnimating && isChecked ? "animate-bounce" : ""}
                    `}
                    strokeWidth={3}
                  />
                  {/* Check animation effect */}
                  {isAnimating && isChecked && (
                    <div className="absolute inset-0 animate-ping bg-primary/50 rounded-sm" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isChecked ? "text-primary" : "text-muted-foreground"} transition-colors`} />
                    <span className={`font-[family-name:var(--font-cursive)] text-lg ${isChecked ? "text-primary" : "text-foreground"} transition-colors`}>
                      {item.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 font-[family-name:var(--font-handwritten)] text-base">
                    {item.description}
                  </p>
                </div>

                {/* Decorative strikethrough when checked */}
                {isChecked && (
                  <div 
                    className="absolute left-12 right-4 top-1/2 h-0.5 bg-primary/30 transform -translate-y-1/2 transition-all duration-500"
                    style={{
                      clipPath: isAnimating ? "inset(0 100% 0 0)" : "inset(0 0% 0 0)",
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-handwritten)] text-xl text-muted-foreground">
              {selectedCount} {selectedCount === 1 ? "interest" : "interests"} selected
            </span>
            {selectedCount >= 3 && (
              <span className="text-primary animate-pulse">*</span>
            )}
          </div>
          
          <Button 
            onClick={onComplete}
            disabled={selectedCount < 1}
            className="group relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-[family-name:var(--font-cursive)] rounded-xl shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
          >
            <span className="relative z-10">Continue to My Lists</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Button>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-4 left-4 font-[family-name:var(--font-handwritten)] text-sm text-muted-foreground/50 transform -rotate-3">
          page 1 of your journey
        </div>
      </div>
    </div>
  )
}
