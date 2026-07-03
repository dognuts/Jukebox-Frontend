"use client"

import { useState, useRef, useCallback, useEffect } from "react"
// Type-only imports are erased at compile time — the livekit-client SDK
// (~1MB) is loaded exclusively via the dynamic import()s below so it
// stays out of the room route's initial bundle.
import type { Room, LocalTrack } from "livekit-client"
import { authRequest } from "@/lib/api"

interface UseLiveKitVoiceOptions {
  roomSlug: string
  isDJ: boolean
  // Listener-side gate: true while voice is actually live in the room
  // (driven by the dj_mic_state WS broadcast). Listeners connect to the
  // SFU only once this flips true — never on room entry. The DJ side
  // ignores it and connects lazily inside startBroadcasting().
  voiceActive: boolean
}

interface UseLiveKitVoiceReturn {
  // DJ controls
  startBroadcasting: (deviceId?: string) => Promise<boolean>
  stopBroadcasting: () => void
  isBroadcasting: boolean
  // Listener state
  djSpeaking: boolean // true when the DJ's voice audio is being received
  // Connection
  connected: boolean
  error: string | null
}

export function useLiveKitVoice({ roomSlug, isDJ, voiceActive }: UseLiveKitVoiceOptions): UseLiveKitVoiceReturn {
  const [connected, setConnected] = useState(false)
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [djSpeaking, setDjSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roomRef = useRef<Room | null>(null)
  const localTrackRef = useRef<LocalTrack | null>(null)
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  // Single-flight guard so overlapping connect calls share one attempt,
  // plus an epoch the teardown bumps so an attempt still awaiting its
  // token/SDK/handshake when the room unmounts abandons instead of
  // leaking an SFU connection.
  const connectPromiseRef = useRef<Promise<void> | null>(null)
  const connectEpochRef = useRef(0)

  // Connect to LiveKit room
  const connectToRoom = useCallback((): Promise<void> => {
    if (roomRef.current) return Promise.resolve() // already connected
    if (connectPromiseRef.current) return connectPromiseRef.current // attempt in flight

    const epoch = connectEpochRef.current
    const attempt = (async () => {
      try {
        // Get token from our backend
        const res = await authRequest<{ token: string; url: string }>("/api/livekit/token", {
          method: "POST",
          body: JSON.stringify({ roomSlug, isDJ }),
        })

        if (!res.token || !res.url) {
          // LiveKit not configured on backend — silently skip
          return
        }

        // Load the WebRTC SDK only now that voice is actually being
        // used (see the type-only import note above).
        const { Room, RoomEvent, Track } = await import("livekit-client")

        if (epoch !== connectEpochRef.current) return // torn down while loading

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        })

        // Handle remote audio tracks (listener receives DJ voice)
        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === Track.Kind.Audio) {
            const audioEl = track.attach()
            audioEl.volume = 1.0
            audioElementsRef.current.set(participant.identity, audioEl)
            setDjSpeaking(true)
          }
        })

        room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          if (track.kind === Track.Kind.Audio) {
            track.detach().forEach((el) => el.remove())
            audioElementsRef.current.delete(participant.identity)
            if (audioElementsRef.current.size === 0) {
              setDjSpeaking(false)
            }
          }
        })

        room.on(RoomEvent.Disconnected, () => {
          setConnected(false)
          setIsBroadcasting(false)
          setDjSpeaking(false)
        })

        await room.connect(res.url, res.token)

        if (epoch !== connectEpochRef.current) {
          // Torn down while the SFU handshake was in flight
          room.disconnect()
          return
        }

        roomRef.current = room
        setConnected(true)
        setError(null)
      } catch (err: any) {
        // Don't show errors for 503 (LiveKit not configured)
        if (!err.message?.includes("503")) {
          setError(err.message || "Failed to connect to voice")
        }
      } finally {
        connectPromiseRef.current = null
      }
    })()
    connectPromiseRef.current = attempt
    return attempt
  }, [roomSlug, isDJ])

  // Listener: connect once voice actually goes live in the room — never
  // on room entry. Once connected, stay connected for the rest of the
  // visit so mid-set mic toggles don't churn token requests and ICE
  // negotiation; the teardown effect below disconnects on unmount or
  // room change. (The DJ connects inside startBroadcasting instead.)
  useEffect(() => {
    if (voiceActive && roomSlug && !isDJ) {
      connectToRoom()
    }
  }, [voiceActive, roomSlug, isDJ, connectToRoom])

  // Teardown on unmount or room change — covers both the listener-side
  // auto-connection above and a DJ connection made by startBroadcasting.
  useEffect(() => {
    return () => {
      connectEpochRef.current++ // abandon any in-flight connect attempt
      if (localTrackRef.current) {
        localTrackRef.current.stop()
        localTrackRef.current = null
      }
      audioElementsRef.current.forEach((el) => el.remove())
      audioElementsRef.current.clear()
      if (roomRef.current) {
        roomRef.current.disconnect()
        roomRef.current = null
      }
      setConnected(false)
      setIsBroadcasting(false)
      setDjSpeaking(false)
    }
  }, [roomSlug])

  // DJ: Start broadcasting mic audio
  const startBroadcasting = useCallback(async (deviceId?: string): Promise<boolean> => {
    setError(null)

    // Ensure we're connected — the DJ side connects here, on first mic
    // use, not on room entry
    if (!roomRef.current) {
      await connectToRoom()
    }

    const room = roomRef.current
    if (!room) {
      setError("Not connected to voice channel")
      return false
    }

    try {
      // Already fetched (and cached) by connectToRoom above — this
      // resolves from the module cache
      const { createLocalAudioTrack, Track } = await import("livekit-client")

      // Create local audio track from mic
      const track = await createLocalAudioTrack({
        deviceId: deviceId || undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      })

      // Publish to room
      await room.localParticipant.publishTrack(track, {
        name: "dj-voice",
        source: Track.Source.Microphone,
      })

      localTrackRef.current = track
      setIsBroadcasting(true)
      return true
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Microphone access denied")
      } else {
        setError(err.message || "Failed to start microphone")
      }
      return false
    }
  }, [connectToRoom])

  // DJ: Stop broadcasting
  const stopBroadcasting = useCallback(() => {
    const room = roomRef.current
    const track = localTrackRef.current

    if (track && room) {
      room.localParticipant.unpublishTrack(track)
      track.stop()
      localTrackRef.current = null
    }

    setIsBroadcasting(false)
  }, [])

  return {
    startBroadcasting,
    stopBroadcasting,
    isBroadcasting,
    djSpeaking,
    connected,
    error,
  }
}
