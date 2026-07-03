"use client"

import { useEffect, useState, useCallback } from "react"

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  description: string
  action: () => void
}

function sameCombo(a: KeyboardShortcut, b: KeyboardShortcut) {
  return (
    a.key.toLowerCase() === b.key.toLowerCase() &&
    !!(a.ctrl || a.meta) === !!(b.ctrl || b.meta) &&
    !!a.shift === !!b.shift &&
    !!a.alt === !!b.alt
  )
}

export function useKeyboardShortcuts() {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([])

  // Registering an already-registered key combo replaces the previous entry
  // instead of appending. Callers re-register from effects whenever their
  // state changes, so the action closure that runs is always the freshest
  // one — appending would leave the oldest (stale) closure winning because
  // the key handler stops on the first match.
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts(prev => {
      const index = prev.findIndex(s => sameCombo(s, shortcut))
      if (index === -1) return [...prev, shortcut]
      const next = [...prev]
      next[index] = shortcut
      return next
    })
  }, [])

  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts(prev => prev.filter(s => s.key !== key))
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in an input, textarea or
      // contenteditable element
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
        // Coerce with !! — `shortcut.ctrl || shortcut.meta` is undefined for
        // modifier-less shortcuts, and `false === undefined` would never match.
        const ctrlMatch = (e.ctrlKey || e.metaKey) === !!(shortcut.ctrl || shortcut.meta)
        const shiftMatch = e.shiftKey === !!shortcut.shift
        const altMatch = e.altKey === !!shortcut.alt

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault()
          shortcut.action()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])

  return { registerShortcut, unregisterShortcut, shortcuts }
}
