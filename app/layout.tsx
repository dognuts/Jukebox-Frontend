// Force rebuild v8 - performance-mode.tsx deleted entirely
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/sonner"
import { ProgressBar } from "@/components/effects/progress-bar"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://jukebox-app.com",
  ),
  title: {
    default: "Jukebox — Where Music Heads Listen Together",
    template: "%s | Jukebox",
  },
  description:
    "Synced listening rooms for music heads. Join curated Jukeboxes or DJ your own — deep cuts, rare tracks, sample breakdowns, live chat. Free.",
  openGraph: {
    type: "website",
    siteName: "Jukebox",
    title: "Jukebox — Where Music Heads Listen Together",
    description:
      "Synced listening rooms with live chat. Curated official Jukeboxes and user-hosted DJ sessions for people who actually care about music.",
    url: "https://jukebox-app.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jukebox — Where Music Heads Listen Together",
    description:
      "Synced listening rooms with live chat. Curated Jukeboxes or DJ your own. Free.",
  },
  alternates: {
    canonical: "https://jukebox-app.com",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#1a1520",
  width: "device-width",
  initialScale: 1,
}

// Deliberately lean: the full provider/chrome stack (player, playlists,
// messages, upgrade dialogs, ambient effects) lives in app/(app)/layout.tsx
// so static content routes in app/(site)/ don't download or hydrate any of it.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <ProgressBar />
        <AuthProvider>
          {children}
          <Toaster position="bottom-right" />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
