import { NeonJukeboxLogo } from "@/components/effects/neon-jukebox-logo"

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/80">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between lg:px-6">
        <div className="flex items-center gap-2">
          <NeonJukeboxLogo size="sm" />
        </div>
        <nav className="flex gap-6" aria-label="Footer navigation">
          <span className="font-sans text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            About
          </span>
          <span className="font-sans text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            Terms
          </span>
          <span className="font-sans text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            Privacy
          </span>
          <span className="font-sans text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            Support
          </span>
        </nav>
        <p className="font-sans text-xs text-muted-foreground">
          {"Jukebox \u00A9 2026. Listen together."}
        </p>
      </div>
    </footer>
  )
}
