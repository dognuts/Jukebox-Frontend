"use client"

import Link from "next/link"
import { Radio, Search, Headphones } from "lucide-react"

// Canonical empty state for every surface: quiet hairline card in the
// redesign language (ink ground, rgba-white fill, restrained type).
// Two densities:
// - default: icon + title + description + optional action, for page-level
//   empties (homepage "no rooms", search results, admin lists)
// - compact: single-line quiet box, for section-level empties inside an
//   already-labelled container (grids, queues, admin sections)
interface EmptyStateProps {
  variant?: "no-results" | "no-rooms" | "offline"
  title?: string
  description?: string
  actionLabel?: string
  // Button action (onAction) or link action (actionHref) — pass one.
  onAction?: () => void
  actionHref?: string
  compact?: boolean
}

export function EmptyState({
  variant = "no-results",
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  compact = false,
}: EmptyStateProps) {
  const defaults = {
    "no-results": {
      icon: Search,
      title: "No rooms found",
      description: "Try adjusting your filters or check back later for new sessions.",
    },
    "no-rooms": {
      icon: Radio,
      title: "No live rooms right now",
      description: "All DJs are taking a break. Check back soon or start your own session!",
    },
    "offline": {
      icon: Headphones,
      title: "You're offline",
      description: "Connect to the internet to browse live rooms and join sessions.",
    },
  }

  const config = defaults[variant]
  const Icon = config.icon

  // Action pill — amber tint on the quiet card, matching the redesign's
  // accent treatment (e.g. the homepage offline banner).
  const actionStyle: React.CSSProperties = {
    background: "rgba(232,154,60,0.1)",
    border: "0.5px solid rgba(232,154,60,0.25)",
    color: "var(--brand-amber)",
  }
  const action =
    actionLabel && actionHref ? (
      <Link
        href={actionHref}
        className="rounded-full px-4 py-1.5 font-medium transition-opacity hover:opacity-80"
        style={{ ...actionStyle, fontSize: "var(--fs-small)" }}
      >
        {actionLabel}
      </Link>
    ) : actionLabel && onAction ? (
      <button
        type="button"
        onClick={onAction}
        className="rounded-full px-4 py-1.5 font-medium transition-opacity hover:opacity-80"
        style={{ ...actionStyle, fontSize: "var(--fs-small)" }}
      >
        {actionLabel}
      </button>
    ) : null

  if (compact) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-[14px] text-center"
        style={{
          gap: "var(--space-sm)",
          paddingInline: "var(--space-md)",
          paddingBlock: "var(--space-lg)",
          background: "rgba(255,255,255,0.02)",
          border: "0.5px solid var(--hairline)",
        }}
      >
        <p style={{ color: "var(--text-low)", fontSize: "var(--fs-body)" }}>
          {title || config.title}
        </p>
        {action}
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-[14px] text-center"
      style={{
        paddingInline: "var(--space-md)",
        paddingBlock: "var(--space-xl)",
        background: "rgba(255,255,255,0.02)",
        border: "0.5px solid var(--hairline)",
      }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          marginBottom: "var(--space-md)",
          background: "rgba(255,255,255,0.04)",
          border: "0.5px solid var(--hairline-strong)",
        }}
      >
        <Icon
          className="h-5 w-5"
          style={{ color: "rgba(232,230,234,0.4)" }}
          aria-hidden="true"
        />
      </div>

      <h3 className="type-h2" style={{ color: "var(--ink-foreground)" }}>
        {title || config.title}
      </h3>
      <p
        className="max-w-sm"
        style={{
          marginTop: "var(--space-2xs)",
          color: "var(--text-low)",
          fontSize: "var(--fs-small)",
          lineHeight: 1.5,
        }}
      >
        {description || config.description}
      </p>

      {action && <div style={{ marginTop: "var(--space-md)" }}>{action}</div>}
    </div>
  )
}
