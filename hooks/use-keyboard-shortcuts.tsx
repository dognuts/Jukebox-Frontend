"use client"

import { useEffect, useState, useCallback, type ReactNode } from "react"
import { toast } from "sonner"

interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  description: string
  action: () => void
}

export function useKeyboardShortcuts() {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([])

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts(prev => [...prev, shortcut])
  }, [])

  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts(prev => prev.filter(s => s.key !== key))
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in input/textarea
      if (
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA'
      ) {
        return
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = (e.ctrlKey || e.metaKey) === (shortcut.ctrl || shortcut.meta)
        const shiftMatch = e.shiftKey === (shortcut.shift || false)
        const altMatch = e.altKey === (shortcut.alt || false)

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

export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const { registerShortcut } = useKeyboardShortcuts()

  useEffect(() => {
    // Register global shortcuts
    registerShortcut({
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts help',
      action: () => {
        toast.info('Keyboard Shortcuts:\n/ - Search\nArrow Keys - Navigate\nEsc - Close')
      },
    })

    registerShortcut({
      key: '/',
      description: 'Open search',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      },
    })
  }, [registerShortcut])

  return <>{children}</>
}
