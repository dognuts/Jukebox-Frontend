"use client"

import { useEffect, useRef } from "react"

const LETTERS = ["J", "U", "K", "E", "B", "O", "X"]

// Alternate letters between blue and cyan for a two-tone neon tube look
const COLORS: { color: string; shadow: string; glow: string }[] = [
  // blue
  {
    color: "oklch(0.70 0.22 240)",
    shadow: "oklch(0.70 0.22 240)",
    glow: "oklch(0.70 0.22 240 / 0.6)",
  },
  // cyan
  {
    color: "oklch(0.82 0.18 195)",
    shadow: "oklch(0.82 0.18 195)",
    glow: "oklch(0.82 0.18 195 / 0.6)",
  },
]

interface Props {
  size?: "sm" | "md" | "lg"
}

export function NeonJukeboxLogo({ size = "md" }: Props) {
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([])

  const textClass =
    size === "sm"
      ? "text-xl"
      : size === "lg"
      ? "text-3xl"
      : "text-2xl"

  // Stagger the flicker animation so each letter is slightly offset
  useEffect(() => {
    letterRefs.current.forEach((el, i) => {
      if (!el) return
      el.style.animationDelay = `${i * 0.18}s`
    })
  }, [])

  return (
    <span
      className={`font-sans font-bold tracking-tight select-none ${textClass}`}
      aria-label="Jukebox"
    >
      {LETTERS.map((letter, i) => {
        const { color, shadow, glow } = COLORS[i % 2]
        return (
          <span
            key={i}
            ref={(el) => { letterRefs.current[i] = el }}
            className="neon-tube-letter inline-block"
            style={
              {
                color,
                "--tube-shadow": shadow,
                "--tube-glow": glow,
              } as React.CSSProperties
            }
          >
            {letter}
          </span>
        )
      })}
    </span>
  )
}
