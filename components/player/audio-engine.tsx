"use client"

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { Play } from "lucide-react"
import { YouTubePlayer, type AudioPlayerHandle } from "./youtube-player"
import { HTML5AudioPlayer } from "./html5-audio-player"
import { SoundCloudPlayer } from "./soundcloud-player"
import {
  autoplayBlockedSlice,
  clockOffsetSlice,
  currentTrackSlice,
} from "@/hooks/room-store"
import { usePlayer } from "@/lib/player-context"
import type { PlaybackState } from "@/lib/api"

export interface AudioEngineTrack {
  id: string
  source: "youtube" | "soundcloud" | "mp3"
  sourceUrl: string
  videoId?: string // YouTube only
}

// Metadata shown on lock screens / OS media hubs via the Media Session
// API. Passed by the room page; the mini-player falls back to the room
// store's current track when it matches the playing track.
export interface AudioEngineMediaMetadata {
  title: string
  artist: string
  artworkUrl?: string | null
}

// How long after an (unheeded) play() attempt before we conclude the
// browser's autoplay policy blocked playback. HTML5 audio reports the
// block instantly via the rejected play() promise; YouTube (stuck
// unstarted/cued) and SoundCloud (no PLAY event ever fires) need this
// watchdog instead.
const AUTOPLAY_WATCHDOG_MS = 3000

// Extra watchdog cycles granted while the player still reports a
// pre-playback initialization state (YouTube unstarted/cued, which the
// state map never propagates, so playerState sits at "paused"; the
// SoundCloud widget before the current track's first PLAY event). A
// slow connection legitimately idles there past the watchdog without
// ever emitting "buffering" — but so does a genuinely policy-blocked
// player, so the grace is capped rather than open-ended.
const AUTOPLAY_WATCHDOG_MAX_INIT_GRACE = 2

// How often the inline YouTube overlay re-measures its target's
// document position outside the event-driven triggers (resize /
// ResizeObserver / ancestor scrolls). Layout shifts that move the
// target without resizing it fire none of those, and plain document
// scrolls reposition purely from the cache — this is the self-heal
// that keeps a stale cache from misaligning the overlay indefinitely.
const INLINE_TARGET_REVALIDATE_MS = 500

// How long after we ourselves call pause() that the element's async
// "paused" event is still attributed to us. Beyond this window, a
// pause while the room is playing is the user pausing the element
// directly (headphone unplug, the YouTube iframe's own controls) and
// gets remembered like a Media Session pause.
const EXPECTED_PAUSE_WINDOW_MS = 1000

export interface AudioEngineProps {
  track: AudioEngineTrack | null
  playbackState: PlaybackState | null
  volume: number // 0-100
  muted: boolean
  isDJ: boolean
  visible?: boolean
  forcePaused?: boolean // DJ mic pause — temporarily pauses audio
  onTimeUpdate?: (seconds: number) => void
  onDuration?: (seconds: number) => void
  onTrackEnd?: () => void
  onPlayStateChange?: (playing: boolean) => void
  onArtwork?: (url: string | null) => void // SoundCloud only
  // Media Session metadata (lock screen / OS media hub). Optional —
  // without it the engine falls back to the room store's current track.
  mediaMetadata?: AudioEngineMediaMetadata
  // Media Session transport overrides. When set (the DJ's room page),
  // the hardware play/pause keys carry room-pause semantics — the same
  // dj_resume/dj_pause the deck buttons send. When absent (listeners,
  // mini-player), pause is handled locally with a "paused by user"
  // flag so the 10s re-sync loop doesn't silently un-pause the user.
  onMediaPlay?: () => void
  onMediaPause?: () => void
  // Registered as the Media Session "nexttrack" handler only when
  // provided (DJ only) — listeners must not get a skip button.
  onMediaNextTrack?: () => void
  // When set, YouTube tracks render their iframe via React portal into
  // this element instead of using the inline or fixed-corner fallback.
  // Used by the listener room view to place the video where the
  // album-art slot normally lives. Mini-player leaves this null so it
  // keeps the fixed-corner render.
  inlineTarget?: HTMLDivElement | null
}

/**
 * AudioEngine is an invisible component that manages the actual audio playback.
 * It renders the appropriate player (YouTube, SoundCloud, or HTML5 audio) based
 * on the track source, and syncs playback position to the server's playback state.
 * 
 * On initial load, audio is muted until the first sync seek completes to prevent
 * the "plays from 0 then jumps" artifact.
 */
