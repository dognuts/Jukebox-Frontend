"use client"

import { useRouter } from "next/navigation"
import { Crown, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
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
      <DialogContent className="overflow-hidden rounded-2xl border-[0.5px] border-hairline bg-popover p-0 sm:max-w-md">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white"
            style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-purple-deep))" }}
          >
            <Crown className="h-7 w-7" />
          </div>
          <DialogTitle className="type-display font-sans text-ink-foreground">Jukebox Plus</DialogTitle>
          <DialogDescription className="mt-1 type-small font-sans text-text-mid">$7.99/month</DialogDescription>
        </div>

        {/* Perks */}
        <div className="px-6 pb-4">
          <ul className="space-y-2.5">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-brand-amber" />
                <span className="font-sans text-sm text-text-mid">{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={() => { closeUpgradeDialog(); router.push("/pricing") }}
            className="w-full rounded-xl py-3 font-sans font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-purple-deep))" }}
          >
            View Pricing
          </button>
          <button
            onClick={closeUpgradeDialog}
            className="block w-full text-center font-sans text-xs text-text-low transition-colors hover:text-text-hi"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
