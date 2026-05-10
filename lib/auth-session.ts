export type AuthSession = {
  userId: string
  email: string
  name: string
  /** Django REST Framework Token — send as Authorization: Token … */
  token: string
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
    const s = JSON.parse(raw) as Partial<AuthSession>
    if (
      s?.userId &&
      typeof s.userId === "string" &&
      s?.email &&
      typeof s.email === "string" &&
      s?.token &&
      typeof s.token === "string"
    ) {
      return {
        userId: s.userId,
        email: s.email,
        name: typeof s.name === "string" ? s.name : s.email.split("@")[0],
        token: s.token,
        picture: typeof s.picture === "string" ? s.picture : undefined,
      }
    }
    clearSession()
  } catch {
    clearSession()
  }
  return null
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
