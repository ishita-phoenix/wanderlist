export type AuthSession = {
  userId: string
  email: string
  name: string
  picture?: string
}

const SESSION_KEY = "wanderlist-session"
const SESSION_KEY_LEGACY = "wanderlust-session"
const USER_ID_KEY = "wanderlist-user-id"
const USER_ID_KEY_LEGACY = "wanderlust-user-id"

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw =
      localStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY_LEGACY)
    if (!raw) return null
    const s = JSON.parse(raw) as AuthSession
    if (s?.userId && typeof s.userId === "string") return s
  } catch {
    /* ignore */
  }
  return null
}

/** Persists an anonymous traveller id so Django `/state/` works without login (login can be wired later). */
export function ensureLocalSession(): AuthSession {
  const existing = readSession()
  if (existing) return existing
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  const s: AuthSession = { userId: `anon:${id}`, email: "", name: "Traveler" }
  writeSession(s)
  return s
}

export function writeSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  localStorage.setItem(USER_ID_KEY, session.userId)
  localStorage.removeItem(SESSION_KEY_LEGACY)
  localStorage.removeItem(USER_ID_KEY_LEGACY)
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(SESSION_KEY_LEGACY)
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(USER_ID_KEY_LEGACY)
}
