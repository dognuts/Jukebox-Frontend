"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export interface MicDevice {
  deviceId: string
  label: string
}

interface UseMicrophoneReturn {
  devices: MicDevice[]
  selectedDeviceId: string | null
  selectDevice: (deviceId: string) => void
  isCapturing: boolean
  start: () => Promise<boolean>
  stop: () => void
  error: string | null
  stream: MediaStream | null
  refreshDevices: () => Promise<void>
}

export function useMicrophone(): UseMicrophoneReturn {
  const [devices, setDevices] = useState<MicDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const refreshDevices = useCallback(async () => {
    try {
      // Need at least one getUserMedia call before enumerateDevices shows labels
      // Try to get a temporary stream to trigger permission prompt
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      tempStream.getTracks().forEach((t) => t.stop())

      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = allDevices
        .filter((d) => d.kind === "audioinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${i + 1}`,
        }))

      setDevices(audioInputs)
      setError(null)

      // Auto-select first device if none selected, or restore previous selection
      if (audioInputs.length > 0) {
        const savedId = typeof window !== "undefined"
          ? localStorage.getItem("jukebox_mic_device")
          : null
        const savedExists = savedId && audioInputs.some((d) => d.deviceId === savedId)
        if (savedExists) {
          setSelectedDeviceId(savedId)
        } else if (!selectedDeviceId || !audioInputs.some((d) => d.deviceId === selectedDeviceId)) {
          setSelectedDeviceId(audioInputs[0].deviceId)
        }
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Microphone access denied. Please allow microphone access in your browser settings.")
      } else if (err.name === "NotFoundError") {
        setError("No microphone found on this device.")
      } else {
        setError(err.message || "Failed to access microphone.")
      }
    }
  }, [selectedDeviceId])

  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId)
    if (typeof window !== "undefined") {
      localStorage.setItem("jukebox_mic_device", deviceId)
    }
  }, [])

  const start = useCallback(async (): Promise<boolean> => {
    setError(null)

    // Ensure we have devices listed
    if (devices.length === 0) {
      await refreshDevices()
    }

    const deviceId = selectedDeviceId || undefined
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId
          ? { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          : { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })

      streamRef.current = stream
      setIsCapturing(true)
      return true
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Microphone access denied.")
      } else if (err.name === "NotFoundError" || err.name === "OverconstrainedError") {
        setError("Selected microphone not available. Try a different device.")
      } else {
        setError(err.message || "Failed to start microphone.")
      }
      return false
    }
  }, [devices.length, selectedDeviceId, refreshDevices])

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCapturing(false)
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return {
    devices,
    selectedDeviceId,
    selectDevice,
    isCapturing,
    start,
    stop,
    error,
    stream: streamRef.current,
    refreshDevices,
  }
}
