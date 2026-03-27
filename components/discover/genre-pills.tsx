"use client"

import { useState, useCallback, useRef } from "react"
import { genres } from "@/lib/mock-data"

const genreColors: Record<string, string> = {
  "Lo-fi": "80",
  "Hip-Hop": "350",
  Jazz: "250",
  Electronic: "200",
  Indie: "150",
  "R&B": "320",
  House: "30",
  Ambient: "180",
  Soul: "50",
  Funk: "10",
  Rock: "0",
  Pop: "290",
}

interface GenrePillsProps {
  selected: string | null
  onSelect: (genre: string | null) => void
}

export function GenrePills({ selected, onSelect }: GenrePillsProps) {
  const [ripplePos, setRipplePos] = useState<{
    x: number
    y: number
    key: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback(
    (genre: string, e: React.MouseEvent) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      setRipplePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        key: Date.now(),
      })
      setTimeout(() => setRipplePos(null), 500)

      if (selected === genre) {
        onSelect(null)
      } else {
        onSelect(genre)
      }
    },
    [selected, onSelect]
  )

  return (
    <div
      ref={containerRef}
      className="flex flex-wrap gap-2 sm:gap-3 justify-start sm:justify-center"
      role="group"
      aria-label="Filter by genre"
    >
      {genres.map((genre) => {
        const hue = genreColors[genre] || "80"
        const isSelected = selected === genre
        return (
          <button
            key={genre}
            onClick={(e) => handleClick(genre, e)}
            className={`relative overflow-hidden rounded-full px-4 py-2 font-sans text-sm font-medium transition-all duration-300 border hover:scale-105 active:scale-95 ${isSelected ? 'genre-pill-glow' : 'hover:border-primary/30'}`}
            style={{
              background: isSelected
                ? `oklch(0.30 0.08 ${hue})`
                : "oklch(0.14 0.015 280 / 0.8)",
              borderColor: isSelected
                ? `oklch(0.65 0.15 ${hue})`
                : "oklch(0.28 0.02 280 / 0.6)",
              color: isSelected
                ? `oklch(0.88 0.12 ${hue})`
                : "oklch(0.65 0.02 280)",
              boxShadow: isSelected
                ? `0 0 16px oklch(0.65 0.15 ${hue} / 0.4), inset 0 0 12px oklch(0.65 0.15 ${hue} / 0.1)`
                : "none",
              textShadow: isSelected
                ? `0 0 8px oklch(0.65 0.15 ${hue} / 0.5)`
                : "none",
            }}
            aria-pressed={isSelected}
          >
            {genre}
            {/* Ripple effect */}
            {ripplePos && isSelected && (
              <span
                key={ripplePos.key}
                className="pointer-events-none absolute rounded-full"
                style={{
                  left: ripplePos.x,
                  top: ripplePos.y,
                  width: 0,
                  height: 0,
                  background: `oklch(0.80 0.15 ${hue} / 0.4)`,
                  animation: "ripple 0.5s ease-out forwards",
                  transform: "translate(-50%, -50%)",
                }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
