/**
 * Deterministic BPM estimator — no AI / network calls.
 *
 * Uses genre base ranges, then adjusts with keyword signals found in
 * the track title and artist name.  A seeded hash adds natural-feeling
 * variation so every track gets a slightly different number.
 */

// ── Genre base BPM ranges ───────────────────────────────────────────
const genreRanges: Record<string, [number, number]> = {
  // Slow
  "lo-fi":        [70, 90],
  ambient:        [60, 80],
  classical:      [65, 85],
  soul:           [68, 88],
  r_b:            [70, 92],
  reggae:         [72, 88],

  // Moderate
  jazz:           [88, 128],
  hip_hop:        [80, 115],
  pop:            [100, 130],
  rock:           [110, 140],
  indie:          [100, 130],
  funk:           [100, 125],
  latin:          [95, 130],
  country:        [100, 125],
  blues:          [75, 110],
  metal:          [120, 160],

  // Fast
  electronic:     [120, 150],
  house:          [120, 130],
  techno:         [125, 145],
  trance:         [130, 150],
  "drum & bass":  [160, 180],
  dnb:            [160, 180],
  dubstep:        [138, 142],
  edm:            [126, 150],
  disco:          [115, 130],
  punk:           [150, 180],
}

// ── Keyword modifiers (applied additively) ──────────────────────────
const keywordMods: [RegExp, number][] = [
  [/\bslow\b/i,      -15],
  [/\bchill\b/i,      -12],
  [/\brelax/i,        -10],
  [/\bmellow\b/i,     -10],
  [/\bdream/i,         -8],
  [/\brainy\b/i,       -8],
  [/\bballad\b/i,     -12],
  [/\bacoustic\b/i,    -8],
  [/\blate\s*night/i,  -6],
  [/\bgroov/i,          5],
  [/\bbounce\b/i,       8],
  [/\bfast\b/i,        12],
  [/\benerg/i,         10],
  [/\bfire\b/i,         8],
  [/\bhype\b/i,        10],
  [/\bparty\b/i,        8],
  [/\bclub\b/i,         6],
  [/\brush\b/i,        10],
  [/\blive\b/i,         4],
  [/\bremix\b/i,        6],
  [/\bextended\b/i,     3],
  [/\bepic\b/i,         5],
]

// ── Simple string → deterministic number hash ───────────────────────
function simpleHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

// ── Confidence heuristic ────────────────────────────────────────────
function confidence(genreMatch: boolean, keywordsHit: number): "low" | "medium" | "high" {
  if (genreMatch && keywordsHit >= 1) return "high"
  if (genreMatch) return "medium"
  return "low"
}

// ── Public API ──────────────────────────────────────────────────────
export function estimateBpm(
  title: string,
  artist: string,
  genre: string,
): { bpm: number; confidence: "low" | "medium" | "high" } {
  // Normalise genre key
  const gKey = genre.toLowerCase().replace(/[^a-z0-9&]/g, "_").replace(/_+/g, "_")

  // Find best matching range
  let range: [number, number] | null = null
  for (const [key, r] of Object.entries(genreRanges)) {
    if (gKey.includes(key) || key.includes(gKey)) {
      range = r
      break
    }
  }
  const [lo, hi] = range ?? [100, 130] // fallback

  // Seed a pseudo-random offset from track identity
  const seed = simpleHash(`${title}::${artist}`)
  const baseOffset = seed % (hi - lo + 1)
  let bpm = lo + baseOffset

  // Apply keyword modifiers
  const combined = `${title} ${artist}`
  let hits = 0
  for (const [re, mod] of keywordMods) {
    if (re.test(combined)) {
      bpm += mod
      hits++
    }
  }

  // Clamp to reasonable range
  bpm = Math.max(55, Math.min(200, Math.round(bpm)))

  return { bpm, confidence: confidence(range !== null, hits) }
}
