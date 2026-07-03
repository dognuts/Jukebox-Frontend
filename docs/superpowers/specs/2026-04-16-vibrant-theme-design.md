# Vibrant Theme Design Spec

**Date:** 2026-04-16
**Status:** Draft — ready for implementation planning

## Goal

Add a new "Vibrant" theme alongside the existing dark theme, toggled via a segmented `DARK | VIBRANT` control in the navbar. Vibrant applies a "premium Miami neon" visual treatment using the same page layout and components — only colors, glow, texture, and a decorative neon arch overlay change.

**Dark mode stays exactly as it is today.** No structural changes. No components added, removed, or replaced. Only Vibrant mode adds visuals.

## Scope

### In scope
- Mount `next-themes` provider (already installed, unused today)
- New `<ThemeToggle />` component in navbar, inserted before `<UserMenu />`
- Miami palette CSS tokens in `.vibrant` selector
- Decorative `<NeonArch />` overlay component rendered behind the hero only in Vibrant
- Background texture overlays (vignette, aurora gradients, faint grid, grain) only in Vibrant
- Theme-aware styling in existing components: `HomeHero`, `FeaturedRoomCard`, `LiveRoomGrid`/`RoomCard`, `ActivityFeed`, `Navbar`, `Footer`
- Theme persistence via localStorage (`jukebox-theme` key)
- Respects `prefers-reduced-motion`

### Out of scope
- Any restructuring of the homepage layout
- Any new content (no new CTAs, sections, chips, or hero copy)
- System-preference detection (explicit user choice only)
- Theme customization UI beyond the toggle
- Any change to dark mode visuals
- Theming of routes beyond the homepage in this spec (other routes naturally inherit CSS tokens but visual polish is homepage-first)

## Palette (locked)

```
Neons
  --neon-cyan:   #00E5FF   (primary, inner-tube feel, links, listener count, focus ring)
  --neon-pink:   #FF2BD6   (primary, outer-tube feel, active states)
  --neon-violet: #8B5CF6   (bloom / depth — mostly used inside box-shadow spreads)
  --neon-sunset: #FF6A1A   (LIVE/ON AIR only — rare accent)

Dark base
  --ink-black:    #05060A
  --deep-navy:    #070B18
  --purple-wash:  #0B1026
```

**Core rule:** depth comes from glow + contrast + texture. Don't introduce more hues.

## Architecture

### Layer 1 — Root class
`<html class="dark">` or `<html class="vibrant">` — managed by `next-themes`. Persists to `localStorage["jukebox-theme"]`. Default: `dark`. System preference **disabled**.

### Layer 2 — Theme provider
Wrap `app/layout.tsx` children in `<ThemeProvider attribute="class" themes={["dark", "vibrant"]} defaultTheme="dark" enableSystem={false} storageKey="jukebox-theme">`. Remove the hardcoded `className="dark"` from `<html>`.

### Layer 3 — CSS tokens
Add a `.vibrant { ... }` selector in `app/globals.css` parallel to the existing `.dark { ... }`. It redefines the same semantic variables with Miami values. Keys include:

```
--background, --foreground, --border
--theme-arch-outer, --theme-arch-inner, --theme-arch-glow
--theme-card-border, --theme-card-bg, --theme-card-glow
--theme-chip-border, --theme-chip-active-bg, --theme-chip-active-border
--theme-cta-bg, --theme-cta-color
--theme-live-color   (sunset in vibrant, amber-red in dark)
--theme-grid-line, --theme-grain-opacity, --theme-aurora-1, --theme-aurora-2, --theme-aurora-3
```

Component styles consume **semantic** tokens only — never raw color names.

### Layer 4 — Components

#### New files

- `components/layout/theme-toggle.tsx` — the `DARK | VIBRANT` segmented pill. Uses `useTheme()` from `next-themes`. Renders nothing until mounted (avoids hydration mismatch).
- `components/effects/neon-arch.tsx` — the decorative arch. Returns `null` unless the active theme is `vibrant`. Renders two nested rounded-top divs (cyan outer, pink inner) with multi-layer box-shadows for bloom, a thin white inner border for glass specular, and a fog haze layer. Positioned absolutely inside the hero section.

#### Modified files

