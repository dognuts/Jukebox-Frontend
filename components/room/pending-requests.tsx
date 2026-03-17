"use client"

import { Check, X, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { APIQueueEntry } from "@/lib/api"

interface PendingRequestsProps {
  requests: APIQueueEntry[]
  onApprove: (entryId: string) => void
  onReject: (entryId: string) => void
}

export function PendingRequests({ requests, onApprove, onReject }: PendingRequestsProps) {
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
      <div className="flex items-center justify-between">
        <h3 className="font-sans text-sm font-semibold text-foreground">
          Pending Requests
        </h3>
        <span className="font-sans text-xs text-muted-foreground">
          {requests.length} request{requests.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/20"
            style={{
              background: "oklch(0.16 0.01 280 / 0.5)",
              border: "1px solid oklch(0.26 0.02 280 / 0.4)",
            }}
          >
            {/* Album art placeholder */}
            <div
              className="h-9 w-9 shrink-0 rounded-lg"
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
                  <span className="text-accent"> · from {req.submittedBy}</span>
                )}
              </span>
            </div>

            {/* Approve / Reject buttons */}
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onApprove(req.id)}
                className="h-7 w-7 rounded-full text-primary hover:bg-primary/20"
                aria-label="Approve request"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onReject(req.id)}
                className="h-7 w-7 rounded-full hover:bg-destructive/20"
                style={{ color: "oklch(0.65 0.18 25)" }}
                aria-label="Reject request"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
