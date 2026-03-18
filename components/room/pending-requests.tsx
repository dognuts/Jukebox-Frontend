"use client"

import { Check, X, Inbox, CheckCheck, XCircle, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { APIQueueEntry } from "@/lib/api"
import { Reorder, useDragControls } from "framer-motion"
import { useState } from "react"

// Generate a consistent color from username
function getAvatarColor(username: string): string {
  const colors = [
    "oklch(0.65 0.15 155)", // teal
    "oklch(0.65 0.20 250)", // purple
    "oklch(0.70 0.18 30)",  // coral
    "oklch(0.68 0.22 80)",  // amber
    "oklch(0.72 0.15 200)", // cyan
    "oklch(0.62 0.18 330)", // pink
  ]
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

interface PendingRequestsProps {
  requests: APIQueueEntry[]
  onApprove: (entryId: string) => void
  onReject: (entryId: string) => void
  onApproveAll?: () => void
  onRejectAll?: () => void
  onReorder?: (reorderedIds: string[]) => void
}

function RequestCard({
  req,
  onApprove,
  onReject,
}: {
  req: APIQueueEntry
  onApprove: () => void
  onReject: () => void
}) {
  const dragControls = useDragControls()
  const avatarColor = req.submittedBy ? getAvatarColor(req.submittedBy) : "oklch(0.5 0.1 280)"

  return (
    <Reorder.Item
      value={req}
      dragListener={false}
      dragControls={dragControls}
      className="flex items-center gap-2 rounded-xl p-2.5 transition-colors hover:bg-muted/20"
      style={{
        background: "oklch(0.16 0.01 280 / 0.5)",
        border: "1px solid oklch(0.26 0.02 280 / 0.4)",
      }}
    >
      {/* Drag handle */}
      <div
        className="cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/40" />
      </div>

      {/* Requester avatar */}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-sans text-[10px] font-bold text-white"
        style={{ background: avatarColor }}
        title={req.submittedBy || "Anonymous"}
      >
        {(req.submittedBy || "?")[0].toUpperCase()}
      </div>

      {/* Album art placeholder */}
      <div
        className="h-8 w-8 shrink-0 rounded-lg"
        style={{ background: req.track?.albumGradient || "oklch(0.25 0.05 300)" }}
      />

      {/* Track info */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-sans text-sm text-foreground">
          {req.track?.title || "Unknown Track"}
        </span>
        <span className="truncate font-sans text-xs text-muted-foreground">
          {req.track?.artist || "Unknown Artist"}
          {req.submittedBy && (
            <span style={{ color: avatarColor }}> · {req.submittedBy}</span>
          )}
        </span>
      </div>

      {/* Approve / Reject buttons */}
      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onApprove}
          className="h-7 w-7 rounded-full text-primary hover:bg-primary/20"
          aria-label="Approve request"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onReject}
          className="h-7 w-7 rounded-full hover:bg-destructive/20"
          style={{ color: "oklch(0.65 0.18 25)" }}
          aria-label="Reject request"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Reorder.Item>
  )
}

export function PendingRequests({
  requests,
  onApprove,
  onReject,
  onApproveAll,
  onRejectAll,
  onReorder,
}: PendingRequestsProps) {
  const [orderedRequests, setOrderedRequests] = useState(requests)

  // Sync with props when requests change
  if (requests.length !== orderedRequests.length || requests.some((r, i) => r.id !== orderedRequests[i]?.id)) {
    setOrderedRequests(requests)
  }

  const handleReorder = (newOrder: APIQueueEntry[]) => {
    setOrderedRequests(newOrder)
    onReorder?.(newOrder.map((r) => r.id))
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6">
        <Inbox className="h-6 w-6 text-muted-foreground/30" />
        <p className="font-sans text-xs text-muted-foreground">
          No pending requests
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pending Requests
          </h3>
          <span
            className="rounded-full px-1.5 py-0.5 font-sans text-[10px] font-medium"
            style={{
              background: "oklch(0.72 0.18 250 / 0.15)",
              color: "oklch(0.72 0.18 250)",
            }}
          >
            {requests.length}
          </span>
        </div>

        {/* Bulk actions */}
        {requests.length > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onApproveAll}
              className="h-6 gap-1 rounded-full px-2 text-[10px] font-medium text-primary hover:bg-primary/15"
            >
              <CheckCheck className="h-3 w-3" />
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRejectAll}
              className="h-6 gap-1 rounded-full px-2 text-[10px] font-medium hover:bg-destructive/15"
              style={{ color: "oklch(0.65 0.18 25)" }}
            >
              <XCircle className="h-3 w-3" />
              All
            </Button>
          </div>
        )}
      </div>

      {/* Reorderable list */}
      <Reorder.Group
        axis="y"
        values={orderedRequests}
        onReorder={handleReorder}
        className="flex flex-col gap-2"
      >
        {orderedRequests.map((req) => (
          <RequestCard
            key={req.id}
            req={req}
            onApprove={() => onApprove(req.id)}
            onReject={() => onReject(req.id)}
          />
        ))}
      </Reorder.Group>
    </div>
  )
}
