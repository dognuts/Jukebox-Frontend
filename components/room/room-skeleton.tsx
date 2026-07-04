import type { CSSProperties } from "react"

/**
 * Route-level skeleton for the room page. Mirrors the real layout —
 * ListenerNav header bar, now-playing hero, queue list, chat rail — in
 * the room's ink palette so navigation paints a recognizable shell
 * before data arrives. Pure markup (no hooks): rendered both by
 * app/room/[slug]/loading.tsx while the server awaits the room fetch,
 * and by RoomClient while its fallback client fetch is in flight.
 *
 * No spinners — a subtle synchronized pulse, disabled for users with
 * prefers-reduced-motion via Tailwind's motion-reduce variant.
 */

const pulse = "animate-pulse motion-reduce:animate-none"

function Bone({
  className = "",
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={`rounded ${className}`}
      style={{ background: "rgba(255,255,255,0.05)", ...style }}
    />
  )
}

// Deterministic widths for the chat message bones (no randomness — this
// renders on the server and must hydrate identically on the client).
const CHAT_BONES = [
  { name: "5rem", line: "82%" },
  { name: "3.5rem", line: "64%" },
  { name: "4.5rem", line: "90%" },
  { name: "3rem", line: "48%" },
  { name: "5.5rem", line: "76%" },
  { name: "4rem", line: "58%" },
]

export function RoomSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading room"
      className="min-h-screen"
      style={{ background: "var(--ink)", color: "var(--ink-foreground)" }}
    >
      <span className="sr-only">Loading room…</span>

      {/* Header bar — mirrors ListenerNav (h-14, hairline bottom border) */}
      <div
        aria-hidden="true"
        className="flex h-14 items-center justify-between px-5"
        style={{
          background: "color-mix(in oklab, var(--ink) 95%, transparent)",
          borderBottom: "0.5px solid var(--hairline)",
        }}
      >
        <div className={`flex items-center ${pulse}`} style={{ gap: "var(--space-sm)" }}>
          <Bone className="h-3 w-10" />
          <div
            className="h-[14px] w-px shrink-0"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <Bone className="h-4 w-36" />
        </div>
        <div className={`flex items-center ${pulse}`} style={{ gap: "var(--space-md)" }}>
          <Bone className="h-3 w-8" />
          <Bone className="h-7 w-7 rounded-full" />
        </div>
      </div>

      {/* Main grid — matches the 2-column listener layout */}
      <div
        aria-hidden="true"
        className="shell-narrow flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_clamp(260px,22vw,360px)]"
        style={{ minHeight: "calc(100vh - 56px)" }}
      >
        {/* Left: now-playing hero + queue */}
        <div className="flex flex-col md:border-r md:border-white/[0.06]">
          <div
            className={pulse}
            style={{
              paddingInline: "var(--space-lg)",
              paddingTop: "var(--space-xl)",
              paddingBottom: "var(--space-lg)",
            }}
          >
            {/* DJ chip */}
            <div className="mb-5 flex items-center gap-2">
              <Bone className="h-[30px] w-[30px] shrink-0 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Bone className="h-3 w-24" />
                <Bone
                  className="h-2.5 w-36"
                  style={{ background: "rgba(255,255,255,0.035)" }}
                />
              </div>
            </div>

            {/* Album art + track info */}
            <div className="flex items-center gap-5">
              <Bone
                className="shrink-0 rounded-xl"
                style={{
                  width: "clamp(88px, 10vw, 128px)",
                  height: "clamp(88px, 10vw, 128px)",
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
                }}
              />
              <div className="min-w-0 flex-1">
                <Bone
                  className="h-2.5 w-20"
                  style={{
                    marginBottom: "var(--space-2xs)",
                    background: "rgba(255,255,255,0.035)",
                  }}
                />
                <Bone
                  className="h-6 w-3/5 max-w-72"
                  style={{ marginBottom: "var(--space-2xs)" }}
                />
                <Bone
                  className="h-4 w-2/5 max-w-48"
                  style={{
                    marginBottom: "var(--space-sm)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                />
                {/* EQ-bar stand-in — faint amber, matching the live EQ */}
                <div className="flex h-6 items-end gap-[3px]">
                  {[10, 16, 12, 20, 14].map((h, i) => (
                    <Bone
                      key={i}
                      className="w-[3px]"
                      style={{ height: h, background: "color-mix(in oklab, var(--brand-amber) 25%, transparent)" }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Queue — "Up next" header + a few rows */}
          <div
            className={pulse}
            style={{
              paddingInline: "var(--space-lg)",
              paddingBottom: "var(--space-lg)",
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: "var(--space-sm)" }}
            >
              <Bone className="h-4 w-20" />
              <Bone
                className="h-3 w-12"
                style={{ background: "rgba(255,255,255,0.035)" }}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center rounded-lg"
                  style={{
                    gap: "var(--space-sm)",
                    paddingInline: "var(--space-sm)",
                    paddingBlock: "var(--space-sm)",
                  }}
                >
                  <Bone className="h-9 w-9 shrink-0 rounded-md" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Bone className="h-3" style={{ width: `${60 - i * 12}%` }} />
                    <Bone
                      className="h-2.5"
                      style={{
                        width: `${35 - i * 6}%`,
                        background: "rgba(255,255,255,0.035)",
                      }}
                    />
                  </div>
                  <Bone
                    className="h-2.5 w-8 shrink-0"
                    style={{ background: "rgba(255,255,255,0.035)" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: chat rail — header, messages anchored to the bottom,
            input bar. */}
        <div
          className={`flex flex-col ${pulse}`}
          style={{
            paddingInline: "var(--space-md)",
            paddingBlock: "var(--space-md)",
          }}
        >
          <Bone className="h-3.5 w-14" style={{ marginBottom: "var(--space-md)" }} />
          <div className="mt-auto flex flex-col gap-4">
            {CHAT_BONES.map((row, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Bone
                    className="shrink-0 rounded-full"
                    style={{
                      width: "clamp(14px, 1.4vw, 18px)",
                      height: "clamp(14px, 1.4vw, 18px)",
                    }}
                  />
                  <Bone className="h-2.5" style={{ width: row.name }} />
                </div>
                <Bone
                  className="h-3"
                  style={{
                    width: row.line,
                    marginLeft: "calc(clamp(14px, 1.4vw, 18px) + 0.375rem)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                />
              </div>
            ))}
          </div>
          <Bone
            className="h-9 w-full rounded-full"
            style={{ marginTop: "var(--space-md)", background: "rgba(255,255,255,0.04)" }}
          />
        </div>
      </div>
    </div>
  )
}
