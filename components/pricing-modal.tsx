"use client"

import { useState, useCallback, useMemo, createContext, useContext, type ReactNode } from "react"
import { X, Check, Zap, Crown, Loader2, Sparkles } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { authRequest } from "@/lib/api"
import { withNextParam } from "@/components/auth/next-param"

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

  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close])

  return (
    <PricingModalContext.Provider value={value}>
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
  { id: "starter", name: "Starter", neon: 100, price: "$1.99" },
  { id: "popular", name: "Popular", neon: 500, price: "$7.99", bonus: "+10%", popular: true },
  { id: "mega", name: "Mega", neon: "1,200", price: "$14.99", bonus: "+25%" },
  { id: "ultra", name: "Ultra", neon: "3,000", price: "$29.99", bonus: "+50%" },
]

// ── Modal Component ──

function PricingModal({ onClose }: { onClose: () => void }) {
  const pathname = usePathname()
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
      setLocalBalance(res.balance)
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
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-[0.5px] border-hairline bg-popover p-0 sm:max-w-2xl"
      >
        {/* Close button */}
        <DialogClose
          aria-label="Close"
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full text-text-low transition-colors hover:bg-white/[0.06] hover:text-text-hi"
        >
          <X className="h-5 w-5" />
        </DialogClose>

        {/* Scroll container — scrolling lives here so the absolute close button stays pinned */}
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto px-6 py-8 sm:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <DialogTitle className="type-display font-sans text-ink-foreground">
              {(user as any)?.isPlus ? "Get Neon" : "Level up your Jukebox"}
            </DialogTitle>
            <DialogDescription className="mt-1.5 type-small font-sans text-text-mid">
              {(user as any)?.isPlus
                ? "Grab Neon to light up live rooms and support your favorite DJs."
                : "Subscribe to Plus or grab Neon to light up live rooms."
              }
            </DialogDescription>
          </div>

          {/* Plus Card — hidden for existing Plus members */}
          {!(user as any)?.isPlus && (
          <div className="relative overflow-hidden rounded-2xl border-[0.5px] border-brand-purple/25 bg-white/[0.02] p-5 sm:p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="flex-1">
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-purple-deep))" }}
                  >
                    <Crown className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="type-h2 font-sans text-ink-foreground">Jukebox Plus</h3>
                  </div>
                </div>

                <ul className="space-y-1.5 mb-0 sm:mb-0">
                  {PLUS_PERKS.map((perk, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-brand-amber" />
                      <span className="font-sans text-xs text-text-mid">{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col items-center gap-3 sm:items-end">
                <div className="text-center sm:text-right">
                  <span className="type-display font-sans text-ink-foreground">$7.99</span>
                  <span className="font-sans text-sm text-text-mid">/mo</span>
                </div>
                <button
                  onClick={handleSubscribePlus}
                  disabled={subscribing || !isLoggedIn}
                  className="rounded-full px-6 py-2 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-purple-deep))" }}
                >
                  {subscribing ? "Processing..." : "Get Plus"}
                </button>
                {!isLoggedIn && (
                  <p className="font-sans text-[10px] text-text-mid">
                    <Link href={withNextParam("/login", pathname)} className="text-brand-amber hover:underline" onClick={onClose}>Log in</Link> to subscribe
                  </p>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Neon Packs */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand-cyan" />
                <h3 className="type-h2 font-sans text-ink-foreground">Neon Packs</h3>
              </div>
              {isLoggedIn && neonBalance > 0 && (
                <span className="flex items-center gap-1 font-mono text-xs font-bold text-brand-cyan">
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
                    className={`group relative flex flex-col items-center gap-2 rounded-xl border-[0.5px] bg-white/[0.02] p-4 transition-colors hover:border-hairline-strong hover:bg-white/[0.04] disabled:opacity-60 ${
                      justBought ? "border-[var(--text-success)]" : "border-hairline"
                    }`}
                  >
                    {(pack as any).popular && !justBought && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full border-[0.5px] border-brand-amber/25 bg-brand-amber/15 px-2 py-0.5 font-sans text-[8px] font-bold uppercase tracking-wider text-brand-amber">
                        Popular
                      </span>
                    )}

                    {justBought ? (
                      <>
                        <Sparkles className="h-6 w-6" style={{ color: "var(--text-success)" }} />
                        <span className="font-sans text-xs font-bold" style={{ color: "var(--text-success)" }}>Added!</span>
                      </>
                    ) : isBuying ? (
                      <Loader2 className="h-6 w-6 animate-spin text-brand-cyan" />
                    ) : (
                      <>
                        <Zap className="h-5 w-5 text-brand-cyan" />
                        <span className="font-mono text-xl font-bold text-ink-foreground">{pack.neon}</span>
                        {pack.bonus && (
                          <span className="rounded-full bg-brand-cyan/10 px-1.5 py-0.5 font-sans text-[9px] font-bold text-brand-cyan">
                            {pack.bonus}
                          </span>
                        )}
                        <span className="rounded-full border-[0.5px] border-hairline-strong bg-white/[0.04] px-3 py-1 font-sans text-xs font-semibold text-text-hi">
                          {pack.price}
                        </span>
                      </>
                    )}
                  </button>
                )
              })}
            </div>

            {!isLoggedIn && (
              <p className="mt-3 text-center font-sans text-[10px] text-text-mid">
                <Link href={withNextParam("/login", pathname)} className="text-brand-amber hover:underline" onClick={onClose}>Log in</Link> to purchase
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