- `app/layout.tsx` — remove hardcoded `className="dark"`, wrap children in `<ThemeProvider>`.
- `components/theme-provider.tsx` — configure the themes prop explicitly (it already wraps `next-themes` with no config today).
- `components/layout/navbar.tsx` — insert `<ThemeToggle />` before `<UserMenu />` in the right cluster.
- `components/discover/home-hero.tsx` — render `<NeonArch />` inside the existing hero section (behind content, using the existing ambient glow as a sibling — the amber glow hides in Vibrant via CSS). Replace hardcoded colors with semantic CSS vars.
- `components/discover/featured-room-card.tsx` — replace hardcoded amber-tinted styles with semantic CSS vars. Add a `::before` gradient border (masked) that only shows in Vibrant.
- `components/discover/room-card.tsx` — replace hardcoded chrome gradient + ON AIR red + listener chip colors with semantic vars. Chrome gradient uses `--theme-chrome-top-*` tokens that resolve to amber/purple in Dark and cyan/violet in Vibrant.
- `components/discover/live-room-grid.tsx` — no visual changes needed (only header text); its child cards get re-tinted.
- `components/discover/activity-feed.tsx` — re-tint row borders/bg via semantic vars.
- `components/layout/footer.tsx` — re-tint links via semantic vars.
- `app/globals.css` — add `.vibrant` selector with all tokens + `body.vibrant::before` and `::after` pseudo-elements for the grid and grain overlays.
- `app/page.tsx` — no change (component tree is untouched).

## Visual Treatment Details

### Neon arch (NeonArch component)

Two nested upside-down-U's over the hero area:

**Outer tube (cyan):**
- 4–5px solid `var(--neon-cyan)` border, no bottom border
- `border-radius: 280px 280px 0 0`
- `box-shadow` stack (inner → outer):
  - `inset 0 0 5px rgba(255,255,255,0.7)` — glass core
  - `inset 0 0 14px rgba(0,229,255,0.55)` — inner tube glow
  - `0 0 5px rgba(0,229,255,1)` — tight outer
  - `0 0 14px rgba(0,229,255,0.85)` — medium outer
  - `0 0 32px rgba(0,229,255,0.5)` — wide outer
  - `0 0 60px rgba(0,229,255,0.25)` — bloom
  - `0 0 100px rgba(139,92,246,0.3)` — violet wide bloom
- `::before` pseudo-element: thin 1px white-ish border on inner side, masked to fade out past the top 30–60%, produces the glass specular highlight streak
- `mask-image: linear-gradient(180deg, #000 0%, #000 65%, transparent 95%)` — the tube fades out at the base so it looks like it's glowing in air

**Inner tube (pink):** same formula with `--neon-pink` and slightly smaller geometry.

**Haze:** absolute-positioned div below the arch base, blurred, with cyan/pink radial washes at the left/right legs, producing the "fog in air" feel.

**Shimmer (animated):** two independent keyframes (`shimmerA` on outer, `shimmerB` on inner) using prime-ish durations (9.3s and 11.7s) with non-rhythmic opacity dips (0.93–0.96) so they don't look like a loop. Disabled under `prefers-reduced-motion`.

### Background (body-level, vibrant only)

Stacked as CSS `background:`
- 3× radial aurora washes (pink top-left, cyan top-right, violet center — each at ~8–10% alpha)
- Base radial from `--purple-wash` at 0% through `--deep-navy` at 45% to `--ink-black` at 100%
- `background-attachment: fixed` so the texture stays put while content scrolls

`body.vibrant::before` — faint crossed grid lines (`repeating-linear-gradient` at 2.5% alpha on 80px spacing) masked radially to fade at the edges. `body.vibrant::after` — inline SVG noise at ~5% opacity, `mix-blend-mode: overlay` for grain.

Both `::before` and `::after` are `position: fixed; pointer-events: none; z-index: 0–1;` — they live under page content.

### Cards (FeaturedRoomCard, RoomCard)

- Background: semi-transparent navy (`rgba(11,16,38,0.85)` → `rgba(7,11,24,0.9)` vertical gradient) replacing the dark-theme amber-brown backgrounds
- Border: pure 1px `rgba(0,229,255,0.18)` on idle, gradient lit edge via a masked `::before` (`linear-gradient(135deg, cyan, pink 60%, violet)`) only visible in Vibrant
- Inner shadow: `inset 0 1px 0 rgba(255,255,255,0.05)` for a subtle glass top-edge highlight
- Outer shadow: soft drop + faint cyan wash
- Hover: border alpha bumps to 0.5, glow shadows ~2× stronger, `transform: translateY(-3px)`

