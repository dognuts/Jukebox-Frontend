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
  { id: "starter", name: "Starter", neon: 100, price: "$1.99", color: "oklch(0.72 0.18 195)" },
  { id: "popular", name: "Popular", neon: 500, price: "$7.99", bonus: "+10%", color: "oklch(0.65 0.24 330)", popular: true },
  { id: "mega", name: "Mega", neon: "1,200", price: "$14.99", bonus: "+25%", color: "oklch(0.82 0.18 80)" },
  { id: "ultra", name: "Ultra", neon: "3,000", price: "$29.99", bonus: "+50%", color: "oklch(0.90 0.05 0)" },
]

export default function PricingPage() {
  const { isLoggedIn, user } = useAuth()
  const [subscribing, setSubscribing] = useState(false)
  const [buyingPack, setBuyingPack] = useState<string | null>(null)
  const [boughtPack, setBoughtPack] = useState<string | null>(null)
  const [neonBalance, setNeonBalance] = useState((user as any)?.neonBalance ?? 0)

  const handleSubscribePlus = async () => {
    if (!isLoggedIn) return
    setSubscribing(true)
    try {
      await authRequest("/api/billing/plus/subscribe", { method: "POST" })
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
      setNeonBalance(res.balance)
      setBoughtPack(packId)
      setTimeout(() => setBoughtPack(null), 2000)
    } catch {
      alert("Purchase failed. Please try again.")
    } finally {
      setBuyingPack(null)
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-5xl px-4 py-12 lg:px-6">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-1.5 font-sans text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Discover
          </Link>

          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="font-sans text-4xl font-bold text-foreground tracking-tight">
              Level Up Your <span style={{ color: "oklch(0.82 0.18 80)" }}>Jukebox</span> Experience
            </h1>
            <p className="mt-3 font-sans text-lg text-muted-foreground max-w-2xl mx-auto">
              Subscribe to Plus for an enhanced experience, or grab Neon to light up live rooms.
            </p>
          </div>

          {/* Plus Card */}
          <div className="mb-16">
            <div
              className="relative overflow-hidden rounded-3xl p-8 lg:p-10"
              style={{
                background: "linear-gradient(135deg, oklch(0.14 0.03 270), oklch(0.11 0.02 300))",
                border: "1px solid oklch(0.55 0.22 270 / 0.3)",
                boxShadow: "0 0 40px oklch(0.55 0.22 270 / 0.1)",
              }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: "oklch(0.55 0.22 270 / 0.2)", border: "1px solid oklch(0.55 0.22 270 / 0.4)" }}
                    >
                      <Crown className="h-5 w-5" style={{ color: "oklch(0.72 0.18 270)" }} />
                    </div>
                    <div>
                      <h2 className="font-sans text-2xl font-bold text-foreground">Jukebox Plus</h2>
                      <p className="font-sans text-sm text-muted-foreground">The ultimate listener experience</p>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {PLUS_PERKS.map((perk, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "oklch(0.72 0.18 270)" }} />
                        <span className="font-sans text-sm text-foreground/80">{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col items-center gap-4 lg:items-end">
                  <div className="text-center lg:text-right">
                    <span className="font-sans text-4xl font-bold text-foreground">$7.99</span>
                    <span className="font-sans text-sm text-muted-foreground">/month</span>
                  </div>
                  <Button
                    onClick={handleSubscribePlus}
                    disabled={subscribing || (user as any)?.isPlus}
                    className="rounded-full px-8 py-3 font-sans font-semibold text-white"
                    style={{
                      background: (user as any)?.isPlus
                        ? "oklch(0.40 0.10 270)"
                        : "linear-gradient(135deg, oklch(0.55 0.22 270), oklch(0.48 0.24 300))",
                      boxShadow: (user as any)?.isPlus ? "none" : "0 0 20px oklch(0.55 0.22 270 / 0.3)",
                    }}
                  >
                    {(user as any)?.isPlus ? "You're a Plus Member" : subscribing ? "Processing..." : "Get Plus"}
                  </Button>
                  {!isLoggedIn && (
                    <p className="font-sans text-xs text-muted-foreground">
                      <Link href="/login" className="text-primary hover:underline">Log in</Link> to subscribe
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Neon Packs */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-5 w-5" style={{ color: "oklch(0.72 0.18 195)" }} />
                <h2 className="font-sans text-2xl font-bold text-foreground">Neon Packs</h2>
              </div>
              <p className="font-sans text-sm text-muted-foreground max-w-lg mx-auto">
                Buy Neon and send it as gifts in live rooms. Fill the neon tube, trigger power-ups, and show your support!
              </p>
              {isLoggedIn && neonBalance > 0 && (
                <p className="mt-2 flex items-center justify-center gap-1 font-mono text-sm font-bold" style={{ color: "oklch(0.72 0.18 195)" }}>
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
                    className="group relative flex flex-col items-center gap-3 rounded-2xl p-5 transition-all hover:scale-105 active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                    style={{
                      background: justBought
                        ? "oklch(0.18 0.05 150 / 0.5)"
                        : "oklch(0.13 0.02 270 / 0.5)",
                      border: `1.5px solid ${justBought ? "oklch(0.55 0.18 150 / 0.5)" : pack.color.replace(")", " / 0.3)")}`,
                      boxShadow: `0 0 20px ${pack.color.replace(")", " / 0.08)")}`,
                      cursor: isLoggedIn ? "pointer" : "default",
                    }}
                  >
                    {/* Popular badge */}
                    {(pack as any).popular && !justBought && (
                      <span
                        className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider"
                        style={{
                          background: pack.color.replace(")", " / 0.2)"),
                          border: `1px solid ${pack.color.replace(")", " / 0.4)")}`,
                          color: pack.color,
                        }}
                      >
                        Most Popular
                      </span>
                    )}

                    {justBought ? (
                      <>
                        <Sparkles className="h-8 w-8" style={{ color: "oklch(0.65 0.18 150)" }} />
                        <span className="font-sans text-sm font-bold" style={{ color: "oklch(0.65 0.18 150)" }}>Added!</span>
                        <span className="font-mono text-xs text-muted-foreground">Balance: {neonBalance.toLocaleString()}</span>
                      </>
                    ) : isBuying ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin" style={{ color: pack.color }} />
                        <span className="font-sans text-xs text-muted-foreground">Processing...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-6 w-6 transition-transform group-hover:scale-110" style={{ color: pack.color }} />
                        <span className="font-sans text-xs font-semibold text-muted-foreground">{pack.name}</span>
                        <span className="font-mono text-2xl font-bold" style={{ color: pack.color }}>
                          {pack.neon}
                        </span>
                        {pack.bonus && (
                          <span className="rounded-full px-2 py-0.5 font-sans text-[10px] font-bold"
                            style={{ background: `${pack.color.replace(")", " / 0.15)")}`, color: pack.color }}
                          >
                            {pack.bonus} bonus
                          </span>
                        )}
                        <span className="rounded-full px-4 py-1.5 font-sans text-sm font-bold text-foreground transition-all group-hover:scale-105"
                          style={{
                            background: "oklch(0.20 0.02 280)",
                            border: `1px solid ${pack.color.replace(")", " / 0.3)")}`,
                          }}
                        >
                          {pack.price}
                        </span>
                      </>
                    )}
                  </button>
                )
              })}
            </div>

            {!isLoggedIn && (
              <p className="mt-4 text-center font-sans text-xs text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">Log in</Link> to purchase Neon Packs
              </p>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  )
}
