"use client"

import dynamic from "next/dynamic"
import { usePlayer } from "@/lib/player-context"

// MiniPlayer pulls a meaningful dependency tree (AudioEngine + YouTube/
// SoundCloud embeds). Load it only when there is actual player state
// instead of shipping it in every page's layout chunk.
const MiniPlayer = dynamic(
  () => import("@/components/layout/mini-player").then((m) => m.MiniPlayer),
  { ssr: false }
)

// Mounted once in the root layout (inside PlayerProvider) so active
// playback survives navigation anywhere — including between the (app)
// and (site) route groups. The messages/upgrade chrome stays in
// AppChrome, which only mounts for (app) routes.
export function PlayerChrome() {
  const { player } = usePlayer()

  return <>{player && <MiniPlayer />}</>
}
