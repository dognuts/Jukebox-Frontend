/**
 * Defensive cap for `data:` URLs embedded in server-rendered payloads.
 *
 * Background (FALLBACK_BODY_TOO_LARGE on Vercel): room cover art is stored as
 * a base64 `data:` URL. When a server component embeds a rooms list / room
 * detail / DJ profile into an ISR page, a few multi-MB covers push the
 * prerendered HTML past Vercel's 20MB limit and the page fails to render.
 *
 * The backend already compresses at upload, rejects oversized covers at write,
 * and strips legacy oversized covers at read. This is the final layer: even if
 * a future backend regression reintroduces the bloat, the frontend caps any
 * `data:` URL field before it reaches a client component / the SSR HTML.
 *
 * `stripOversizedDataUrl` only touches strings that start with `data:` and
 * exceed the cap — plain `https:` URLs (and short covers) pass through
 * untouched. Oversized ones become `""`, which the consumers treat as "no
 * cover/avatar" and fall back to their gradient/initials placeholder.
 */

/**
 * Cap for the homepage rooms LIST payload. Tighter than the detail cap because
 * a list embeds many rooms at once (50 × 512KB would still blow the 20MB ISR
 * limit). Matches the backend's list-serialization threshold.
 */
export const LIST_DATA_URL_MAX_CHARS = 128 * 1024

/**
 * Cap for single-item DETAIL payloads (room detail, DJ profile) where only one
 * cover/avatar is embedded. Matches the backend's detail-serialization
 * threshold.
 */
export const DETAIL_DATA_URL_MAX_CHARS = 512 * 1024

export function stripOversizedDataUrl(value: string, maxChars?: number): string
export function stripOversizedDataUrl(
  value: string | undefined,
  maxChars?: number,
): string | undefined
export function stripOversizedDataUrl(
  value: string | null,
  maxChars?: number,
): string | null
export function stripOversizedDataUrl(
  value: string | null | undefined,
  maxChars?: number,
): string | null | undefined
export function stripOversizedDataUrl(
  value: string | null | undefined,
  maxChars = DETAIL_DATA_URL_MAX_CHARS,
): string | null | undefined {
  if (
    typeof value === "string" &&
    value.startsWith("data:") &&
    value.length > maxChars
  ) {
    return ""
  }
  return value
}
