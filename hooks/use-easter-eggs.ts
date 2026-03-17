"use client"

import { createContext, useContext, useCallback, useRef, useEffect, useState } from "react"

interface EasterEggState {
  konamiActivated: boolean
  rainbowMode: boolean
  classicModeBadge: boolean
  bubblesPoppedCount: number
  bubblePopperUnlocked: boolean
  dropTheBeat: boolean
  lightsOut: boolean
  djScratchToast: boolean
  triggerKonami: () => void
  triggerRainbow: () => void
  triggerBubblePop: () => void
  triggerDropTheBeat: () => void
  triggerLightsOut: () => void
  triggerDjScratch: () => void
  checkChatMagicWords: (message: string) => void
}

const EasterEggContext = createContext<EasterEggState | null>(null)

export function useEasterEggs() {
  const ctx = useContext(EasterEggContext)
  if (!ctx) {
    throw new Error("useEasterEggs must be used within EasterEggProvider")
  }
  return ctx
}

export { EasterEggContext }

export function useEasterEggState(): EasterEggState {
  const [konamiActivated, setKonamiActivated] = useState(false)
  const [rainbowMode, setRainbowMode] = useState(false)
  const [classicModeBadge, setClassicModeBadge] = useState(false)
  const [bubblesPoppedCount, setBubblesPoppedCount] = useState(0)
  const [bubblePopperUnlocked, setBubblePopperUnlocked] = useState(false)
  const [dropTheBeat, setDropTheBeat] = useState(false)
  const [lightsOut, setLightsOut] = useState(false)
  const [djScratchToast, setDjScratchToast] = useState(false)

  const konamiSequence = useRef<string[]>([])
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const bubbleCountRef = useRef(0)

  // Konami code listener
  useEffect(() => {
    const code = [
      "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
      "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
      "KeyB", "KeyA",
    ]

    function handleKeyDown(e: KeyboardEvent) {
      konamiSequence.current.push(e.code)
      if (konamiSequence.current.length > code.length) {
        konamiSequence.current.shift()
      }
      if (konamiSequence.current.join(",") === code.join(",")) {
        setKonamiActivated(true)
        setClassicModeBadge(true)
        setTimeout(() => setKonamiActivated(false), 5000)
        setTimeout(() => setClassicModeBadge(false), 30000)
        konamiSequence.current = []
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const triggerKonami = useCallback(() => {
    setKonamiActivated(true)
    setClassicModeBadge(true)
    setTimeout(() => setKonamiActivated(false), 5000)
    setTimeout(() => setClassicModeBadge(false), 30000)
  }, [])

  const triggerRainbow = useCallback(() => {
    setRainbowMode(true)
    setTimeout(() => setRainbowMode(false), 5000)
  }, [])

  const triggerBubblePop = useCallback(() => {
    bubbleCountRef.current += 1
    setBubblesPoppedCount(bubbleCountRef.current)

    // Reset timer for the 30-second window
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current)
    bubbleTimerRef.current = setTimeout(() => {
      bubbleCountRef.current = 0
      setBubblesPoppedCount(0)
    }, 30000)

    if (bubbleCountRef.current >= 10 && !bubblePopperUnlocked) {
      setBubblePopperUnlocked(true)
    }
  }, [bubblePopperUnlocked])

  const triggerDropTheBeat = useCallback(() => {
    setDropTheBeat(true)
    setTimeout(() => setDropTheBeat(false), 600)
  }, [])

  const triggerLightsOut = useCallback(() => {
    setLightsOut(true)
    setTimeout(() => setLightsOut(false), 2000)
  }, [])

  const triggerDjScratch = useCallback(() => {
    setDjScratchToast(true)
    setTimeout(() => setDjScratchToast(false), 2000)
  }, [])

  const checkChatMagicWords = useCallback(
    (message: string) => {
      const lower = message.toLowerCase().trim()
      if (lower === "drop the beat") {
        triggerDropTheBeat()
      } else if (lower === "lights out") {
        triggerLightsOut()
      }
    },
    [triggerDropTheBeat, triggerLightsOut]
  )

  return {
    konamiActivated,
    rainbowMode,
    classicModeBadge,
    bubblesPoppedCount,
    bubblePopperUnlocked,
    dropTheBeat,
    lightsOut,
    djScratchToast,
    triggerKonami,
    triggerRainbow,
    triggerBubblePop,
    triggerDropTheBeat,
    triggerLightsOut,
    triggerDjScratch,
    checkChatMagicWords,
  }
}
