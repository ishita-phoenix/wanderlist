"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PersonalityBuilder } from "@/components/personality-builder"
import { CityLists } from "@/components/city-lists"
import { CityListView } from "@/components/city-list-view"
import { DiscoverPage } from "@/components/discover-page"
import { BuildItinerary } from "@/components/build-itinerary"
import { ItineraryView } from "@/components/itinerary-view"
import { Navigation } from "@/components/navigation"
import { loadUserState, saveUserState } from "@/lib/api"
import {
  clearSession,
  ensureLocalSession,
  readSession,
  type AuthSession,
} from "@/lib/auth-session"
import { activityHasStoredPopularity, enrichActivityWithPopularity } from "@/lib/popularity"
import { DEFAULT_CITY_LISTS, DEFAULT_PREFERENCES } from "@/lib/default-user-state"

export type AppScreen = 
  | "personality" 
  | "lists" 
  | "city-list" 
  | "discover" 
  | "build" 
  | "itinerary"

export interface TravelPreferences {
  food: boolean
  museums: boolean
  landmarks: boolean
  nature: boolean
  nightlife: boolean
  shopping: boolean
  art: boolean
  history: boolean
  adventure: boolean
  relaxation: boolean
}

export interface Activity {
  id: string
  name: string
  description: string
  image: string
  category: string
  duration: string
  rating: number
  address: string
  lat?: number
  lng?: number
  /** OSM tags from Photon (optional); helps rank / filter search hits */
  osmKey?: string
  osmValue?: string
  /** Optional short “why visit” line from AI when OPENAI_API_KEY is set */
  aiTip?: string
  /** 0–100: Foursquare Places `rating` (~0→10 scaled to %) when saving, else client 0–5★ scaled */
  popularityScore?: number
  popularitySource?: "foursquare" | "foursquare_listing" | "client_stars"
}

export interface CityList {
  id: string
  name: string
  country: string
  color: string
  activities: Activity[]
}

export interface Itinerary {
  startDate: string
  endDate: string
  wakeTime: string
  sleepTime: string
  days: ItineraryDay[]
  /** GPT short paragraph when OPENAI_API_KEY is set on the backend */
  aiSummary?: string
}

export interface ItineraryDay {
  date: string
  activities: ScheduledActivity[]
}

export interface ScheduledActivity extends Activity {
  startTime: string
  endTime: string
  travelMinutesFromPrev?: number
}

