"use client"

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react"
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

// For components that render both inside and outside an UpgradeProvider
// (e.g. the user menu, which also mounts in the lean (site) layout where
// no upgrade stack exists). Returns null instead of throwing.
export function useOptionalUpgrade() {
  return useContext(UpgradeContext)
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

  const value = useMemo(
    () => ({ plan, isDialogOpen, openUpgradeDialog, closeUpgradeDialog, upgradeToPremium, downgradeToFree }),
    [plan, isDialogOpen, openUpgradeDialog, closeUpgradeDialog, upgradeToPremium, downgradeToFree]
  )

  return (
    <UpgradeContext.Provider value={value}>
      {children}
    </UpgradeContext.Provider>
  )
}
