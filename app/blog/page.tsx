import type { Metadata } from "next"
import Link from "next/link"
import { getAllPosts } from "@/lib/blog"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Music discovery, listening culture, and the art of shared music experiences. By Jukebox.",
  alternates: { canonical: "https://jukebox-app.com/blog" },
  openGraph: {
    title: "Jukebox Blog",
    description: "Music discovery, listening culture, and community.",
    url: "https://jukebox-app.com/blog",
  },
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function BlogIndexPage() {
  const posts = getAllPosts()

  return (
    <div
      className="relative min-h-screen"
      style={{ background: "#0d0b10", color: "#e8e6ea" }}
    >
      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-3xl px-5 pb-24 pt-10 sm:px-6 sm:pt-16">
          <header className="mb-14">
            <p
              className="mb-3 text-xs font-semibold uppercase"
              style={{
                color: "rgba(232,230,234,0.45)",
                letterSpacing: "0.18em",
              }}
            >
              The Jukebox Blog
            </p>
            <h1
              className="text-4xl font-bold tracking-tight sm:text-5xl"
              style={{ color: "#e8e6ea" }}
            >
              Music, listening culture, and the rooms you drop into.
            </h1>
            <p
              className="mt-5 max-w-2xl text-lg leading-7"
              style={{ color: "rgba(232,230,234,0.6)" }}
            >
              Notes on communal listening, how music apps have evolved, and the
              small rituals that make sharing a song with someone feel like
              something.
            </p>
          </header>

          {posts.length === 0 ? (
            <div
              className="rounded-xl px-5 py-8 text-center text-sm"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "0.5px solid rgba(255,255,255,0.06)",
                color: "rgba(232,230,234,0.5)",
              }}
            >
              No posts yet. Check back soon.
            </div>
          ) : (
            <ul className="space-y-4">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block rounded-2xl px-5 py-5 transition-colors hover:bg-white/[0.04] sm:px-6 sm:py-6"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "0.5px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {post.genre_room && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                          style={{
                            background: "rgba(232,154,60,0.12)",
                            border: "0.5px solid rgba(232,154,60,0.25)",
                            color: "#e89a3c",
                            letterSpacing: "0.12em",
                          }}
                        >
                          {post.genre_room.replace(/-/g, " ")}
                        </span>
                      )}
                      <span
                        className="text-[12px]"
                        style={{ color: "rgba(232,230,234,0.45)" }}
                      >
                        {formatDate(post.date)}
                      </span>
                      <span
                        className="text-[12px]"
                        style={{ color: "rgba(232,230,234,0.35)" }}
                        aria-hidden
                      >
                        ·
                      </span>
                      <span
                        className="text-[12px]"
                        style={{ color: "rgba(232,230,234,0.45)" }}
                      >
                        {post.readingTime}
                      </span>
                    </div>

                    <h2
                      className="mt-3 text-xl font-bold tracking-tight transition-colors sm:text-2xl"
                      style={{ color: "#e8e6ea" }}
                    >
                      {post.title}
                    </h2>

                    <p
                      className="mt-2 text-[15px] leading-6"
                      style={{ color: "rgba(232,230,234,0.65)" }}
                    >
                      {post.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>

        <Footer />
      </div>
    </div>
  )
}
