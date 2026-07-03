import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jukebox",
    short_name: "Jukebox",
    description: "Listen to music together in live rooms",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0b10",
    theme_color: "#1a1520",
    icons: [
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Full-bleed variant with the glyph inside the safe zone — Android
      // adaptive icons crop this with the launcher mask.
      { src: "/icon-512x512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  }
}
