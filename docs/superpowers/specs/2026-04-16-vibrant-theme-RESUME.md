# Vibrant Theme — Resume Notes

**Status:** Design iteration in progress. More visual revisions needed before implementation.
**Last session:** 2026-04-16
**Next step:** Continue iterating on the Vibrant visual treatment using the v7 mockup as starting point.

## Quick resume — where to look first

1. **Latest mockup (live HTML preview):**
   `Jukebox-Frontend/docs/superpowers/mockups/2026-04-16-vibrant-theme-mockup-v7.html`
   Open in any browser. Has a working DARK / VIBRANT toggle to compare both modes.

2. **Design spec:**
   `Jukebox-Frontend/docs/superpowers/specs/2026-04-16-vibrant-theme-design.md`
   Architecture and component list are final. Visual details need one more pass before implementation — the spec reflects earlier v5 details; v7 has refinements not yet captured there (see "Refinements since the spec" below).

3. **Reference image the user is targeting:**
   `C:/Users/eiptu/Documents/Jukebox/Reference1.png`
   Every visual decision should be checked against this.

## Decisions locked in

- **Toggle**: segmented `DARK | VIBRANT` pill in the navbar, inserted before `<UserMenu />`
- **Theme system**: `next-themes` (already installed) with `attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`, `storageKey="jukebox-theme"`
- **Dark mode**: untouched — visually identical to current site
- **Layout**: unchanged in Vibrant — same components, same hierarchy, same content. Vibrant adds only visual treatment + the decorative neon arch overlay.
- **Palette**: Miami Neon — locked.
  - `#00E5FF` cyan, `#FF2BD6` pink, `#8B5CF6` violet, `#FF6A1A` sunset (rare LIVE accent), `#FFB84D` amber (DJ names / warm accents)
  - Base: `#05060A` ink, `#070B18` deep navy, `#0B1026` purple-wash
  - LIVE-dot color: actually `#FF3366` red/crimson (not sunset) — matches reference
- **Architecture** (from the spec):
  - New components: `theme-toggle.tsx`, `neon-arch.tsx`
  - Modified: `app/layout.tsx`, `theme-provider.tsx`, `navbar.tsx`, `home-hero.tsx`, `featured-room-card.tsx`, `room-card.tsx`, `live-room-grid.tsx`, `activity-feed.tsx`, `footer.tsx`, `globals.css`

## Refinements since the spec was written (apply these when implementing)

These details emerged during mockup iteration v5 → v7 and should supersede the spec's visual section:

### Background (body, Vibrant only)
- **Nebula is NOT a flat gradient**. Use a stack:
  1. Base: radial-gradient in purple-navy to ink black
  2. Layered aurora: 5 radial washes in pink (lower-left dense), cyan (upper-right, lower-right), violet (center-lower)
  3. **Mid-frequency SVG turbulence** (`feTurbulence baseFrequency="0.004 0.006" numOctaves="5"`, color-matrix pink + cyan, blur 1.5, blend `screen`, masked radially around the aurora hotspots) for volumetric cloud structure
  4. **High-frequency SVG turbulence** (`baseFrequency="0.035 0.055" numOctaves="4"`, `soft-light` blend) for wispy filaments
- **Star field** in 3 layers:
  - Faint (30 dots, r=0.25–0.3, opacity 0.28–0.4)
  - Medium (20 dots, r=0.55–0.7, opacity 0.6–0.75)
  - Bright (10 dots, r=1.1–1.5, Gaussian-blurred, with optional diffraction cross rects)
- Grain overlay at 5% opacity, `mix-blend-mode: overlay`
- All layers are `position: fixed` so they don't scroll-reflow

### Tube illumination layer (key insight)
- A separate blurred radial bloom positioned *behind the arch area* that visibly **lights up the surrounding background** — cyan + pink + violet radial gradients, `mix-blend-mode: screen`, `filter: blur(14px)`
- This is what makes the tubes feel like real light sources illuminating the nebula around them

### Main arch (NeonArch component)
- **Positioned outside `.shell`** — use `position: absolute; left: 3vw; right: 3vw; top: 80px; height: 620px` so the arch extends beyond the content column and past the FeaturedRoomCard width
- **Flatter ellipse shape** via `border-radius: 50% 50% 0 0 / 80% 80% 0 0` (not a pure semicircle)
- **Tight tube spacing** — inner tube inset by only 10px from outer (v5 had 22px, too wide)
- **Thinner tubes** — 3.5px outer + 3px inner (v5 had 4px+3px, felt chunky)
- **Sharper glow stack** — remove the 120px wide violet halo from v5 (it blurred the tube). Use:
  ```
  inset 0 0 3px rgba(255,255,255,0.9),       /* glass core */
  inset 0 0 9px <color 0.7>,                 /* inner tube glow */
  0 0 3px <color 1>,                         /* tight outer line */
  0 0 9px <color 0.95>,                      /* immediate outer */
  0 0 18px <color 0.7>,                      /* medium halo */
  0 0 34px <color 0.4>,                      /* soft halo */
  0 0 60px <color 0.18>                      /* final falloff */
  ```
