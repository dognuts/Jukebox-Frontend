"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrackPublication,
  RemoteParticipant,
  LocalTrack,
  createLocalAudioTrack,
} from "livekit-client"
import { authRequest } from "@/lib/api"

interface UseLiveKitVoiceOptions {
  roomSlug: string
  isDJ: boolean
  enabled: boolean // true when the user is in the room
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

export function useLiveKitVoice({ roomSlug, isDJ, enabled }: UseLiveKitVoiceOptions): UseLiveKitVoiceReturn {
  const [connected, setConnected] = useState(false)
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [djSpeaking, setDjSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roomRef = useRef<Room | null>(null)
  const localTrackRef = useRef<LocalTrack | null>(null)
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())

  // Connect to LiveKit room
  const connectToRoom = useCallback(async () => {
    if (roomRef.current) return // already connected

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
      roomRef.current = room
      setConnected(true)
      setError(null)
    } catch (err: any) {
      // Don't show errors for 503 (LiveKit not configured)
      if (!err.message?.includes("503")) {
        setError(err.message || "Failed to connect to voice")
      }
    }
  }, [roomSlug, isDJ])

  // Connect when enabled
  useEffect(() => {
    if (enabled && roomSlug) {
      connectToRoom()
    }

    return () => {
      // Clean up on unmount
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
  }, [enabled, roomSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  // DJ: Start broadcasting mic audio
  const startBroadcasting = useCallback(async (deviceId?: string): Promise<boolean> => {
    setError(null)

    // Ensure we're connected
    if (!roomRef.current) {
      await connectToRoom()
    }

    const room = roomRef.current
    if (!room) {
      setError("Not connected to voice channel")
      return false
    }

    try {
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
