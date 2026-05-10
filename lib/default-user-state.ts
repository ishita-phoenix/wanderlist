import type { CityList, TravelPreferences } from "@/app/page"

export const DEFAULT_PREFERENCES: TravelPreferences = {
  food: false,
  museums: false,
  landmarks: false,
  nature: false,
  nightlife: false,
  shopping: false,
  art: false,
  history: false,
  adventure: false,
  relaxation: false,
}

export const DEFAULT_CITY_LISTS: CityList[] = [
  { id: "1", name: "New York", country: "USA", color: "#E57373", activities: [] },
  { id: "2", name: "Paris", country: "France", color: "#64B5F6", activities: [] },
  { id: "3", name: "Tokyo", country: "Japan", color: "#81C784", activities: [] },
]
