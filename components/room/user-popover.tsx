"use client"

import { useState } from "react"
import { MessageCircle, Clock, Calendar, User } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { getChatUser, currentUser, type ChatUser } from "@/lib/mock-data"
import { useMessages } from "@/lib/messages-context"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

interface UserPopoverProps {
  username: string
  avatarColor: string
  userId?: string // real user ID — empty/undefined for anonymous session users
  children: React.ReactNode
}

export function UserPopover({
  username,
  avatarColor,
  userId,
  children,
}: UserPopoverProps) {
  const [open, setOpen] = useState(false)
  const { startConversation } = useMessages()
  const { isLoggedIn } = useAuth()

  // Don't show popover for the current user
  if (username === currentUser.username || username === "You") {
    return <>{children}</>
  }

  const user = getChatUser(username)
  const isRegistered = !!userId
  const canDM = isLoggedIn && isRegistered

  const handleDM = () => {
    if (!canDM) return
    if (user) {
      startConversation(user)
    } else {
      startConversation({
        username: userId!, // use the real user ID as the username key for DM routing
        displayName: username,
        avatarColor,
        bio: "",
        joinDate: "Unknown",
        listenHours: 0,
      })
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        className="w-64 rounded-xl border-border/40 p-0"
        style={{
          background: "oklch(0.14 0.015 280 / 0.95)",
          backdropFilter: "blur(8px)",
          zIndex: 50,
        }}
      >
        <div className="p-4">
          {/* Avatar + Name */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{
                background: `${avatarColor}`,
                color: "oklch(0.10 0.01 280)",
              }}
            >
              {username[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-sans text-sm font-semibold text-foreground">
                {user?.displayName ?? username}
              </p>
              <p className="truncate font-sans text-xs text-muted-foreground">
                {isRegistered ? `@${username}` : "Guest listener"}
              </p>
            </div>
          </div>

          {/* Bio */}
          {user?.bio && (
            <p className="mt-3 font-sans text-xs text-muted-foreground leading-relaxed">
              {user.bio}
            </p>
          )}

          {/* Stats row */}
          {user && (
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="font-mono text-[10px]">
                  {user.listenHours}h listened
                </span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span className="font-mono text-[10px]">
                  {user.joinDate}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3 flex gap-2">
            {canDM ? (
              <Button
                size="sm"
                onClick={handleDM}
                className="flex-1 gap-1.5 rounded-lg font-sans text-xs"
                style={{
                  background: "oklch(0.55 0.20 270)",
                  color: "oklch(0.95 0.01 280)",
                }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Message
              </Button>
            ) : !isLoggedIn ? (
              <Link href="/login" onClick={() => setOpen(false)} className="flex-1">
                <Button
                  size="sm"
                  className="w-full gap-1.5 rounded-lg font-sans text-xs"
                  style={{
                    background: "oklch(0.25 0.02 280)",
                    color: "oklch(0.60 0.02 280)",
                    border: "1px solid oklch(0.30 0.02 280 / 0.5)",
                  }}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Log in to message
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                disabled
                className="flex-1 gap-1.5 rounded-lg font-sans text-xs opacity-50"
                style={{
                  background: "oklch(0.20 0.02 280)",
                  color: "oklch(0.50 0.02 280)",
                }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Guest — no DMs
              </Button>
            )}
            {isRegistered && (
              <Link href={`/user/${encodeURIComponent(username)}`} onClick={() => setOpen(false)}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 rounded-lg font-sans text-xs text-muted-foreground hover:text-foreground"
                >
                  <User className="h-3.5 w-3.5" />
                  Profile
                </Button>
              </Link>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