export function AudioEngine({
  track,
  playbackState,
  volume,
  muted,
  isDJ,
  visible = false,
  forcePaused = false,
  onTimeUpdate,
  onDuration,
  onTrackEnd,
  onPlayStateChange,
  onArtwork,
  mediaMetadata,
  onMediaPlay,
  onMediaPause,
  onMediaNextTrack,
  inlineTarget,
}: AudioEngineProps) {
  const playerRef = useRef<AudioPlayerHandle>(null)
  const [ready, setReady] = useState(false)
  const [synced, setSynced] = useState(false)
  const [playerState, setPlayerState] = useState<"playing" | "paused" | "ended" | "buffering">("paused")
  const lastSyncRef = useRef(0)
  const syncTimeoutsRef = useRef<NodeJS.Timeout[]>([])
  const signaledEndRef = useRef("")  // trackID for which we've already signaled end
  const [adPlaying, setAdPlaying] = useState(false)
  const adJustEndedRef = useRef(false)
  // Set when the user paused — via a Media Session action (headphone
  // button, lock screen) or directly on the element (headphone-unplug
  // auto-pause, the YouTube iframe's own controls). While set,
  // syncToServer refuses to issue play() so the 10s re-sync loop can't
  // fight the user's pause. Cleared whenever playback actually starts.
  const userPausedRef = useRef(false)
  // Timestamp of the last pause WE initiated (server sync, mic pause,
  // media-key handler) so its element-level "paused" event isn't
  // mistaken for the user pausing the element directly.
  const expectedPauseRef = useRef(0)
  // Autoplay-policy gate. Lives in the room store (the "blocked" flag
  // other surfaces can read); this engine both writes it and renders
  // the "Tap to join the audio" overlay from it.
  const autoplayBlocked = useSyncExternalStore(
    autoplayBlockedSlice.subscribe,
    autoplayBlockedSlice.get,
    autoplayBlockedSlice.get
  )
  const autoplayWatchdogRef = useRef<NodeJS.Timeout | null>(null)
  // Grace cycles consumed by the current watchdog while the player
  // still reports a pre-playback init state (see the constant above).
  const watchdogInitGraceRef = useRef(0)
  // The global player context's track — what the mini-player is
  // actually playing. Last fallback for lock-screen metadata: once the
  // mini-player's 15s REST poll advances the track, the room store
  // (last written by the departed room's WebSocket) no longer matches
  // the playing track, but this always does. PlayerProvider wraps the
  // whole app (app/layout.tsx), so the hook is safe everywhere the
  // engine mounts.
  const contextTrack = usePlayer().player?.track

  // Store callbacks in refs so syncToServer doesn't recreate when they change.
  // This prevents the seek+play churn that was freezing YouTube in the mini-player.
  const onTrackEndRef = useRef(onTrackEnd)
  onTrackEndRef.current = onTrackEnd
  const onPlayStateChangeRef = useRef(onPlayStateChange)
  onPlayStateChangeRef.current = onPlayStateChange
  const onMediaPlayRef = useRef(onMediaPlay)
  onMediaPlayRef.current = onMediaPlay
  const onMediaPauseRef = useRef(onMediaPause)
  onMediaPauseRef.current = onMediaPause
  const onMediaNextTrackRef = useRef(onMediaNextTrack)
  onMediaNextTrackRef.current = onMediaNextTrack
  // Latest-value refs for the autoplay watchdog's delayed check.
  const playbackStateRef = useRef(playbackState)
  playbackStateRef.current = playbackState
  const forcePausedRef = useRef(forcePaused)
  forcePausedRef.current = forcePaused
  const playerStateRef = useRef(playerState)
  playerStateRef.current = playerState

  // Persistent YouTube host — a single fixed-position div appended to
  // document.body that always hosts the portal-rendered YouTubePlayer.
  // Its position/size is updated via CSS to either match inlineTarget's
  // bounding rect (when set) or sit at the corner fallback position.
  // Because the host is stable across all inlineTarget changes, the
  // YouTubePlayer mounts exactly once per track and never gets torn
  // down and rebuilt when the target moves — which was the bug that
  // made the iframe disappear on state transitions.
  const [ytHost, setYtHost] = useState<HTMLDivElement | null>(null)

  // Create the stable host on mount.
  useEffect(() => {
    if (typeof document === "undefined") return
    const host = document.createElement("div")
    host.setAttribute("data-yt-host", "")
    host.style.position = "fixed"
    host.style.zIndex = "40"
    host.style.overflow = "hidden"
    host.style.pointerEvents = "auto"
    // Default corner position until inlineTarget is wired up.
    host.style.bottom = "80px"
    host.style.right = "12px"
    host.style.width = "200px"
    host.style.height = "112px"
    host.style.borderRadius = "10px"
    host.style.border = "1px solid oklch(0.30 0.04 280 / 0.5)"
    host.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)"
    document.body.appendChild(host)
    setYtHost(host)
    return () => {
      if (host.parentNode) host.parentNode.removeChild(host)
    }
  }, [])

  // Track inlineTarget's bounding rect and update the host's fixed
  // position to overlay it. Rebinds its observers whenever either
  // inlineTarget or ytHost changes.
  useEffect(() => {
    const host = ytHost
    if (!host) return

    // Corner fallback when there's no target.
    const cornerPosition = () => {
      host.style.top = ""
      host.style.left = ""
      host.style.bottom = "80px"
      host.style.right = "12px"
      host.style.width = "200px"
      host.style.height = "112px"
      host.style.borderRadius = "10px"
      host.style.border = "1px solid oklch(0.30 0.04 280 / 0.5)"
      host.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)"
      host.style.clipPath = ""
    }

    if (!inlineTarget) {
      cornerPosition()
      return
    }

    // Overlay mode — track the inlineTarget's position on the page
    // and keep the fixed host aligned to it as the user scrolls or
    // the viewport resizes.
    //
    // Layout reads are cached: getComputedStyle (border radius) runs
    // once per target, and getBoundingClientRect only runs when the
    // target may actually have moved within the document (resize /
    // ResizeObserver / nested-ancestor scroll). Plain document scrolls
    // — the per-frame hot path — reposition the host purely from the
    // cached document-space coordinates and window.scrollX/Y, with no
    // forced style/layout recalculation.
    const measured = { docTop: 0, docLeft: 0, width: 0, height: 0 }
    // Visible box imposed by the target's overflow-clipping ancestors,
    // in document coords (±Infinity = unclipped on that side). The
    // room's mobile shell scrolls the now-playing pane inside an
    // overflow-y-auto <main> while the nav and tab bar stay on screen
    // above it — without this the fixed host would follow the slot
    // right over them (z-40) and swallow their taps. Desktop has no
    // clipping ancestor (md:overflow-visible), so the box stays
    // infinite and nothing changes there.
    const clipBox = {
      top: -Infinity,
      right: Infinity,
      bottom: Infinity,
      left: -Infinity,
    }
    // Inherit the target's border radius so the overlay looks glued
    // to its slot. It never changes per target, so read it once.
    const borderRadius =
      window.getComputedStyle(inlineTarget).borderRadius || "10px"

    const measure = () => {
      const rect = inlineTarget.getBoundingClientRect()
      measured.docTop = rect.top + window.scrollY
      measured.docLeft = rect.left + window.scrollX
      measured.width = rect.width
      measured.height = rect.height
      // Re-derive the ancestor clip box alongside the target rect —
      // both go stale under the same triggers (ancestor scroll,
      // resize, breakpoint crossings flipping overflow classes).
      clipBox.top = -Infinity
      clipBox.right = Infinity
      clipBox.bottom = Infinity
      clipBox.left = -Infinity
      let ancestor = inlineTarget.parentElement
      while (
        ancestor &&
        ancestor !== document.body &&
        ancestor !== document.documentElement
      ) {
        const style = window.getComputedStyle(ancestor)
        const clipsY = style.overflowY !== "visible"
        const clipsX = style.overflowX !== "visible"
        if (clipsY || clipsX) {
          const r = ancestor.getBoundingClientRect()
          if (clipsY) {
            clipBox.top = Math.max(clipBox.top, r.top + window.scrollY)
            clipBox.bottom = Math.min(clipBox.bottom, r.bottom + window.scrollY)
          }
          if (clipsX) {
            clipBox.left = Math.max(clipBox.left, r.left + window.scrollX)
            clipBox.right = Math.min(clipBox.right, r.right + window.scrollX)
          }
        }
        ancestor = ancestor.parentElement
      }
    }

    const applyPosition = () => {
      if (!inlineTarget.isConnected) {
        cornerPosition()
        return
      }
      const top = measured.docTop - window.scrollY
      const left = measured.docLeft - window.scrollX
      host.style.top = `${top}px`
      host.style.left = `${left}px`
      host.style.right = ""
      host.style.bottom = ""
      host.style.width = `${measured.width}px`
      host.style.height = `${measured.height}px`
      host.style.borderRadius = borderRadius
      host.style.border = "0px"
      host.style.boxShadow = "none"
      // Clip the host to the ancestors' visible box, so scrolling the
      // slot out of its pane cuts the video off at the pane edge
      // instead of sliding it over the nav / tab bar. clip-path also
      // removes the clipped area from hit testing, so the bars stay
      // tappable while the video passes "behind" them.
      const insetTop = Math.max(0, clipBox.top - window.scrollY - top)
      const insetLeft = Math.max(0, clipBox.left - window.scrollX - left)
      const insetBottom = Math.max(
        0,
        top + measured.height - (clipBox.bottom - window.scrollY)
      )
      const insetRight = Math.max(
        0,
        left + measured.width - (clipBox.right - window.scrollX)
      )
      host.style.clipPath =
        insetTop > 0 || insetRight > 0 || insetBottom > 0 || insetLeft > 0
          ? `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`
          : ""
    }

    measure()
    applyPosition()

    // Use requestAnimationFrame-throttled scroll/resize updates so
    // the overlay tracks smoothly without flooding the main thread.
    let frame = 0
    let needsMeasure = false
    const schedule = (remeasure: boolean) => {
      if (remeasure) needsMeasure = true
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (needsMeasure) {
          needsMeasure = false
          if (inlineTarget.isConnected) measure()
        }
        applyPosition()
      })
    }

    const handleScroll = (e: Event) => {
      const t = e.target
      if (t && t !== document && t !== window && t instanceof Element) {
        // A nested scroller that doesn't contain the target can't move
        // it — ignore entirely (e.g. the chat column scrolling).
        if (!t.contains(inlineTarget)) return
        // An ancestor scroller moved the target within the document —
        // the cached coordinates are stale, so re-measure.
        schedule(true)
        return
      }
      // Document scroll — cached coordinates stay valid.
      schedule(false)
    }

    const handleResize = () => schedule(true)

    const ro = new ResizeObserver(() => schedule(true))
    ro.observe(inlineTarget)

    window.addEventListener("scroll", handleScroll, { passive: true, capture: true })
    window.addEventListener("resize", handleResize, { passive: true })

    // The event-driven triggers above can't see everything: a layout
    // shift that moves the target without resizing it (content above
    // it expanding) fires no scroll or resize at all, and document
    // scrolls reposition purely from the cache — either would leave
    // the overlay misaligned until the next real trigger. This
    // low-frequency re-measure self-heals within half a second at the
    // cost of one layout read per tick.
    const revalidate = setInterval(
      () => schedule(true),
      INLINE_TARGET_REVALIDATE_MS
    )

    return () => {
      ro.disconnect()
      window.removeEventListener("scroll", handleScroll, { capture: true } as any)
      window.removeEventListener("resize", handleResize)
      clearInterval(revalidate)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [inlineTarget, ytHost])

  // Helper to clear all pending sync timeouts
  const clearSyncTimeouts = useCallback(() => {
    for (const t of syncTimeoutsRef.current) clearTimeout(t)
    syncTimeoutsRef.current = []
  }, [])

  const clearAutoplayWatchdog = useCallback(() => {
    if (autoplayWatchdogRef.current) {
      clearTimeout(autoplayWatchdogRef.current)
      autoplayWatchdogRef.current = null
    }
  }, [])

  // Armed after every play() attempt until the track has actually
  // played. If the player still isn't playing when the timer fires —
  // and nothing legitimate explains it (ad, buffering, server pause,
  // mic pause, user pause) — the autoplay policy blocked us: raise the
  // store flag so the "Tap to join the audio" gate renders. Buffering
  // means data is flowing (a slow network, not a policy block), so the
  // check re-arms instead of flagging.
  const armAutoplayWatchdog = useCallback(() => {
    clearAutoplayWatchdog()
    watchdogInitGraceRef.current = 0
    const check = () => {
      autoplayWatchdogRef.current = null
      if (hasPlayedRef.current) return
      if (playerRef.current?.isAdPlaying?.()) return
      if (!playbackStateRef.current?.isPlaying) return
      if (forcePausedRef.current || userPausedRef.current) return
      if (playerStateRef.current === "buffering") {
        autoplayWatchdogRef.current = setTimeout(check, AUTOPLAY_WATCHDOG_MS)
        return
      }
      // Still in a pre-playback init state (YouTube unstarted/cued,
      // SoundCloud before its first PLAY event)? Probably a slow
      // load, not a policy block — give it a capped number of extra
      // cycles before flashing the gate at someone whose playback was
      // never actually blocked.
      if (
        playerRef.current?.isInitializing?.() &&
        watchdogInitGraceRef.current < AUTOPLAY_WATCHDOG_MAX_INIT_GRACE
      ) {
        watchdogInitGraceRef.current++
        autoplayWatchdogRef.current = setTimeout(check, AUTOPLAY_WATCHDOG_MS)
        return
      }
      if (playerStateRef.current !== "playing") {
        autoplayBlockedSlice.set(true)
      }
    }
    autoplayWatchdogRef.current = setTimeout(check, AUTOPLAY_WATCHDOG_MS)
  }, [clearAutoplayWatchdog])

  // HTML5 audio reports a policy block synchronously via the rejected
  // play() promise — no need to wait out the watchdog.
  const handlePlayBlocked = useCallback(() => {
    clearAutoplayWatchdog()
    autoplayBlockedSlice.set(true)
  }, [clearAutoplayWatchdog])

  // Volume control — suppress volume until synced to prevent hearing audio at position 0
  useEffect(() => {
    if (ready && playerRef.current) {
      // During an ad we DO want audio — the pre/mid-roll should be
      // audible even though we aren't "synced" to the shared track
      // position yet. Only the initial sync-to-server phase (pre-first-sync,
      // no ad running) should mute to hide the seek jump.
      if (!synced && !adPlaying) {
        playerRef.current.setVolume(0)
      } else {
        playerRef.current.setVolume(muted ? 0 : volume)
      }
    }
  }, [volume, muted, ready, synced, adPlaying])

  // Sync to server playback state.
  // Uses refs for onTrackEnd/onPlayStateChange so this callback only
  // recreates when actual playback parameters change — not when the
  // parent re-renders with new callback identities.
  const syncToServer = useCallback(() => {
    if (!playbackState || !ready || !playerRef.current) return
    if (forcePaused) return // DJ mic is active — don't resume
    // The user paused via a Media Session action (headphone button /
    // lock screen) — honor it instead of silently un-pausing them.
    if (userPausedRef.current) return
    // Don't fight the ad — let YouTube play the pre-roll/mid-roll through.
    if (playerRef.current.isAdPlaying?.()) return

    const now = Date.now()
    // Don't sync more than once per second
    if (now - lastSyncRef.current < 1000) return
    lastSyncRef.current = now

    if (!playbackState.isPlaying) {
      // Server says paused — pause at the pause position
      expectedPauseRef.current = Date.now()
      playerRef.current.pause()
      if (playbackState.pausePosition > 0) {
        playerRef.current.seekTo(playbackState.pausePosition)
      }
      setSynced(true)
      onPlayStateChangeRef.current?.(false)
      return
    }

    // Server says playing — calculate where we should be. startedAt is
    // a SERVER timestamp, so correct our wall clock by the offset
    // estimated from the WS initial_state handshake (0 when unknown) —
    // otherwise every listener sits at their clock skew from the room,
    // and a clock-fast client falsely signals track end.
    const serverStartMs = playbackState.startedAt
    const elapsedMs = Date.now() + clockOffsetSlice.get() - serverStartMs
    const targetSeconds = Math.max(0, elapsedMs / 1000)

    // Check the player's actual duration
    const playerDuration = playerRef.current.getDuration?.() || 0

    // If we know the real duration and server time has passed it, the track is over
    // Tell the server to advance rather than playing from a wrong position
    if (playerDuration > 30 && targetSeconds > playerDuration + 2) {
      // Track should have ended — trigger onTrackEnd to notify server (only once per track)
      if (hasPlayedRef.current && signaledEndRef.current !== playbackState.trackId) {
        signaledEndRef.current = playbackState.trackId || ""
        onTrackEndRef.current?.()
      }
      // Still play from current position while waiting for server to advance
      playerRef.current.play()
      armAutoplayWatchdog()
      if (!synced) setTimeout(() => setSynced(true), 600)
      else onPlayStateChangeRef.current?.(true)
      return
    }

    // If player doesn't know duration yet and target is very far ahead, start from current position
    if (playerDuration <= 0 && targetSeconds > 600) {
      playerRef.current.play()
      armAutoplayWatchdog()
      if (!synced) setTimeout(() => setSynced(true), 600)
      else onPlayStateChangeRef.current?.(true)
      return
    }

    // Check current position
    const currentPos = playerRef.current.getCurrentTime()
    const drift = Math.abs(currentPos - targetSeconds)

    // Seek if drift > 2 seconds
    if (drift > 2) {
      playerRef.current.seekTo(targetSeconds)
    }

    playerRef.current.play()
    armAutoplayWatchdog()

    // Restore volume after a short delay to let the seek take effect
    if (!synced) {
      setTimeout(() => {
        setSynced(true)
      }, 300)
    } else {
      onPlayStateChangeRef.current?.(true)
    }
  }, [playbackState, ready, synced, forcePaused, armAutoplayWatchdog])

  // Ref-mirror of syncToServer so the Media Session handlers (bound
  // once) always call the current sync closure.
  const syncToServerRef = useRef(syncToServer)
  syncToServerRef.current = syncToServer

  // Sync when playback state changes
  useEffect(() => {
    syncToServer()
  }, [syncToServer])

  // Also sync when player becomes ready
  const handleReady = useCallback(() => {
    setReady(true)
    clearSyncTimeouts()
    // Sync with staggered retries to ensure player is truly ready to seek
    syncTimeoutsRef.current.push(
      setTimeout(() => syncToServer(), 200),
      setTimeout(() => { lastSyncRef.current = 0; syncToServer() }, 1200),
      setTimeout(() => { lastSyncRef.current = 0; syncToServer() }, 2500),
    )
  }, [syncToServer, clearSyncTimeouts])

  // Clean up sync timeouts on unmount; also drop the autoplay gate so
  // it can't linger after the engine (and its player) is gone.
  useEffect(() => {
    return () => {
      clearSyncTimeouts()
      clearAutoplayWatchdog()
      autoplayBlockedSlice.set(false)
    }
  }, [clearSyncTimeouts, clearAutoplayWatchdog])

  // DJ mic pause — temporarily pause audio when forcePaused is true, resume when false
  useEffect(() => {
    if (!ready || !playerRef.current) return
    if (forcePaused) {
      expectedPauseRef.current = Date.now()
      playerRef.current.pause()
      onPlayStateChange?.(false)
    } else if (playbackState?.isPlaying) {
      // Resume — re-sync to server position since time has passed
      syncToServer()
    }
  }, [forcePaused]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sync periodically to correct any drift (every 10s)
  useEffect(() => {
    if (!ready || !playbackState?.isPlaying) return
    const interval = setInterval(syncToServer, 10000)
    return () => clearInterval(interval)
  }, [ready, playbackState?.isPlaying, syncToServer])

  // Reset ready state when track changes. The autoplay-blocked flag is
  // deliberately NOT cleared here — without a user gesture the next
  // track is just as blocked, and clearing it would flicker the gate.
  // userPausedRef also survives track changes: a user who paused via
  // their headphones chose silence, not "silence until the DJ advances".
  // (shouldAutoplay below gates the child players' track-change
  // self-play on the same flag so they can't steamroll it either.)
  useEffect(() => {
    clearSyncTimeouts()
    clearAutoplayWatchdog()
    setReady(false)
    setSynced(false)
    lastSyncRef.current = 0
    hasPlayedRef.current = false
    signaledEndRef.current = ""
  }, [track?.id, clearSyncTimeouts, clearAutoplayWatchdog])

  // Track whether the player has actually started playing
  const hasPlayedRef = useRef(false)

  const handleStateChange = useCallback((state: "playing" | "paused" | "ended" | "buffering") => {
    setPlayerState(state)
    playerStateRef.current = state

    if (state === "playing") {
      hasPlayedRef.current = true
      // Playback started — by whatever path (sync, media key, the
      // player's own controls) — so any remembered user pause is over
      // and, whatever the watchdog suspected, the autoplay policy
      // isn't blocking us.
      userPausedRef.current = false
      clearAutoplayWatchdog()
      autoplayBlockedSlice.set(false)
      onPlayStateChangeRef.current?.(true)
    } else if (state === "paused") {
      // A pause we didn't initiate — headphone-unplug auto-pause on
      // the hidden <audio>, the YouTube iframe's own controls — while
      // the room is playing means the user chose silence at the
      // element level, bypassing the Media Session handler. Remember
      // it like a media-key pause so the 10s re-sync loop doesn't
      // resume through the speakers moments later.
      if (
        Date.now() - expectedPauseRef.current > EXPECTED_PAUSE_WINDOW_MS &&
        playbackStateRef.current?.isPlaying &&
        !forcePausedRef.current &&
        hasPlayedRef.current &&
        !playerRef.current?.isAdPlaying?.()
      ) {
        userPausedRef.current = true
      }
      onPlayStateChangeRef.current?.(false)
    } else if (state === "ended") {
      // Ignore "ended" fired by YouTube when an ad finishes — that's the
      // ad's end-of-video, not the track's. The real track takes over
      // immediately after, and handleAdStateChange re-syncs us then.
      if (playerRef.current?.isAdPlaying?.() || adJustEndedRef.current) {
        adJustEndedRef.current = false
        return
      }
      // Only trigger track end if the player has actually played something
      // YouTube IFrame API can fire "ended" (state 0) during initialization
      if (hasPlayedRef.current) {
        // HTML5 audio and the SoundCloud widget fire "paused" right
        // before "ended" at natural end of track — running to
        // completion is the opposite of a user pause, so undo the flag
        // the paused branch just set.
        userPausedRef.current = false
        onTrackEndRef.current?.()
      }
    }
  }, [clearAutoplayWatchdog])

  // When YouTube transitions into or out of an ad, react:
  //  - Into ad: clear "synced" so we'll re-sync once the real video starts.
  //  - Out of ad: force the next syncToServer to run immediately.
  const handleAdStateChange = useCallback((isAd: boolean) => {
    setAdPlaying(isAd)
    if (isAd) {
      setSynced(false)
    } else {
      adJustEndedRef.current = true
      lastSyncRef.current = 0
      // Let the real video's metadata settle, then snap to the shared
      // server position.
      setTimeout(() => syncToServer(), 400)
    }
  }, [syncToServer])

  // Consulted by the child players before their track-change self-play
  // (YouTube's loadVideoById + timed playVideo retries, SoundCloud's
  // widget.load auto_play). Without this gate a track advance would
  // steamroll a remembered pause: the child plays on its own, the
  // resulting "playing" event clears userPausedRef in handleStateChange,
  // and the user is silently un-paused — the exact failure the flag
  // exists to stop. Reads refs only, so its identity is stable and the
  // children can re-check it when their timed retries fire.
  const shouldAutoplay = useCallback(() => {
    return !userPausedRef.current && !forcePausedRef.current
  }, [])

  // "Tap to join the audio" — the click handler IS the user gesture the
  // autoplay policy wants, so play() must run synchronously inside it
  // before the (re-entrant) sync seeks to the shared position.
  const handleUnlockAudio = useCallback(() => {
    userPausedRef.current = false
    autoplayBlockedSlice.set(false)
    playerRef.current?.play()
    lastSyncRef.current = 0
    syncToServer()
  }, [syncToServer])

  // ── Media Session: lock-screen metadata ─────────────────────────────
  // Prefer the explicit prop (room page); fall back to the room store's
  // current track, then to the player context's track — the store
  // covers the mini-player right after leaving a room, the context
  // covers it after its REST poll advances past what the departed
  // room's WebSocket last wrote to the store.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return
    if (typeof MediaMetadata === "undefined") return
    const ms = navigator.mediaSession
    const clearMetadata = () => {
      try {
        ms.metadata = null
      } catch {}
    }
    if (!track) {
      clearMetadata()
      return
    }
    let meta = mediaMetadata
    if (!meta) {
      const storeTrack = currentTrackSlice.get()
      if (storeTrack && storeTrack.id === track.id) {
        meta = { title: storeTrack.title, artist: storeTrack.artist }
      }
    }
    if (!meta && contextTrack && contextTrack.id === track.id) {
      meta = { title: contextTrack.title, artist: contextTrack.artist }
    }
    if (!meta) return
    try {
      ms.metadata = new MediaMetadata({
        title: meta.title || "Untitled",
        artist: meta.artist || "",
        artwork: meta.artworkUrl
          ? [{ src: meta.artworkUrl, sizes: "512x512" }]
          : [],
      })
    } catch {
      // Malformed artwork URL etc. — a blank media hub entry beats a crash.
    }
    // Teardown lives HERE, not in the transport-handler effect: that
    // effect re-runs when hasMediaNext flips (the DJ key resolves from
    // sessionStorage post-mount), and a metadata-nulling cleanup there
    // would wipe the lock screen while THIS effect — whose deps didn't
    // change — never re-sets it.
    return clearMetadata
  }, [track?.id, mediaMetadata?.title, mediaMetadata?.artist, mediaMetadata?.artworkUrl, contextTrack?.id, contextTrack?.title, contextTrack?.artist]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mirror the player state into the OS media hub so its play/pause
  // button reflects reality.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return
    try {
      navigator.mediaSession.playbackState =
        playerState === "playing" ? "playing" : "paused"
    } catch {}
  }, [playerState])

  // ── Media Session: transport handlers ───────────────────────────────
  // With handlers registered, hardware media keys and lock-screen
  // controls route here instead of poking the raw element — which is
  // what let the 10s re-sync loop silently un-pause users before.
  const hasMediaNext = !!onMediaNextTrack
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return
    const ms = navigator.mediaSession
    const trySet = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null
    ) => {
      try {
        ms.setActionHandler(action, handler)
      } catch {
        // Action not supported by this browser — fine to skip.
      }
    }

    trySet("play", () => {
      userPausedRef.current = false
      // Inside the media-key gesture — counts as user activation.
      playerRef.current?.play()
      if (onMediaPlayRef.current) {
        // DJ: resume the room; the playback_state broadcast re-syncs us.
        onMediaPlayRef.current()
      } else {
        // Listener: snap back to the room's shared position.
        lastSyncRef.current = 0
        syncToServerRef.current()
      }
      try {
        ms.playbackState = "playing"
      } catch {}
    })

    trySet("pause", () => {
      expectedPauseRef.current = Date.now()
      playerRef.current?.pause()
      if (onMediaPauseRef.current) {
        // DJ: pause the room for everyone — same semantics as the deck
        // button.
        onMediaPauseRef.current()
      } else {
        // Listener: remember the local pause so the re-sync loop honors
        // it instead of un-pausing within 10 seconds.
        userPausedRef.current = true
      }
      try {
        ms.playbackState = "paused"
      } catch {}
    })

    // nexttrack is DJ-only — registering it for listeners would put a
    // skip button they can't use on every lock screen.
    trySet("nexttrack", hasMediaNext ? () => onMediaNextTrackRef.current?.() : null)

    // Note: metadata teardown deliberately does NOT live here — this
    // effect re-runs on hasMediaNext flips, and nulling ms.metadata in
    // its cleanup would clobber what the metadata effect set.
    return () => {
      trySet("play", null)
      trySet("pause", null)
      trySet("nexttrack", null)
    }
  }, [hasMediaNext])

  if (!track) return null

  // "Tap to join the audio" gate — rendered whenever the autoplay
  // policy blocked playback. Portaled to document.body as a fixed
  // bottom-center card so the same gate covers every surface that
  // mounts the engine (room page AND mini-player) — the hidden
  // SoundCloud/mp3 players have no other manual escape hatch. Sits
  // above the mini-player bar (z-50) and the YouTube host (z-40).
  const unlockOverlay =
    autoplayBlocked && typeof document !== "undefined"
      ? createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
            style={{ bottom: "88px" }}
          >
            <button
              type="button"
              onClick={handleUnlockAudio}
              className="pointer-events-auto flex items-center gap-3 rounded-full py-2.5 pl-3.5 pr-6 text-left transition-transform hover:scale-[1.02]"
              style={{
                background: "#e89a3c",
                color: "#0d0b10",
                boxShadow:
                  "0 12px 32px rgba(0,0,0,0.55), 0 0 28px rgba(232,154,60,0.45)",
              }}
              aria-label="Tap to join the audio"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: "rgba(13,11,16,0.15)" }}
              >
                <Play className="h-4 w-4" fill="currentColor" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-bold leading-tight">
                  Tap to join the audio
                </span>
                <span
                  className="text-[11px] font-medium leading-tight"
                  style={{ color: "rgba(13,11,16,0.65)" }}
                >
                  Your browser paused autoplay
                </span>
              </span>
            </button>
          </div>,
          document.body
        )
      : null

  // Render the appropriate player
  let player: ReactNode = null
  switch (track.source) {
    case "youtube": {
      if (!track.videoId) break
      // The YouTubePlayer ALWAYS portals into the stable ytHost div
      // (see the top of the component for how that host is created).
      // Changing the position of the visible video only changes the
      // host's CSS — the React tree position of the YouTubePlayer is
      // constant, which is what keeps the YT.Player instance alive
      // across inlineTarget transitions.
      if (!ytHost) break
      player = createPortal(
        <YouTubePlayer
          ref={playerRef}
          videoId={track.videoId}
          shouldAutoplay={shouldAutoplay}
          onReady={handleReady}
          onStateChange={handleStateChange}
          onDuration={onDuration}
          onTimeUpdate={onTimeUpdate}
          onAdStateChange={handleAdStateChange}
        />,
        ytHost
      )
      break
    }

    case "soundcloud":
      // SoundCloud: always hidden iframe — Jukebox controls handle UI
      player = (
        <SoundCloudPlayer
          ref={playerRef}
          trackUrl={track.sourceUrl}
          shouldAutoplay={shouldAutoplay}
          onReady={handleReady}
          onStateChange={handleStateChange}
          onDuration={onDuration}
          onTimeUpdate={onTimeUpdate}
          onArtwork={onArtwork}
        />
      )
      break

    case "mp3":
      player = (
        <HTML5AudioPlayer
          ref={playerRef}
          src={track.sourceUrl}
          onReady={handleReady}
          onStateChange={handleStateChange}
          onDuration={onDuration}
          onTimeUpdate={onTimeUpdate}
          onPlayBlocked={handlePlayBlocked}
        />
      )
      break
  }

  return (
    <>
      {player}
      {unlockOverlay}
    </>
  )
}
