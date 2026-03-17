"use client"

import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { cn } from "@/lib/utils"

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  animation?: "fade-up" | "fade-scale" | "fade-left" | "fade-right"
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  animation = "fade-up",
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>()

  const animationClass = {
    "fade-up": "animate-fade-in-up",
    "fade-scale": "animate-fade-in-scale",
    "fade-left": "animate-fade-in-up",
    "fade-right": "animate-fade-in-up",
  }[animation]

  return (
    <div
      ref={ref}
      className={cn(
        "opacity-0",
        isVisible && animationClass,
        className
      )}
      style={{
        animationDelay: isVisible ? `${delay}ms` : "0ms",
        animationFillMode: "forwards",
      }}
    >
      {children}
    </div>
  )
}
