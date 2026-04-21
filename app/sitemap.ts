import type { MetadataRoute } from "next"
import { getAllPosts } from "@/lib/blog"

const BASE_URL = "https://jukebox-app.com"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/login",
    "/signup",
    "/pricing",
    "/create",
    "/privacy",
    "/terms",
    "/support",
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1.0 : 0.5,
  }))

  const blogIndex: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
  ]

  const blogPosts: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  const genreRooms: MetadataRoute.Sitemap = [
    "lo-fi",
    "hip-hop",
    "jazz",
    "electronic",
    "indie",
    "soul",
  ].map((genre) => ({
    url: `${BASE_URL}/room/${genre}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }))

  // Pull live user-created rooms from the backend at build/revalidate time.
  // Backend returns APIRoom[]: { slug, lastActive?, createdAt, isLive, ... }
  let userRooms: MetadataRoute.Sitemap = []
  const apiBase = process.env.NEXT_PUBLIC_API_URL || ""
  if (apiBase) {
    try {
      const res = await fetch(`${apiBase}/api/rooms?live=true`, {
        next: { revalidate: 3600 },
      })
      if (res.ok) {
        const rooms = (await res.json()) as Array<{
          slug?: string
          lastActive?: string
          createdAt?: string
        }>
        userRooms = (rooms || [])
          .filter((room) => typeof room?.slug === "string" && room.slug.length > 0)
          .slice(0, 200)
          .map((room) => ({
            url: `${BASE_URL}/room/${room.slug}`,
            lastModified: room.lastActive
              ? new Date(room.lastActive)
              : room.createdAt
              ? new Date(room.createdAt)
              : now,
            changeFrequency: "daily" as const,
            priority: 0.6,
          }))
      }
    } catch {
      // Backend unavailable — ship sitemap without user rooms.
    }
  }

  return [
    ...staticPages,
    ...genreRooms,
    ...blogIndex,
    ...blogPosts,
    ...userRooms,
  ]
}
