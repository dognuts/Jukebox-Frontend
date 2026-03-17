"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Trophy, Disc3, Sparkles } from "lucide-react"

interface AchievementToastProps {
  show: boolean
  title: string
  icon?: "trophy" | "disc" | "sparkles"
}

const icons = {
  trophy: Trophy,
  disc: Disc3,
  sparkles: Sparkles,
}

export function AchievementToast({
  show,
  title,
  icon = "trophy",
}: AchievementToastProps) {
  const Icon = icons[icon]

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-primary/30 px-5 py-3 neon-border-amber"
          style={{ background: "var(--glass-bg)", backdropFilter: "blur(20px)" }}
        >
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-sans text-sm font-semibold text-foreground">
            {title}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
