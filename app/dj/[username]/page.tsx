import type { Metadata } from "next"
import { DJClient } from "./dj-client"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const canonical = `https://jukebox-app.com/dj/${username}`
  const title = `${username} — DJ Profile`
  const description = `Check out ${username} on Jukebox. See their rooms, favorites, and listening history.`

  return {
    title,
    description,
    openGraph: {
      title: `${username} on Jukebox`,
      description: "DJ profile on Jukebox — listen together.",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: { canonical },
  }
}

export default async function DJProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  return <DJClient username={username} />
}
