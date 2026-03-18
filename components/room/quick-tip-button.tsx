"use client"

import { useState, useCallback } from "react"
import { Coins, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface QuickTipButtonProps {
  djName: string
  onTip?: (amount: number) => void
}

const TIP_AMOUNTS = [10, 25, 50, 100]

export function QuickTipButton({ djName, onTip }: QuickTipButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCelebrating, setIsCelebrating] = useState(false)
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([])

  const createParticles = useCallback(() => {
    const colors = [
      "oklch(0.82 0.18 80)", // amber
      "oklch(0.85 0.20 60)", // gold
      "oklch(0.72 0.18 250)", // blue
      "oklch(0.70 0.22 350)", // magenta
    ]
    
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 120,
      y: (Math.random() - 0.5) * 120 - 30,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))
    
    setParticles(newParticles)
    setTimeout(() => setParticles([]), 1000)
  }, [])

  const handleTip = (amount: number) => {
    setIsCelebrating(true)
    createParticles()
    
    onTip?.(amount)
    toast.success(`Sent ${amount} Neon to ${djName}!`, {
      description: "Thanks for supporting the DJ!",
    })

    setTimeout(() => {
      setIsCelebrating(false)
      setIsExpanded(false)
    }, 1500)
  }

  return (
    <div className="relative">
      {/* Celebration particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
          style={{
            background: particle.color,
            boxShadow: `0 0 6px ${particle.color}`,
            transform: `translate(${particle.x}px, ${particle.y}px)`,
            animation: "tip-particle 1s ease-out forwards",
          }}
        />
      ))}

      {/* Main button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`send-neon-btn relative flex items-center gap-2 rounded-full px-5 py-2.5 font-sans text-sm font-bold transition-all duration-300 ${
            isCelebrating ? "scale-110" : ""
          }`}
          style={isCelebrating ? {
            background: "linear-gradient(135deg, oklch(0.82 0.22 195), oklch(0.90 0.18 180))",
            boxShadow: "0 0 40px oklch(0.82 0.22 195 / 0.8), 0 0 80px oklch(0.72 0.18 195 / 0.4)",
          } : undefined}
        >
          {isCelebrating ? (
            <Sparkles className="h-4 w-4 animate-spin" />
          ) : (
            <Coins className="h-4 w-4" />
          )}
          <span>Send Neon</span>
        </button>

        {/* Expanded tip amounts */}
        <div
          className={`flex items-center gap-1.5 overflow-hidden transition-all duration-300 ${
            isExpanded ? "max-w-[300px] opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          {TIP_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => handleTip(amount)}
              className="shrink-0 rounded-full px-3 py-1.5 font-sans text-xs font-bold transition-all hover:scale-110 active:scale-95"
              style={{
                background: "oklch(0.18 0.02 280)",
                border: "1px solid oklch(0.82 0.18 80 / 0.3)",
                color: "oklch(0.82 0.18 80)",
              }}
            >
              {amount}
            </button>
          ))}
        </div>
      </div>

      {/* CSS for particle animation */}
      <style jsx>{`
        @keyframes tip-particle {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--tx, 0), var(--ty, -50px)) scale(0);
          }
        }
      `}</style>
    </div>
  )
}
