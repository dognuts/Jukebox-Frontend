"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { User, LogOut, LogIn, Crown, Shield, Mail } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import { useUpgrade } from "@/lib/upgrade-context"

export function UserMenu() {
  const { user, isLoggedIn, logout } = useAuth()
  const { plan, openUpgradeDialog } = useUpgrade()
  const router = useRouter()

  // Not logged in — show login button
  if (!isLoggedIn || !user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <button
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-sm font-medium transition-all hover:opacity-90"
            style={{
              background: "oklch(0.82 0.18 80 / 0.15)",
              border: "1px solid oklch(0.82 0.18 80 / 0.3)",
              color: "oklch(0.82 0.18 80)",
            }}
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Log in</span>
          </button>
        </Link>
      </div>
    )
  }

  const initials = user.displayName.slice(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border/30 font-sans text-sm font-bold text-foreground transition-all hover:scale-105 hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          style={{ background: user.avatarColor || "oklch(0.70 0.18 30)" }}
          aria-label="User menu"
        >
          <span className="text-background">{initials}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-xl border border-border/30 bg-background/95 p-1 backdrop-blur-md"
      >
        <DropdownMenuLabel className="px-3 py-2 font-sans text-sm">
          <div className="font-semibold text-foreground">{user.displayName}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
          {!user.emailVerified && (
            <ResendVerificationLink />
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/30" />
        <DropdownMenuItem asChild>
          <Link
            href="/account"
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 font-sans text-sm text-foreground transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
          >
            <User className="h-4 w-4" />
            Account
          </Link>
        </DropdownMenuItem>
        {user.isAdmin && (
          <DropdownMenuItem asChild>
            <Link
              href="/admin"
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 font-sans text-sm transition-colors hover:bg-accent/10 hover:text-accent focus:bg-accent/10 focus:text-accent"
              style={{ color: "oklch(0.65 0.18 270)" }}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          </DropdownMenuItem>
        )}
        {plan === "free" && (
          <>
            <DropdownMenuSeparator className="bg-border/30" />
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 font-sans text-sm font-semibold upgrade-button-premium transition-all"
              onClick={openUpgradeDialog}
              style={{
                background: "linear-gradient(135deg, oklch(0.82 0.18 80) 0%, oklch(0.85 0.20 60) 50%, oklch(0.72 0.18 250) 100%)",
                backgroundSize: "200% auto",
                color: "oklch(0.15 0.02 80)",
              }}
            >
              <Crown className="h-4 w-4" />
              <span>Upgrade to Premium</span>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator className="bg-border/30" />
        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 font-sans text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={async () => {
            await logout()
            router.push("/")
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ResendVerificationLink() {
  const { resendVerification } = useAuth()
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")

  const handleResend = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (status === "sending" || status === "sent") return
    setStatus("sending")
    try {
      await resendVerification()
      setStatus("sent")
    } catch {
      setStatus("error")
      setTimeout(() => setStatus("idle"), 3000)
    }
  }

  return (
    <button
      onClick={handleResend}
      className="mt-1 flex items-center gap-1 text-[10px] font-medium transition-colors hover:underline"
      style={{
        color: status === "sent" ? "oklch(0.65 0.18 150)" : status === "error" ? "oklch(0.65 0.15 25)" : "oklch(0.75 0.15 60)",
      }}
    >
      <Mail className="h-2.5 w-2.5" />
      {status === "sending" ? "Sending..." : status === "sent" ? "Verification sent!" : status === "error" ? "Failed — try again" : "Resend verification email"}
    </button>
  )
}
