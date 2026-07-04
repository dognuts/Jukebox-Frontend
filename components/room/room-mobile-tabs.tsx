"use client"

import { memo } from "react"

// Which mobile pane of the room page is showing. "main" is the
// now-playing column (which also holds the queue for DJs), "queue" is
// the listener-only queue pane, "deck" is the DJ-only host deck.
export type MobileRoomTab = "main" | "chat" | "queue" | "deck"

interface RoomMobileTabsProps {
  activeTab: MobileRoomTab
  onTabChange: (tab: MobileRoomTab) => void
  isDJ: boolean
  // Pending request count — badges the Deck tab so approvals aren't
  // missed while the DJ is reading chat.
  pendingCount: number
  // "Title — Artist" one-liner for the compact strip; null while
  // nothing is playing hides the strip.
  nowPlayingLabel: string | null
}

// Mobile-only pane switcher for the room page. Below md the room's
// columns used to stack into one long scroll that buried chat below
// the fold and the DJ deck below a full viewport of chat — this bar
// turns the columns into tap-to-switch panes so every primary surface
// is one tap away. md+ renders all columns side by side and hides
// this bar entirely, so the desktop layout is untouched.
export const RoomMobileTabs = memo(function RoomMobileTabs({
  activeTab,
  onTabChange,
  isDJ,
  pendingCount,
  nowPlayingLabel,
}: RoomMobileTabsProps) {
  // Deck first for DJs — transport / mic / approvals are the controls
  // they need constantly while live. (The DJ's queue lives on the
  // now-playing pane; listeners get a dedicated queue pane instead.)
  const tabs: { id: MobileRoomTab; label: string }[] = isDJ
    ? [
        { id: "deck", label: "Deck" },
        { id: "main", label: "Now playing" },
        { id: "chat", label: "Chat" },
      ]
    : [
        { id: "main", label: "Now playing" },
        { id: "chat", label: "Chat" },
        { id: "queue", label: "Queue" },
      ]

  return (
    <div
      className="shrink-0 md:hidden"
      style={{
        background: "color-mix(in oklab, var(--ink) 95%, transparent)",
        borderBottom: "0.5px solid var(--hairline)",
      }}
    >
      {/* Compact now-playing strip — keeps the current track in view
          while the now-playing pane itself is hidden (chat / queue /
          deck). Tapping it jumps back to the now-playing pane. */}
      {nowPlayingLabel && activeTab !== "main" && (
        <button
          type="button"
          onClick={() => onTabChange("main")}
          className="flex w-full items-center text-left"
          style={{
            gap: "var(--space-xs)",
            paddingInline: "var(--space-md)",
            paddingTop: "var(--space-sm)",
          }}
        >
          <span
            aria-hidden="true"
            className="h-[6px] w-[6px] shrink-0 animate-pulse rounded-full motion-reduce:animate-none"
            style={{ background: "var(--brand-amber)" }}
          />
          <span
            className="min-w-0 truncate"
            style={{
              color: "var(--text-mid)",
              fontSize: "var(--fs-small)",
            }}
          >
            <span className="sr-only">Now playing: </span>
            {nowPlayingLabel}
          </span>
        </button>
      )}

      {/* Segmented pane switcher — styled to match the DjDeck policy
          buttons (amber active state on frosted inactive pills). */}
      <div
        role="group"
        aria-label="Room sections"
        className="flex"
        style={{
          gap: "var(--space-2xs)",
          paddingInline: "var(--space-md)",
          paddingBlock: "var(--space-sm)",
        }}
      >
        {tabs.map((t) => {
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              aria-pressed={active}
              // Hook for the room page's focus guard: when a pane
              // switch display:none's the element holding focus, the
              // guard re-anchors focus on the newly active tab button.
              data-room-tab={t.id}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg"
              style={{
                paddingBlock: "var(--space-sm)",
                fontSize: "var(--fs-small)",
                background: active
                  ? "color-mix(in oklab, var(--brand-amber) 14%, transparent)"
                  : "rgba(255,255,255,0.04)",
                border: active
                  ? "0.5px solid color-mix(in oklab, var(--brand-amber) 40%, transparent)"
                  : "0.5px solid var(--hairline-strong)",
                color: active ? "var(--brand-amber-bright)" : "var(--text-low)",
                fontWeight: active ? 600 : 500,
              }}
            >
              {t.label}
              {t.id === "deck" && pendingCount > 0 && (
                <span
                  className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-bold tabular-nums"
                  style={{
                    background: "var(--brand-amber)",
                    color: "var(--ink)",
                    fontSize: "var(--fs-meta)",
                  }}
                >
                  {pendingCount}
                  <span className="sr-only"> pending requests</span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
})