### Chips / Mood pills (HomeHero)

- Idle: 1px cyan outline at 35% alpha, cyan text, transparent bg
- Hover: full cyan outline + `box-shadow: 0 0 14px rgba(0,229,255,0.4)`
- Active: Cyan→Pink 18% gradient bg + pink border + white text + double-color glow

### ON AIR / LIVE

- Color shifts from dark's red-amber (`#ff5050`) to `--neon-sunset` (`#FF6A1A`) in Vibrant
- Keeps the same dot+text layout. Adds a subtle border + glow.

### Chrome on jukebox cards

- Top chrome arch: gradient changes from brown-purple (dark) to cyan-pink-transparent (vibrant)
- Bottom neon trim: amber-orange line (dark) becomes cyan→pink (vibrant) with stronger glow
- Card body inner bg stays dark; only the chrome trim + accents re-tint

## Performance Guardrails

Blur filters and heavy glows are expensive. Constraints:
- No `backdrop-filter: blur(>14px)` anywhere new
- Neon arch uses `box-shadow` (GPU-composited on most browsers) not `filter: blur()`
- Background pseudo-elements are `position: fixed` so they don't scroll-reflow
- Shimmer animation toggles opacity only — no transform, no layout-affecting properties
- Grid overlay is a single fixed pseudo-element, masked radially (cheap)
- Grain is a data-URI SVG applied once as `background-image` — no per-frame work

We already have rAF throttling on the navbar scroll listener from the earlier pass; Vibrant mode doesn't add new scroll listeners.

## Accessibility

- Toggle is a `<button>` element with `aria-label="Toggle theme"` and `aria-pressed` on each segment
- Keyboard: space/enter on either segment switches theme
- Active-segment contrast: dark text on Cyan→Pink gradient — passes WCAG AA for UI against the bright gradient
- Body text in Vibrant is `#fff` on `~#05060A` — AAA contrast
- Mood pill hover/focus ring uses cyan at 1.0 alpha — clearly visible
- `prefers-reduced-motion`: disables arch shimmer and any other non-essential animations
- No color-coded meaning that relies solely on the palette (ON AIR has both color AND a pulsing dot AND text)

## Tuning Knobs (where to adjust intensity)

Everything is parameterized by CSS custom properties so future adjustments don't touch components. All in `app/globals.css` under `.vibrant`:

| Effect | Variable | Starting value |
|---|---|---|
| Overall arch glow strength | `--theme-arch-glow` (multiplier on box-shadow alphas) | 1.0 |
| Grid visibility | `--theme-grid-line` (alpha) | 0.025 |
| Grain | `--theme-grain-opacity` | 0.05 |
| Aurora brightness | `--theme-aurora-alpha` | 0.10 |
| Card border glow on idle | `--theme-card-border` alpha | 0.18 |
| Card border glow on hover | `--theme-card-hover-glow` | 0.5 |

## Implementation Order

Recommended order for the plan phase:
1. Wire `ThemeProvider`, remove hardcoded `dark` class, verify dark mode unchanged
2. Add `ThemeToggle` to navbar; it switches classes but nothing visual changes yet
3. Add `.vibrant` CSS tokens (colors only) — verify text/bg recolor works end-to-end
4. Add background overlays (aurora + grid + grain) under `body.vibrant`
5. Build `NeonArch` component; mount in `HomeHero` conditionally
6. Re-style cards (FeaturedRoomCard, RoomCard chrome) via semantic vars
7. Re-style chips, activity rows, footer links
8. Add shimmer animations, verify reduced-motion behavior
9. QA dark mode is pixel-identical to pre-change

Each step is shippable independently and keeps dark mode working.

## Acceptance Criteria

- Toggling to Vibrant immediately reads as "premium neon" — not a flat gradient
- The arch looks like real glowing glass tubes (core + bloom + glass highlight streak + violet wide bloom)
- Background has visible but subtle texture (grid, grain, aurora) — not distracting
- Cards and chips have neon-edged depth; hover intensifies but doesn't jump
- Dark mode is visually identical to the current site (pixel diff ~0)
- Theme persists across reloads
- No new layout shifts, content jumps, or performance regressions vs current dark mode
- No new components appear in Dark mode

## Open Questions

None at this stage. Palette and architecture are locked. Implementation plan will handle file-by-file breakdown.
