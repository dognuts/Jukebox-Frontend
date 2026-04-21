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
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  }
}
