"use client"

import { useEffect, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { EasterEggContext, useEasterEggState } from "@/hooks/use-easter-eggs"

// The Konami overlay and achievement toasts are the only consumers of
// framer-motion in the shared layout tree. Load them on demand the first
// time an egg fires so the motion bundle never ships in the initial chunk
// for sessions that never trigger one (virtually all of them).
const EasterEggEffects = dynamic(
  () => import("./easter-egg-effects").then((m) => m.EasterEggEffects),
  { ssr: false }
)

export function EasterEggProvider({ children }: { children: ReactNode }) {
  const state = useEasterEggState()

  // Latch: mount the effects layer on first activation and keep it mounted
  // so AnimatePresence exit animations still play when the egg ends.
  const [effectsMounted, setEffectsMounted] = useState(false)
  const anyEffectActive =
    state.konamiActivated || state.bubblePopperUnlocked || state.djScratchToast

  useEffect(() => {
    if (anyEffectActive) setEffectsMounted(true)
  }, [anyEffectActive])

  return (
    <EasterEggContext value={state}>
      <div
        className={`${state.rainbowMode ? "animate-rainbow" : ""} ${state.lightsOut ? "opacity-5" : "opacity-100"}`}
        style={{
          transition: "opacity 0.5s ease-in-out",
        }}
      >
        {state.dropTheBeat && (
          <div className="animate-shake fixed inset-0 z-50 pointer-events-none" />
        )}

        {children}

        {effectsMounted && (
          <EasterEggEffects
            konamiActivated={state.konamiActivated}
            bubblePopperUnlocked={state.bubblePopperUnlocked}
            djScratchToast={state.djScratchToast}
          />
        )}
      </div>
    </EasterEggContext>
  )
}
