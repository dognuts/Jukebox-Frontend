interface SectionDividerProps {
  className?: string
  variant?: "default" | "subtle"
}

export function SectionDivider({ className = "", variant = "default" }: SectionDividerProps) {
  if (variant === "subtle") {
    return (
      <div 
        className={`my-8 h-px ${className}`} 
        style={{
          background: "linear-gradient(90deg, transparent 0%, oklch(0.25 0.02 280 / 0.5) 20%, oklch(0.25 0.02 280 / 0.5) 80%, transparent 100%)"
        }}
        aria-hidden="true" 
      />
    )
  }

  return (
    <div className={`relative my-10 ${className}`} aria-hidden="true">
      {/* Main line */}
      <div 
        className="h-px w-full"
        style={{
          background: "linear-gradient(90deg, transparent 0%, oklch(0.82 0.18 80 / 0.25) 15%, oklch(0.70 0.22 350 / 0.3) 50%, oklch(0.72 0.18 250 / 0.25) 85%, transparent 100%)"
        }}
      />
      {/* Glow effect */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-4 blur-md"
        style={{
          background: "radial-gradient(ellipse at center, oklch(0.82 0.18 80 / 0.08) 0%, transparent 70%)"
        }}
      />
      {/* Center diamond accent */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rotate-45"
        style={{
          background: "oklch(0.82 0.18 80 / 0.4)",
          boxShadow: "0 0 8px oklch(0.82 0.18 80 / 0.3)"
        }}
      />
    </div>
  )
}
