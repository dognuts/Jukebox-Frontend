# Listener Troubleshooter & In-App Support Report — Design

**Date:** 2026-04-23
**Status:** Design (awaiting user review)

## Background

YouTube embeds now occasionally render an in-iframe "Sign in to confirm you're not a bot" gate for logged-out sessions. When this happens in a Jukebox autoplay room, the video tile loads but playback never starts for the affected listener, and there is no UI feedback explaining why.

Skipping the gated track was rejected: everyone hearing the same thing at the same time is a core Jukebox value proposition. Instead, listeners should be given a scannable self-service troubleshooter that covers the YT-gate case and the handful of other playback issues they might hit, plus an in-app path to contact admins when self-service isn't enough.

The YouTube IFrame API does not expose a signal for the bot gate, so detecting it programmatically would be heuristic and conflated with unrelated failure modes (browser autoplay policy, network stall, etc.). A human-navigable help page avoids that detection problem entirely.

## Goals

- Listeners can self-diagnose and fix the most common playback issues without leaving the browser.
- Listeners who are stuck can send a support report to admins in one click, with full context auto-attached.
- The support endpoint is resistant to bot-volume spam without adding user-visible friction.
- The troubleshooter reuses existing UI primitives where possible (`FAQItem` accordion, existing `/support` page conventions).

## Non-goals

- Automatic detection of the YouTube bot gate. No runtime inference; this is a documentation + escape-hatch problem.
- Automatic fallback to alternate playback sources (SoundCloud mirror, direct audio). Out of scope; tracks remain single-source.
- Full support ticket system. Reports are sent as email; there is no persisted ticket, status, or thread.
- Sophisticated anti-spam (CAPTCHA, Turnstile). Layered lightweight defenses only; can be upgraded later if the admin inbox sees abuse.

## Architecture

### New routes and components

**Frontend (`Jukebox-Frontend`):**

- `app/help/listening/page.tsx` — new route. Renders the troubleshooter page.
- `components/help/troubleshooter-row.tsx` — accordion row that accepts a `ReactNode` body. Wraps the visual treatment of `FAQItem` (which only accepts a plain string) so remedies can include lists, links, and buttons. The existing `FAQItem` stays as-is for the text-only `/support` FAQ.
- `components/help/contact-support-form.tsx` — modal with the fields described in "Contact form" below. Handles its own open/close state, submission, and confirmation view.
- Listener-view entry point: a low-emphasis text link "Trouble listening?" rendered at the bottom of the listener layout (under the now-playing area, above or inline with chat), passing `?room={slug}&track={trackId}` in the href so the form can prefill context.

**Backend (`Jukebox-Backend`):**

