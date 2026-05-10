"use client"

import { AppScreen } from "@/app/page"
import { CityList } from "@/app/page"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AuthSession } from "@/lib/auth-session"
import { ChevronDown, LogOut, MapPin, User, List } from "lucide-react"

interface NavigationProps {
  currentScreen: AppScreen
  onNavigate: (screen: AppScreen) => void
  selectedCity: CityList | null
  session: AuthSession
  onSignOut: () => void
}

export function Navigation({ currentScreen, onNavigate, selectedCity, session, onSignOut }: NavigationProps) {
  const navItems = [
    { id: "personality" as AppScreen, label: "Profile", icon: User },
    { id: "lists" as AppScreen, label: "My Lists", icon: List },
  ]

  return (
    <header className="sticky top-0 z-50 border-b-2 border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button 
            onClick={() => onNavigate("lists")}
            className="flex items-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center transform -rotate-6 group-hover:rotate-0 transition-transform">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-cursive)] text-2xl text-primary leading-none">
                Wanderlist
              </span>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">
                Travel Journal
              </span>
            </div>
          </button>

          {/* Current Location Breadcrumb */}
          {selectedCity && (currentScreen === "city-list" || currentScreen === "discover" || currentScreen === "build" || currentScreen === "itinerary") && (
            <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-secondary/50 rounded-full border border-border">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="font-[family-name:var(--font-cursive)] text-lg text-foreground">
                {selectedCity.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {selectedCity.country}
              </span>
            </div>
          )}

          {/* Nav Items + account */}
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = currentScreen === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                    ${isActive 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "hover:bg-secondary text-foreground"
                    }
                  `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm font-medium">{item.label}</span>
                  </button>
                )
              })}
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 pl-2 border-l border-border rounded-lg py-1 pr-1 -mr-1 hover:bg-secondary/80 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Account menu"
                >
                  <Avatar className="size-9 border-2 border-border shrink-0 shadow-sm">
                    {session.picture ? (
                      <AvatarImage
                        src={session.picture}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="font-[family-name:var(--font-cursive)] text-sm bg-secondary">
                      {(session.name || session.email || "?").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm text-foreground truncate font-medium max-w-[140px] md:max-w-[200px] text-left">
                    {session.name || session.email}
                  </span>
                  <ChevronDown className="hidden sm:block size-4 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 border-2 border-border bg-card p-0 shadow-xl">
                <div className="border-b border-border bg-secondary/30 px-3 py-4">
                  <div className="flex gap-3">
                    <Avatar className="size-16 border-2 border-border shadow-md shrink-0">
                      {session.picture ? (
                        <AvatarImage
                          src={session.picture}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="object-cover"
                        />
                      ) : null}
                      <AvatarFallback className="font-[family-name:var(--font-cursive)] text-2xl bg-secondary">
                        {(session.name || session.email || "?").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="font-[family-name:var(--font-cursive)] text-lg text-foreground leading-tight truncate">
                        {session.name || "Traveler"}
                      </p>
                      {session.email ? (
                        <p className="text-xs text-muted-foreground break-all mt-1">{session.email}</p>
                      ) : null}
                      <p className="text-[10px] text-muted-foreground/80 mt-2 font-mono truncate" title={session.userId}>
                        ID: {session.userId.slice(0, 12)}…
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3 uppercase tracking-wider">
                    Saves to Django under this browser id (login coming later)
                  </p>
                </div>
                <DropdownMenuLabel className="sr-only">Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  className="cursor-pointer gap-2 py-3 focus:bg-destructive/10 focus:text-destructive"
                  onClick={onSignOut}
                >
                  <LogOut className="size-4" />
                  Reset local profile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
