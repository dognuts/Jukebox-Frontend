"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Shield, Search, Users, Ban, CheckCircle, XCircle, Crown, Zap,
  Trash2, Mail, Loader2, ArrowLeft, ChevronRight, Edit, Save, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/layout/navbar"
import { useAuth } from "@/lib/auth-context"
import { authRequest } from "@/lib/api"

interface AdminUser {
  id: string
  email: string
  displayName: string
  stageName: string
  avatarColor: string
  bio: string
  emailVerified: boolean
  isAdmin: boolean
  isPlus: boolean
  isBanned: boolean
  neonBalance: number
  createdAt: string
  city: string
  region: string
  country: string
}

export default function AdminUsersPage() {
  const { user, isLoggedIn } = useAuth()
  const router = useRouter()
  const isAdmin = isLoggedIn && user?.isAdmin

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [searched, setSearched] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [editField, setEditField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  const searchUsers = useCallback(async (q?: string) => {
    setLoading(true)
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : ""
      const data = await authRequest<AdminUser[]>(`/api/admin/users${params}`)
      setUsers(data || [])
      setSearched(true)
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) searchUsers()
  }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    searchUsers(query.trim() || undefined)
  }

  const selectUser = useCallback(async (userId: string) => {
    try {
      const data = await authRequest<AdminUser>(`/api/admin/users/${userId}`)
      setSelectedUser(data)
      setEditField(null)
    } catch {
      alert("Failed to load user")
    }
  }, [])

  const updateUser = useCallback(async (userId: string, field: string, value: any) => {
    setActionLoading(true)
    try {
      const data = await authRequest<AdminUser>(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      })
      setSelectedUser(data)
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...data } : u))
    } catch {
      alert("Failed to update user")
    } finally {
      setActionLoading(false)
      setEditField(null)
    }
  }, [])

  const deleteUser = useCallback(async (userId: string) => {
    if (!confirm("Permanently delete this user and all their data? This cannot be undone.")) return
    if (!confirm("Are you absolutely sure? Type the user's email to confirm.")) return
    setActionLoading(true)
    try {
      await authRequest(`/api/admin/users/${userId}`, { method: "DELETE" })
      setSelectedUser(null)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch {
      alert("Failed to delete user")
    } finally {
      setActionLoading(false)
    }
  }, [])

  if (!isLoggedIn || !isAdmin) {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20">
          <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="font-sans text-lg font-semibold text-foreground">Admin Access Required</p>
          <p className="font-sans text-sm text-muted-foreground mt-1">You need admin privileges to view this page.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-1 font-sans text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Admin
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: "oklch(0.72 0.18 250)" }} />
              <h1 className="font-sans text-xl font-bold text-foreground">User Management</h1>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {users.length} users
          </Badge>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by email, display name, or stage name..."
              className="pl-10 rounded-xl bg-muted/20 border-border/30"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading} className="rounded-xl gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </div>

        <div className="flex gap-6">
          {/* User List */}
          <div className={`flex-1 ${selectedUser ? "hidden lg:block lg:max-w-sm" : ""}`}>
            {users.length === 0 && searched ? (
              <div className="text-center py-12">
                <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="font-sans text-sm text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/15 ${
                      selectedUser?.id === u.id ? "bg-muted/20 border border-border/40" : ""
                    }`}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: u.avatarColor, color: "oklch(0.10 0.01 280)" }}
                    >
                      {u.displayName?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-sans text-sm font-medium text-foreground">
                          {u.displayName || u.email}
                        </span>
                        {u.isAdmin && <Shield className="h-3 w-3 shrink-0" style={{ color: "oklch(0.65 0.20 30)" }} />}
                        {u.isPlus && <Crown className="h-3 w-3 shrink-0" style={{ color: "oklch(0.72 0.18 270)" }} />}
                        {u.isBanned && <Ban className="h-3 w-3 shrink-0" style={{ color: "oklch(0.60 0.20 25)" }} />}
                      </div>
                      <span className="truncate font-sans text-[10px] text-muted-foreground">{u.email}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Detail Panel */}
          {selectedUser && (
            <div
              className="flex-1 rounded-2xl p-5"
              style={{ background: "oklch(0.13 0.015 280 / 0.6)", border: "1px solid oklch(0.25 0.02 280 / 0.4)" }}
            >
              {/* Close on mobile */}
              <button onClick={() => setSelectedUser(null)} className="mb-3 lg:hidden flex items-center gap-1 font-sans text-xs text-muted-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to list
              </button>

              {/* User header */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold"
                  style={{ background: selectedUser.avatarColor, color: "oklch(0.10 0.01 280)" }}
                >
                  {selectedUser.displayName?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <h2 className="font-sans text-lg font-bold text-foreground">{selectedUser.displayName}</h2>
                  {selectedUser.stageName && (
                    <p className="font-sans text-xs text-muted-foreground">@{selectedUser.stageName}</p>
                  )}
                  <p className="font-sans text-[10px] text-muted-foreground/60">{selectedUser.id}</p>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <InfoRow label="Email" value={selectedUser.email} icon={<Mail className="h-3 w-3" />} />
                <InfoRow label="Verified" value={selectedUser.emailVerified ? "Yes" : "No"}
                  icon={selectedUser.emailVerified ? <CheckCircle className="h-3 w-3" style={{ color: "oklch(0.65 0.18 150)" }} /> : <XCircle className="h-3 w-3" style={{ color: "oklch(0.65 0.15 25)" }} />} />
                <InfoRow label="Neon Balance" value={selectedUser.neonBalance.toLocaleString()} icon={<Zap className="h-3 w-3" style={{ color: "oklch(0.72 0.18 195)" }} />} />
                <InfoRow label="Joined" value={new Date(selectedUser.createdAt).toLocaleDateString()} />
                <InfoRow label="Location" value={[selectedUser.city, selectedUser.region, selectedUser.country].filter(Boolean).join(", ") || "Unknown"} />
                <InfoRow label="Bio" value={selectedUser.bio || "None"} />
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap gap-2 mb-5">
                {selectedUser.isAdmin && <Badge style={{ background: "oklch(0.65 0.20 30 / 0.15)", color: "oklch(0.65 0.20 30)", border: "1px solid oklch(0.65 0.20 30 / 0.3)" }}>Admin</Badge>}
                {selectedUser.isPlus && <Badge style={{ background: "oklch(0.55 0.22 270 / 0.15)", color: "oklch(0.72 0.18 270)", border: "1px solid oklch(0.55 0.22 270 / 0.3)" }}>Plus</Badge>}
                {selectedUser.isBanned && <Badge style={{ background: "oklch(0.60 0.20 25 / 0.15)", color: "oklch(0.60 0.20 25)", border: "1px solid oklch(0.60 0.20 25 / 0.3)" }}>Banned</Badge>}
                {!selectedUser.emailVerified && <Badge variant="outline" className="text-muted-foreground">Unverified</Badge>}
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {/* Toggle Ban */}
                  <ActionButton
                    loading={actionLoading}
                    onClick={() => updateUser(selectedUser.id, "isBanned", !selectedUser.isBanned)}
                    icon={<Ban className="h-3.5 w-3.5" />}
                    label={selectedUser.isBanned ? "Unban User" : "Ban User"}
                    color={selectedUser.isBanned ? "oklch(0.65 0.18 150)" : "oklch(0.60 0.20 25)"}
                  />
                  {/* Toggle Verified */}
                  <ActionButton
                    loading={actionLoading}
                    onClick={() => updateUser(selectedUser.id, "emailVerified", !selectedUser.emailVerified)}
                    icon={<CheckCircle className="h-3.5 w-3.5" />}
                    label={selectedUser.emailVerified ? "Unverify Email" : "Verify Email"}
                    color="oklch(0.65 0.18 150)"
                  />
                  {/* Toggle Plus */}
                  <ActionButton
                    loading={actionLoading}
                    onClick={() => updateUser(selectedUser.id, "isPlus", !selectedUser.isPlus)}
                    icon={<Crown className="h-3.5 w-3.5" />}
                    label={selectedUser.isPlus ? "Remove Plus" : "Grant Plus"}
                    color="oklch(0.72 0.18 270)"
                  />
                  {/* Toggle Admin */}
                  <ActionButton
                    loading={actionLoading}
                    onClick={() => updateUser(selectedUser.id, "isAdmin", !selectedUser.isAdmin)}
                    icon={<Shield className="h-3.5 w-3.5" />}
                    label={selectedUser.isAdmin ? "Remove Admin" : "Grant Admin"}
                    color="oklch(0.82 0.18 80)"
                  />
                </div>

                {/* Set Neon Balance */}
                <div className="flex items-center gap-2">
                  {editField === "neonBalance" ? (
                    <>
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-28 h-8 rounded-lg text-xs bg-muted/20"
                        placeholder="Amount"
                      />
                      <Button size="sm" className="h-8 rounded-lg gap-1 text-xs"
                        onClick={() => updateUser(selectedUser.id, "neonBalance", parseInt(editValue) || 0)}>
                        <Save className="h-3 w-3" /> Set
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 rounded-lg text-xs" onClick={() => setEditField(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 rounded-lg font-sans text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditField("neonBalance"); setEditValue(String(selectedUser.neonBalance)) }}
                    >
                      <Zap className="h-3.5 w-3.5" style={{ color: "oklch(0.72 0.18 195)" }} />
                      Set Neon Balance ({selectedUser.neonBalance.toLocaleString()})
                    </Button>
                  )}
                </div>

                {/* Delete */}
                <div className="pt-3 border-t border-border/20">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteUser(selectedUser.id)}
                    disabled={actionLoading}
                    className="gap-1.5 rounded-lg font-sans text-xs hover:bg-red-500/10"
                    style={{ color: "oklch(0.60 0.20 25)" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete User Permanently
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 font-sans text-[10px] text-muted-foreground/70">
        {icon} {label}
      </span>
      <span className="font-sans text-xs text-foreground truncate">{value}</span>
    </div>
  )
}

function ActionButton({ loading, onClick, icon, label, color }: {
  loading: boolean; onClick: () => void; icon: React.ReactNode; label: string; color: string
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={loading}
      onClick={onClick}
      className="h-8 gap-1.5 rounded-lg font-sans text-xs"
      style={{ color, border: `1px solid ${color}30` }}
    >
      {icon} {label}
    </Button>
  )
}
