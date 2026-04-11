"use client"

interface ListenerDjContextProps {
  djName: string
  djInitials: string
  body: string
}

// Amber-tinted card that renders DJ commentary about the current track.
// The body copy comes from the track's infoSnippet (admin-authored blurb)
// or the most recent DJ announcement chat message — whatever the caller
// decides to pass in.
export function ListenerDjContext({
  djName,
  djInitials,
  body,
}: ListenerDjContextProps) {
  if (!body) return null

  return (
    <div
      style={{
        paddingInline: "var(--space-lg)",
        paddingBottom: "var(--space-md)",
      }}
    >
      <div
        className="rounded-[10px]"
        style={{
          paddingInline: "var(--space-md)",
          paddingBlock: "var(--space-sm)",
          background: "rgba(232,154,60,0.04)",
          border: "0.5px solid rgba(232,154,60,0.1)",
        }}
      >
        <div
          className="flex items-center"
          style={{
            gap: "var(--space-xs)",
            marginBottom: "var(--space-2xs)",
          }}
        >
          <div
            className="flex shrink-0 items-center justify-center rounded-full font-bold"
            style={{
              width: "clamp(14px, 1.4vw, 18px)",
              height: "clamp(14px, 1.4vw, 18px)",
              fontSize: "var(--fs-meta)",
              background: "#e89a3c",
              color: "#0d0b10",
            }}
          >
            {djInitials}
          </div>
          <span
            className="font-medium"
            style={{
              color: "#e89a3c",
              fontSize: "var(--fs-small)",
            }}
          >
            {djName}
          </span>
        </div>
        <div
          className="leading-[1.5]"
          style={{
            color: "rgba(232,230,234,0.6)",
            fontSize: "var(--fs-body)",
          }}
        >
          {body}
        </div>
      </div>
    </div>
  )
}
