"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { useAuth } from "./auth-context"

export type PlanTier = "free" | "premium"
export type BillingCycle = "monthly" | "yearly"

interface UpgradeContextValue {
  plan: PlanTier
  isDialogOpen: boolean
  openUpgradeDialog: () => void
  closeUpgradeDialog: () => void
  upgradeToPremium: () => void
  downgradeToFree: () => void
}

const UpgradeContext = createContext<UpgradeContextValue | null>(null)

export function useUpgrade() {
  const ctx = useContext(UpgradeContext)
  if (!ctx) throw new Error("useUpgrade must be used within UpgradeProvider")
  return ctx
}

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Derive plan from server-backed user state
  const plan: PlanTier = (user as any)?.isPlus ? "premium" : "free"

  const openUpgradeDialog = useCallback(() => {
    if (plan !== "premium") setIsDialogOpen(true)
  }, [plan])
  const closeUpgradeDialog = useCallback(() => setIsDialogOpen(false), [])
  // These are no-ops now — real subscription is via API
  const upgradeToPremium = useCallback(() => {}, [])
  const downgradeToFree = useCallback(() => {}, [])

  return (
    <UpgradeContext.Provider
      value={{ plan, isDialogOpen, openUpgradeDialog, closeUpgradeDialog, upgradeToPremium, downgradeToFree }}
    >
      {children}
    </UpgradeContext.Provider>
  )
}
