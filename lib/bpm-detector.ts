/**
 * Real-time BPM detection using Web Audio API.
 *
 * Works by analyzing audio frequency data for energy spikes (onsets)
 * in the low-frequency range (kick drums, bass), then calculating
 * the average interval between detected beats.
 *
 * This only works with HTML5 <audio> elements where we can create
 * a MediaElementSource. For YouTube/SoundCloud iframes, use the
 * lookup-based approach instead.
 */

export class BPMDetector {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaElementAudioSourceNode | null = null
  private rafId: number = 0
  private beatTimes: number[] = []
  private lastEnergy = 0
  private energyHistory: number[] = []
  private onBPMUpdate: ((bpm: number) => void) | null = null
  private connected = false

  /**
   * Connect to an HTML5 audio element and start detecting BPM.
   */
  attach(audioElement: HTMLAudioElement, onBPMUpdate: (bpm: number) => void) {
    this.onBPMUpdate = onBPMUpdate

    // Don't reconnect if already connected to this element
    if (this.connected) return

    try {
      this.audioContext = new AudioContext()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 1024
      this.analyser.smoothingTimeConstant = 0.3

      this.source = this.audioContext.createMediaElementSource(audioElement)
      this.source.connect(this.analyser)
      this.analyser.connect(this.audioContext.destination)

      this.connected = true
      this.beatTimes = []
      this.energyHistory = []
      this.lastEnergy = 0

      this.detect()
    } catch (err) {
      console.warn("[bpm] failed to attach:", err)
    }
  }

  private detect = () => {
    if (!this.analyser) return

    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyser.getByteFrequencyData(dataArray)

    // Focus on low frequencies (bass/kick drum range: ~60-150Hz)
    // With 1024 FFT size and 44100 sample rate, each bin ≈ 43Hz
    // Bins 1-4 cover roughly 43-172Hz
    let energy = 0
    const lowBins = Math.min(6, bufferLength)
    for (let i = 1; i < lowBins; i++) {
      energy += dataArray[i]
    }
    energy /= (lowBins - 1)

    // Keep a rolling history for dynamic threshold
    this.energyHistory.push(energy)
    if (this.energyHistory.length > 60) {
      this.energyHistory.shift()
    }

    // Calculate average and variance for adaptive threshold
    const avg = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length
    const variance = this.energyHistory.reduce((a, b) => a + (b - avg) ** 2, 0) / this.energyHistory.length
    const stdDev = Math.sqrt(variance)

    // Beat detected when energy spikes above threshold
    const threshold = avg + Math.max(stdDev * 1.2, 15)
    const now = performance.now()

    if (energy > threshold && energy > this.lastEnergy * 1.15 && energy > 20) {
      // Debounce: minimum 200ms between beats (max 300 BPM)
      const lastBeat = this.beatTimes[this.beatTimes.length - 1] || 0
      if (now - lastBeat > 200) {
        this.beatTimes.push(now)

        // Keep last 30 seconds of beats
        const cutoff = now - 30000
        this.beatTimes = this.beatTimes.filter((t) => t > cutoff)

        // Calculate BPM from intervals (need at least 4 beats)
        if (this.beatTimes.length >= 4) {
          const intervals: number[] = []
          for (let i = 1; i < this.beatTimes.length; i++) {
            intervals.push(this.beatTimes[i] - this.beatTimes[i - 1])
          }

          // Remove outliers (intervals that are too far from median)
          intervals.sort((a, b) => a - b)
          const median = intervals[Math.floor(intervals.length / 2)]
          const filtered = intervals.filter(
            (iv) => iv > median * 0.6 && iv < median * 1.6
          )

          if (filtered.length >= 3) {
            const avgInterval = filtered.reduce((a, b) => a + b, 0) / filtered.length
            let bpm = Math.round(60000 / avgInterval)

            // Normalize to common BPM range (60-200)
            // If we're detecting half-time or double-time, adjust
            while (bpm > 200) bpm = Math.round(bpm / 2)
            while (bpm < 60) bpm = Math.round(bpm * 2)

            this.onBPMUpdate?.(bpm)
          }
        }
      }
    }

    this.lastEnergy = energy

    this.rafId = requestAnimationFrame(this.detect)
  }

  detach() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }

    try {
      this.source?.disconnect()
      this.analyser?.disconnect()
      this.audioContext?.close()
    } catch {
      // ignore cleanup errors
    }

    this.source = null
    this.analyser = null
    this.audioContext = null
    this.connected = false
    this.beatTimes = []
    this.energyHistory = []
    this.onBPMUpdate = null
  }
}

/**
 * Manual tap-tempo BPM calculator.
 * Users tap along with the beat and we calculate BPM from tap intervals.
 * Can also be used programmatically with onset timestamps.
 */
export class TapTempo {
  private taps: number[] = []
  private timeout: ReturnType<typeof setTimeout> | null = null

  tap(): number | null {
    const now = performance.now()

    // Reset if more than 3 seconds since last tap
    if (this.taps.length > 0 && now - this.taps[this.taps.length - 1] > 3000) {
      this.taps = []
    }

    this.taps.push(now)

    // Keep last 12 taps
    if (this.taps.length > 12) {
      this.taps.shift()
    }

    if (this.taps.length < 3) return null

    // Calculate average interval
    const intervals: number[] = []
    for (let i = 1; i < this.taps.length; i++) {
      intervals.push(this.taps[i] - this.taps[i - 1])
    }
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
    return Math.round(60000 / avg)
  }

  reset() {
    this.taps = []
  }
}
