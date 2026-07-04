"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Zap, Crown, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

import { useAuth } from "@/lib/auth-context"
import { authRequest } from "@/lib/api"

const PLUS_PERKS = [
  "Ad-free Jukebox UI (our promos only — platform ads unaffected)",
  "Exclusive Plus badge on your profile and in chat",
  "Priority queue placement when requesting tracks",
  "Extended chat message history",
]

const NEON_PACKS = [
  { id: "starter", name: "Starter", neon: 100, price: "$1.99" },
  { id: "popular", name: "Popular", neon: 500, price: "$7.99", bonus: "+10%", popular: true },
  { id: "mega", name: "Mega", neon: "1,200", price: "$14.99", bonus: "+25%" },
  { id: "ultra", name: "Ultra", neon: "3,000", price: "$29.99", bonus: "+50%" },
]

export default function PricingPage() {
  const { isLoggedIn, user, refreshAuth } = useAuth()
  const [subscribing, setSubscribing] = useState(false)
  const [buyingPack, setBuyingPack] = useState<string | null>(null)
  const [boughtPack, setBoughtPack] = useState<string | null>(null)
  const [localBalance, setLocalBalance] = useState<number | null>(null)
  const neonBalance = localBalance ?? (user as any)?.neonBalance ?? 0

  const handleSubscribePlus = async () => {
    if (!isLoggedIn) return
    setSubscribing(true)
    try {
      await authRequest("/api/billing/plus/subscribe", { method: "POST" })
      await refreshAuth() // update user.isPlus in auth context
      window.location.reload()
    } catch {
      alert("Failed to subscribe. Please try again.")
    } finally {
      setSubscribing(false)
    }
  }

  const handleBuyNeon = async (packId: string) => {
    if (!isLoggedIn) return
    setBuyingPack(packId)
    try {
      const res = await authRequest<{ balance: number; neonAdded: number }>("/api/billing/neon/buy", {
        method: "POST",
        body: JSON.stringify({ packId }),
      })
      setLocalBalance(res.balance)
      refreshAuth() // update neon balance in navbar
      setBoughtPack(packId)
      setTimeout(() => setBoughtPack(null), 2000)
    } catch {
      alert("Purchase failed. Please try again.")
    } finally {
      setBuyingPack(null)
    }
  }

  return (
    <div className="relative min-h-screen bg-ink">
      <Navbar />

      <main
        className="relative z-10 mx-auto max-w-5xl px-4 lg:px-6"
        style={{ paddingBlock: "var(--space-xl)" }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-sans text-xs text-text-mid transition-colors hover:text-ink-foreground"
          style={{ marginBottom: "var(--space-lg)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Discover
        </Link>

        {/* Hero */}
        <div className="text-center" style={{ marginBottom: "var(--space-2xl)" }}>
          <h1 className="type-display font-sans text-ink-foreground">
            {(user as any)?.isPlus ? "Get Neon" : "Level up your Jukebox"}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl type-body font-sans text-text-mid">
            {(user as any)?.isPlus
              ? "Grab Neon to light up live rooms, trigger power-ups, and support your favorite DJs."
              : "Subscribe to Plus for an enhanced experience, or grab Neon to light up live rooms."
            }
          </p>
        </div>

        {/* Plus Card — hidden for existing Plus members */}
        {!(user as any)?.isPlus && (
        <div style={{ marginBottom: "var(--space-2xl)" }}>
          <div className="relative overflow-hidden rounded-2xl border-[0.5px] border-brand-purple/25 bg-white/[0.02] p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                    style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-purple-deep))" }}
                  >
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="type-h2 font-sans text-ink-foreground">Jukebox Plus</h2>
                    <p className="type-small font-sans text-text-mid">The ultimate listener experience</p>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {PLUS_PERKS.map((perk, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-brand-amber" />
                      <span className="font-sans text-sm text-text-mid">{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col items-center gap-4 lg:items-end">
                <div className="text-center lg:text-right">
                  <span className="type-display font-sans text-ink-foreground">$7.99</span>
                  <span className="font-sans text-sm text-text-mid">/month</span>
                </div>
                <Button
                  onClick={handleSubscribePlus}
                  disabled={subscribing || !isLoggedIn}
                  className="rounded-xl px-8 py-3 font-sans font-semibold text-white hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-purple-deep))" }}
                >
                  {subscribing ? "Processing..." : "Get Plus"}
                </Button>
                {!isLoggedIn && (
                  <p className="font-sans text-xs text-text-mid">
                    <Link href="/login" className="text-brand-amber hover:underline">Log in</Link> to subscribe
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Neon Packs */}
        <div style={{ marginBottom: "var(--space-2xl)" }}>
          <div className="text-center" style={{ marginBottom: "var(--space-lg)" }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-brand-cyan" />
              <h2 className="type-h2 font-sans text-ink-foreground">Neon Packs</h2>
            </div>
            <p className="mx-auto max-w-lg type-small font-sans text-text-mid">
              Buy Neon and send it as gifts in live rooms. Fill the neon tube, trigger power-ups, and show your support!
            </p>
            {isLoggedIn && neonBalance > 0 && (
              <p className="mt-2 flex items-center justify-center gap-1 font-mono text-sm font-bold text-brand-cyan">
                <Zap className="h-4 w-4" />
                Your balance: {neonBalance.toLocaleString()} Neon
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {NEON_PACKS.map((pack) => {
              const isBuying = buyingPack === pack.id
              const justBought = boughtPack === pack.id
              return (
                <button
                  key={pack.id}
                  onClick={() => handleBuyNeon(pack.id)}
                  disabled={!isLoggedIn || !!buyingPack || !!boughtPack}
                  className={`group relative flex flex-col items-center gap-3 rounded-2xl border-[0.5px] bg-white/[0.02] p-5 transition-colors hover:border-hairline-strong hover:bg-white/[0.04] disabled:opacity-60 ${
                    justBought ? "border-[var(--text-success)]" : "border-hairline"
                  }`}
                  style={{ cursor: isLoggedIn ? "pointer" : "default" }}
                >
                  {/* Popular badge */}
                  {(pack as any).popular && !justBought && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full border-[0.5px] border-brand-amber/25 bg-brand-amber/15 px-3 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider text-brand-amber">
                      Most Popular
                    </span>
                  )}

                  {justBought ? (
                    <>
                      <Sparkles className="h-8 w-8" style={{ color: "var(--text-success)" }} />
                      <span className="font-sans text-sm font-bold" style={{ color: "var(--text-success)" }}>Added!</span>
                      <span className="font-mono text-xs text-text-mid">Balance: {neonBalance.toLocaleString()}</span>
                    </>
                  ) : isBuying ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-brand-cyan" />
                      <span className="font-sans text-xs text-text-mid">Processing...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-6 w-6 text-brand-cyan" />
                      <span className="type-meta font-sans font-semibold text-text-low">{pack.name}</span>
                      <span className="font-mono text-2xl font-bold text-ink-foreground">
                        {pack.neon}
                      </span>
                      {pack.bonus && (
                        <span className="rounded-full bg-brand-cyan/10 px-2 py-0.5 font-sans text-[10px] font-bold text-brand-cyan">
                          {pack.bonus} bonus
                        </span>
                      )}
                      <span className="rounded-full border-[0.5px] border-hairline-strong bg-white/[0.04] px-4 py-1.5 font-sans text-sm font-semibold text-text-hi">
                        {pack.price}
                      </span>
                    </>
                  )}
                </button>
              )
            })}
          </div>

          {!isLoggedIn && (
            <p className="mt-4 text-center font-sans text-xs text-text-mid">
              <Link href="/login" className="text-brand-amber hover:underline">Log in</Link> to purchase Neon Packs
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
