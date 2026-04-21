import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Your Account",
  description: "Manage your Jukebox account, favorites, and settings.",
  alternates: { canonical: "https://jukebox-app.com/account" },
  robots: { index: false, follow: false },
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children
}
