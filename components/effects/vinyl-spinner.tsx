"use client"

import { useState, useRef, useCallback } from "react"
import { useEasterEggs } from "@/hooks/use-easter-eggs"

interface VinylSpinnerProps {
  albumGradient: string
  isPlaying: boolean
  size?: number
}

export function VinylSpinner({
  albumGradient,
  isPlaying,
  size = 220,
}: VinylSpinnerProps) {
  const [scratching, setScratching] = useState(false)
  const [scratchAngle, setScratchAngle] = useState(0)
  const dragStartX = useRef<number | null>(null)
  const { triggerDjScratch } = useEasterEggs()

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragStartX.current = e.clientX
      setScratching(true)

      const handleMove = (me: PointerEvent) => {
        if (dragStartX.current === null) return
        const delta = me.clientX - dragStartX.current
        setScratchAngle(delta * 0.5)
      }

      const handleUp = () => {
        dragStartX.current = null
        setScratching(false)
        setScratchAngle(0)
        triggerDjScratch()
        window.removeEventListener("pointermove", handleMove)
        window.removeEventListener("pointerup", handleUp)
      }

      window.addEventListener("pointermove", handleMove)
      window.addEventListener("pointerup", handleUp)
    },
    [triggerDjScratch]
  )

  const platSize = size
  const armLength = platSize * 0.52
  const armPivotX = platSize * 0.82
  const armPivotY = platSize * -0.04
  // Arm swings into the record when playing
  const armAngle = isPlaying ? 24 : 8

  return (
    <div
      className="relative select-none"
      style={{ width: platSize, height: platSize }}
    >
      {/* Platter base / turntable mat */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.16 0.01 280) 48%, oklch(0.13 0.008 280) 50%, oklch(0.10 0.006 280) 100%)",
          boxShadow: isPlaying
            ? "0 0 40px oklch(0.82 0.18 80 / 0.15), inset 0 0 20px oklch(0 0 0 / 0.4)"
            : "inset 0 0 20px oklch(0 0 0 / 0.4)",
          transition: "box-shadow 0.5s ease",
        }}
      />

      {/* Vinyl disc */}
      <div
        className="absolute inset-[4%] cursor-grab rounded-full active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        style={{
          background: `
            radial-gradient(circle, transparent 18%, oklch(0.10 0.005 280) 19%, oklch(0.10 0.005 280) 100%),
            repeating-radial-gradient(circle at center, transparent 0px, transparent 2px, oklch(0.14 0.005 280 / 0.3) 2.5px, transparent 3px)
          `,
          animationName: isPlaying && !scratching ? "vinyl-spin" : "none",
          animationDuration: "2.5s",
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
          animationPlayState: isPlaying && !scratching ? "running" : "paused",
          transform: scratching ? `rotate(${scratchAngle}deg)` : undefined,
          transition: scratching ? "none" : "transform 0.5s ease-out",
        }}
        role="img"
        aria-label="Vinyl record"
      >
        {/* Groove rings - more visible for rotation tracking */}
        {Array.from({ length: 24 }, (_, i) => {
          const pct = 26 + i * 2.4
          const brightness = i % 3 === 0 ? 0.24 : 0.18
          const opacity = i % 3 === 0 ? 0.7 : 0.45
          return (
            <div
              key={pct}
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: `${(100 - pct) / 2}%`,
                border: `${i % 3 === 0 ? '1px' : '0.5px'} solid oklch(${brightness} 0.005 280 / ${opacity})`,
              }}
            />
          )
        })}

        {/* Light reflection arc across the vinyl */}
        <div
          className="absolute inset-[5%] rounded-full pointer-events-none overflow-hidden"
        >
          <div
            className="absolute"
            style={{
              top: "10%",
              left: "-10%",
              width: "60%",
              height: "30%",
              background: "linear-gradient(135deg, oklch(1 0 0 / 0.06), transparent)",
              borderRadius: "50%",
              transform: "rotate(-20deg)",
            }}
          />
        </div>

        {/* Album art label in center */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "38%",
            height: "38%",
            background: albumGradient,
            boxShadow: "0 0 12px oklch(0.30 0.05 280 / 0.5), inset 0 0 8px oklch(0 0 0 / 0.3)",
          }}
        >
          {/* Center spindle hole */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: "14%",
              height: "14%",
              background: "oklch(0.08 0.005 280)",
              boxShadow: "inset 0 0 3px oklch(0 0 0 / 0.8), 0 0 2px oklch(0.3 0.01 280 / 0.3)",
            }}
          />
        </div>

        {/* Scratch indicator */}
        {scratching && (
          <div
            className="absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2"
            style={{
              background: "linear-gradient(to bottom, oklch(0.90 0.15 80 / 0.8), transparent)",
            }}
          />
        )}
      </div>

      {/* ─── Stylus/Tonearm ─── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: armPivotY,
          left: armPivotX,
          width: armLength,
          height: armLength,
          transformOrigin: "4px 4px",
          transform: `rotate(${armAngle}deg)`,
          transition: "transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)",
        }}
      >
        {/* Pivot base */}
        <div
          className="absolute rounded-full"
          style={{
            width: 14,
            height: 14,
            top: -3,
            left: -3,
            background: "linear-gradient(135deg, rgba(200,200,210,0.9), rgba(150,150,165,0.7))",
            boxShadow: "0 0 6px oklch(0 0 0 / 0.3)",
          }}
        />
        {/* Arm shaft */}
        <div
          style={{
            position: "absolute",
            top: 4,
            left: 3,
            width: 2.5,
            height: armLength * 0.72,
            background: "linear-gradient(90deg, rgba(180,180,195,0.8), rgba(220,220,230,0.95), rgba(170,170,185,0.75))",
            borderRadius: 2,
            transformOrigin: "top center",
            transform: "rotate(0deg)",
            boxShadow: "1px 1px 3px oklch(0 0 0 / 0.3)",
          }}
        />
        {/* Headshell (angled end piece) */}
        <div
          style={{
            position: "absolute",
            top: armLength * 0.70,
            left: -1,
            width: 8,
            height: 14,
            background: "linear-gradient(180deg, rgba(190,190,205,0.8), rgba(160,160,175,0.6))",
            borderRadius: "1px 1px 3px 3px",
            transform: "rotate(6deg)",
            boxShadow: "0 1px 3px oklch(0 0 0 / 0.4)",
          }}
        />
        {/* Stylus tip */}
        <div
          style={{
            position: "absolute",
            top: armLength * 0.70 + 12,
            left: 1,
            width: 2,
            height: 4,
            background: "rgba(220,220,230,0.9)",
            borderRadius: "0 0 1px 1px",
          }}
        />
      </div>
    </div>
  )
}
