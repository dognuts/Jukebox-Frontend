/**
 * Helpers for the ?next= return-to param used by the auth pages.
 *
 * Only same-origin relative paths are honored: the value must start with a
 * single "/" — protocol-relative "//host" values and backslash variants that
 * some browsers normalize to "//" are rejected — so a crafted link can never
 * bounce a fresh login to another origin.
 */

export function sanitizeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null
  return raw
}

/**
 * Append a validated ?next= to an auth route ("/login", "/signup").
 * Skips "/" — returning home is already the post-auth default.
 */
export function withNextParam(authPath: string, next: string | null | undefined): string {
  const safe = sanitizeNextPath(next)
  if (!safe || safe === "/") return authPath
  return `${authPath}?next=${encodeURIComponent(safe)}`
}
