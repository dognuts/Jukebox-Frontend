"use client"

import { useState, useCallback, createContext, useContext, type ReactNode } from "react"
import { X, Check, Zap, Crown, Loader2, Sparkles } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { authRequest } from "@/lib/api"

// ── Context so any component can open the pricing modal ──

interface PricingModalContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
}

const PricingModalContext = createContext<PricingModalContextValue | null>(null)

export function usePricingModal() {
  const ctx = useContext(PricingModalContext)
  if (!ctx) throw new Error("usePricingModal must be used within PricingModalProvider")
  return ctx
}

export function PricingModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return (
    <PricingModalContext.Provider value={{ isOpen, open, close }}>
      {children}
      {isOpen && <PricingModal onClose={close} />}
    </PricingModalContext.Provider>
  )
}

// ── Data ──

const PLUS_PERKS = [
  "Ad-free Jukebox experience",
  "Plus badge in chat & profile",
  "Priority queue placement",
  "Extended chat history",
]

const NEON_PACKS = [
  { id: "starter", name: "Starter", neon: 100, price: "$1.99", color: "oklch(0.72 0.18 195)" },
  { id: "popular", name: "Popular", neon: 500, price: "$7.99", bonus: "+10%", color: "oklch(0.65 0.24 330)", popular: true },
  { id: "mega", name: "Mega", neon: "1,200", price: "$14.99", bonus: "+25%", color: "oklch(0.82 0.18 80)" },
  { id: "ultra", name: "Ultra", neon: "3,000", price: "$29.99", bonus: "+50%", color: "oklch(0.90 0.05 0)" },
]

// ── Modal Component ──

