"use client"

import { useState } from "react"
import { UserCheck, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function FollowButton({ displayName }: { displayName: string }) {
  const [following, setFollowing] = useState(false)

  function handleClick() {
    // Toast outside the state updater — updaters must stay pure (StrictMode
    // runs them twice, which double-fired the toast).
    const next = !following
    setFollowing(next)
    toast.success(next ? `Following ${displayName}` : `Unfollowed ${displayName}`)
  }

  return (
    <Button
      onClick={handleClick}
      variant={following ? "outline" : "default"}
      className={
        following
          ? "gap-2 rounded-full border-border/60 font-sans text-foreground hover:bg-muted/40"
          : "gap-2 rounded-full bg-primary font-sans text-primary-foreground hover:bg-primary/90"
      }
    >
      {following ? (
        <>
          <UserCheck className="h-4 w-4" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          Follow
        </>
      )}
    </Button>
  )
}