- `internal/handlers/support.go` — new handler file, `POST /api/support/listener-report`.
- `internal/antispam/ratelimit.go` — add `AllowSupportReport(ctx, ip)` method to the existing `RateLimiter`, following the same pattern as `AllowSignup` and `AllowLogin`. Uses Redis key `support_report_rate:{ip}` with the existing `checkRate` helper.
- `internal/handlers/clientip.go` — new helper `ClientIP(r *http.Request) string`. Replaces the inline `X-Forwarded-For` / `X-Real-IP` / `RemoteAddr` parsing duplicated three times in `internal/handlers/auth.go` (Signup, Login, a password-reset-style path). Update those three call sites as part of this work.
- `internal/email/email.go` — add `SendListenerReport(ctx ListenerReportContext) error` and the `ListenerReportContext` type. Extend `NewService` to accept a new `supportReportTo string` parameter; pass `cfg.AdminEmail` at construction in `cmd/server/main.go` (the `ADMIN_EMAIL` env var already exists in `internal/config/config.go` — we're not introducing new config).
- `cmd/server/main.go` — register the new handler, wire the existing `antispam.RateLimiter`, pass `cfg.AdminEmail` into `email.NewService`.

### Open decision (confirm before implementation)

The destination email address. The user initially said `admin@jukebox-app.com`; existing `/support` page mailto links point to `support@jukebox-app.com`. The implementation uses the existing `ADMIN_EMAIL` env var (already in `Config`), so switching destinations is an env-var change, not a code change. The user should confirm which address they want set for `ADMIN_EMAIL` before shipping — and decide whether to also update the `/support` page mailto to match.

### Deliberate non-use: Turnstile

Cloudflare Turnstile is already wired (`internal/antispam/captcha.go`, `Config.TurnstileSecretKey`, used by signup). Per the tier-A decision, we are *not* adding Turnstile to the listener-report endpoint. If the destination inbox sees abuse in practice, adding Turnstile is a small follow-up: plug `antispam.VerifyTurnstile` into the handler and add a `CaptchaToken` field to the request payload, same as signup.

## Troubleshooter page

Route: `/help/listening`.

Layout:

- Header with "Trouble listening?" title and a one-line intro ("Pick the issue you're seeing — most things have a quick fix.").
- Accordion of five rows, built on `TroubleshooterRow`. Only one row open at a time. Rows collapsed by default. Each row has a stable anchor id for deep-linking (`#gated`, `#no-audio`, `#out-of-sync`, `#unavailable`, `#still-stuck`).
- Below the accordion, a `Contact support` CTA that opens the contact form modal.

Row content:

1. **"Video says 'Sign in to confirm you're not a bot.'"** (anchor: `#gated`)
   - Open `youtube.com` in a new tab of this browser and sign into your YouTube account.
   - Come back to this tab and refresh. The video should load normally.
   - Explanation: YouTube requires a signed-in session for some embedded videos. It's a YouTube anti-abuse check that affects every site embedding their player, not a Jukebox issue.

2. **"I can't hear anything."** (anchor: `#no-audio`)
   - Click the play button once — browsers block audio until you interact with the page.
   - Check your browser tab isn't muted (right-click the tab).
   - Check the volume slider in the Jukebox player.
   - Check your system volume and output device.

3. **"The track is out of sync with my friends."** (anchor: `#out-of-sync`)
   - Refresh the page — Jukebox will re-seek to the room's current position.
   - Persistent drift usually means a slow or unstable connection. Try a different network.

4. **"The video is black or says 'Video unavailable.'"** (anchor: `#unavailable`)
   - The uploader removed the video or changed its embed permissions. The room will move on to the next track.
   - This is rare — autoplay tracks are screened before they're added, and user-DJs vet their own queues.

5. **"Still stuck?"** (anchor: `#still-stuck`, no expand behavior — renders as a button-style row)
   - Button: "Contact support" → opens `ContactSupportForm` modal.

Query-param behavior: if the page receives `?room={slug}&track={trackId}`, it passes them to the modal's context so the support request auto-attaches the room and track the listener was in. The page itself does not render room/track info — they appear only in the report payload.

Discoverability: add a one-line link from the existing `/support` page ("Playback problems? See the listening troubleshooter →") pointing to `/help/listening` so users who land on `/support` first can still find it.

## Contact form

Modal launched from the troubleshooter's "Contact support" button. The modal records `openedAt = Date.now()` on mount (used for the minimum-submission-time anti-spam check).

### Fields

| Field | Visible when | Validation |
|---|---|---|
| Issue category (select) | Always | One of `gated`, `no-audio`, `out-of-sync`, `other`. Default: derived from the last-expanded troubleshooter row if the modal was opened from one; otherwise `other`. |
| Message (textarea) | Always | Required. 10–2000 characters. |
| Email (text input) | Only if unauthenticated | Required when shown. HTML5 email pattern + basic client format check. |
| "Okay to contact me back" (checkbox) | Always | Default checked. Sent as `canContactBack`. |
| `website` (honeypot, hidden input) | Always (in DOM, not visible) | Must be empty on submit; non-empty → silent drop server-side. |

### Submission flow

1. Client validates fields, then POSTs `/api/support/listener-report` with form data, `openedAt`, and context (`roomSlug`, `trackId`, `playbackPositionSec`).
2. Server runs anti-spam and validation, resolves session user (if cookie present), looks up room name and track title/artist from the store, composes the email, and sends via Resend.
3. On 200: modal body is replaced with a confirmation ("Thanks — we'll reply within 24–48 hours.") and a Close button.
4. On 429 (rate limit): form shows "You've sent a lot of reports — please email support@jukebox-app.com directly." as inline text.
5. On other errors: form shows "Couldn't send. Please email support@jukebox-app.com directly." inline error, keeps the form populated so the user can copy/paste.

## Backend: request handling

Endpoint: `POST /api/support/listener-report`. Unauthenticated — anonymous listeners must be able to submit.

### Request body

```json
{
  "category": "gated" | "no-audio" | "out-of-sync" | "other",
  "message": "string",
  "contactEmail": "string",
  "canContactBack": true,
  "openedAt": 1713888000000,
  "website": "",
  "roomSlug": "friday-night-funk",
  "trackId": "uuid",
  "playbackPositionSec": 42.5
}
```

### Processing order (fail fast, fail cheap)

1. Validate request shape: required fields, type, lengths. 400 on malformed.
2. Honeypot: `website != ""` → return 200 `{ ok: true }`, send no email, log at debug.
3. Minimum submission time: `serverNow - openedAt < 2000ms` → return 200 `{ ok: true }`, send no email, log at debug.
4. Per-IP rate limit (fixed-window, 5 per hour — same semantics as `AllowSignup`, backed by Redis `INCR` + 1h `EXPIRE`): on exceed, return 429 with `{ ok: false, code: "rate_limited" }` and a user-facing message.
5. Resolve session user from cookie (if present). If found, ignore `contactEmail` from the request and use the account email; populate `UserID`. If no session, require `contactEmail` in the request (return 400 if absent).
6. Look up `RoomName` from `roomSlug` and `TrackTitle`/`TrackArtist` from `trackId` via the store. On miss, continue with `"(unknown)"` rather than erroring — the report is still useful.
7. Build `ListenerReportContext` and call `email.Service.SendListenerReport(ctx)`. On Resend failure, return 500 `{ ok: false }`.
8. Return 200 `{ ok: true }`.

### Rate limiter

Reuse the existing `antispam.RateLimiter` (Redis-backed, already instantiated in `main.go` for signup/login). Add a new method:

```go
// AllowSupportReport returns true if the IP has not exceeded the support-report
// rate limit (5 per hour, same max as signup).
func (rl *RateLimiter) AllowSupportReport(ctx context.Context, ip string) (bool, error) {
    return rl.checkRate(ctx, "support_report_rate:"+ip, int64(rl.maxPerHour))
}
```

Rationale for reuse: Redis-backed means limits survive process restarts (an in-memory limiter would not), and the convention (`AllowSignup`, `AllowLogin`, now `AllowSupportReport`) is consistent with the existing codebase. If Redis is unreachable, the existing `checkRate` fails open — acceptable per the existing signup behavior.

### Client IP resolution

The inline pattern — inspect `X-Forwarded-For`, then `X-Real-IP`, then `RemoteAddr`, then strip the port and take only the first entry of a comma-separated XFF — currently appears verbatim in three places in `internal/handlers/auth.go` (Signup, Login, and one password-reset path). Extract to a shared helper as part of this work:

```go
// internal/handlers/clientip.go
func ClientIP(r *http.Request) string { /* ... */ }
```

Update the three existing call sites in `auth.go` to use the helper, and use it from the new support handler. This is a small, in-scope cleanup — the duplicate code is directly relevant because the new handler needs the same behavior.

## Backend: email composition

New method in `internal/email/email.go`:

```go
type ListenerReportContext struct {
    Category             string
    Message              string
    ContactEmail         string
    CanContactBack       bool
    UserID               string
    RoomSlug             string
    RoomName             string
    TrackID              string
    TrackTitle           string
    TrackArtist          string
    PlaybackPositionSec  float64
    UserAgent            string
    ClientIP             string
    SubmittedAt          time.Time
}

func (s *Service) SendListenerReport(ctx ListenerReportContext) error
```

Destination: `supportReportTo` on the `email.Service`, sourced from `Config.AdminEmail` (`ADMIN_EMAIL` env var, which already exists in `internal/config/config.go`). Add as a fourth parameter to `email.NewService(apiKey, fromEmail, frontendURL, supportReportTo string)` and pass `cfg.AdminEmail` at construction time in `cmd/server/main.go`. If `ADMIN_EMAIL` is empty, `SendListenerReport` logs a warning and returns a non-error (same behavior as `email.Service` dev mode).

Subject: `[Jukebox Support] Listener report — {Category} — {RoomName}`.

Body (HTML, consistent with existing verification/reset emails):

- Header: "Listener support report".
- Two-column table of context fields (category, submitted at, user, room + slug, track + artist, playback position, user-agent, IP).
- The user's message rendered in a styled blockquote, with newlines preserved via `white-space: pre-wrap` and HTML-escaped for safety.
- Footer: "Contact back: yes/no" so the admin knows whether a reply is welcome.

## Error handling

- **Client-side validation errors:** inline error text next to the offending field; do not submit.
- **Honeypot / time-check trips:** server returns 200 silently. Client shows the success confirmation. This is intentional — we don't want to tell a bot why it was blocked.
- **Rate-limited (429):** client shows a specific "please email support directly" message inline; form remains populated so a real user can copy their message and email it themselves.
- **Resend failure (500):** same fallback message as 429 with "Couldn't send" wording. Form stays populated.
- **Unknown room/track:** silently continue with `"(unknown)"` in the email; do not fail the request. A report with missing context is still useful to admins.
- **Message HTML-escape:** the user message is escaped when rendered in the email body to prevent injection into the admin's HTML email client.

## Testing

### Backend unit tests

`internal/antispam/ratelimit_test.go` (new file — the package doesn't have one yet):
- `AllowSupportReport` returns true for the first 5 calls from the same IP, false on the 6th, within a one-hour window.
- Different IPs are counted independently.
- Localhost (`127.0.0.1`, `::1`) always allowed (consistent with `AllowSignup` behavior).
- Use a `miniredis` or equivalent stub; mirror the test style of any existing Redis-touching tests in the repo (check during implementation).

`internal/handlers/clientip_test.go` (new):
- `X-Forwarded-For` single IP → returned verbatim.
- `X-Forwarded-For` comma-separated (`"1.2.3.4, 5.6.7.8"`) → returns `1.2.3.4` (first).
- Only `X-Real-IP` set → returned.
- Neither header → falls back to `RemoteAddr` with port stripped.

`internal/handlers/support_test.go`:
- Missing required fields → 400.
- Message too short / too long → 400.
- Anonymous without `contactEmail` → 400.
- Honeypot `website != ""` → 200, no email sent (assert no Resend call via stub).
- `openedAt` less than 2s ago → 200, no email sent.
- Anonymous path with valid email → 200, email sent with that email in body.
- Authenticated path → email body contains account's email and `UserID`, not the client-supplied `contactEmail`.
- Unknown `roomSlug` → 200, email body shows `"(unknown)"`.
- Rate limit exceeded → 429.

`internal/email/email_test.go`:
- `SendListenerReport` subject contains category + room name.
- Body contains message, all context fields, and the "Contact back: yes/no" footer.
- User message is HTML-escaped.

### Frontend E2E tests

`e2e/listener-troubleshooter.spec.ts`:
- `/help/listening` renders all 5 rows. Clicking row 1 expands it; clicking row 2 collapses row 1 and expands row 2.
- Deep-link `/help/listening#gated` opens row 1 on load.
- "Contact support" opens the modal with category prefilled from the last-expanded row (or `other` if none).
- Anonymous user sees the email field; logged-in user does not.
- Valid submission → confirmation state replaces form. Assert the POST payload shape (category, message, contactEmail when anon, context fields).
- Stubbed 429 response → fallback message appears; form remains populated.
- Stubbed 500 response → "Couldn't send" fallback appears.

### Manual smoke test plan

1. Open an autoplay room in a logged-out browser; trigger the YT bot gate.
2. Click "Trouble listening?" at the bottom of the listener view. Page opens with room/track in the URL.
3. Expand row 1, follow its instructions (sign into YouTube, refresh), confirm playback resumes.
4. Submit a support report anonymously with a test email. Confirm the admin inbox receives a well-formatted email within a minute containing room name, track, playback position, user agent, and IP.
5. Repeat step 4 six times from the same IP within an hour; confirm the 6th shows the rate-limit fallback and no email was sent.
6. Repeat step 4 from a logged-in account; confirm the email body shows the account's email (not a client-supplied one) and `UserID` is populated.