- **Horizontal "feet"** at the base of each leg (4 elements: outer-left, outer-right, inner-left, inner-right) — small 18×3.5px bars for outer pink, 14×3px bars for inner cyan, each with matching tight glow. Matches the classic jukebox arch termination in the reference.
- **Bottom mask** `linear-gradient(180deg, #000 0%, #000 88%, transparent 100%)` — tubes fade only at the very end, stay crisp for most of the leg
- **Thin inner specular** via `::before` on each tube: `border: 0.5px solid rgba(255,255,255,0.7)` masked to only show in the top 30–65% — gives the glass sheen

### Room cards (Vibrant only — Dark stays chrome jukebox)
- **Replace the chrome gradient border entirely with a neon tube outline**:
  ```
  border: 2px solid <color>;
  border-radius: 14px;
  background: rgba(5, 6, 17, 0.85);
  box-shadow:
    inset 0 0 3px rgba(255,255,255,0.6),    /* inner glass core */
    inset 0 0 10px <color 0.25>,            /* subtle interior wash */
    0 0 3px <color 1>,                      /* crisp tube core */
    0 0 10px <color 0.75>,                  /* immediate glow */
    0 0 22px <color 0.4>,                   /* halo */
    0 0 50px <color 0.18>;                  /* bloom onto nebula */
  ```
- **Card colors**: 1st and 3rd cards get cyan (`#00E5FF`); 2nd (middle/featured) gets pink (`#FF2BD6`) with slightly stronger bloom to stand out
- **Hide the chrome jukebox top trim + bottom neon strip** in Vibrant (the neon-tube border IS the frame). Dark mode keeps them.
- **Hover state**: boost the glow ~40% (add ~4px to each shadow layer)

### Text colors (apply throughout)
- `JUKEBOX` hero H1 and nav logo: **WHITE** (`#fff`) with layered glow `0 0 8px white/0.4, 0 0 20px white/0.25, 0 0 40px cyan/0.25, 0 0 60px pink/0.2`
- `Listen Together` tagline: **solid CYAN** (`#00E5FF`) with cyan glow
- "3 rooms live now" live-count: **CYAN** (not rainbow gradient)
- Live-count dot: **red/crimson** `#FF3366`
- LIVE/ON AIR badge on cards: same **red/crimson** `#FF3366` (not sunset orange)
- DJ names (both on Featured card and room cards): **amber** `#FFB84D` with amber glow — this is a warm accent against the cool nebula, major miss in early versions
- Now-playing strip text: **amber** `#FFB84D` with amber-tinted gradient bg
- Inactive mood pills: muted white outline (`rgba(255,255,255,0.18)` border, 0.7 alpha text)
- Active mood pill: solid **pink** border + pink-tinted bg + pink text + pink glow
- `★ FEATURED` badge: **amber** `#FFB84D`
- "Live now" section H2: **cyan→pink gradient** text
- Footer ♪ notes: **three different colors** — 1st pink, 2nd cyan, 3rd amber

## Unresolved / open questions for next session

1. The user wants **more revisions** beyond v7 — don't assume we're done. Treat v7 as the current state, not the final design.
2. Whether the arch should have any interaction with scroll (currently scrolls with page — decided). Reconfirm if user wants parallax or anything else.
3. Mobile behavior — the 3vw arch positioning needs QA on narrow widths.
4. Whether to bake an actual nebula image (PNG/WebP ~100–300kb) into the repo for crisper photorealism, vs the SVG turbulence approach. User pushed for more photorealistic look — might need this.
5. Tuning knob defaults (arch glow strength, grain opacity, etc.) — surface as CSS vars so they can be tweaked without touching components.

## Visual companion note

Mockup files and server state live outside the repo at:
`C:\Users\eiptu\Documents\Jukebox\.superpowers\brainstorm\`

The server auto-exits after 30 minutes of inactivity. To resume the visual companion, run:
```bash
bash "C:/Users/eiptu/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/skills/brainstorming/scripts/start-server.sh" --project-dir "C:/Users/eiptu/Documents/Jukebox"
```

The canonical v7 mockup is now also copied into the repo at `docs/superpowers/mockups/` so it survives even if the brainstorm directory is cleaned up.

## When resuming

Read (in order):
1. This file
2. The design spec
3. Open the v7 mockup in a browser + open Reference1.png side-by-side
4. Ask the user what they want to revise next — don't assume.
