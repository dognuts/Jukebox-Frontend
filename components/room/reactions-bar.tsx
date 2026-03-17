"use client"

import { useState, useCallback } from "react"
import { useParticleBurst, ParticleBurstDisplay } from "@/components/effects/particle-burst"

const reactions = [
  { emoji: "\uD83D\uDD25", label: "Fire", key: "fire" },
  { emoji: "\u2764\uFE0F", label: "Heart", key: "heart" },
  { emoji: "\uD83D\uDE4C", label: "Raised hands", key: "hands" },
  { emoji: "\uD83C\uDFB6", label: "Music", key: "music" },
  { emoji: "\uD83D\uDE0E", label: "Cool", key: "cool" },
]

export function ReactionsBar() {
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      reactions.map((r) => [r.key, Math.floor(Math.random() * 20)])
    )
  )
  const { particles, burst } = useParticleBurst()

  const handleReact = useCallback(
    (reaction: (typeof reactions)[0], e: React.MouseEvent<HTMLButtonElement>) => {
      setCounts((prev) => ({
        ...prev,
        [reaction.key]: prev[reaction.key] + 1,
      }))
      burst(reaction.emoji, 3, e.currentTarget)
    },
    [burst]
  )

  return (
    <div className="relative">
      <ParticleBurstDisplay particles={particles} />
      <div className="flex items-center gap-2">
        {reactions.map((reaction) => (
          <button
            key={reaction.key}
            onClick={(e) => handleReact(reaction, e)}
            className="group flex items-center gap-1.5 rounded-full border border-border/30 px-3 py-1.5 transition-all hover:border-primary/30 hover:bg-muted/30 active:scale-95"
            style={{ background: "var(--glass-bg)" }}
            aria-label={`React with ${reaction.label}`}
          >
            <span className="text-base transition-transform group-hover:scale-110 group-active:scale-125">
              {reaction.emoji}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {counts[reaction.key]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
