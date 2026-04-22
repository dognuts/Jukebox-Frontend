# Admin Bulk Track Search — Design

**Date:** 2026-04-22
**Status:** Draft — pending user review

## Goal

Let an admin build an autoplay tracklist by pasting a list of songs (one free-form query per line) instead of manually searching YouTube for each one, copying the URL, and pasting it into the admin panel. The system auto-resolves each query to the top YouTube Data API v3 match and drops it straight into the staged or live tracklist as a full `AutoplayTrack`. Wrong matches are corrected via an inline "alternatives" expander on each row, without retyping.

## Non-goals

- Not building SoundCloud bulk search. SoundCloud's public API has been closed to new registrations since 2021; their search can't be used reliably. The existing per-URL paste flow for SoundCloud (via `noembed`) stays unchanged.
- Not exposing bulk search to non-admin users.
- Not building full-library management (replacing the staged-vs-live two-panel UX, bulk delete, playlist import from Spotify, etc.).
- Not caching results across sessions. Each bulk import fires fresh searches.

## Architecture

The feature adds one backend endpoint and one UI mode toggle on the existing `/admin/autoplay` page. It slots into the existing admin call pattern (`authRequest("/api/admin/...")` → Go backend).

```
Admin textarea (Next.js frontend)
  → authRequest("/api/admin/search-track", { query })           [per line, concurrency-capped]
    → Go backend admin handler
      → YouTube Data API v3: search.list (for top 5 matches)
      → YouTube Data API v3: videos.list (batch, for durations)
    ← JSON: { primary, alternatives[] }
  ← Append to staged or live tracklist state
```

### Why backend, not Next.js API route

All other admin calls go through `authRequest` to the Go backend (see `app/admin/autoplay/page.tsx` lines 105-391). Adding a Next.js API route for this one feature would introduce a second auth pattern and split admin logic across two services. Keeping it in the Go backend:

- Reuses the existing admin JWT/session check
- Keeps the YouTube Data API key with the other third-party service keys in backend env
- Doesn't bloat the Next.js app with server-side credentials

## API contract

### `GET /api/admin/search-track?q=<query>`

**Auth:** Admin-only. Returns `401` for unauthenticated, `403` for non-admin.

**Query params:**
- `q` (string, required): the free-form search query. Backend trims, enforces max length (say 200 chars).

**Response (200):**
```json
{
  "primary": {
    "title": "Apache",
    "artist": "The Incredible Bongo Band",
    "duration": 284,
    "source": "youtube",
    "sourceUrl": "https://www.youtube.com/watch?v=rVvV2R2sFuI",
    "thumbnail": "https://i.ytimg.com/vi/rVvV2R2sFuI/mqdefault.jpg",
    "channel": "Michael Viner's Incredible Bongo Band - Topic"
  },
  "alternatives": [
    { ...same shape, up to 4 more... }
  ]
}
```

**Response (204):** No results found. Frontend shows a red error row with the original query.

**Response (429):** YouTube quota exhausted. Frontend shows an operator-facing error message naming the quota state.

**Response (502):** Upstream YouTube API error. Frontend marks the row failed; admin can retry or fall back to manual paste.

### Field derivation

- `title` / `artist`: YouTube returns `snippet.title` and `snippet.channelTitle`. Apply the same splitter the existing `resolveTrack` uses ("X - Y" → artist=X, title=Y). If no separator, use `snippet.title` as title and `snippet.channelTitle` as artist.
- `duration`: Parse ISO 8601 duration from `videos.list` (e.g. `PT4M44S` → 284 seconds).
- `source`: hardcoded `"youtube"`.
- `sourceUrl`: `https://www.youtube.com/watch?v={videoId}`.
- `thumbnail`: `snippet.thumbnails.medium.url`.
- `channel`: `snippet.channelTitle` — used for the alternatives expander display, not stored on `AutoplayTrack`.

### Backend implementation notes

- New Go package, say `internal/youtube`, with one exported function `SearchTrack(ctx, query) (*SearchResult, error)`.
- Reads `YOUTUBE_DATA_API_KEY` from env on startup. If unset, the admin endpoint returns `503` with a clear "not configured" message.
- One `search.list` call (`part=snippet&type=video&maxResults=5&q=...&videoEmbeddable=true`) — quota cost: 100 units.
- One `videos.list` call (`part=contentDetails&id=v1,v2,v3,v4,v5`) — quota cost: 1 unit.
- `videoEmbeddable=true` filters out videos that can't be embedded, avoiding a class of "this video is unavailable in your region" playback failures.
- No result caching in v1. Each admin request hits YouTube fresh.

## Frontend changes

### New UI: Bulk add mode

The existing "Add track" row on each playlist panel (both staged and live) gains a mode toggle:

```
[ URL ] [ Bulk ]   ← current "Paste URL..." stays on left when URL selected
                   ← Bulk replaces it with a multiline textarea
```

When **Bulk** is selected:
- Textarea placeholder: `Paste one song per line — "Apache Incredible Bongo Band", "J Dilla Donuts Stop", anything goes. Admin only.`
- Primary button: **"Find on YouTube"** (disabled while empty or while a batch is in flight)
- Below the textarea, a live progress line appears while searches run: `Searching 12 of 30…`

### Auto-pick flow

