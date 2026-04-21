import fs from "fs"
import path from "path"
import matter from "gray-matter"
import readingTime from "reading-time"

const BLOG_DIR = path.join(process.cwd(), "content", "blog")

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  author: string
  keywords: string[]
  genre_room: string
  cover_alt: string
  readingTime: string
  content: string
}

function parsePost(slug: string, raw: string): BlogPost {
  const { data, content } = matter(raw)
  const rt = readingTime(content)

  return {
    slug,
    title: data.title ?? "",
    description: data.description ?? "",
    date: data.date ?? "",
    author: data.author ?? "Jukebox Team",
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    genre_room: data.genre_room ?? "",
    cover_alt: data.cover_alt ?? "",
    readingTime: rt.text,
    content,
  }
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return []

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"))

  const posts = files.map((file) => {
    const slug = file.replace(/\.mdx$/, "")
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf-8")
    return parsePost(slug, raw)
  })

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, "utf-8")
  return parsePost(slug, raw)
}

export function getRelatedPosts(
  currentSlug: string,
  limit = 3,
): BlogPost[] {
  return getAllPosts()
    .filter((p) => p.slug !== currentSlug)
    .slice(0, limit)
}
