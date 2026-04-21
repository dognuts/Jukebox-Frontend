import { redirect } from "next/navigation"

// Dynamic: we want every hit to resolve to the currently-featured room,
// not a slug frozen at build time.
export const dynamic = "force-dynamic"

// If the backend is unreachable, fall back to the current live room.
const FALLBACK_SLUG = "the-b-side"

export default async function LiveRedirectPage() {
  let slug = FALLBACK_SLUG

  const apiBase = process.env.NEXT_PUBLIC_API_URL || ""
  if (apiBase) {
    try {
      const res = await fetch(`${apiBase}/api/featured`, {
        cache: "no-store",
      })
      if (res.ok) {
        const room = (await res.json()) as { slug?: string } | null
        if (room?.slug) slug = room.slug
      }
    } catch {
      // Keep fallback.
    }
  }

  redirect(`/room/${slug}`)
}
