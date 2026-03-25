// Force rebuild v8 - performance-mode.tsx deleted entirely
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { EasterEggProvider } from "@/components/effects/easter-egg-provider"
import { PlayerProvider } from "@/lib/player-context"
import { PlaylistProvider } from "@/lib/playlist-context"
import { MessagesProvider } from "@/lib/messages-context"
import { UpgradeProvider } from "@/lib/upgrade-context"
import { RoomStatusProvider } from "@/lib/room-status-context"
import { AuthProvider } from "@/lib/auth-context"
import { FavoritesProvider } from "@/lib/favorites-context"
import { MiniPlayer } from "@/components/layout/mini-player"
import { MessagesDrawer } from "@/components/messages/messages-drawer"
import { PricingModalProvider } from "@/components/pricing-modal"
import { UpgradeDialog } from "@/components/upgrade/upgrade-dialog"
import { Toaster } from "@/components/ui/sonner"
import { AmbientBackground } from "@/components/effects/ambient-background"
import { BubbleBackground } from "@/components/effects/bubble-background"
import { ProgressBar } from "@/components/effects/progress-bar"
import { SourceProtection } from "@/components/effects/source-protection"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Jukebox - Listen Together",
  description:
    "Built by music heads for music heads to find, discuss, and listen to music together.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <ProgressBar />
        <SourceProtection />
        <AmbientBackground />
        <RoomStatusProvider>
        <AuthProvider>
        <FavoritesProvider>
        <UpgradeProvider>
          <PricingModalProvider>
          <PlaylistProvider>
            <MessagesProvider>
              <PlayerProvider>
                <EasterEggProvider>
                  <BubbleBackground />
                  {children}
                </EasterEggProvider>
                <MiniPlayer />
                <MessagesDrawer />
                <UpgradeDialog />
                <Toaster position="bottom-right" />
              </PlayerProvider>
            </MessagesProvider>
          </PlaylistProvider>
          </PricingModalProvider>
        </UpgradeProvider>
        </FavoritesProvider>
        </AuthProvider>
        </RoomStatusProvider>
        <Analytics />
      </body>
    </html>
  )
}
