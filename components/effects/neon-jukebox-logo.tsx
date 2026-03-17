'use client'

import { useEffect, useRef } from 'react'

interface NeonJukeboxLogoProps {
  size?: 'sm' | 'lg'
}

export function NeonJukeboxLogo({ size = 'lg' }: NeonJukeboxLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null)

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
      [[0.55, 35], [1.0, 120]],
      [[0.35, 25], [1.0, 60], [0.65, 40], [1.0, 220]],
      [[0.2, 55], [0.55, 90], [1.0, 400]],
      [[0.75, 30], [1.0, 90]],
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
      const nextIn = 220 + Math.random() * 1400
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
  }, [])

  const sizeClass = size === 'sm' ? 'h-8 w-auto' : 'h-12 w-auto'

  return (
    <div
      ref={containerRef}
      className={`${sizeClass} inline-flex items-center justify-center`}
    >
      <svg
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
