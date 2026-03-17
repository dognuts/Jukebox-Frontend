"use client"

import { cn } from "@/lib/utils"

interface SoundWaveVisualizerProps {
  isPlaying?: boolean
  barCount?: number
  size?: "sm" | "md" | "lg"
  color?: "amber" | "magenta" | "blue" | "mixed"
  className?: string
}

export function SoundWaveVisualizer({
  isPlaying = true,
  barCount = 5,
  size = "md",
  color = "amber",
  className,
}: SoundWaveVisualizerProps) {
  const sizeClasses = {
    sm: "h-3 gap-0.5",
    md: "h-5 gap-1",
    lg: "h-8 gap-1.5",
  }

  const barWidths = {
    sm: "w-0.5",
    md: "w-1",
    lg: "w-1.5",
  }

  const getBarColor = (index: number) => {
    if (color === "mixed") {
      const colors = ["var(--neon-amber)", "var(--neon-magenta)", "var(--neon-blue)"]
      return colors[index % colors.length]
    }
    const colorMap = {
      amber: "var(--neon-amber)",
      magenta: "var(--neon-magenta)",
      blue: "var(--neon-blue)",
    }
    return colorMap[color]
  }

  return (
    <div
      className={cn(
        "flex items-end",
        sizeClasses[size],
        className
      )}
      role="img"
      aria-label={isPlaying ? "Audio playing" : "Audio paused"}
    >
      {[...Array(barCount)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all",
            barWidths[size],
            isPlaying ? "equalizer-bar" : "opacity-30"
          )}
          style={{
            background: getBarColor(i),
            height: isPlaying ? undefined : "20%",
            animationPlayState: isPlaying ? "running" : "paused",
            boxShadow: isPlaying ? `0 0 4px ${getBarColor(i)}` : "none",
          }}
        />
      ))}
    </div>
  )
}
