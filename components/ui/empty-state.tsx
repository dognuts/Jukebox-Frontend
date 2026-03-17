"use client"

import { Radio, Search, Music, Headphones } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  variant?: "no-results" | "no-rooms" | "offline"
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  variant = "no-results",
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const defaults = {
    "no-results": {
      icon: Search,
      title: "No rooms found",
      description: "Try adjusting your filters or check back later for new sessions.",
    },
    "no-rooms": {
      icon: Radio,
      title: "No live rooms right now",
      description: "All DJs are taking a break. Check back soon or start your own session!",
    },
    "offline": {
      icon: Headphones,
      title: "You're offline",
      description: "Connect to the internet to browse live rooms and join sessions.",
    },
  }

  const config = defaults[variant]
  const Icon = config.icon

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon with neon glow */}
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
        style={{
          background: "oklch(0.16 0.02 280)",
          border: "1px solid oklch(0.30 0.03 60 / 0.3)",
          boxShadow: "0 0 30px oklch(0.82 0.18 80 / 0.1), inset 0 0 20px oklch(0.82 0.18 80 / 0.05)",
        }}
      >
        <Icon
          className="h-10 w-10"
          style={{
            color: "oklch(0.65 0.12 80)",
            filter: "drop-shadow(0 0 8px oklch(0.82 0.18 80 / 0.4))",
          }}
        />
      </div>

      {/* Text */}
      <h3 className="font-sans text-xl font-semibold text-foreground mb-2">
        {title || config.title}
      </h3>
      <p className="font-sans text-sm text-muted-foreground max-w-sm leading-relaxed">
        {description || config.description}
      </p>

      {/* Optional action button */}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="outline"
          className="mt-6 rounded-full"
        >
          {actionLabel}
        </Button>
      )}

      {/* Decorative music notes */}
      <div className="mt-8 flex items-center gap-3 opacity-30">
        <Music className="h-4 w-4 text-muted-foreground" />
        <div className="h-px w-16 bg-border" />
        <Music className="h-4 w-4 text-muted-foreground" />
        <div className="h-px w-16 bg-border" />
        <Music className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  )
}
