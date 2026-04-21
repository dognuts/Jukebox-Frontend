import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { BlogPost } from "@/lib/blog"

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

export function PostLayout({
  post,
  related,
  children,
}: {
  post: BlogPost
  related: BlogPost[]
  children: React.ReactNode
}) {
  return (
    <article className="mx-auto max-w-[680px] px-5 pb-24 pt-8 sm:px-6 sm:pt-12">
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-xs transition-colors hover:opacity-80"
        style={{ color: "rgba(232,230,234,0.5)" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All posts
      </Link>

      {/* Title block */}
      <header className="mt-10 mb-10">
        {post.genre_room && (
          <Link
            href={`/room/${post.genre_room}`}
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest no-underline"
            style={{
              background: "rgba(232,154,60,0.12)",
              border: "0.5px solid rgba(232,154,60,0.28)",
              color: "#e89a3c",
              letterSpacing: "0.12em",
            }}
          >
            {post.genre_room.replace(/-/g, " ")}
          </Link>
        )}
        <h1
          className="mt-5 text-4xl font-bold tracking-tight sm:text-[42px] sm:leading-[1.1]"
          style={{ color: "#e8e6ea" }}
        >
          {post.title}
        </h1>
        <p
          className="mt-5 text-lg leading-7"
          style={{ color: "rgba(232,230,234,0.65)" }}
        >
          {post.description}
        </p>
        <div
          className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]"
          style={{ color: "rgba(232,230,234,0.45)" }}
        >
          <span>{post.author}</span>
          {post.date && (
            <>
              <span aria-hidden>·</span>
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </>
          )}
          {post.readingTime && (
            <>
              <span aria-hidden>·</span>
              <span>{post.readingTime}</span>
            </>
          )}
        </div>
      </header>

      {/* MDX content */}
      <div className="prose-content">{children}</div>

      {/* Related posts */}
      {related.length > 0 && (
        <aside
          className="mt-20 border-t pt-10"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <h2
            className="mb-6 text-xs font-semibold uppercase tracking-widest"
            style={{
              color: "rgba(232,230,234,0.5)",
              letterSpacing: "0.16em",
            }}
          >
            More reading
          </h2>
          <ul className="space-y-5">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/blog/${r.slug}`}
                  className="group block rounded-xl p-4 transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "0.5px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    className="text-base font-semibold"
                    style={{ color: "#e8e6ea" }}
                  >
                    {r.title}
                  </div>
                  <div
                    className="mt-1 line-clamp-2 text-sm"
                    style={{ color: "rgba(232,230,234,0.55)" }}
                  >
                    {r.description}
                  </div>
                  <div
                    className="mt-2 text-[12px]"
                    style={{ color: "rgba(232,230,234,0.4)" }}
                  >
                    {formatDate(r.date)} · {r.readingTime}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  )
}