On submit:
1. Split textarea content on newlines, trim, drop empty lines. Count = N.
2. Fire N requests to `/api/admin/search-track` with **concurrency cap of 5** (a simple in-flight counter with a queue).
3. As each response lands, append the `primary` track to the current tracklist state (staged or live, whichever panel the admin is in). The order of the final tracklist matches the order of the input lines — use an ordered array and place each result by index, not arrival order.
4. For `204` (no results) or errors, insert a placeholder row:
   - Muted red background
   - Shows the original query verbatim
   - A "Retry" button that re-fires just that query
   - A "Remove" button to drop the row
5. When all N complete, clear the textarea, show a toast: `Added M of N tracks. K failed.` (or similar).

### Alternatives expander (per row)

Every row added via bulk search gets an inline **⟳ Alternatives** button in the row's action area. Clicking it:
1. Expands a panel below the row showing the up-to-4 alternatives from the original search response (we've been holding these in state on the row).
2. Each alternative displays: thumbnail, title, channel, duration.
3. Clicking one replaces the row's `title`, `artist`, `duration`, `sourceUrl` in one atomic state update; collapses the panel.
4. The panel also has a "Search again" button that re-runs the original query and refreshes the alternatives list (useful if the admin wants a totally different set of options).

Rows added by the existing URL-paste flow do not get the Alternatives button — they never had alternatives to begin with.

### State model

`AutoplayTrack` gains one optional field:
```ts
type AutoplayTrack = {
  // ...existing fields
  _searchAlternatives?: TrackCandidate[]  // client-only; not persisted
  _searchQuery?: string                   // client-only; not persisted
}
```

These are prefixed with `_` to signal client-only. They're stripped before any `authRequest` that persists tracks to the backend — the simplest strip is in the existing `save` handlers (`saveLivePlaylist`, `saveStagedPlaylist`). Leaving them in the payload would be harmless but noisy in the DB.

## Error handling & edge cases

| Scenario | Behavior |
|---|---|
| Empty lines in paste | Skipped silently during the split step |
| Exactly one query with no results | Placeholder row with Retry/Remove buttons |
| YouTube returns video without duration | Store `duration: 0`; backend autoplay-fallback handles it (per existing sync.go comment) |
| Admin cancels mid-batch | In-flight requests complete; no new ones queue. Already-appended rows stay. |
| YouTube quota exhausted mid-batch | Remaining requests fail with 429; frontend inserts failure rows; admin sees "Quota exhausted" toast |
| `YOUTUBE_DATA_API_KEY` unset on backend | Endpoint returns 503 with message; Bulk mode shows a one-line inline error "Bulk search not configured — see README". URL mode keeps working. |
| Search returns a non-music video | That's on the query. Admin uses Alternatives expander to pick the right one, or fixes their query. |

## Quota & operational notes

- Default YouTube Data API v3 quota: 10,000 units/day.
- Cost per track imported: 100 (search) + ~0.2 (fractional share of the batched videos.list call) ≈ **101 units per track**.
- Default quota = **~99 tracks/day**. A single official Jukebox tracklist of ~30 tracks uses ~3,000 units, leaving room for ~3 full imports + corrections per day on free quota.
- If the admin hits the cap regularly, file a YouTube Data API quota-bump request at Google Cloud Console (free; 1-2 day review).
- Add to `.env.example` in backend: `YOUTUBE_DATA_API_KEY=`
- Add to backend README: short paragraph on what the key is for and how to get one.

## Testing

### Backend
- Unit test `internal/youtube.SearchTrack` with mocked HTTP client, covering:
  - Happy path: valid query → returns primary + 4 alternatives
  - No results: YouTube returns `items: []` → function returns `(nil, ErrNoResults)` so handler maps to 204
  - Quota exhausted: YouTube returns 403 with `quotaExceeded` reason → function returns `ErrQuotaExhausted` so handler maps to 429
  - Upstream 5xx: function returns wrapped error, handler maps to 502
  - Malformed duration string: parse failure is non-fatal, duration falls back to 0
- Handler test for the HTTP layer: admin auth enforcement (non-admin → 403), query validation (empty → 400, too long → 400).

### Frontend
- Component test for the Bulk mode textarea → concurrent-submit flow, asserting:
  - Up to 5 requests in flight at once (check by spying on `authRequest` calls)
  - Results land in input-order regardless of arrival order
  - Failed rows render the placeholder with original query
  - Alternatives expander populates from the response's `alternatives[]`
  - Clicking an alternative mutates the row atomically

### Manual QA checklist (one pass before ship)
- Paste 3 tracks with correct queries → 3 rows land with right titles/artists/durations.
- Paste 1 garbage query → placeholder row with Retry button.
- Paste 10 tracks, expand Alternatives on one, pick a different version → row updates.
- Toggle between URL and Bulk mode mid-session; ensure state doesn't get confused.
- Save tracklist → verify backend doesn't receive `_searchAlternatives` or `_searchQuery` in payload.

## Out of scope (possible future work)

- SoundCloud bulk search (requires workaround for their closed API; low priority since YouTube coverage is near-universal for Jukebox's use case).
- Caching recent searches across the session (saves quota on re-searches but adds state management).
- Spotify/Apple Music playlist import (paste a Spotify playlist URL → bulk search each track). Interesting follow-up but a separate feature.
- Sample-original auto-pairing for the Sourcecode Jukebox (could use WhoSampled scraping or manual-curation; different UX entirely).
- Client-side fuzzy match against already-added tracks to dedupe ("you already added this one").
