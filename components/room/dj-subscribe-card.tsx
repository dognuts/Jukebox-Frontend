"use client"

import { useState, useEffect, useCallback } from "react"
import { Heart, Loader2, Check, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authRequest, API_BASE } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface DJSubscribeCardProps {
  djUserId: string
  djName: string
}

export function DJSubscribeCard({ djUserId, djName }: DJSubscribeCardProps) {
  const { isLoggedIn, user } = useAuth()
  const [priceCents, setPriceCents] = useState(499)
  const [isEnabled, setIsEnabled] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [justSubscribed, setJustSubscribed] = useState(false)

  // Don't show if viewing your own room
  const isOwnRoom = (user as any)?.id === djUserId

  useEffect(() => {
    if (!djUserId) return
    let cancelled = false

    async function load() {
      try {
        // Get DJ sub settings (public)
        const settingsRes = await fetch(`${API_BASE}/api/billing/dj/${djUserId}/settings`, { credentials: "include" })
        if (settingsRes.ok) {
          const settings = await settingsRes.json()
          if (!cancelled) {
            setPriceCents(settings.priceCents || 499)
            setIsEnabled(settings.isEnabled ?? false)
          }
        }

        // Check if current user is subscribed
        if (isLoggedIn) {
          try {
            const subRes = await authRequest<{ subscribed: boolean }>(`/api/billing/dj/${djUserId}/subscription`)
            if (!cancelled) setIsSubscribed(subRes.subscribed)
          } catch {}
        }
      } catch {}
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [djUserId, isLoggedIn])

  const handleSubscribe = useCallback(async () => {
    if (!isLoggedIn) return
    setSubscribing(true)
    try {
      await authRequest(`/api/billing/dj/${djUserId}/subscribe`, { method: "POST" })
      setIsSubscribed(true)
      setJustSubscribed(true)
      setTimeout(() => setJustSubscribed(false), 3000)
    } catch {
      alert("Failed to subscribe. Please try again.")
    } finally {
      setSubscribing(false)
    }
  }, [djUserId, isLoggedIn])

  // Don't render if: loading, not enabled, or viewing own room
  if (loading || !isEnabled || isOwnRoom) return null

  const priceStr = `$${(priceCents / 100).toFixed(2)}`

  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3"
      style={{
        background: "linear-gradient(135deg, oklch(0.14 0.04 330 / 0.4), oklch(0.12 0.03 280 / 0.4))",
        border: "1px solid oklch(0.55 0.18 330 / 0.25)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "oklch(0.55 0.18 330 / 0.15)" }}
        >
          <Heart className="h-4 w-4" style={{ color: "oklch(0.70 0.20 330)" }} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-sans text-xs font-semibold text-foreground">
            Subscribe to {djName}
          </p>
          <p className="font-sans text-[10px] text-muted-foreground">
            {priceStr}/month — support this DJ directly
          </p>
        </div>
      </div>

      {isSubscribed ? (
        <div className="flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5"
          style={{
            background: justSubscribed ? "oklch(0.55 0.18 150 / 0.15)" : "oklch(0.55 0.18 330 / 0.1)",
            border: `1px solid ${justSubscribed ? "oklch(0.55 0.18 150 / 0.3)" : "oklch(0.55 0.18 330 / 0.25)"}`,
          }}
        >
          {justSubscribed ? (
            <Crown className="h-3.5 w-3.5" style={{ color: "oklch(0.65 0.18 150)" }} />
          ) : (
            <Check className="h-3.5 w-3.5" style={{ color: "oklch(0.70 0.20 330)" }} />
          )}
          <span className="font-sans text-[11px] font-semibold"
            style={{ color: justSubscribed ? "oklch(0.65 0.18 150)" : "oklch(0.70 0.20 330)" }}
          >
            {justSubscribed ? "Subscribed!" : "Subscribed"}
          </span>
        </div>
      ) : (
        <Button
          onClick={handleSubscribe}
          disabled={subscribing || !isLoggedIn}
          size="sm"
          className="shrink-0 gap-1.5 rounded-full font-sans text-xs font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, oklch(0.55 0.20 330), oklch(0.48 0.22 300))",
            boxShadow: "0 0 12px oklch(0.55 0.20 330 / 0.25)",
          }}
        >
          {subscribing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Heart className="h-3.5 w-3.5" />
          )}
          {priceStr}/mo
        </Button>
      )}
    </div>
  )
}
