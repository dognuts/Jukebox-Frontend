import Image, { type ImageProps } from "next/image"

/**
 * next/image wrapper for user- and API-supplied artwork whose origin is
 * not known ahead of time (room cover art, avatars, chat GIFs).
 *
 * The Next image optimizer only accepts remote hosts allowlisted in
 * next.config.mjs `images.remotePatterns` and throws at render time for
 * anything else. Cover art is usually an inline data: URL (handled
 * natively by next/image, which auto-disables optimization for it), but
 * it can also be an arbitrary remote URL. This wrapper routes known
 * CDN hosts through the optimizer and renders everything else as a
 * plain lazy-loaded <img> via `unoptimized`, so an unexpected host can
 * never crash the page.
 *
 * OPTIMIZED_HOSTS must stay in sync with images.remotePatterns in
 * next.config.mjs.
 */
const OPTIMIZED_HOSTS = [
  /(^|\.)ytimg\.com$/, // YouTube thumbnails (i.ytimg.com)
  /(^|\.)sndcdn\.com$/, // SoundCloud artwork (i1.sndcdn.com, ...)
]

function isOptimizable(src: string): boolean {
  // Local assets under /public are always safe to optimize.
  if (src.startsWith("/")) return true
  try {
    const { protocol, hostname } = new URL(src)
    return protocol === "https:" && OPTIMIZED_HOSTS.some((re) => re.test(hostname))
  } catch {
    // Relative or unparseable — let next/image handle it unoptimized.
    return false
  }
}

export function SmartImage({ src, ...props }: Omit<ImageProps, "src"> & { src: string }) {
  return <Image src={src} unoptimized={!isOptimizable(src)} {...props} />
}
