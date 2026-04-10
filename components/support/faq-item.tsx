"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

export function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border/30 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-foreground"
      >
        <span className="font-sans text-sm font-medium text-foreground pr-4">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <p className="pb-4 font-sans text-sm text-muted-foreground leading-relaxed">
          {a}
        </p>
      )}
    </div>
  )
}
