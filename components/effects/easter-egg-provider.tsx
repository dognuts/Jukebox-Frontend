"use client"

import type { ReactNode } from "react"
import { EasterEggContext, useEasterEggState } from "@/hooks/use-easter-eggs"
import { AchievementToast } from "./achievement-toast"
import { AnimatePresence, motion } from "framer-motion"

export function EasterEggProvider({ children }: { children: ReactNode }) {
  const state = useEasterEggState()

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

        {/* Konami Wurlitzer overlay */}
        <AnimatePresence>
          {state.konamiActivated && (
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="flex flex-col items-center gap-4"
                initial={{ y: "-120%" }}
                animate={{ y: 0 }}
                exit={{ y: "-120%" }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
              >
                {/* Stylized jukebox */}
                <div
                  className="relative flex h-80 w-56 flex-col items-center rounded-3xl border-2 border-primary/40 neon-border-amber"
                  style={{
                    background:
                      "linear-gradient(180deg, oklch(0.30 0.08 80), oklch(0.18 0.04 280))",
                  }}
                >
                  {/* Top dome */}
                  <div
                    className="mt-4 h-24 w-40 rounded-t-full"
                    style={{
                      background:
                        "linear-gradient(180deg, oklch(0.82 0.18 80 / 0.4), oklch(0.70 0.22 350 / 0.3))",
                      boxShadow:
                        "0 0 30px oklch(0.82 0.18 80 / 0.5), inset 0 -10px 20px oklch(0.70 0.22 350 / 0.3)",
                    }}
                  >
                    {/* Animated neon bars inside dome */}
                    <div className="flex items-end justify-center gap-1 pt-6">
                      {[0.6, 1, 0.4, 0.8, 0.5, 0.9, 0.3].map((h, i) => (
                        <div
                          key={i}
                          className="w-2 rounded-t"
                          style={{
                            height: `${h * 40}px`,
                            background: `oklch(0.82 0.18 ${80 + i * 40})`,
                            transformOrigin: "bottom",
                            animation: `visualizer-bar ${0.3 + i * 0.1}s ease-in-out infinite alternate`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <div className="text-center font-sans text-lg font-bold text-primary neon-text-amber">
                      JUKEBOX
                    </div>
                    <div className="text-center font-sans text-xs text-muted-foreground">
                      Classic Mode Activated
                    </div>
                  </div>

                  {/* Coin slot */}
                  <div className="mt-6 flex items-center gap-1">
                    <div className="h-1 w-8 rounded-full bg-primary/40" />
                  </div>

                  {/* Bottom chrome */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-16 rounded-b-3xl"
                    style={{
                      background:
                        "linear-gradient(180deg, oklch(0.45 0.04 80), oklch(0.25 0.02 280))",
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Achievement toasts */}
        <AchievementToast
          show={state.bubblePopperUnlocked}
          title="Bubble Popper!"
          icon="trophy"
        />
        <AchievementToast
          show={state.djScratchToast}
          title="DJ Mode!"
          icon="disc"
        />
      </div>
    </EasterEggContext>
  )
}
