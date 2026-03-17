"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

export interface AuthUser {
  id: string
  email: string
  emailVerified: boolean
  displayName: string
  avatarColor: string
  bio: string
  favoriteGenres: string[]
  createdAt: string
  updatedAt: string
  isAdmin?: boolean
  city?: string
  region?: string
  country?: string
  stageName?: string
  isPlus?: boolean
  neonBalance?: number
  plusExpiresAt?: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  isLoggedIn: boolean
  accessToken: string | null
  signup: (email: string, password: string, displayName: string, stageName?: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  updateProfile: (data: Partial<{ displayName: string; bio: string; avatarColor: string; favoriteGenres: string[]; stageName: string }>) => Promise<AuthUser>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resendVerification: () => Promise<void>
  deleteAccount: (password: string) => Promise<void>
  authFetch: (path: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = "jukebox_access_token"
const REFRESH_KEY = "jukebox_refresh_token"

function getStored(key: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(key)
}

function setStored(key: string, value: string) {
  if (typeof window !== "undefined") localStorage.setItem(key, value)
}

function clearStored(key: string) {
  if (typeof window !== "undefined") localStorage.removeItem(key)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Authenticated fetch helper
  const authFetch = useCallback(async (path: string, options?: RequestInit): Promise<Response> => {
    const token = getStored(TOKEN_KEY)
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options?.headers as Record<string, string>) || {}),
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
    return fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...options,
      headers,
    })
  }, [])

  // Try to refresh tokens and load user on mount
  const refreshAuth = useCallback(async () => {
    const refreshToken = getStored(REFRESH_KEY)
    if (!refreshToken) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ refreshToken }),
      })

      if (!res.ok) {
        clearStored(TOKEN_KEY)
        clearStored(REFRESH_KEY)
        setUser(null)
        setAccessToken(null)
        setLoading(false)
        return
      }

      const data = await res.json()
      setStored(TOKEN_KEY, data.accessToken)
      setStored(REFRESH_KEY, data.refreshToken)
      setAccessToken(data.accessToken)
      setUser(data.user)
    } catch {
      // Backend unreachable
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // If we have an access token, try to load the user
    const token = getStored(TOKEN_KEY)
    if (token) {
      setAccessToken(token)
      fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      })
        .then((res) => {
          if (res.ok) return res.json()
          throw new Error("token invalid")
        })
        .then((data) => {
          setUser(data)
          setLoading(false)
        })
        .catch(() => {
          // Token expired — try refresh
          refreshAuth()
        })
    } else {
      refreshAuth()
    }
  }, [refreshAuth])

  // Set up token refresh interval (every 12 minutes for 15-min tokens)
  useEffect(() => {
    if (!user) return
    const interval = setInterval(refreshAuth, 12 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user, refreshAuth])

  const handleAuthResponse = useCallback((data: { user: AuthUser; accessToken: string; refreshToken: string }) => {
    setStored(TOKEN_KEY, data.accessToken)
    setStored(REFRESH_KEY, data.refreshToken)
    setAccessToken(data.accessToken)
    setUser(data.user)
  }, [])

  const signup = useCallback(async (email: string, password: string, displayName: string, stageName?: string) => {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, displayName, stageName: stageName || "" }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text)
    }
    const data = await res.json()
    handleAuthResponse(data)
  }, [handleAuthResponse])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text)
    }
    const data = await res.json()
    handleAuthResponse(data)
  }, [handleAuthResponse])

  const logout = useCallback(async () => {
    try {
      await authFetch("/api/auth/logout", { method: "POST" })
    } catch {}
    clearStored(TOKEN_KEY)
    clearStored(REFRESH_KEY)
    setAccessToken(null)
    setUser(null)
  }, [authFetch])

  const updateProfile = useCallback(async (data: Partial<{ displayName: string; bio: string; avatarColor: string; favoriteGenres: string[] }>) => {
    const res = await authFetch("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(await res.text())
    const updated = await res.json()
    setUser(updated)
    return updated
  }, [authFetch])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const res = await authFetch("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    if (data.accessToken) handleAuthResponse(data)
  }, [authFetch, handleAuthResponse])

  const forgotPassword = useCallback(async (email: string) => {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) throw new Error(await res.text())
  }, [])

  const resetPassword = useCallback(async (token: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })
    if (!res.ok) throw new Error(await res.text())
  }, [])

  const verifyEmail = useCallback(async (token: string) => {
    const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    if (!res.ok) throw new Error(await res.text())
    // Refresh user to get updated emailVerified status
    if (accessToken) {
      const meRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (meRes.ok) setUser(await meRes.json())
    }
  }, [accessToken])

  const resendVerification = useCallback(async () => {
    const res = await authFetch("/api/auth/resend-verification", { method: "POST" })
    if (!res.ok) throw new Error(await res.text())
  }, [authFetch])

  const deleteAccount = useCallback(async (password: string) => {
    const res = await authFetch("/api/auth/me", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    })
    if (!res.ok) throw new Error(await res.text())
    clearStored(TOKEN_KEY)
    clearStored(REFRESH_KEY)
    setAccessToken(null)
    setUser(null)
  }, [authFetch])

  return (
    <AuthContext.Provider value={{
      user, loading, isLoggedIn: !!user, accessToken,
      signup, login, logout, refreshAuth, updateProfile,
      changePassword, forgotPassword, resetPassword,
      verifyEmail, resendVerification, deleteAccount, authFetch,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
