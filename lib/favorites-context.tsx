"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { toast } from "sonner"

interface FavoritesContextValue {
  favorites: Set<string>
  isFavorite: (roomId: string) => boolean
  toggleFavorite: (roomId: string, roomName?: string) => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const isFavorite = useCallback((roomId: string) => favorites.has(roomId), [favorites])

  const toggleFavorite = useCallback((roomId: string, roomName?: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(roomId)) {
        next.delete(roomId)
        toast.success(roomName ? `Removed "${roomName}" from favorites` : "Removed from favorites")
      } else {
        next.add(roomId)
        toast.success(roomName ? `Added "${roomName}" to favorites` : "Added to favorites")
      }
      return next
    })
  }, [])

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider")
  return ctx
}
