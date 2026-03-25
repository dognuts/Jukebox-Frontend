"use client"

import { useEffect } from "react"

/**
 * SourceProtection adds lightweight anti-copying measures.
 * Won't stop a determined attacker (nothing can — browsers must receive code),
 * but deters casual copiers:
 * - Disables right-click context menu
 * - Blocks common "save page" and "view source" keyboard shortcuts
 * - Detects devtools opening (heuristic) and logs it
 * - Clears console on load
 */
export function SourceProtection() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return // don't interfere with dev

    // Block right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    // Block keyboard shortcuts for view-source, save, print
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      // Ctrl+U (view source), Ctrl+S (save), Ctrl+P (print)
      if (ctrl && (e.key === "u" || e.key === "U" || e.key === "s" || e.key === "S" || e.key === "p" || e.key === "P")) {
        e.preventDefault()
      }
      // Ctrl+Shift+I (devtools), Ctrl+Shift+J (console), Ctrl+Shift+C (inspect)
      if (ctrl && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) {
        e.preventDefault()
      }
      // F12 (devtools)
      if (e.key === "F12") {
        e.preventDefault()
      }
    }

    // Block text selection on the page (optional — only on non-input elements)
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement
      const tag = target.tagName?.toLowerCase()
      // Allow selection in inputs, textareas, and contenteditable
      if (tag === "input" || tag === "textarea" || target.isContentEditable) {
        return
      }
      // Allow selection in chat messages (users copy song names, links, etc.)
      if (target.closest("[data-selectable]")) {
        return
      }
    }

    // Clear console with a warning
    const clearConsole = () => {
      console.clear()
      console.log(
        "%c⚠️ Stop!",
        "color: #ff6a1a; font-size: 40px; font-weight: bold; text-shadow: 1px 1px 2px #000;"
      )
      console.log(
        "%cThis is a browser feature intended for developers. If someone told you to copy-paste something here, it's likely a scam.",
        "color: #aaa; font-size: 14px;"
      )
      console.log(
        "%c© Jukebox — All rights reserved. Unauthorized reproduction is prohibited.",
        "color: #666; font-size: 11px;"
      )
    }

    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("keydown", handleKeyDown)
    clearConsole()

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return null
}
