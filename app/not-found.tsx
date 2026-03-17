import Link from "next/link"
import { Button } from "@/components/ui/button"

import { NeonJukeboxLogo } from "@/components/effects/neon-jukebox-logo"

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      
      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Neon 404 */}
        <div className="mb-8">
          <h1 
            className="text-8xl sm:text-9xl font-black tracking-tighter"
            style={{
              color: 'oklch(0.82 0.18 80)',
              textShadow: `
                0 0 10px oklch(0.82 0.18 80 / 0.8),
                0 0 30px oklch(0.82 0.18 80 / 0.6),
                0 0 60px oklch(0.82 0.18 80 / 0.4),
                0 0 100px oklch(0.82 0.18 80 / 0.2)
              `,
            }}
          >
            404
          </h1>
        </div>

        {/* Message */}
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
          Room Not Found
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Looks like this room went off the air. The DJ might have ended the session, 
          or maybe the link got scrambled in transmission.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button asChild size="lg" className="rounded-full">
            <Link href="/">
              Back to Lobby
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/">
              Browse Live Rooms
            </Link>
          </Button>
        </div>

        {/* Logo */}
        <div className="mt-12 opacity-60">
          <NeonJukeboxLogo size="sm" />
        </div>
      </div>
    </div>
  )
}
