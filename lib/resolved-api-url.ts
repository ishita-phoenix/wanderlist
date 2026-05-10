import { publicEnv } from "@/lib/env-public"

/**
 * Join API base URL with a path like `/build/`.
 * Absolute bases (`https://…`) use the URL API so we never corrupt `https://`.
 */
export function resolvedApiUrl(pathSuffix: string): string {
  const baseRaw = String(publicEnv.apiBaseUrl || "").trim() || "/api"
  let suffix = String(pathSuffix || "").trim()
  if (!suffix.startsWith("/")) suffix = `/${suffix}`

  if (/^https?:\/\//i.test(baseRaw)) {
    const cleanBase = baseRaw.replace(/\/+$/, "")
    return new URL(`${cleanBase}${suffix}`).href
  }

  const base = baseRaw.replace(/\/+$/, "")
  return `${base}${suffix}`.replace(/([^:])\/{2,}/g, "$1/")
}
