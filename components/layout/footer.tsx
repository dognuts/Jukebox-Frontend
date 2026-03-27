import Link from "next/link"
import { NeonJukeboxLogo } from "@/components/effects/neon-jukebox-logo"

export function Footer() {
  return (
    <footer className="relative border-t border-border/50 overflow-hidden">
      {/* Subtle gradient glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, oklch(0.82 0.18 80 / 0.3) 30%, oklch(0.70 0.22 350 / 0.3) 50%, oklch(0.72 0.18 250 / 0.3) 70%, transparent 100%)",
          boxShadow: "0 0 20px oklch(0.82 0.18 80 / 0.15)"
        }}
      />
      
      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-12 lg:px-6">
        <div className="flex items-center gap-2">
          <NeonJukeboxLogo size="sm" />
        </div>
        
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2" aria-label="Footer navigation">
          <Link 
            href="/terms" 
            className="font-sans text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
          >
            Terms
          </Link>
          <Link 
            href="/privacy" 
            className="font-sans text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
          >
            Privacy
          </Link>
          <Link 
            href="/support" 
            className="font-sans text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
          >
            Support
          </Link>
          <Link 
            href="/pricing" 
            className="font-sans text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
          >
            Pricing
          </Link>
        </nav>
        
        <div className="flex flex-col items-center gap-3">
          <p className="font-sans text-xs text-muted-foreground">
            {"Jukebox \u00A9 2026. Listen together."}
          </p>
          <p className="font-sans text-[10px] text-muted-foreground/60">
            Built for music heads, by music heads.
          </p>
        </div>
      </div>
    </footer>
  )
}
