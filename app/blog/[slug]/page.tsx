import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MDXRemote } from "next-mdx-remote/rsc"
import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/lib/blog"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { PostLayout } from "@/components/blog/post-layout"
import { mdxComponents } from "@/components/blog/mdx-components"

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  const canonical = `https://jukebox-app.com/blog/${slug}`

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      url: canonical,
      siteName: "Jukebox",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    alternates: { canonical },
  }
}

function ArticleJsonLd({
  slug,
  title,
  description,
  date,
}: {
  slug: string
  title: string
  description: string
  date: string
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished: date,
    dateModified: date,
    author: {
      "@type": "Organization",
      name: "Jukebox",
      url: "https://jukebox-app.com",
    },
    publisher: {
      "@type": "Organization",
      name: "Jukebox",
      url: "https://jukebox-app.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://jukebox-app.com/blog/${slug}`,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const related = getRelatedPosts(slug, 3)

  return (
    <div
      className="relative min-h-screen"
      style={{ background: "#0d0b10", color: "#e8e6ea" }}
    >
      <ArticleJsonLd
        slug={slug}
        title={post.title}
        description={post.description}
        date={post.date}
      />
      <div className="relative z-10">
        <Navbar />
        <PostLayout post={post} related={related}>
          <MDXRemote source={post.content} components={mdxComponents} />
        </PostLayout>
        <Footer />
      </div>
    </div>
  )
}
