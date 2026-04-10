"use client"

import { useEasterEggs } from "@/hooks/use-easter-eggs"

interface AudioVisualizerProps {
  isPlaying: boolean
  color?: "amber" | "magenta" | "blue"
}

const barHeights = [0.3, 0.6, 0.4, 0.8, 0.5, 1, 0.6, 0.9, 0.4, 0.7, 0.5, 0.8, 0.3, 0.6, 0.9, 0.5]

export function AudioVisualizer({
  isPlaying,
  color = "amber",
}: AudioVisualizerProps) {
  const { dropTheBeat } = useEasterEggs()

  const hue = color === "amber" ? 80 : color === "magenta" ? 350 : 250

  return (
    <div
      className="flex items-end justify-center gap-[3px]"
      aria-hidden="true"
    >
      {barHeights.map((h, i) => {
        const heightVal = dropTheBeat ? 100 : isPlaying ? h * 100 : 10
        return (
          <div
            key={i}
            className="w-1 rounded-t transition-all"
            style={{
              height: `${heightVal}%`,
              maxHeight: "48px",
              minHeight: "3px",
              background: `oklch(0.75 0.15 ${hue})`,
              transformOrigin: "bottom",
              animation: isPlaying
                ? `visualizer-bar ${0.25 + i * 0.06}s ease-in-out ${i * 0.04}s infinite alternate`
                : "none",
              boxShadow: isPlaying
                ? `0 0 4px oklch(0.75 0.15 ${hue} / 0.4)`
                : "none",
              opacity: isPlaying ? 0.9 : 0.2,
              transition: "opacity 0.3s, height 0.3s",
            }}
          />
        )
      })}
    </div>
  )
}