function PricingModal({ onClose }: { onClose: () => void }) {
  const { isLoggedIn, user, refreshAuth } = useAuth()
  const [subscribing, setSubscribing] = useState(false)
  const [buyingPack, setBuyingPack] = useState<string | null>(null)
  const [boughtPack, setBoughtPack] = useState<string | null>(null)
  const [neonBalance, setNeonBalance] = useState((user as any)?.neonBalance ?? 0)

  const handleSubscribePlus = async () => {
    if (!isLoggedIn) return
    setSubscribing(true)
    try {
      await authRequest("/api/billing/plus/subscribe", { method: "POST" })
      await refreshAuth()
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
      refreshAuth()
      setBoughtPack(packId)
      setTimeout(() => setBoughtPack(null), 2000)
    } catch {
      alert("Purchase failed. Please try again.")
    } finally {
      setBuyingPack(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-2xl mx-4 my-8 rounded-3xl animate-in slide-in-from-bottom-4 fade-in duration-300"
        style={{
          background: "oklch(0.12 0.015 280)",
          border: "1px solid oklch(0.25 0.02 280 / 0.6)",
          boxShadow: "0 25px 80px oklch(0 0 0 / 0.5), 0 0 40px oklch(0.55 0.22 270 / 0.08)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full transition-all hover:bg-muted/20"
          style={{ color: "oklch(0.6 0.02 280)" }}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-6 py-8 sm:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="font-sans text-2xl font-bold text-foreground tracking-tight">
              Level Up Your <span style={{ color: "oklch(0.82 0.18 80)" }}>Jukebox</span>
            </h2>
            <p className="mt-1.5 font-sans text-sm text-muted-foreground">
              Subscribe to Plus or grab Neon to light up live rooms.
            </p>
          </div>

          {/* Plus Card */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 sm:p-6 mb-8"
            style={{
              background: "linear-gradient(135deg, oklch(0.14 0.03 270), oklch(0.11 0.02 300))",
              border: "1px solid oklch(0.55 0.22 270 / 0.3)",
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="flex-1">
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: "oklch(0.55 0.22 270 / 0.2)", border: "1px solid oklch(0.55 0.22 270 / 0.4)" }}
                  >
                    <Crown className="h-4 w-4" style={{ color: "oklch(0.72 0.18 270)" }} />
                  </div>
                  <div>
                    <h3 className="font-sans text-lg font-bold text-foreground">Jukebox Plus</h3>
                  </div>
                </div>

                <ul className="space-y-1.5 mb-0 sm:mb-0">
                  {PLUS_PERKS.map((perk, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "oklch(0.72 0.18 270)" }} />
                      <span className="font-sans text-xs text-foreground/80">{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col items-center gap-3 sm:items-end">
                <div className="text-center sm:text-right">
                  <span className="font-sans text-3xl font-bold text-foreground">$7.99</span>
                  <span className="font-sans text-sm text-muted-foreground">/mo</span>
                </div>
                <button
                  onClick={handleSubscribePlus}
                  disabled={subscribing || (user as any)?.isPlus || !isLoggedIn}
                  className="rounded-full px-6 py-2 font-sans text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
                  style={{
                    background: (user as any)?.isPlus
                      ? "oklch(0.40 0.10 270)"
                      : "linear-gradient(135deg, oklch(0.55 0.22 270), oklch(0.48 0.24 300))",
                    boxShadow: (user as any)?.isPlus ? "none" : "0 0 20px oklch(0.55 0.22 270 / 0.3)",
                  }}
                >
                  {(user as any)?.isPlus ? "Active" : subscribing ? "Processing..." : "Get Plus"}
                </button>
                {!isLoggedIn && (
                  <p className="font-sans text-[10px] text-muted-foreground">
                    <Link href="/login" className="text-primary hover:underline" onClick={onClose}>Log in</Link> to subscribe
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Neon Packs */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" style={{ color: "oklch(0.72 0.18 195)" }} />
                <h3 className="font-sans text-lg font-bold text-foreground">Neon Packs</h3>
              </div>
              {isLoggedIn && neonBalance > 0 && (
                <span className="flex items-center gap-1 font-mono text-xs font-bold" style={{ color: "oklch(0.72 0.18 195)" }}>
                  <Zap className="h-3 w-3" />
                  {neonBalance.toLocaleString()}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {NEON_PACKS.map((pack) => {
                const isBuying = buyingPack === pack.id
                const justBought = boughtPack === pack.id
                return (
                  <button
                    key={pack.id}
                    onClick={() => handleBuyNeon(pack.id)}
                    disabled={!isLoggedIn || !!buyingPack || !!boughtPack}
                    className="group relative flex flex-col items-center gap-2 rounded-xl p-4 transition-all hover:scale-105 active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                    style={{
                      background: justBought
                        ? "oklch(0.18 0.05 150 / 0.5)"
                        : "oklch(0.15 0.02 270 / 0.5)",
                      border: `1.5px solid ${justBought ? "oklch(0.55 0.18 150 / 0.5)" : pack.color.replace(")", " / 0.3)")}`,
                    }}
                  >
                    {(pack as any).popular && !justBought && (
                      <span
                        className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 font-sans text-[8px] font-bold uppercase tracking-wider"
                        style={{
                          background: pack.color.replace(")", " / 0.2)"),
                          border: `1px solid ${pack.color.replace(")", " / 0.4)")}`,
                          color: pack.color,
                        }}
                      >
                        Popular
                      </span>
                    )}

                    {justBought ? (
                      <>
                        <Sparkles className="h-6 w-6" style={{ color: "oklch(0.65 0.18 150)" }} />
                        <span className="font-sans text-xs font-bold" style={{ color: "oklch(0.65 0.18 150)" }}>Added!</span>
                      </>
                    ) : isBuying ? (
                      <Loader2 className="h-6 w-6 animate-spin" style={{ color: pack.color }} />
                    ) : (
                      <>
                        <Zap className="h-5 w-5 transition-transform group-hover:scale-110" style={{ color: pack.color }} />
                        <span className="font-mono text-xl font-bold" style={{ color: pack.color }}>{pack.neon}</span>
                        {pack.bonus && (
                          <span className="rounded-full px-1.5 py-0.5 font-sans text-[9px] font-bold"
                            style={{ background: `${pack.color.replace(")", " / 0.12)")}`, color: pack.color }}
                          >
                            {pack.bonus}
                          </span>
                        )}
                        <span
                          className="rounded-full px-3 py-1 font-sans text-xs font-bold text-foreground"
                          style={{ background: "oklch(0.20 0.02 280)", border: `1px solid ${pack.color.replace(")", " / 0.3)")}` }}
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
              <p className="mt-3 text-center font-sans text-[10px] text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline" onClick={onClose}>Log in</Link> to purchase
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