export default function Home() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const loadedRef = useRef(false)

  const [currentScreen, setCurrentScreen] = useState<AppScreen>("personality")
  const [preferences, setPreferences] = useState<TravelPreferences>(DEFAULT_PREFERENCES)
  const [selectedCity, setSelectedCity] = useState<CityList | null>(null)
  const [cityLists, setCityLists] = useState<CityList[]>(DEFAULT_CITY_LISTS)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)

  /** Always read the list from `cityLists` so saved state merges (and popularity) are visible after hydrate. */
  const activeCity = useMemo(() => {
    if (!selectedCity) return null
    return cityLists.find((c) => c.id === selectedCity.id) ?? selectedCity
  }, [selectedCity, cityLists])

  useEffect(() => {
    setSession(readSession() ?? ensureLocalSession())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!session?.userId) return
    loadedRef.current = false
    const bootstrap = async () => {
      const data = await loadUserState(session.userId)
      if (data.preferences) setPreferences({ ...DEFAULT_PREFERENCES, ...data.preferences })
      if (data.cityLists && data.cityLists.length > 0) setCityLists(data.cityLists)
      if (data.itinerary) setItinerary(data.itinerary)
      loadedRef.current = true
    }
    bootstrap()
  }, [session?.userId])

  useEffect(() => {
    if (!session?.userId || !loadedRef.current) return
    const id = setTimeout(() => {
      saveUserState({ userId: session.userId, preferences, cityLists, itinerary })
    }, 600)
    return () => clearTimeout(id)
  }, [session?.userId, preferences, cityLists, itinerary])

  useEffect(() => {
    if (currentScreen !== "build" || !activeCity?.activities.length || !hydrated || !loadedRef.current) return
    if (!activeCity.activities.some((a) => !activityHasStoredPopularity(a))) return
    let cancelled = false
    ;(async () => {
      const enriched = await Promise.all(
        activeCity.activities.map((a) => enrichActivityWithPopularity(a, activeCity.name, activeCity.country))
      )
      if (cancelled) return
      setCityLists((lists) => lists.map((c) => (c.id === activeCity.id ? { ...c, activities: enriched } : c)))
      setSelectedCity((prev) => (prev && prev.id === activeCity.id ? { ...prev, activities: enriched } : prev))
    })()
    return () => {
      cancelled = true
    }
  }, [currentScreen, activeCity, hydrated])

  const handleCitySelect = (city: CityList) => {
    setSelectedCity(city)
    setCurrentScreen("city-list")
  }

  const handleAddActivity = async (activity: Activity) => {
    if (!selectedCity) return
    const withPopularity = await enrichActivityWithPopularity(activity, selectedCity.name, selectedCity.country)
    setCityLists((lists) =>
      lists.map((c) =>
        c.id === selectedCity.id ? { ...c, activities: [...c.activities, withPopularity] } : c
      )
    )
    setSelectedCity({
      ...selectedCity,
      activities: [...selectedCity.activities, withPopularity],
    })
  }

  const handleRemoveActivity = (activityId: string) => {
    if (selectedCity) {
      const updatedLists = cityLists.map((city) =>
        city.id === selectedCity.id
          ? { ...city, activities: city.activities.filter((a) => a.id !== activityId) }
          : city
      )
      setCityLists(updatedLists)
      setSelectedCity({
        ...selectedCity,
        activities: selectedCity.activities.filter((a) => a.id !== activityId),
      })
    }
  }

  const handleBuildItinerary = (newItinerary: Itinerary) => {
    setItinerary(newItinerary)
    setCurrentScreen("itinerary")
  }

  const handleSignOut = useCallback(() => {
    clearSession()
    setSession(ensureLocalSession())
    setPreferences(DEFAULT_PREFERENCES)
    setCityLists(DEFAULT_CITY_LISTS)
    setItinerary(null)
    setSelectedCity(null)
    setCurrentScreen("personality")
    loadedRef.current = false
  }, [])

  if (!hydrated || !session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-[family-name:var(--font-cursive)] text-xl">Loading…</p>
      </main>
    )
  }

  const handleAddCity = (cityName: string, country: string) => {
    const colors = ["#E57373", "#64B5F6", "#81C784", "#FFB74D", "#BA68C8", "#4DD0E1"]
    const newCity: CityList = {
      id: Date.now().toString(),
      name: cityName,
      country: country,
      color: colors[cityLists.length % colors.length],
      activities: [],
    }
    setCityLists([...cityLists, newCity])
  }

  const handleDeleteCity = (cityId: string) => {
    const city = cityLists.find((c) => c.id === cityId)
    if (!city) return
    if (
      !window.confirm(
        `Remove "${city.name}" from your board? All saved places in this list will be deleted.`
      )
    ) {
      return
    }
    setCityLists((lists) => lists.filter((c) => c.id !== cityId))
    if (selectedCity?.id === cityId) {
      setSelectedCity(null)
      setCurrentScreen("lists")
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        selectedCity={activeCity ?? selectedCity}
        session={session}
        onSignOut={handleSignOut}
      />
      
      <div className="container mx-auto px-4 py-6">
        {currentScreen === "personality" && (
          <PersonalityBuilder 
            preferences={preferences} 
            setPreferences={setPreferences}
            onComplete={() => setCurrentScreen("lists")}
          />
        )}
        
        {currentScreen === "lists" && (
          <CityLists 
            cities={cityLists}
            onSelectCity={handleCitySelect}
            onAddCity={handleAddCity}
            onRemoveCity={handleDeleteCity}
          />
        )}
        
        {currentScreen === "city-list" && activeCity && (
          <CityListView 
            city={activeCity}
            onDiscover={() => setCurrentScreen("discover")}
            onBuild={() => setCurrentScreen("build")}
            onRemoveActivity={handleRemoveActivity}
            onAddActivity={handleAddActivity}
            onBack={() => setCurrentScreen("lists")}
            onDeleteList={() => handleDeleteCity(activeCity.id)}
          />
        )}
        
        {currentScreen === "discover" && activeCity && (
          <DiscoverPage 
            city={activeCity}
            preferences={preferences}
            onAddActivity={handleAddActivity}
            onBack={() => setCurrentScreen("city-list")}
          />
        )}
        
        {currentScreen === "build" && activeCity && (
          <BuildItinerary 
            city={activeCity}
            preferences={preferences}
            onBuild={handleBuildItinerary}
            onBack={() => setCurrentScreen("city-list")}
          />
        )}
        
        {currentScreen === "itinerary" && itinerary && activeCity && (
          <ItineraryView 
            itinerary={itinerary}
            city={activeCity}
            onBack={() => setCurrentScreen("build")}
          />
        )}
      </div>
    </main>
  )
}
