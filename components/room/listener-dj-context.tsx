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
    <div className="px-6 pb-4">
      <div
        className="rounded-[10px] px-3.5 py-3"
        style={{
          background: "rgba(232,154,60,0.04)",
          border: "0.5px solid rgba(232,154,60,0.1)",
        }}
      >
        <div className="mb-1.5 flex items-center gap-1.5">
          <div
            className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full text-[7px] font-bold"
            style={{ background: "#e89a3c", color: "#0d0b10" }}
          >
            {djInitials}
          </div>
          <span
            className="text-[11px] font-medium"
            style={{ color: "#e89a3c" }}
          >
            {djName}
          </span>
        </div>
        <div
          className="text-xs leading-[1.5]"
          style={{ color: "rgba(232,230,234,0.55)" }}
        >
          {body}
        </div>
      </div>
    </div>
  )
}
