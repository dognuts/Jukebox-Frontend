import { EasterEggProvider } from "@/components/effects/easter-egg-provider"
import { MessagesProvider } from "@/lib/messages-context"
import { UpgradeProvider } from "@/lib/upgrade-context"
import { RoomStatusProvider } from "@/lib/room-status-context"
import { FavoritesProvider } from "@/lib/favorites-context"
import { PricingModalProvider } from "@/components/pricing-modal"
import { AppChrome } from "@/components/layout/app-chrome"
import { AmbientBackground } from "@/components/effects/ambient-background"
import { BubbleBackground } from "@/components/effects/bubble-background"

// Full interactive stack for the app routes (home, rooms, account, create,
// admin, dj, pricing, auth). AuthProvider + Toaster and the player stack
// (PlayerProvider/PlaylistProvider/PlayerChrome) come from the root layout
// so playback survives navigation into the (site) route group; everything
// else mounts here so the static (site) routes never pay for it.
// MessagesDrawer/UpgradeDialog are lazy-mounted inside AppChrome only when
// their state actually needs them.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AmbientBackground />
      <RoomStatusProvider>
        <FavoritesProvider>
          <UpgradeProvider>
            <PricingModalProvider>
              <MessagesProvider>
                <EasterEggProvider>
                  <BubbleBackground />
                  {children}
                </EasterEggProvider>
                <AppChrome />
              </MessagesProvider>
            </PricingModalProvider>
          </UpgradeProvider>
        </FavoritesProvider>
      </RoomStatusProvider>
    </>
  )
}
