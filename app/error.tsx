"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import * as Sentry from "@sentry/nextjs"

import { NeonJukeboxLogo } from "@/components/effects/neon-jukebox-logo"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error(error)
  }, [error])

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      
      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Error Icon */}
        <div 
          className="mb-6 p-4 rounded-full"
          style={{
            background: 'oklch(0.50 0.20 30 / 0.15)',
            boxShadow: '0 0 30px oklch(0.50 0.20 30 / 0.3)',
          }}
        >
          <AlertTriangle 
            className="w-12 h-12"
            style={{ color: 'oklch(0.70 0.18 30)' }}
          />
        </div>

        {/* Message */}
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
          Something Went Wrong
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          The audio stream hit a snag. This could be a temporary glitch or 
          something on our end. Try refreshing, or head back to the lobby.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button 
            onClick={reset}
            size="lg" 
            className="rounded-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/">
              Back to Lobby
            </Link>
          </Button>
        </div>

        {/* Error digest for debugging */}
        {error.digest && (
          <p className="mt-6 text-xs text-muted-foreground/50 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        {/* Logo */}
        <div className="mt-12 opacity-60">
          <NeonJukeboxLogo size="sm" />
        </div>
      </div>
    </div>
  )
}
