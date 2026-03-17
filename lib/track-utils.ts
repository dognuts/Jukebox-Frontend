/**
 * Parse a pasted URL into a track source type and normalized URL/ID.
 */

export type ParsedTrackSource = {
  source: "youtube" | "soundcloud" | "mp3"
  sourceUrl: string
  videoId?: string // YouTube only
  embedUrl?: string
}

// YouTube URL patterns (includes music.youtube.com)
const YT_PATTERNS = [
  /(?:(?:music\.)?youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /(?:music\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /(?:music\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
]

// SoundCloud URL pattern
const SC_PATTERN = /^https?:\/\/(www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/

// Direct audio file extensions
const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|flac|m4a|aac|webm)(\?.*)?$/i

export function parseTrackUrl(input: string): ParsedTrackSource | null {
  const url = input.trim()
  if (!url) return null

  // Check YouTube
  for (const pattern of YT_PATTERNS) {
    const match = url.match(pattern)
    if (match) {
      const videoId = match[1]
      return {
        source: "youtube",
        sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
        videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
      }
    }
  }

  // Check SoundCloud
  if (SC_PATTERN.test(url)) {
    return {
      source: "soundcloud",
      sourceUrl: url,
    }
  }

  // Check direct audio file
  if (AUDIO_EXTENSIONS.test(url) || url.startsWith("blob:")) {
    return {
      source: "mp3",
      sourceUrl: url,
    }
  }

  return null
}

/**
 * Extract a reasonable title guess from a URL when no metadata is available.
 */
export function guessTitleFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const filename = pathname.split("/").pop() || ""
    // Remove extension and decode
    return decodeURIComponent(filename.replace(/\.[^.]+$/, "").replace(/[-_+]/g, " ")).trim() || "Unknown Track"
  } catch {
    return "Unknown Track"
  }
}

/**
 * Random gradient for album art placeholder.
 */
const GRADIENT_HUES = [30, 60, 150, 200, 250, 300, 330]

export function randomAlbumGradient(): string {
  const h1 = GRADIENT_HUES[Math.floor(Math.random() * GRADIENT_HUES.length)]
  const h2 = (h1 + 40 + Math.floor(Math.random() * 60)) % 360
  return `linear-gradient(135deg, oklch(0.45 0.15 ${h1}), oklch(0.35 0.20 ${h2}))`
}
