"use client"

import { useState, useCallback } from "react"
import { Upload, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { SmartImage } from "@/components/smart-image"
import { type User } from "./types"
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
        <Label className="mb-3 block font-sans text-sm font-semibold text-text-hi">
          Profile Photo
        </Label>
        <div className="flex items-center gap-4">
          <div
            className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[0.5px] border-hairline-strong font-sans text-2xl font-bold text-ink shadow-lg overflow-hidden"
            style={{ background: user.avatarColor }}
          >
            {avatarPreview ? (
              <SmartImage
                src={avatarPreview}
                alt="Avatar preview"
                fill
                sizes="80px"
                className="object-cover"
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
                className="gap-2 rounded-xl border-hairline-strong bg-white/[0.04] text-text-hi hover:bg-white/[0.06] hover:text-ink-foreground"
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
            <p className="mt-2 font-sans text-xs text-text-low">
              JPG, PNG, or GIF. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email" className="mb-2 block font-sans text-sm font-semibold text-text-hi">
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border-[0.5px] border-hairline-strong bg-white/[0.04] font-sans text-sm"
        />
      </div>

      {/* Stage Name */}
      <div>
        <Label htmlFor="stage-name" className="mb-2 block font-sans text-sm font-semibold text-text-hi">
          Stage Name <span className="font-normal text-text-low">(display name)</span>
        </Label>
        <p className="mb-1.5 font-sans text-xs text-text-mid">
          Your public identity — shown when you DJ and across the platform
        </p>
        <Input
          id="stage-name"
          value={stageName}
          onChange={(e) => setStageName(e.target.value)}
          placeholder="e.g. DJ Shadow"
          minLength={2}
          maxLength={30}
          className="rounded-xl border-[0.5px] border-hairline-strong bg-white/[0.04] font-sans text-sm"
        />
      </div>

      {/* Password Change */}
      <div>
        <Label className="mb-3 block font-sans text-sm font-semibold text-text-hi">
          Change Password
        </Label>
        <div className="space-y-3">
          <div>
            <Label htmlFor="current-password" className="mb-1.5 block font-sans text-xs text-text-mid">
              Current Password
            </Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="rounded-xl border-[0.5px] border-hairline-strong bg-white/[0.04] font-sans text-sm"
            />
          </div>
          <div>
            <Label htmlFor="new-password" className="mb-1.5 block font-sans text-xs text-text-mid">
              New Password
            </Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="rounded-xl border-[0.5px] border-hairline-strong bg-white/[0.04] font-sans text-sm"
            />
          </div>
          <div>
            <Label htmlFor="confirm-password" className="mb-1.5 block font-sans text-xs text-text-mid">
              Confirm New Password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="rounded-xl border-[0.5px] border-hairline-strong bg-white/[0.04] font-sans text-sm"
            />
          </div>
        </div>
      </div>

      {/* Account Type */}
      <div>
        <Label className="mb-3 block font-sans text-sm font-semibold text-text-hi">
          Account Type
        </Label>
        <div className="flex items-center justify-between rounded-xl border-[0.5px] border-hairline bg-white/[0.02] p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans text-sm font-semibold text-text-hi">
                {accountType === "premium" ? "Plus" : "Free"} Plan
              </span>
              <Badge
                variant={accountType === "premium" ? "default" : "outline"}
                className={
                  accountType === "premium"
                    ? "border-0 bg-brand-purple font-sans text-xs font-semibold text-white"
                    : "border-[0.5px] border-hairline-strong bg-white/[0.04] font-sans text-xs font-semibold text-text-mid"
                }
              >
                {accountType === "premium" ? "Plus" : "Free"}
              </Badge>
            </div>
            <p className="mt-1 font-sans text-xs text-text-mid">
              {accountType === "premium"
                ? "No ads - uninterrupted listening experience"
                : "Free accounts get ads every 10 minutes"}
            </p>
          </div>
          {accountType === "free" && (
            <Button
              size="sm"
              onClick={handleUpgradeAccount}
              className="gap-2 rounded-xl font-sans font-semibold text-white hover:opacity-90"
              style={{ background: "linear-gradient(135deg, var(--brand-purple), var(--brand-purple-deep))" }}
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
          className="gap-2 rounded-xl bg-brand-amber font-sans font-semibold text-ink hover:bg-brand-amber/90"
        >
          Save Changes
        </Button>
      </div>
    </div>
  )
}
