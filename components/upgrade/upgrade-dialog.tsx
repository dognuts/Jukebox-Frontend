"use client"

import { useRouter } from "next/navigation"
import { Crown, Zap, Check } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useUpgrade } from "@/lib/upgrade-context"

const PERKS = [
  "Ad-free Jukebox UI",
  "Exclusive Plus badge",
  "Priority queue placement",
  "Extended chat history",
]

export function UpgradeDialog() {
  const { plan, isDialogOpen, closeUpgradeDialog } = useUpgrade()
  const router = useRouter()

  if (plan === "premium") return null

  return (
    <Dialog open={isDialogOpen} onOpenChange={(o) => !o && closeUpgradeDialog()}>
      <DialogContent
        className="border-border/30 sm:max-w-md p-0 overflow-hidden"
        style={{ background: "oklch(0.12 0.02 270 / 0.97)", backdropFilter: "blur(20px)" }}
      >
        {/* Header */}
        <div
          className="px-6 pt-8 pb-6 text-center"
          style={{ background: "linear-gradient(180deg, oklch(0.18 0.05 270 / 0.6), transparent)" }}
        >
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background: "oklch(0.55 0.22 270 / 0.2)",
              border: "1px solid oklch(0.55 0.22 270 / 0.4)",
              boxShadow: "0 0 20px oklch(0.55 0.22 270 / 0.2)",
            }}
          >
            <Crown className="h-7 w-7" style={{ color: "oklch(0.72 0.18 270)" }} />
          </div>
          <h2 className="font-sans text-xl font-bold text-foreground">Jukebox Plus</h2>
          <p className="mt-1 font-sans text-sm text-muted-foreground">$7.99/month</p>
        </div>

        {/* Perks */}
        <div className="px-6 pb-4">
          <ul className="space-y-2.5">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0" style={{ color: "oklch(0.72 0.18 270)" }} />
                <span className="font-sans text-sm text-foreground/80">{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={() => { closeUpgradeDialog(); router.push("/pricing") }}
            className="w-full rounded-xl py-3 font-sans font-semibold text-background upgrade-button-premium"
            style={{
              background: "linear-gradient(135deg, oklch(0.82 0.18 80) 0%, oklch(0.85 0.20 60) 50%, oklch(0.72 0.18 250) 100%)",
              backgroundSize: "200% auto",
              boxShadow: "0 0 20px oklch(0.82 0.18 80 / 0.3)",
            }}
          >
            View Pricing
          </button>
          <button
            onClick={closeUpgradeDialog}
            className="block w-full text-center font-sans text-xs text-muted-foreground hover:text-foreground"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
