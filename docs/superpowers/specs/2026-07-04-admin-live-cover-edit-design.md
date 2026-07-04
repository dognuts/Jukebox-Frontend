# Admin: edit official-jukebox cover art while live — design

**Date:** 2026-07-04
**Status:** Approved (minimal scope — no live WS propagation, per user decision)

## Problem

The cover editor on `/admin/autoplay` (the official-jukebox control surface) sends
raw `FileReader.readAsDataURL` output — up to ~6.7MB of base64 — in
`PATCH /api/admin/rooms/{id}`. Since the ISR-payload fix, the backend correctly
rejects `data:` covers over 128KB (`validateCoverArt`), so editing a cover with
any normal photo now fails with "Failed to update cover: cover image too large".
The editor is otherwise fully functional on live rooms.

## Decision context

- **Propagation choice (user):** on next reload only. In-room listeners keep the
  old cover until refresh; the room detail ISR revalidates within 60s and the
  homepage list within its poll/cache windows. No WebSocket event.
- The create page already solves the same problem with a canvas compressor
  (`compressCoverArt`: downscale to ≤640px longest edge, JPEG q0.82, refuse if
  the result still exceeds 128KB). It must be shared, not duplicated.

## Change

1. **`lib/compress-cover-art.ts` (new):** extract `compressCoverArt` (and its
   size constant / error message) verbatim from `app/(app)/create/page.tsx`.
   The create page imports it — zero behavior change there.
2. **`app/(app)/admin/autoplay/page.tsx`:** `handleCoverFile` calls the shared
   compressor instead of `reader.readAsDataURL`. Keep the existing image-type
   and 5MB pre-checks and the page's `alert()` error style:
   - still-too-large after compression → "That image is too large — try a smaller one."
   - decode/canvas failure → distinct message (not the size message).
   The debug payload-size log then reports the compressed size.

## Not changing

- Backend: `PATCH /api/admin/rooms/{id}` already validates, is admin-gated, and
  works while rooms play.
- No WS cover-change event (explicit user choice).
- No cover editing added to `/admin` rooms list — the autoplay page is the
  official-jukebox surface.

## Verification

- `tsc --noEmit` zero errors; `pnpm build` green; Playwright e2e suite green.
- Compressed output for a multi-MB photo lands well under 128KB (log line).

## Error handling

Oversized-after-compression → alert, no PATCH sent. Backend 400 (defense in
depth) still surfaces through the existing catch/alert path.
