import { publicEnv } from "@/lib/env-public"

/**
 * Join `NEXT_PUBLIC_API_BASE_URL` (or `/api`) with a path like `/build/` without `//`.
 * Django accepts endpoints with or without a trailing slash; this keeps URLs consistent.
 */
export function resolvedApiUrl(pathSuffix: string): string {
  const base = String(publicEnv.apiBaseUrl || "").trim().replace(/\/+$/, "")
  let path = String(pathSuffix || "").trim()
  if (!path.startsWith("/")) path = `/${path}`
  const joined = `${base}${path}`.replace(/([^:])\/{2,}/g, "$1/")
  return joined
}
