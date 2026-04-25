"use client"

import { ChevronDown } from "lucide-react"
import type { ReactNode } from "react"

interface TroubleshooterRowProps {
  id: string                // anchor id for deep-linking (e.g., "gated")
  title: string             // the symptom question
  open: boolean             // controlled open state (parent manages "only one open at a time")
  onToggle: () => void
  children: ReactNode       // remedy content
}

export function TroubleshooterRow({ id, title, open, onToggle, children }: TroubleshooterRowProps) {
  return (
    <div id={id} className="border-b border-border/30 last:border-0 scroll-mt-16">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-body`}
        className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-foreground"
      >
        <span className="font-sans text-sm font-medium text-foreground pr-4">{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div id={`${id}-body`} className="pb-4 pr-8 font-sans text-sm text-muted-foreground leading-relaxed space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}
