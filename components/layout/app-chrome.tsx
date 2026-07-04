"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useMessages } from "@/lib/messages-context"
import { useUpgrade } from "@/lib/upgrade-context"

// Each of these pulls a meaningful dependency tree (Radix sheet +
// conversation UI for the drawer, Radix dialog for upgrade). Load them
// only when their state first requires them instead of shipping them in
// the layout chunk. The mini player used to live here too, but it now
// mounts from PlayerChrome in the root layout so playback survives
// navigation into the (site) route group.
const MessagesDrawer = dynamic(
  () =>
    import("@/components/messages/messages-drawer").then(
      (m) => m.MessagesDrawer
    ),
  { ssr: false }
)
const UpgradeDialog = dynamic(
  () =>
    import("@/components/upgrade/upgrade-dialog").then((m) => m.UpgradeDialog),
  { ssr: false }
)

export function AppChrome() {
  const { drawerOpen } = useMessages()
  const { isDialogOpen } = useUpgrade()

  // Latch: once the drawer/dialog has been opened, keep the component
  // mounted so Radix close animations still play and internal state
  // (active conversation) survives re-opens.
  const [drawerMounted, setDrawerMounted] = useState(false)
  const [upgradeMounted, setUpgradeMounted] = useState(false)

  useEffect(() => {
    if (drawerOpen) setDrawerMounted(true)
  }, [drawerOpen])

  useEffect(() => {
    if (isDialogOpen) setUpgradeMounted(true)
  }, [isDialogOpen])

  return (
    <>
      {drawerMounted && <MessagesDrawer />}
      {upgradeMounted && <UpgradeDialog />}
    </>
  )
}
