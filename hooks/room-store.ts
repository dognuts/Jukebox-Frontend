"use client"

import { useSyncExternalStore } from "react"
import type { APIChatMessage, PlaybackState, APITrack } from "@/lib/api"

// Module-level external store for the hottest WS slices. The room
// WebSocket hook writes here; components subscribe to individual
// slices via useSyncExternalStore so only the components that read
// a given slice re-render when it updates.
//
// Slices included:
// - chatMessages: real chat (messages/requests/announcements) — read
//   by the chat column and the DJ-context card.
// - activityEvents: presence/tip events (joins, leaves, neon gifts).
//   Kept separate from chatMessages so a busy room's join/leave churn
//   doesn't invalidate the rendered message list.
// - playbackState / currentTrack: playback sync data.
// - playbackPosition: the audio engine's current position in seconds,
//   written 2-4x per second while playing. Only the progress display
//   leaf subscribes — page-level state here re-rendered the whole
//   room tree on every tick.
// Everything else still lives inside useRoomWebSocket's React state —
// moving those hurts more than it helps because most of them are read
// by the room page itself.

type Listener = () => void

class Slice<T> {
  private value: T
  private listeners = new Set<Listener>()

  constructor(initial: T) {
    this.value = initial
  }

  get = (): T => this.value

  set = (next: T) => {
    if (Object.is(next, this.value)) return
    this.value = next
    for (const l of this.listeners) l()
  }

  update = (mutator: (prev: T) => T) => {
    const next = mutator(this.value)
    this.set(next)
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

export const chatMessagesSlice = new Slice<APIChatMessage[]>([])
export const activityEventsSlice = new Slice<APIChatMessage[]>([])
export const playbackStateSlice = new Slice<PlaybackState | null>(null)
export const currentTrackSlice = new Slice<APITrack | null>(null)
export const playbackPositionSlice = new Slice<number>(0)

// Server-vs-client wall-clock offset in milliseconds, computed as
// serverTime - Date.now() when the WebSocket's initial_state message
// arrives (WS CONTRACT, frozen: initial_state carries a top-level
// "serverTime" unix-epoch-ms field; absent field -> offset 0). Added
// to Date.now() wherever a playback position is derived from
// playbackState.startedAt, so a listener whose clock is minutes off
// doesn't drift from the room — or worse, falsely signal track end.
// Deliberately NOT reset in resetRoomSlices: the offset is a property
// of this client against the backend, not of any one room, and keeping
// it lets the mini-player (which runs without a room WebSocket) apply
// the last known offset too.
export const clockOffsetSlice = new Slice<number>(0)

// True while the audio engine's playback is blocked by the browser's
// autoplay policy and is waiting for a user gesture. Written by
// AudioEngine (which also renders the "Tap to join the audio" gate).
export const autoplayBlockedSlice = new Slice<boolean>(false)

// Reset slices when the room slug changes (the [slug] effect in
// use-room-websocket.ts is the only caller) so a room switch doesn't flash
// stale state from a different room. Reconnects deliberately do NOT reset:
// the resync markers let the fresh initial_state replace state atomically.
// autoplayBlockedSlice is deliberately NOT reset here: the flag is a
// property of the browser's autoplay policy, not of any one room, and
// its owner is the audio engine — which clears it on unmount and on
// real playback, and intentionally keeps it across track changes
// (without a user gesture the next track is just as blocked). Clearing
// it from a room transition while the engine stays mounted hid the
// tap-to-listen gate until the play watchdog re-flagged it seconds
// later.
export function resetRoomSlices() {
  chatMessagesSlice.set([])
  activityEventsSlice.set([])
  playbackStateSlice.set(null)
  currentTrackSlice.set(null)
  playbackPositionSlice.set(0)
}

export function useRoomChatMessages(): APIChatMessage[] {
  return useSyncExternalStore(
    chatMessagesSlice.subscribe,
    chatMessagesSlice.get,
    chatMessagesSlice.get
  )
}

export function useRoomPlaybackState(): PlaybackState | null {
  return useSyncExternalStore(
    playbackStateSlice.subscribe,
    playbackStateSlice.get,
    playbackStateSlice.get
  )
}

// Derived boolean for page-level layout gates ("is anything playing?").
// useSyncExternalStore compares snapshots with Object.is, so subscribers
// only re-render when playback state appears/disappears — not on every
// playback_state broadcast.
const getHasPlaybackState = () => playbackStateSlice.get() !== null

export function useRoomHasPlaybackState(): boolean {
  return useSyncExternalStore(
    playbackStateSlice.subscribe,
    getHasPlaybackState,
    getHasPlaybackState
  )
}

export function useRoomCurrentTrack(): APITrack | null {
  return useSyncExternalStore(
    currentTrackSlice.subscribe,
    currentTrackSlice.get,
    currentTrackSlice.get
  )
}

export function useRoomPlaybackPosition(): number {
  return useSyncExternalStore(
    playbackPositionSlice.subscribe,
    playbackPositionSlice.get,
    playbackPositionSlice.get
  )
}
