import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create a Jukebox",
  description:
    "Become a DJ. Build a tracklist, name your Jukebox, go live. Let listeners suggest tracks or lock it down — your room, your rules. Free.",
  alternates: { canonical: "https://jukebox-app.com/create" },
}

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children
}
