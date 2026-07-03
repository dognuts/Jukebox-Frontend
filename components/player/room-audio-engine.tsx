"use client"

import { memo } from "react"
import { AudioEngine, type AudioEngineProps } from "./audio-engine"
import { playbackPositionSlice, useRoomPlaybackState } from "@/hooks/room-store"

// Room-page wrapper around AudioEngine that keeps the two hottest
// playback data flows OUT of the page component:
//
// - It subscribes to the playback-state slice HERE, one level below
//   RoomClient, so pause/resume/track-sync/drift-correction broadcasts
//   re-render only this invisible wrapper — not the whole room tree.
// - It routes the engine's onTimeUpdate ticks (2-4x per second while
//   playing) straight into the playback-position slice, whose only
//   subscriber is the progress-bar leaf inside ListenerNowPlaying.
//
// The mini player keeps using AudioEngine directly — it builds its own
// playbackState and doesn't write to the room slices.
type RoomAudioEngineProps = Omit<AudioEngineProps, "playbackState" | "onTimeUpdate">

export const RoomAudioEngine = memo(function RoomAudioEngine(
  props: RoomAudioEngineProps
) {
  const playbackState = useRoomPlaybackState()
  return (
    <AudioEngine
      {...props}
      playbackState={playbackState}
      onTimeUpdate={playbackPositionSlice.set}
    />
  )
})
