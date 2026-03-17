"use client"

import { useState, useCallback } from "react"
import { Upload, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { type User } from "@/lib/mock-data"
import { useUpgrade } from "@/lib/upgrade-context"

interface SettingsFormProps {
  user: User
}

export function SettingsForm({ user }: SettingsFormProps) {
  const [email, setEmail] = useState(user.email)
  const [stageName, setStageName] = useState((user as any).stageName || "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl || "")
  const { plan: accountType, openUpgradeDialog } = useUpgrade()

  const handleAvatarUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          setAvatarPreview(reader.result as string)
          console.log("[v0] Avatar uploaded (preview only):", file.name)
        }
        reader.readAsDataURL(file)
      }
    },
    []
  )

  const handleSave = useCallback(() => {
    console.log("[v0] Saving settings:", {
      email,
      passwordChanged: !!newPassword,
      avatarChanged: avatarPreview !== user.avatarUrl,
      accountType,
    })
    // In a real app, this would send data to backend
    alert("Settings saved successfully! (mock)")
  }, [email, newPassword, avatarPreview, user.avatarUrl, accountType])

  const handleUpgradeAccount = useCallback(() => {
    openUpgradeDialog()
  }, [openUpgradeDialog])

  return (
    <div className="space-y-6">
      {/* Avatar Upload */}
      <div>
        <Label className="mb-3 block font-sans text-sm font-semibold text-foreground">
          Profile Photo
        </Label>
        <div className="flex items-center gap-4">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-border/30 font-sans text-2xl font-bold text-background shadow-lg overflow-hidden"
            style={{ background: user.avatarColor }}
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="h-full w-full object-cover"
              />
            ) : (
              user.displayName.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <label htmlFor="avatar-upload">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl"
                onClick={() => document.getElementById("avatar-upload")?.click()}
              >
                <Upload className="h-4 w-4" />
                Upload New Photo
              </Button>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <p className="mt-2 font-sans text-xs text-muted-foreground">
              JPG, PNG, or GIF. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email" className="mb-2 block font-sans text-sm font-semibold text-foreground">
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border-border/30 bg-muted/30 font-sans text-sm"
        />
      </div>

      {/* Stage Name */}
      <div>
        <Label htmlFor="stage-name" className="mb-2 block font-sans text-sm font-semibold text-foreground">
          Stage Name <span className="font-normal text-muted-foreground">(display name)</span>
        </Label>
        <p className="mb-1.5 font-sans text-xs text-muted-foreground">
          Your public identity — shown when you DJ and across the platform
        </p>
        <Input
          id="stage-name"
          value={stageName}
          onChange={(e) => setStageName(e.target.value)}
          placeholder="e.g. DJ Shadow"
          minLength={2}
          maxLength={30}
          className="rounded-xl border-border/30 bg-muted/30 font-sans text-sm"
        />
      </div>

      {/* Password Change */}
      <div>
        <Label className="mb-3 block font-sans text-sm font-semibold text-foreground">
          Change Password
        </Label>
        <div className="space-y-3">
          <div>
            <Label htmlFor="current-password" className="mb-1.5 block font-sans text-xs text-muted-foreground">
              Current Password
            </Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="rounded-xl border-border/30 bg-muted/30 font-sans text-sm"
            />
          </div>
          <div>
            <Label htmlFor="new-password" className="mb-1.5 block font-sans text-xs text-muted-foreground">
              New Password
            </Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="rounded-xl border-border/30 bg-muted/30 font-sans text-sm"
            />
          </div>
          <div>
            <Label htmlFor="confirm-password" className="mb-1.5 block font-sans text-xs text-muted-foreground">
              Confirm New Password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="rounded-xl border-border/30 bg-muted/30 font-sans text-sm"
            />
          </div>
        </div>
      </div>

      {/* Account Type */}
      <div>
        <Label className="mb-3 block font-sans text-sm font-semibold text-foreground">
          Account Type
        </Label>
        <div
          className="flex items-center justify-between rounded-xl border border-border/30 p-4"
          style={{
            background: "oklch(0.13 0.01 280 / 0.5)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans text-sm font-semibold text-foreground">
                {accountType === "premium" ? "Premium" : "Free"} Plan
              </span>
              <Badge
                variant={accountType === "premium" ? "default" : "outline"}
                className={
                  accountType === "premium"
                    ? "border-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 font-sans text-xs font-semibold text-amber-400"
                    : "border-blue-500/30 font-sans text-xs font-semibold text-blue-400"
                }
              >
                {accountType === "premium" ? "Premium" : "Free"}
              </Badge>
            </div>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              {accountType === "premium"
                ? "No ads - uninterrupted listening experience"
                : "Free accounts get ads every 10 minutes"}
            </p>
          </div>
          {accountType === "free" && (
            <Button
              size="sm"
              onClick={handleUpgradeAccount}
              className="gap-2 rounded-xl bg-gradient-to-r from-amber-500/90 to-orange-500/90 font-sans text-background hover:from-amber-500 hover:to-orange-500"
            >
              <Crown className="h-4 w-4" />
              Upgrade
            </Button>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          className="gap-2 rounded-xl bg-primary font-sans text-primary-foreground hover:bg-primary/90"
        >
          Save Changes
        </Button>
      </div>
    </div>
  )
}
