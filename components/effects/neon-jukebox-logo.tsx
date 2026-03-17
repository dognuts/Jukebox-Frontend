'use client'

import { useEffect, useRef } from 'react'

interface NeonJukeboxLogoProps {
  size?: 'sm' | 'md' | 'lg'
}

// Color A: warm orange (existing)
const COLOR_A = { r: 255, g: 106, b: 26 }
// Color B: blue at 0.35 "intensity" — we'll treat 0.35 as a brightness scale
const COLOR_B = { r: 0, g: 149, b: 229 }

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}

export function NeonJukeboxLogo({ size = 'lg' }: NeonJukeboxLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!containerRef.current) return

    const letterGroups = new Map<number, HTMLElement[]>()

    // Collect all letter elements
    containerRef.current.querySelectorAll('.letter').forEach((el) => {
      const i = Number((el as HTMLElement).dataset.i)
      if (!letterGroups.has(i)) letterGroups.set(i, [])
      letterGroups.get(i)!.push(el as HTMLElement)
    })

    function setLetterBrightness(i: number, v: number) {
      const opacity = 0.18 + 0.82 * v
      const els = letterGroups.get(i) || []
      for (const el of els) {
        el.style.opacity = opacity.toFixed(3)
      }
    }

    // Initialize steady on
    for (let i = 0; i < 7; i++) setLetterBrightness(i, 1)

    // Flicker patterns: sequences of [brightness, ms]
    const patterns = [
      [[0.55, 70], [1.0, 240]],
      [[0.35, 50], [1.0, 120], [0.65, 80], [1.0, 440]],
      [[0.2, 110], [0.55, 180], [1.0, 800]],
      [[0.75, 60], [1.0, 180]],
    ] as const

    function runPattern(i: number, pattern: readonly (readonly [number, number])[]) {
      let t = 0
      for (const [v, ms] of pattern) {
        setTimeout(() => setLetterBrightness(i, v), t)
        t += ms
      }
      setTimeout(() => setLetterBrightness(i, 1), t)
    }

    // Schedule per-letter flickers at random intervals
    function scheduleLetter(i: number): void {
      const nextIn = 440 + Math.random() * 2800
      setTimeout(() => {
        const r = Math.random()
        if (r < 0.62) {
          runPattern(i, patterns[0])
        } else if (r < 0.86) {
          runPattern(i, patterns[1])
        } else if (r < 0.95) {
          runPattern(i, patterns[3])
        } else {
          runPattern(i, patterns[2])
        }
        scheduleLetter(i)
      }, nextIn)
    }

    for (let i = 0; i < 7; i++) scheduleLetter(i)

    // Rare whole-sign "hum dip"
    function globalDip(): void {
      const nextIn = 5000 + Math.random() * 14000
      setTimeout(() => {
        if (Math.random() < 0.65) {
          for (let i = 0; i < 7; i++) setLetterBrightness(i, 0.88)
          setTimeout(() => {
            for (let i = 0; i < 7; i++) setLetterBrightness(i, 1)
          }, 90 + Math.random() * 90)
        }
        globalDip()
      }, nextIn)
    }
    globalDip()

    // --- Color cycle via rAF ---
    // Cycle period: ~30 seconds. t oscillates 0→1→0 using a sine wave.
    const CYCLE_MS = 30000
    let rafId: number
    if (startTimeRef.current === 0) {
      startTimeRef.current = performance.now()
    }
    const startTime = startTimeRef.current

    function applyColor(t: number) {
      const svg = svgRef.current
      if (!svg) return

      // t = 0 → full orange, t = 1 → blue at 0.35 brightness
      const r = lerp(COLOR_A.r, COLOR_B.r, t)
      const g = lerp(COLOR_A.g, COLOR_B.g, t)
      const b = lerp(COLOR_A.b, COLOR_B.b, t)

      // outer: full color, low alpha
      const outerAlpha = lerp(Math.round(0.18 * 255), Math.round(0.35 * 255), t) / 255

      const outerEls = svg.querySelectorAll<SVGTextElement>('.outer')
      outerEls.forEach((el) => {
        el.style.stroke = `rgb(${r},${g},${b})`
        el.style.opacity = outerAlpha.toFixed(3)
        el.style.filter = `drop-shadow(0 0 10px rgba(${r},${g},${b},0.22)) drop-shadow(0 0 30px rgba(${r},${g},${b},0.22))`
      })

      const mainEls = svg.querySelectorAll<SVGTextElement>('.main')
      mainEls.forEach((el) => {
        el.style.stroke = `rgb(${r},${g},${b})`
        el.style.filter = `drop-shadow(0 0 10px rgba(${r},${g},${b},0.55)) drop-shadow(0 0 22px rgba(${r},${g},${b},0.35))`
      })

      // core: bright highlight — stays light but tints toward blue-white
      const coreR = lerp(255, 210, t)
      const coreG = lerp(235, 235, t)
      const coreB = lerp(210, 255, t)
      const coreEls = svg.querySelectorAll<SVGTextElement>('.core')
      coreEls.forEach((el) => {
        el.style.stroke = `rgba(${coreR},${coreG},${coreB},0.85)`
        el.style.filter = `drop-shadow(0 0 12px rgba(${coreR},${coreG},${coreB},0.55))`
      })
    }

    function tick(now: number) {
      const elapsed = (now - startTime) % CYCLE_MS
      // sine wave: 0 → 1 → 0 over CYCLE_MS
      const t = (1 - Math.cos((elapsed / CYCLE_MS) * 2 * Math.PI)) / 2
      applyColor(t)
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [])

  const sizeClass = size === 'sm' ? 'h-8 w-auto' : size === 'md' ? 'h-12 w-auto' : 'h-16 w-auto'

  return (
    <div
      ref={containerRef}
      className={`${sizeClass} inline-flex items-center justify-center`}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 1200 260"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="JUKEBOX neon wordmark"
        className="h-full w-auto"
      >
        <defs>
          <style>{`
            .tube {
              fill: none;
              stroke-linecap: round;
              stroke-linejoin: round;
              paint-order: stroke;
            }
            .outer {
              stroke: rgb(255, 106, 26);
              stroke-width: 30;
              opacity: 0.18;
              filter: drop-shadow(0 0 10px rgba(255, 106, 26, 0.22)) drop-shadow(0 0 30px rgba(255,106,26,0.22));
            }
            .main {
              stroke: rgb(255, 106, 26);
              stroke-width: 18;
              opacity: 1;
              filter: drop-shadow(0 0 10px rgba(255,106,26,0.55)) drop-shadow(0 0 22px rgba(255,106,26,0.35));
            }
            .core {
              stroke: rgba(255, 235, 210, 0.85);
              stroke-width: 6;
              opacity: 0.9;
              filter: drop-shadow(0 0 12px rgba(255, 245, 235, 0.55));
              mix-blend-mode: screen;
            }
            .trail {
              stroke: rgba(255,255,255,0.92);
              stroke-width: 4;
              stroke-linecap: round;
              stroke-dasharray: 90 760;
              animation: dash 2.0s linear infinite;
              filter: drop-shadow(0 0 14px rgba(255,255,255,0.65));
              opacity: 0.55;
              mix-blend-mode: screen;
            }
            @keyframes dash { to { stroke-dashoffset: -850; } }
            .letter { transition: opacity 80ms linear; }
          `}</style>
        </defs>
        <g>
          {/* OUTER GLOW */}
          <text
            x="600"
            y="170"
            textAnchor="middle"
            style={{
              font: '900 150px "Arial Black", Impact, system-ui',
              letterSpacing: '16px',
            }}
            className="tube outer"
          >
            <tspan className="letter" data-i="0">
              J
            </tspan>
            <tspan className="letter" data-i="1">
              U
            </tspan>
            <tspan className="letter" data-i="2">
              K
            </tspan>
            <tspan className="letter" data-i="3">
              E
            </tspan>
            <tspan className="letter" data-i="4">
              B
            </tspan>
            <tspan className="letter" data-i="5">
              O
            </tspan>
            <tspan className="letter" data-i="6">
              X
            </tspan>
          </text>

          {/* MAIN TUBE */}
          <text
            x="600"
            y="170"
            textAnchor="middle"
            style={{
              font: '900 150px "Arial Black", Impact, system-ui',
              letterSpacing: '16px',
            }}
            className="tube main"
          >
            <tspan className="letter" data-i="0">
              J
            </tspan>
            <tspan className="letter" data-i="1">
              U
            </tspan>
            <tspan className="letter" data-i="2">
              K
            </tspan>
            <tspan className="letter" data-i="3">
              E
            </tspan>
            <tspan className="letter" data-i="4">
              B
            </tspan>
            <tspan className="letter" data-i="5">
              O
            </tspan>
            <tspan className="letter" data-i="6">
              X
            </tspan>
          </text>

          {/* LIGHT TRAIL */}
          <text
            x="600"
            y="170"
            textAnchor="middle"
            style={{
              font: '900 150px "Arial Black", Impact, system-ui',
              letterSpacing: '16px',
            }}
            className="tube trail"
          >
            <tspan className="letter" data-i="0">
              J
            </tspan>
            <tspan className="letter" data-i="1">
              U
            </tspan>
            <tspan className="letter" data-i="2">
              K
            </tspan>
            <tspan className="letter" data-i="3">
              E
            </tspan>
            <tspan className="letter" data-i="4">
              B
            </tspan>
            <tspan className="letter" data-i="5">
              O
            </tspan>
            <tspan className="letter" data-i="6">
              X
            </tspan>
          </text>

          {/* GLASS CORE */}
          <text
            x="600"
            y="170"
            textAnchor="middle"
            style={{
              font: '900 150px "Arial Black", Impact, system-ui',
              letterSpacing: '16px',
            }}
            className="tube core"
          >
            <tspan className="letter" data-i="0">
              J
            </tspan>
            <tspan className="letter" data-i="1">
              U
            </tspan>
            <tspan className="letter" data-i="2">
              K
            </tspan>
            <tspan className="letter" data-i="3">
              E
            </tspan>
            <tspan className="letter" data-i="4">
              B
            </tspan>
            <tspan className="letter" data-i="5">
              O
            </tspan>
            <tspan className="letter" data-i="6">
              X
            </tspan>
          </text>
        </g>
      </svg>
    </div>
  )
}
