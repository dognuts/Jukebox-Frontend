'use client'

import { useEffect, useRef } from 'react'

interface NeonJukeboxLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  // When true, skip the per-letter flicker scheduling and color-cycle
  // rAF loop. The logo renders static. Use on pages where the logo is
  // decorative rather than the main focal point (e.g., the room view)
  // to free up the main thread for interactive work.
  staticRender?: boolean
}

// Color A: warm orange (existing)
const COLOR_A = { r: 255, g: 106, b: 26 }
// Color B: blue at 0.35 "intensity" — we'll treat 0.35 as a brightness scale
const COLOR_B = { r: 0, g: 149, b: 229 }

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}

export function NeonJukeboxLogo({ size = 'lg', staticRender = false }: NeonJukeboxLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    if (staticRender) return
    if (!containerRef.current) return

    // Mobile Firefox/Chrome re-rasterize SVG drop-shadow filters every time
    // the underlying pixels change, and the per-letter opacity flicker fires
    // that repaint for the entire wordmark — causing a visible whole-logo
    // flash on top of the intended per-letter flicker. Skip the JS-driven
    // filter/color updates on mobile; the CSS media query in <style> below
    // also drops the drop-shadow filter there, so mobile renders a static
    // neon with only the per-letter flicker.
    const isDesktop = typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : true

    const letterGroups = new Map<number, HTMLElement[]>()

    // Collect all letter elements
    containerRef.current.querySelectorAll('.letter').forEach((el) => {
      const i = Number((el as HTMLElement).dataset.i)
      if (!letterGroups.has(i)) letterGroups.set(i, [])
      letterGroups.get(i)!.push(el as HTMLElement)
    })

    // Track every pending timeout so the flicker/dip scheduling chains stop
    // on unmount instead of re-arming themselves forever against detached
    // DOM nodes.
    const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>()
    function schedule(fn: () => void, ms: number) {
      const id = setTimeout(() => {
        pendingTimeouts.delete(id)
        fn()
      }, ms)
      pendingTimeouts.add(id)
    }
    function clearPendingTimeouts() {
      for (const id of pendingTimeouts) clearTimeout(id)
      pendingTimeouts.clear()
    }

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
        schedule(() => setLetterBrightness(i, v), t)
        t += ms
      }
      schedule(() => setLetterBrightness(i, 1), t)
    }

    // Schedule per-letter flickers at random intervals
    function scheduleLetter(i: number): void {
      const nextIn = 440 + Math.random() * 2800
      schedule(() => {
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

    // Rare whole-sign "hum dip" — desktop only. Dimming all 7 letters at
    // once on mobile would force the drop-shadow filter to re-rasterize
    // and the cost would show up as a visible flash.
    function globalDip(): void {
      const nextIn = 5000 + Math.random() * 14000
      schedule(() => {
        if (Math.random() < 0.65) {
          for (let i = 0; i < 7; i++) setLetterBrightness(i, 0.88)
          schedule(() => {
            for (let i = 0; i < 7; i++) setLetterBrightness(i, 1)
          }, 90 + Math.random() * 90)
        }
        globalDip()
      }, nextIn)
    }
    if (isDesktop) globalDip()

    // --- Color cycle ---
    // Skip entirely on mobile — the warm orange base colors from the CSS
    // definitions are the final look there. This avoids rewriting .filter
    // on every tick, which is the primary source of the mobile flicker.
    if (!isDesktop) {
      return clearPendingTimeouts
    }
    // Cycle period: ~30 seconds. t oscillates 0→1→0 using a sine wave.
    const CYCLE_MS = 30000
    if (startTimeRef.current === 0) {
      startTimeRef.current = performance.now()
    }
    const startTime = startTimeRef.current

    // Cache SVG element selections
    const svg = svgRef.current
    const cachedOuter = svg ? Array.from(svg.querySelectorAll<SVGTextElement>('.outer')) : []
    const cachedMain = svg ? Array.from(svg.querySelectorAll<SVGTextElement>('.main')) : []
    const cachedCore = svg ? Array.from(svg.querySelectorAll<SVGTextElement>('.core')) : []

    function applyColor(t: number) {
      if (!svg) return

      const r = lerp(COLOR_A.r, COLOR_B.r, t)
      const g = lerp(COLOR_A.g, COLOR_B.g, t)
      const b = lerp(COLOR_A.b, COLOR_B.b, t)

      const outerAlpha = lerp(Math.round(0.18 * 255), Math.round(0.35 * 255), t) / 255

      for (const el of cachedOuter) {
        el.style.stroke = `rgb(${r},${g},${b})`
        el.style.opacity = outerAlpha.toFixed(3)
        el.style.filter = `drop-shadow(0 0 10px rgba(${r},${g},${b},0.22)) drop-shadow(0 0 30px rgba(${r},${g},${b},0.22))`
      }

      for (const el of cachedMain) {
        el.style.stroke = `rgb(${r},${g},${b})`
        el.style.filter = `drop-shadow(0 0 10px rgba(${r},${g},${b},0.55)) drop-shadow(0 0 22px rgba(${r},${g},${b},0.35))`
      }

      const coreR = lerp(255, 210, t)
      const coreG = lerp(235, 235, t)
      const coreB = lerp(210, 255, t)
      for (const el of cachedCore) {
        el.style.stroke = `rgba(${coreR},${coreG},${coreB},0.85)`
        el.style.filter = `drop-shadow(0 0 12px rgba(${coreR},${coreG},${coreB},0.55))`
      }
    }

    // Rewriting the drop-shadow filter strings forces the SVG glow stack to
    // re-rasterize, so tick as rarely as possible: the crossfade runs over
    // 30s, so 1 update/sec keeps the steps imperceptible while cutting the
    // raster work 10x versus the old ~10fps rAF loop.
    const COLOR_TICK_MS = 1000

    function tick() {
      const elapsed = (performance.now() - startTime) % CYCLE_MS
      // sine wave: 0 → 1 → 0 over CYCLE_MS
      const t = (1 - Math.cos((elapsed / CYCLE_MS) * 2 * Math.PI)) / 2
      applyColor(t)
    }

    let colorInterval: ReturnType<typeof setInterval> | null = null

    function startColorLoop() {
      if (colorInterval) return
      tick()
      colorInterval = setInterval(tick, COLOR_TICK_MS)
    }
    function stopColorLoop() {
      if (colorInterval) {
        clearInterval(colorInterval)
        colorInterval = null
      }
    }

    startColorLoop()

    // Pause entirely while the tab is hidden.
    const handleVisibility = () => {
      if (document.hidden) {
        stopColorLoop()
      } else {
        startColorLoop()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      stopColorLoop()
      clearPendingTimeouts()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [staticRender])

  const sizeClass =
    size === 'xs'
      ? 'h-7 w-auto'
      : size === 'sm'
      ? 'h-10 w-auto'
      : size === 'md'
      ? 'h-12 w-auto'
      : 'h-16 w-auto'

  return (
    <div
      ref={containerRef}
      className={`${sizeClass} inline-flex items-center justify-center`}
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 1200 260"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="JUKEBOX neon wordmark"
        className="h-full w-auto"
        style={{ contain: 'layout style paint' }}
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
            /* Mobile: drop the drop-shadow filter and mix-blend-mode so
               per-letter opacity changes don't force the entire wordmark's
               filter/blend layer to re-rasterize. The layered strokes
               still provide the neon look. */
            @media (max-width: 767px) {
              .outer, .main, .core, .trail { filter: none !important; }
              .core, .trail { mix-blend-mode: normal !important; }
            }
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
