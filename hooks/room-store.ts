"use client"

import { useSyncExternalStore } from "react"
import type { APIChatMessage, PlaybackState, APITrack } from "@/lib/api"

// Module-level external store for the hottest WS slices. The room
// WebSocket hook writes here; components subscribe to individual
// slices via useSyncExternalStore so only the components that read
// a given slice re-render when it updates.
//
// Slices included: chatMessages and playbackState. Everything else
// still lives inside useRoomWebSocket's React state — moving those
// hurts more than it helps because most of them are read by the
// room page itself, which re-renders anyway.

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
export const playbackStateSlice = new Slice<PlaybackState | null>(null)
export const currentTrackSlice = new Slice<APITrack | null>(null)

// Reset slices when the room slug changes or the connection opens so a
// reconnect doesn't flash stale state from a different room.
export function resetRoomSlices() {
  chatMessagesSlice.set([])
  playbackStateSlice.set(null)
  currentTrackSlice.set(null)
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

export function useRoomCurrentTrack(): APITrack | null {
  return useSyncExternalStore(
    currentTrackSlice.subscribe,
    currentTrackSlice.get,
    currentTrackSlice.get
  )
}
