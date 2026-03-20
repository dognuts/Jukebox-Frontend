import Link from "next/link"
import { NeonJukeboxLogo } from "@/components/effects/neon-jukebox-logo"

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/80">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 lg:px-6">
        <div className="flex items-center gap-2">
          <NeonJukeboxLogo size="sm" />
        </div>
        <nav className="flex gap-6" aria-label="Footer navigation">
          <Link href="/terms" className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link href="/support" className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors">
            Support
          </Link>
        </nav>
        <p className="font-sans text-xs text-muted-foreground">
          {"Jukebox \u00A9 2026. Listen together."}
        </p>
      </div>
    </footer>
  )
}
