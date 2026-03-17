"use client"

import { useState, useCallback } from "react"
import { Zap, Loader2, Sparkles, ArrowLeft, Plus, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { authRequest } from "@/lib/api"

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500]

const NEON_PACKS = [
  { id: "starter", name: "Starter", neon: 100, price: "$1.99", priceCents: 199, color: "oklch(0.72 0.18 195)" },
  { id: "popular", name: "Popular", neon: 500, price: "$7.99", priceCents: 799, bonus: "+10%", color: "oklch(0.65 0.24 330)" },
  { id: "mega", name: "Mega", neon: 1200, price: "$14.99", priceCents: 1499, bonus: "+25%", color: "oklch(0.82 0.18 80)" },
  { id: "ultra", name: "Ultra", neon: 3000, price: "$29.99", priceCents: 2999, bonus: "+50%", color: "oklch(0.90 0.05 0)" },
]

type View = "send" | "topup"

interface SendNeonModalProps {
  open: boolean
  onClose: () => void
  roomId: string
  neonBalance: number
  onBalanceChange?: (newBalance: number) => void
}

export function SendNeonModal({ open, onClose, roomId, neonBalance: initialBalance, onBalanceChange }: SendNeonModalProps) {
  const [view, setView] = useState<View>("send")
  const [balance, setBalance] = useState(initialBalance)
  const [amount, setAmount] = useState(25)
  const [sending, setSending] = useState(false)
  const [buying, setBuying] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [buySuccess, setBuySuccess] = useState<string | null>(null)
  const [error, setError] = useState("")

  // Sync balance from props when modal opens
  useState(() => { setBalance(initialBalance) })

  const updateBalance = useCallback((newBal: number) => {
    setBalance(newBal)
    onBalanceChange?.(newBal)
  }, [onBalanceChange])

  // ---- Send flow ----
  const handleSend = useCallback(async () => {
    if (amount < 1 || amount > balance) return
    setSending(true)
    setError("")
    try {
      const res = await authRequest<{ balance: number; powerUp: boolean }>("/api/billing/neon/send", {
        method: "POST",
        body: JSON.stringify({ roomId, amount }),
      })
      updateBalance(res.balance)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
        setAmount(25)
        setView("send")
      }, 1200)
    } catch (err: any) {
      setError(err.message?.includes("insufficient") ? "Not enough Neon! Top up below." : "Failed to send Neon")
    } finally {
      setSending(false)
    }
  }, [amount, roomId, balance, onClose, updateBalance])

  // ---- Buy flow ----
  const handleBuy = useCallback(async (packId: string) => {
    setBuying(packId)
    setError("")
    try {
      const res = await authRequest<{ balance: number; neonAdded: number }>("/api/billing/neon/buy", {
        method: "POST",
        body: JSON.stringify({ packId }),
      })
      updateBalance(res.balance)
      setBuySuccess(packId)
      setTimeout(() => {
        setBuySuccess(null)
        setView("send") // return to send view with updated balance
      }, 1200)
    } catch (err: any) {
      setError("Purchase failed. Please try again.")
    } finally {
      setBuying(null)
    }
  }, [updateBalance])

  const handleClose = useCallback(() => {
    onClose()
    // Reset state after close animation
    setTimeout(() => {
      setView("send")
      setError("")
      setSuccess(false)
      setBuySuccess(null)
    }, 200)
  }, [onClose])

  const needsTopUp = amount > balance

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent
        className="border-border/30 sm:max-w-sm"
        style={{ background: "oklch(0.12 0.02 270 / 0.97)", backdropFilter: "blur(20px)" }}
      >
        {/* ============ SEND VIEW ============ */}
        {view === "send" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-sans text-lg text-foreground">
                <Zap className="h-5 w-5" style={{ color: "oklch(0.72 0.18 195)" }} />
                Send Neon
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Balance + Top Up button */}
              <div className="flex items-center justify-between rounded-xl px-3 py-2"
                style={{ background: "oklch(0.16 0.02 270 / 0.6)", border: "1px solid oklch(0.30 0.04 270 / 0.3)" }}
              >
                <span className="font-sans text-xs text-muted-foreground">Your balance</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-mono text-sm font-bold" style={{ color: "oklch(0.72 0.18 195)" }}>
                    <Zap className="h-3.5 w-3.5" />
                    {balance.toLocaleString()}
                  </span>
                  <button
                    onClick={() => { setError(""); setView("topup") }}
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[10px] font-semibold transition-all hover:scale-105"
                    style={{
                      background: "oklch(0.72 0.18 195 / 0.15)",
                      border: "1px solid oklch(0.72 0.18 195 / 0.35)",
                      color: "oklch(0.72 0.18 195)",
                    }}
                  >
                    <Plus className="h-2.5 w-2.5" />
                    Top Up
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: "oklch(0.25 0.08 25 / 0.3)", border: "1px solid oklch(0.50 0.15 25 / 0.3)" }}
                >
                  <p className="font-sans text-xs text-red-400">{error}</p>
                  {error.includes("Top up") && (
                    <button
                      onClick={() => { setError(""); setView("topup") }}
                      className="font-sans text-xs font-semibold transition-colors hover:underline"
                      style={{ color: "oklch(0.72 0.18 195)" }}
                    >
                      Get Neon →
                    </button>
                  )}
                </div>
              )}

              {/* Quick amounts */}
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.map((amt) => {
                  const tooExpensive = amt > balance
                  return (
                    <button
                      key={amt}
                      onClick={() => setAmount(amt)}
                      className={`relative rounded-xl px-3 py-2.5 font-mono text-sm font-semibold transition-all ${
                        amount === amt ? "ring-2" : "hover:bg-muted/20"
                      }`}
                      style={{
                        background: amount === amt ? "oklch(0.72 0.18 195 / 0.15)" : "oklch(0.16 0.01 280 / 0.5)",
                        border: `1px solid ${amount === amt ? "oklch(0.72 0.18 195 / 0.5)" : "oklch(0.28 0.02 280 / 0.4)"}`,
                        color: tooExpensive
                          ? "oklch(0.45 0.03 280)"
                          : amount === amt ? "oklch(0.72 0.18 195)" : "oklch(0.65 0.03 280)",
                        ringColor: "oklch(0.72 0.18 195 / 0.5)",
                      }}
                    >
                      {amt}
                      {tooExpensive && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px]"
                          style={{ background: "oklch(0.72 0.18 195 / 0.25)", color: "oklch(0.72 0.18 195)" }}
                        >
                          <Plus className="h-2 w-2" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Send or Top Up prompt */}
              {needsTopUp ? (
                <Button
                  onClick={() => { setError(""); setView("topup") }}
                  className="w-full gap-2 rounded-xl font-sans font-semibold"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.55 0.22 195), oklch(0.48 0.24 230))",
                    color: "white",
                    boxShadow: "0 0 15px oklch(0.55 0.22 195 / 0.3)",
                  }}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Top Up to Send {amount} Neon
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={sending || success || amount < 1}
                  className="w-full gap-2 rounded-xl font-sans font-semibold"
                  style={{
                    background: success
                      ? "oklch(0.55 0.18 150)"
                      : "linear-gradient(135deg, oklch(0.55 0.22 195), oklch(0.48 0.24 230))",
                    color: "white",
                    boxShadow: "0 0 15px oklch(0.55 0.22 195 / 0.3)",
                  }}
                >
                  {success ? (
                    <><Sparkles className="h-4 w-4" /> Sent!</>
                  ) : sending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Zap className="h-4 w-4" /> Send {amount} Neon</>
                  )}
                </Button>
              )}
            </div>
          </>
        )}

        {/* ============ TOP UP VIEW ============ */}
        {view === "topup" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-sans text-lg text-foreground">
                <button
                  onClick={() => setView("send")}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-muted/30"
                >
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <ShoppingCart className="h-5 w-5" style={{ color: "oklch(0.72 0.18 195)" }} />
                Get Neon
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              {/* Current balance */}
              <div className="flex items-center justify-between rounded-xl px-3 py-2"
                style={{ background: "oklch(0.16 0.02 270 / 0.6)", border: "1px solid oklch(0.30 0.04 270 / 0.3)" }}
              >
                <span className="font-sans text-xs text-muted-foreground">Current balance</span>
                <span className="flex items-center gap-1 font-mono text-sm font-bold" style={{ color: "oklch(0.72 0.18 195)" }}>
                  <Zap className="h-3.5 w-3.5" />
                  {balance.toLocaleString()}
                </span>
              </div>

              {error && (
                <p className="text-center font-sans text-xs text-red-400">{error}</p>
              )}

              {/* Pack options */}
              <div className="space-y-2">
                {NEON_PACKS.map((pack) => {
                  const isBuying = buying === pack.id
                  const justBought = buySuccess === pack.id
                  return (
                    <button
                      key={pack.id}
                      onClick={() => handleBuy(pack.id)}
                      disabled={!!buying || !!buySuccess}
                      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                      style={{
                        background: justBought
                          ? "oklch(0.20 0.06 150 / 0.4)"
                          : "oklch(0.15 0.02 270 / 0.6)",
                        border: `1px solid ${justBought ? "oklch(0.55 0.18 150 / 0.5)" : pack.color.replace(")", " / 0.25)")}`,
                      }}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: `${pack.color.replace(")", " / 0.15)")}` }}
                      >
                        <Zap className="h-4.5 w-4.5" style={{ color: pack.color }} />
                      </div>

                      <div className="flex flex-1 flex-col items-start gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold" style={{ color: pack.color }}>
                            {pack.neon.toLocaleString()} Neon
                          </span>
                          {pack.bonus && (
                            <span className="rounded-full px-1.5 py-0.5 font-sans text-[9px] font-bold"
                              style={{ background: `${pack.color.replace(")", " / 0.15)")}`, color: pack.color }}
                            >
                              {pack.bonus}
                            </span>
                          )}
                        </div>
                        <span className="font-sans text-[10px] text-muted-foreground">{pack.name} Pack</span>
                      </div>

                      <div className="shrink-0">
                        {justBought ? (
                          <span className="flex items-center gap-1 font-sans text-xs font-semibold" style={{ color: "oklch(0.65 0.18 150)" }}>
                            <Sparkles className="h-3.5 w-3.5" />
                            Added!
                          </span>
                        ) : isBuying ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <span className="font-sans text-sm font-bold text-foreground">{pack.price}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Back to send */}
              <button
                onClick={() => setView("send")}
                className="block w-full text-center font-sans text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                ← Back to sending
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
