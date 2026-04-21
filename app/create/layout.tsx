import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create a Room",
  description:
    "Create your own live listening room on Jukebox. Pick a genre, invite friends, listen together.",
  alternates: { canonical: "https://jukebox-app.com/create" },
}

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children
}
