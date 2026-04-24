# Listener Troubleshooter & Support Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/help/listening` — a scannable self-service troubleshooter — with an in-app contact form that emails admins with room/track context auto-attached. Entry point is a "Trouble listening?" link on the listener view. No runtime bot-gate detection.

**Architecture:** Backend gets a new unauthenticated `POST /api/support/listener-report` handler with layered lightweight anti-spam (honeypot, min-submit-time, per-IP Redis rate limit reusing the existing `antispam.RateLimiter`). Email sent via the existing Resend-backed `email.Service` to `cfg.AdminEmail`. Frontend gets a help route, a reusable `TroubleshooterRow` accordion component, and a `ContactSupportForm` modal. No new runtime detection, no auto-skip — listener-facing behavior is documentation plus an escape hatch.

**Tech Stack:** Go 1.23 (chi router, Resend, Redis); Next.js 16 (React 19, Radix, Tailwind, Playwright for E2E).

**Spec:** `Jukebox-Frontend/docs/superpowers/specs/2026-04-23-listener-troubleshooter-design.md` (commit `9ecc46b`).

**Repos touched:** Tasks 1–6 live in `Jukebox-Backend/`. Tasks 7–13 live in `Jukebox-Frontend/`. Commit inside the repo you're editing. Task 14 is a manual smoke-test pass.

**Note on existing test conventions:**
- Go handlers are tested using stdlib `testing` + `net/http/httptest`. Dependencies are abstracted behind small interfaces declared in the handler package; tests inject fakes. See `internal/handlers/admin_search_test.go` for the reference pattern.
- Table-driven tests are used for pure-logic packages (see `internal/antispam/disposable_test.go`).
- Frontend E2E uses Playwright with `page.route('**/api/**')` to stub the backend. See `Jukebox-Frontend/playwright.config.ts`; the `e2e/` directory is new and the first spec lives in Task 13.

---

## Task 1: Extract `ClientIP` helper (backend, `Jukebox-Backend/`)

**Why:** The `X-Forwarded-For` / `X-Real-IP` / `RemoteAddr` parsing is duplicated verbatim three times in `internal/handlers/auth.go`. The new support handler needs the same behavior. Extracting to a helper is an in-scope DRY cleanup.

**Files:**
- Create: `Jukebox-Backend/internal/handlers/clientip.go`
- Create: `Jukebox-Backend/internal/handlers/clientip_test.go`

- [ ] **Step 1: Write the failing test**

Create `Jukebox-Backend/internal/handlers/clientip_test.go`:

```go
package handlers

import (
	"net/http/httptest"
	"testing"
)

func TestClientIP(t *testing.T) {
	tests := []struct {
		desc        string
		xff         string
		xRealIP     string
		remoteAddr  string
		want        string
	}{
		{"XFF single IP wins", "203.0.113.9", "", "10.0.0.1:4242", "203.0.113.9"},
		{"XFF comma-separated returns first entry", "203.0.113.9, 70.41.3.18", "", "10.0.0.1:4242", "203.0.113.9"},
		{"XFF comma-separated trims whitespace", "203.0.113.9 , 70.41.3.18", "", "10.0.0.1:4242", "203.0.113.9"},
		{"X-Real-IP used when no XFF", "", "198.51.100.7", "10.0.0.1:4242", "198.51.100.7"},
		{"RemoteAddr with port falls back", "", "", "10.0.0.1:4242", "10.0.0.1"},
		{"RemoteAddr without port falls back", "", "", "10.0.0.1", "10.0.0.1"},
	}

	for _, tt := range tests {
		t.Run(tt.desc, func(t *testing.T) {
			r := httptest.NewRequest("POST", "/", nil)
			if tt.xff != "" {
				r.Header.Set("X-Forwarded-For", tt.xff)
			}
			if tt.xRealIP != "" {
				r.Header.Set("X-Real-IP", tt.xRealIP)
			}
			r.RemoteAddr = tt.remoteAddr

			got := ClientIP(r)
			if got != tt.want {
				t.Errorf("ClientIP() = %q, want %q", got, tt.want)
			}
		})
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```
cd Jukebox-Backend
go test ./internal/handlers -run TestClientIP -v
```

Expected: compile error — `undefined: ClientIP`.

- [ ] **Step 3: Write the implementation**

Create `Jukebox-Backend/internal/handlers/clientip.go`:

```go
package handlers

import (
	"net/http"
	"strings"
)

// ClientIP returns the client's IP address, preferring X-Forwarded-For (first
// entry if comma-separated), then X-Real-IP, then falling back to
// r.RemoteAddr with any port stripped. This mirrors the inline logic that
// auth.go used to duplicate across Signup, Login, and password-reset flows.
func ClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if idx := strings.Index(xff, ","); idx != -1 {
			return strings.TrimSpace(xff[:idx])
		}
		return strings.TrimSpace(xff)
	}
	if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
		return realIP
	}
	addr := r.RemoteAddr
	if i := strings.LastIndex(addr, ":"); i != -1 {
		return addr[:i]
	}
	return addr
}
```

- [ ] **Step 4: Run test to verify it passes**

```
cd Jukebox-Backend
go test ./internal/handlers -run TestClientIP -v
```

Expected: all six subtests PASS.

- [ ] **Step 5: Commit**

```
cd Jukebox-Backend
git add internal/handlers/clientip.go internal/handlers/clientip_test.go
git commit -m "feat(handlers): extract ClientIP helper with XFF/X-Real-IP/RemoteAddr fallback"
```

---

## Task 2: Refactor `auth.go` to use `ClientIP`

**Why:** The three copy-pasted IP-resolution blocks in `internal/handlers/auth.go` become one call. Pure refactor — no behavior change.

**Files:**
- Modify: `Jukebox-Backend/internal/handlers/auth.go` (three call sites: the Signup handler and two others — grep `r.Header.Get("X-Forwarded-For")` within this file to find them)

- [ ] **Step 1: Locate all three sites**

```
cd Jukebox-Backend
grep -n "X-Forwarded-For" internal/handlers/auth.go
```

Expected: three hits. Each is followed by ~6–8 lines of IP-resolution logic.

- [ ] **Step 2: Replace each site with a single `ClientIP` call**

For every occurrence, replace the block:

```go
ip := r.Header.Get("X-Forwarded-For")
if ip == "" {
    ip = r.Header.Get("X-Real-IP")
}
if ip == "" {
    ip = strings.Split(r.RemoteAddr, ":")[0]
}
if idx := strings.Index(ip, ","); idx != -1 {
    ip = strings.TrimSpace(ip[:idx])
}
```

with:

```go
ip := ClientIP(r)
```

Keep `ip` as the variable name so downstream code (`signupLimiter.AllowSignup(..., ip)`, `log.Printf(... ip)`, `antispam.VerifyTurnstile(..., ip)`) is untouched.

- [ ] **Step 3: Remove the now-unused `strings` import if it's no longer needed**

Run:

```
cd Jukebox-Backend
go build ./...
```

If the build complains about an unused `strings` import in `auth.go`, remove it. If `strings` is still used elsewhere in the file (it is — `strings.ToLower`, `strings.TrimSpace`, etc.), leave the import alone.

Expected: clean build.

- [ ] **Step 4: Run the existing test suite to catch regressions**

```
cd Jukebox-Backend
go test ./...
```

Expected: all existing tests pass. `TestClientIP` passes.

- [ ] **Step 5: Commit**

```
cd Jukebox-Backend
git add internal/handlers/auth.go
git commit -m "refactor(handlers): use ClientIP helper in auth.go (3 call sites)"
```

---

## Task 3: Add `AllowSupportReport` method to `antispam.RateLimiter`

**Why:** Reuse the existing Redis-backed rate limiter with a dedicated Redis key namespace for listener-report submissions. Pattern matches `AllowSignup` / `AllowLogin`.

**Files:**
- Modify: `Jukebox-Backend/internal/antispam/ratelimit.go`

- [ ] **Step 1: Add the method**

Append to `Jukebox-Backend/internal/antispam/ratelimit.go` after `AllowLogin`:

```go
// AllowSupportReport returns true if the IP has not exceeded the
// listener-support-report rate limit (maxPerHour, same as signup).
// Uses the same fixed-window Redis INCR+EXPIRE approach as the other limiters.
func (rl *RateLimiter) AllowSupportReport(ctx context.Context, ip string) (bool, error) {
	return rl.checkRate(ctx, "support_report_rate:"+ip, int64(rl.maxPerHour))
}
```

- [ ] **Step 2: Verify it compiles**

```
cd Jukebox-Backend
go build ./...
```

Expected: clean build. No new tests are added for this method — it's a one-line delegation to the already-tested (in practice) `checkRate` path, consistent with `AllowSignup` and `AllowLogin` which also don't have unit tests in this codebase.

- [ ] **Step 3: Commit**

```
cd Jukebox-Backend
git add internal/antispam/ratelimit.go
git commit -m "feat(antispam): add AllowSupportReport rate-limit method"
```

---

## Task 4: `ListenerReportContext` + `SendListenerReport` in `email.go`

**Why:** Email method that composes and sends the support-report email. The body composition is extracted into a pure function so it's unit-testable without hitting Resend. `NewService` grows one parameter (`supportReportTo`) wired from `cfg.AdminEmail`.

**Files:**
- Modify: `Jukebox-Backend/internal/email/email.go`
- Create: `Jukebox-Backend/internal/email/email_test.go`

- [ ] **Step 1: Write the failing test for HTML composition**

Create `Jukebox-Backend/internal/email/email_test.go`:

```go
package email

import (
	"strings"
	"testing"
	"time"
)

func TestComposeListenerReportHTML_IncludesAllContext(t *testing.T) {
	ctx := ListenerReportContext{
		Category:            "gated",
		Message:             "Video says sign in to confirm you're not a bot.",
		ContactEmail:        "listener@example.com",
		CanContactBack:      true,
		UserID:              "user-42",
		RoomSlug:            "friday-night-funk",
		RoomName:            "Friday Night Funk",
		TrackID:             "track-1",
		TrackTitle:          "Apache",
		TrackArtist:         "Incredible Bongo Band",
		PlaybackPositionSec: 42.5,
		UserAgent:           "Mozilla/5.0",
		ClientIP:            "203.0.113.9",
		SubmittedAt:         time.Date(2026, 4, 23, 12, 0, 0, 0, time.UTC),
	}

	html := composeListenerReportHTML(ctx)

	for _, want := range []string{
		"gated",
		"Friday Night Funk",
		"friday-night-funk",
		"Apache",
		"Incredible Bongo Band",
		"42.5",
		"user-42",
		"listener@example.com",
		"203.0.113.9",
		"Mozilla/5.0",
		"Contact back: yes",
	} {
		if !strings.Contains(html, want) {
			t.Errorf("composeListenerReportHTML output missing %q\nGot:\n%s", want, html)
		}
	}
}

func TestComposeListenerReportHTML_EscapesUserMessage(t *testing.T) {
	ctx := ListenerReportContext{
		Category:    "other",
		Message:     `<script>alert("xss")</script>`,
		RoomSlug:    "r", RoomName: "R",
		TrackID:     "t", TrackTitle: "T", TrackArtist: "A",
		SubmittedAt: time.Now(),
	}

	html := composeListenerReportHTML(ctx)

	if strings.Contains(html, `<script>`) {
		t.Errorf("raw <script> tag leaked into HTML output:\n%s", html)
	}
	if !strings.Contains(html, "&lt;script&gt;") {
		t.Errorf("expected HTML-escaped <script> in output:\n%s", html)
	}
}

func TestComposeListenerReportHTML_ContactBackNo(t *testing.T) {
	ctx := ListenerReportContext{
		Category:       "other",
		Message:        "hello",
		CanContactBack: false,
		RoomName:       "R",
		TrackTitle:     "T",
		SubmittedAt:    time.Now(),
	}

	html := composeListenerReportHTML(ctx)

	if !strings.Contains(html, "Contact back: no") {
		t.Errorf("expected 'Contact back: no' in output:\n%s", html)
	}
}
```

- [ ] **Step 2: Run it — fails because type and function don't exist yet**

```
cd Jukebox-Backend
go test ./internal/email -v
```

Expected: `undefined: ListenerReportContext`, `undefined: composeListenerReportHTML`.

- [ ] **Step 3: Implement the type, composer, send method, and updated constructor**

Edit `Jukebox-Backend/internal/email/email.go`:

Replace the existing `Service` struct + `NewService` with:

```go
type Service struct {
	apiKey          string
	fromEmail       string
	frontendURL     string
	supportReportTo string
	devMode         bool
}

func NewService(apiKey, fromEmail, frontendURL, supportReportTo string) *Service {
	devMode := apiKey == ""
	if devMode {
		log.Println("[email] No RESEND_API_KEY set — running in dev mode (emails logged to console)")
	}
	return &Service{
		apiKey:          apiKey,
		fromEmail:       fromEmail,
		frontendURL:     frontendURL,
		supportReportTo: supportReportTo,
		devMode:         devMode,
	}
}
```

Append to the same file:

```go
// ListenerReportContext is the data collected for a single listener support
// submission. Compiled by the handler from request body + session + store
// lookups; passed whole to SendListenerReport.
type ListenerReportContext struct {
	Category            string    // "gated" | "no-audio" | "out-of-sync" | "other"
	Message             string
	ContactEmail        string    // account email if logged in, else the form's email field
	CanContactBack      bool
	UserID              string    // empty string if anonymous
	RoomSlug            string
	RoomName            string
	TrackID             string
	TrackTitle          string
	TrackArtist         string
	PlaybackPositionSec float64
	UserAgent           string
	ClientIP            string
	SubmittedAt         time.Time
}

// SendListenerReport emails the listener's support report to supportReportTo.
// If supportReportTo is empty (ADMIN_EMAIL unset), logs a warning and returns
// nil — same spirit as devMode: don't fail the request, just flag it.
func (s *Service) SendListenerReport(ctx ListenerReportContext) error {
	if s.supportReportTo == "" {
		log.Printf("[email] SUPPORT_REPORT_TO not configured — listener report dropped: %s / %s", ctx.RoomName, ctx.TrackTitle)
		return nil
	}

	subject := fmt.Sprintf("[Jukebox Support] Listener report — %s — %s", ctx.Category, ctx.RoomName)
	html := composeListenerReportHTML(ctx)
	return s.send(s.supportReportTo, subject, html)
}

// composeListenerReportHTML builds the HTML body of a listener report email.
// Factored out from SendListenerReport so it can be tested without Resend.
// The user's free-text message is HTML-escaped to avoid injecting into the
// admin's HTML-rendering email client.
func composeListenerReportHTML(ctx ListenerReportContext) string {
	contactBack := "no"
	if ctx.CanContactBack {
		contactBack = "yes"
	}

	// Each label/value pair becomes a row in a simple two-column table.
	rows := []struct{ label, value string }{
		{"Category", ctx.Category},
		{"Submitted at", ctx.SubmittedAt.UTC().Format(time.RFC3339)},
		{"User ID", valueOrDash(ctx.UserID)},
		{"Contact email", ctx.ContactEmail},
		{"Room", fmt.Sprintf("%s (%s)", ctx.RoomName, ctx.RoomSlug)},
		{"Track", fmt.Sprintf("%s — %s", ctx.TrackTitle, ctx.TrackArtist)},
		{"Track ID", valueOrDash(ctx.TrackID)},
		{"Playback position", fmt.Sprintf("%.1fs", ctx.PlaybackPositionSec)},
		{"User agent", valueOrDash(ctx.UserAgent)},
		{"Client IP", valueOrDash(ctx.ClientIP)},
	}

	var tableRows strings.Builder
	for _, r := range rows {
		tableRows.WriteString(fmt.Sprintf(
			`<tr><td style="padding:4px 12px 4px 0;color:#888;font-size:13px;">%s</td><td style="padding:4px 0;color:#f5f5f5;font-size:13px;">%s</td></tr>`,
			html.EscapeString(r.label), html.EscapeString(r.value),
		))
	}

	return fmt.Sprintf(`
		<div style="font-family: -apple-system, sans-serif; max-width: 640px; margin: 0 auto; padding: 32px 20px;">
			<h1 style="font-size: 20px; color: #f5f5f5; margin-bottom: 8px;">Listener support report</h1>
			<p style="color: #a0a0a0; font-size: 13px; margin-bottom: 24px;">
				Submitted via /help/listening. Contact back: %s.
			</p>
			<table style="border-collapse: collapse; margin-bottom: 24px;">
				%s
			</table>
			<blockquote style="margin: 0; padding: 12px 16px; border-left: 3px solid #e89a2e; background: rgba(232,154,46,0.08); color: #e8e6ea; font-size: 14px; white-space: pre-wrap;">%s</blockquote>
		</div>
	`, contactBack, tableRows.String(), html.EscapeString(ctx.Message))
}

func valueOrDash(s string) string {
	if s == "" {
		return "—"
	}
	return s
}
```

Add imports (at the top of the file): `"fmt"` and `"html"` and `"strings"` and `"time"`. If some are already present, don't duplicate. Result should look like:

```go
import (
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"log"
	"net/http"
	"strings"
	"time"
)
```

- [ ] **Step 4: Run the tests — they should pass**

```
cd Jukebox-Backend
go test ./internal/email -v
```

Expected: all three tests PASS. If the "escapes user message" test fails, verify that `html.EscapeString(ctx.Message)` is wired into the blockquote.

- [ ] **Step 5: Verify the whole repo still builds (the `NewService` signature changed)**

```
cd Jukebox-Backend
go build ./...
```

Expected: the build will fail in `cmd/server/main.go` because `email.NewService` now takes 4 args, not 3. This is fixed in Task 6 — for now, briefly expect this failure. Revert by leaving the build broken; the next backend task does not depend on `main.go` compiling, and Task 6 fixes it end-to-end.

Alternatively, fix `main.go` minimally now to keep the repo green — update the call to `email.NewService(cfg.ResendAPIKey, cfg.FromEmail, cfg.FrontendURL, cfg.AdminEmail)` and commit as part of this task. **Pick this option** to keep CI green between tasks.

Apply this tiny edit to `cmd/server/main.go` line 81:

```go
emailSvc := email.NewService(cfg.ResendAPIKey, cfg.FromEmail, cfg.FrontendURL, cfg.AdminEmail)
```

Run again:

```
cd Jukebox-Backend
go build ./...
```

Expected: clean build.

- [ ] **Step 6: Commit**

```
cd Jukebox-Backend
git add internal/email/email.go internal/email/email_test.go cmd/server/main.go
git commit -m "feat(email): add SendListenerReport + ListenerReportContext

Extends email.NewService to take supportReportTo (wired from cfg.AdminEmail).
HTML composition extracted to composeListenerReportHTML for unit testing.
User message is HTML-escaped to prevent injection into admin inboxes."
```

---

## Task 5: Support handler + validation + tests

**Why:** Ties together request parsing, anti-spam, session resolution, store lookups, and email sending. Pure-logic pieces (request validation, bot-check) are extracted to functions and unit-tested per the convention in `admin_search_test.go`.

**Files:**
- Create: `Jukebox-Backend/internal/handlers/support.go`
- Create: `Jukebox-Backend/internal/handlers/support_test.go`

- [ ] **Step 1: Write the failing test for the pure-logic helpers**

Create `Jukebox-Backend/internal/handlers/support_test.go`:

```go
package handlers

import (
	"testing"
	"time"
)

func TestValidateListenerReport(t *testing.T) {
	validAnon := listenerReportRequest{
		Category:     "gated",
		Message:      "My video is showing the signin thing and I cant hear anything please help",
		ContactEmail: "listener@example.com",
		RoomSlug:     "friday-night-funk",
		TrackID:      "track-1",
	}

	tests := []struct {
		desc       string
		req        listenerReportRequest
		hasSession bool
		wantOK     bool
	}{
		{"valid anon", validAnon, false, true},
		{"valid logged-in without email", func() listenerReportRequest { r := validAnon; r.ContactEmail = ""; return r }(), true, true},
		{"bad category", func() listenerReportRequest { r := validAnon; r.Category = "random"; return r }(), false, false},
		{"message too short", func() listenerReportRequest { r := validAnon; r.Message = "short"; return r }(), false, false},
		{"message too long", func() listenerReportRequest {
			r := validAnon
			b := make([]byte, 2001)
			for i := range b {
				b[i] = 'a'
			}
			r.Message = string(b)
			return r
		}(), false, false},
		{"anon requires email", func() listenerReportRequest { r := validAnon; r.ContactEmail = ""; return r }(), false, false},
		{"anon bad email", func() listenerReportRequest { r := validAnon; r.ContactEmail = "not-an-email"; return r }(), false, false},
	}

	for _, tt := range tests {
		t.Run(tt.desc, func(t *testing.T) {
			err := validateListenerReport(tt.req, tt.hasSession)
			if tt.wantOK && err != "" {
				t.Errorf("expected valid, got error: %s", err)
			}
			if !tt.wantOK && err == "" {
				t.Errorf("expected error, got valid")
			}
		})
	}
}

func TestIsLikelyBot(t *testing.T) {
	now := time.Now()
	nowMs := now.UnixMilli()

	tests := []struct {
		desc string
		req  listenerReportRequest
		want bool
	}{
		{"honeypot filled", listenerReportRequest{Website: "http://spam.example", OpenedAt: nowMs - 5000}, true},
		{"honeypot empty and time ok", listenerReportRequest{Website: "", OpenedAt: nowMs - 5000}, false},
		{"submitted instantly", listenerReportRequest{Website: "", OpenedAt: nowMs - 200}, true},
		{"openedAt in the future (clock skew)", listenerReportRequest{Website: "", OpenedAt: nowMs + 10000}, true},
		{"openedAt zero (missing)", listenerReportRequest{Website: "", OpenedAt: 0}, true},
	}

	for _, tt := range tests {
		t.Run(tt.desc, func(t *testing.T) {
			got := isLikelyBot(tt.req, now)
			if got != tt.want {
				t.Errorf("isLikelyBot = %v, want %v", got, tt.want)
			}
		})
	}
}
```

- [ ] **Step 2: Run — should fail because types/functions don't exist**

```
cd Jukebox-Backend
go test ./internal/handlers -run "TestValidateListenerReport|TestIsLikelyBot" -v
```

Expected: `undefined: listenerReportRequest`, `undefined: validateListenerReport`, `undefined: isLikelyBot`.

- [ ] **Step 3: Implement the handler package**

Create `Jukebox-Backend/internal/handlers/support.go`:

```go
package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/jukebox/backend/internal/email"
	"github.com/jukebox/backend/internal/middleware"
	"github.com/jukebox/backend/internal/models"
	"github.com/jukebox/backend/internal/store"
)

// ----- Dependencies (interfaces so tests can stub them) -----

// supportReportRateLimiter is the subset of antispam.RateLimiter we use.
// Declared as an interface here so tests don't need Redis.
type supportReportRateLimiter interface {
	AllowSupportReport(ctx context.Context, ip string) (bool, error)
}

// supportReportEmailer is the subset of *email.Service we use.
type supportReportEmailer interface {
	SendListenerReport(ctx email.ListenerReportContext) error
}

// supportReportStore is the subset of *store.PGStore we use for context lookup.
// GetRoomBySlug returns (nil, nil) on miss — the handler treats that as
// "unknown" rather than erroring.
type supportReportStore interface {
	GetRoomBySlug(ctx context.Context, slug string) (*models.Room, error)
}

// ----- Handler -----

type SupportHandler struct {
	pg      supportReportStore
	limiter supportReportRateLimiter
	emailer supportReportEmailer
}

func NewSupportHandler(pg *store.PGStore, limiter supportReportRateLimiter, emailer supportReportEmailer) *SupportHandler {
	return &SupportHandler{pg: pg, limiter: limiter, emailer: emailer}
}

// ----- Request shape -----

type listenerReportRequest struct {
	Category            string  `json:"category"`
	Message             string  `json:"message"`
	ContactEmail        string  `json:"contactEmail"`
	CanContactBack      bool    `json:"canContactBack"`
	OpenedAt            int64   `json:"openedAt"`
	Website             string  `json:"website"`
	RoomSlug            string  `json:"roomSlug"`
	TrackID             string  `json:"trackId"`
	PlaybackPositionSec float64 `json:"playbackPositionSec"`
}

// ----- Pure validators -----

// validateListenerReport returns "" if the request is well-formed, else a
// short error message suitable for a 400 response body.
func validateListenerReport(req listenerReportRequest, hasSession bool) string {
	switch req.Category {
	case "gated", "no-audio", "out-of-sync", "other":
	default:
		return "invalid category"
	}
	if n := len(strings.TrimSpace(req.Message)); n < 10 || n > 2000 {
		return "message must be 10–2000 characters"
	}
	if !hasSession {
		if req.ContactEmail == "" {
			return "contactEmail required for anonymous reports"
		}
		if _, err := mail.ParseAddress(req.ContactEmail); err != nil {
			return "invalid contactEmail"
		}
	}
	return ""
}

// isLikelyBot returns true if the honeypot or minimum-submission-time check
// trips. Missing openedAt (zero) or openedAt in the future (>0 skew) is
// treated as a trip to avoid a trivial bypass.
func isLikelyBot(req listenerReportRequest, now time.Time) bool {
	if req.Website != "" {
		return true
	}
	if req.OpenedAt <= 0 {
		return true
	}
	nowMs := now.UnixMilli()
	if req.OpenedAt > nowMs {
		return true
	}
	return nowMs-req.OpenedAt < 2000
}

// ----- HTTP handler -----

// CreateListenerReport handles POST /api/support/listener-report.
func (h *SupportHandler) CreateListenerReport(w http.ResponseWriter, r *http.Request) {
	var req listenerReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	user := middleware.GetUser(r.Context())
	hasSession := user != nil

	if msg := validateListenerReport(req, hasSession); msg != "" {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	// Silent-drop branches: return 200 so the bot can't learn which check it tripped.
	if isLikelyBot(req, time.Now()) {
		writeOK(w)
		return
	}

	ip := ClientIP(r)

	if h.limiter != nil {
		allowed, err := h.limiter.AllowSupportReport(r.Context(), ip)
		if err != nil {
			log.Printf("[support] rate limit check error: %v", err)
			// Fail open — consistent with existing signup limiter behavior.
		}
		if !allowed {
			http.Error(w, "You've sent a lot of reports — please email support@jukebox-app.com directly.", http.StatusTooManyRequests)
			return
		}
	}

	// Resolve context: session > room lookup > track lookup. Misses become "(unknown)".
	contactEmail := req.ContactEmail
	userID := ""
	if user != nil {
		contactEmail = user.Email
		userID = user.ID
	}

	roomName := "(unknown)"
	if h.pg != nil && req.RoomSlug != "" {
		if room, err := h.pg.GetRoomBySlug(r.Context(), req.RoomSlug); err == nil && room != nil {
			roomName = room.Name
		}
	}

	trackTitle, trackArtist := "(unknown)", "(unknown)"
	if h.pg != nil && req.TrackID != "" {
		if track, err := h.pg.GetTrackByID(r.Context(), req.TrackID); err == nil && track != nil {
			trackTitle = track.Title
			trackArtist = track.Artist
		}
	}

	ctx := email.ListenerReportContext{
		Category:            req.Category,
		Message:             strings.TrimSpace(req.Message),
		ContactEmail:        contactEmail,
		CanContactBack:      req.CanContactBack,
		UserID:              userID,
		RoomSlug:            req.RoomSlug,
		RoomName:            roomName,
		TrackID:             req.TrackID,
		TrackTitle:          trackTitle,
		TrackArtist:         trackArtist,
		PlaybackPositionSec: req.PlaybackPositionSec,
		UserAgent:           r.UserAgent(),
		ClientIP:            ip,
		SubmittedAt:         time.Now().UTC(),
	}

	if err := h.emailer.SendListenerReport(ctx); err != nil {
		log.Printf("[support] SendListenerReport failed: %v", err)
		http.Error(w, "couldn't send — please try again or email support@jukebox-app.com", http.StatusInternalServerError)
		return
	}

	writeOK(w)
}

func writeOK(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"ok":true}`))
}
```

- [ ] **Step 4: Update the request shape and handler body for client-supplied track fields**

The store has `GetRoomBySlug(ctx, slug) (*models.Room, error)` returning a `*models.Room` with `.Name` (confirmed in `internal/store/postgres.go:118` and `internal/models/models.go:44`). The interface in Step 3 uses exactly this method — no change needed.

There is no `GetTrackByID` that covers both autoplay and user-requested tracks. Rather than reimplementing track-context lookup server-side, the client supplies `trackTitle` and `trackArtist` in the request body (the player already knows them). They're not security-sensitive — the only consumer is the admin email and an attacker gains nothing by spoofing their own title.

Update `listenerReportRequest` in `support.go` to add these two fields:

```go
type listenerReportRequest struct {
	Category            string  `json:"category"`
	Message             string  `json:"message"`
	ContactEmail        string  `json:"contactEmail"`
	CanContactBack      bool    `json:"canContactBack"`
	OpenedAt            int64   `json:"openedAt"`
	Website             string  `json:"website"`
	RoomSlug            string  `json:"roomSlug"`
	TrackID             string  `json:"trackId"`
	TrackTitle          string  `json:"trackTitle"`
	TrackArtist         string  `json:"trackArtist"`
	PlaybackPositionSec float64 `json:"playbackPositionSec"`
}
```

Replace the track-resolution block in `CreateListenerReport` with:

```go
	trackTitle := req.TrackTitle
	if trackTitle == "" {
		trackTitle = "(unknown)"
	}
	trackArtist := req.TrackArtist
	if trackArtist == "" {
		trackArtist = "(unknown)"
	}
```

Leave the room lookup as shown in Step 3 (server-side via `GetRoomBySlug`) — the room name is available and worth verifying server-side so listeners can't spoof well-known room names.

- [ ] **Step 5: Run tests**

```
cd Jukebox-Backend
go test ./internal/handlers -run "TestValidateListenerReport|TestIsLikelyBot" -v
```

Expected: all subtests PASS.

Also run the full repo test suite:

```
go test ./...
go build ./...
```

Both should succeed.

- [ ] **Step 6: Commit**

```
cd Jukebox-Backend
git add internal/handlers/support.go internal/handlers/support_test.go
git commit -m "feat(handlers): add POST /api/support/listener-report

Handler with tiered anti-spam: honeypot, min-submit-time, per-IP rate
limit (reuses antispam.RateLimiter). Pure validators extracted for
unit testing; dependencies abstracted behind interfaces matching the
pattern established in admin_search.go."
```

---

## Task 6: Register the handler in `main.go`

**Why:** The support endpoint needs to be reachable. Also wires the support handler with the existing rate limiter.

**Files:**
- Modify: `Jukebox-Backend/cmd/server/main.go`

- [ ] **Step 1: Construct the handler**

In the `// ---------- Handlers ----------` section, add (after `monH := handlers.NewMonetizationHandler(...)`):

```go
	supportH := handlers.NewSupportHandler(pg, signupLimiter, emailSvc)
```

Note: we pass `signupLimiter` — it's a single `*antispam.RateLimiter`. It already has `AllowSignup`, `AllowLogin`, and (after Task 3) `AllowSupportReport`. No need for a second limiter instance.

- [ ] **Step 2: Register the route**

In the `r.Route("/api", func(r chi.Router) { ... })` block, add (near the auth routes, or in a dedicated `// Support` block):

```go
		// Support / listener reports (public — anonymous listeners can submit)
		r.Post("/support/listener-report", supportH.CreateListenerReport)
```

- [ ] **Step 3: Build and smoke-test**

```
cd Jukebox-Backend
go build ./...
go test ./...
```

Expected: clean build, all tests pass. If you have a local dev server and Redis running:

```
go run ./cmd/server
# in another shell:
curl -i -X POST http://localhost:8080/api/support/listener-report \
  -H "Content-Type: application/json" \
  -d '{"category":"gated","message":"this is a test message from curl","contactEmail":"test@example.com","canContactBack":true,"openedAt":1,"website":"","roomSlug":"nonexistent","trackId":"t1","trackTitle":"T","trackArtist":"A","playbackPositionSec":0}'
```

`openedAt:1` trips the time check → expect `200 {"ok":true}` with no email sent. With a real `openedAt` (current ms - 5000) and `RESEND_API_KEY` set, expect an email to arrive at `ADMIN_EMAIL`. In dev mode (no Resend key), expect the email to be logged to stdout.

- [ ] **Step 4: Commit**

```
cd Jukebox-Backend
git add cmd/server/main.go
git commit -m "feat(server): register POST /api/support/listener-report"
```

---

## Task 7: `TroubleshooterRow` accordion component (frontend)

**Why:** The existing `FAQItem` only accepts `{ q: string; a: string }`. Troubleshooter remedies need lists, links, and buttons, so we need a variant accepting `ReactNode` for the body. The existing `FAQItem` stays untouched (used by `/support`).

**Files:**
- Create: `Jukebox-Frontend/components/help/troubleshooter-row.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client"

import { ChevronDown } from "lucide-react"
import type { ReactNode } from "react"

interface TroubleshooterRowProps {
  id: string                // anchor id for deep-linking (e.g., "gated")
  title: string             // the symptom question
  open: boolean             // controlled open state (parent manages "only one open at a time")
  onToggle: () => void
  children: ReactNode       // remedy content
}

export function TroubleshooterRow({ id, title, open, onToggle, children }: TroubleshooterRowProps) {
  return (
    <div id={id} className="border-b border-border/30 last:border-0 scroll-mt-16">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-body`}
        className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-foreground"
      >
        <span className="font-sans text-sm font-medium text-foreground pr-4">{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div id={`${id}-body`} className="pb-4 pr-8 font-sans text-sm text-muted-foreground leading-relaxed space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```
cd Jukebox-Frontend
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
cd Jukebox-Frontend
git add components/help/troubleshooter-row.tsx
git commit -m "feat(help): add TroubleshooterRow accordion component"
```

---

## Task 8: `/help/listening` page (static content, no form yet)

**Why:** The troubleshooter content on its own. The "Contact support" button is a placeholder (disabled or logging only) until Task 10 wires the modal in.

**Files:**
- Create: `Jukebox-Frontend/app/help/listening/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { TroubleshooterRow } from "@/components/help/troubleshooter-row"

type RowId = "gated" | "no-audio" | "out-of-sync" | "unavailable"

const ROWS: Array<{ id: RowId; title: string; render: () => React.ReactNode }> = [
  {
    id: "gated",
    title: `Video says "Sign in to confirm you're not a bot."`,
    render: () => (
      <>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Open <a href="https://youtube.com" target="_blank" rel="noreferrer" className="underline underline-offset-2">youtube.com</a> in a new tab of this browser and sign into your YouTube account.</li>
          <li>Come back to this tab and refresh the page. The video should load normally.</li>
        </ol>
        <p className="text-xs">
          Why this happens: YouTube requires a signed-in session for some embedded videos. It's a YouTube anti-abuse check that affects every site embedding their player — not a Jukebox issue.
        </p>
      </>
    ),
  },
  {
    id: "no-audio",
    title: `I can't hear anything.`,
    render: () => (
      <ul className="list-disc pl-5 space-y-1">
        <li>Click the play button once — browsers block audio until you interact with the page.</li>
        <li>Check your browser tab isn't muted (right-click the tab).</li>
        <li>Check the volume slider in the Jukebox player.</li>
        <li>Check your system volume and output device.</li>
      </ul>
    ),
  },
  {
    id: "out-of-sync",
    title: `The track is out of sync with my friends.`,
    render: () => (
      <ul className="list-disc pl-5 space-y-1">
        <li>Refresh the page — Jukebox will re-seek to the room's current position.</li>
        <li>Persistent drift usually means a slow or unstable connection. Try a different network.</li>
      </ul>
    ),
  },
  {
    id: "unavailable",
    title: `The video is black or says "Video unavailable."`,
    render: () => (
      <>
        <p>The uploader removed the video or changed its embed permissions. The room will move on to the next track.</p>
        <p className="text-xs">This is rare — autoplay tracks are screened before they're added, and user-DJs vet their own queues.</p>
      </>
    ),
  },
]

export default function ListeningTroubleshooterPage() {
  const params = useSearchParams()
  const [openId, setOpenId] = useState<RowId | "still-stuck" | null>(null)

  // Deep-link support: #gated / #no-audio / #out-of-sync / #unavailable / #still-stuck
  useEffect(() => {
    if (typeof window === "undefined") return
    const hash = window.location.hash.replace("#", "")
    if (hash) {
      const known: (RowId | "still-stuck")[] = ["gated", "no-audio", "out-of-sync", "unavailable", "still-stuck"]
      if ((known as string[]).includes(hash)) setOpenId(hash as RowId | "still-stuck")
    }
  }, [])

  const roomSlug = params.get("room") || ""
  const trackId = params.get("track") || ""
  const trackTitle = params.get("trackTitle") || ""
  const trackArtist = params.get("trackArtist") || ""
  const playbackPositionSec = Number(params.get("pos") || 0)

  const handleContactClick = () => {
    // Wired in Task 10 to open the ContactSupportForm modal.
    console.log("[help/listening] contact support clicked", { roomSlug, trackId, trackTitle, trackArtist, playbackPositionSec })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6">
      <h1 className="font-sans text-3xl font-bold text-foreground mb-2">Trouble listening?</h1>
      <p className="font-sans text-sm text-muted-foreground mb-10">
        Pick the issue you're seeing — most things have a quick fix.
      </p>

      <div className="rounded-xl border border-border/40 px-4 mb-6" style={{ background: "oklch(0.14 0.01 280 / 0.5)" }}>
        {ROWS.map((row) => (
          <TroubleshooterRow
            key={row.id}
            id={row.id}
            title={row.title}
            open={openId === row.id}
            onToggle={() => setOpenId(openId === row.id ? null : row.id)}
          >
            {row.render()}
          </TroubleshooterRow>
        ))}

        {/* Row 5 — Still stuck? (no expand behavior, renders as button-style) */}
        <div id="still-stuck" className="py-4 scroll-mt-16">
          <div className="flex items-center justify-between gap-4">
            <span className="font-sans text-sm font-medium text-foreground">Still stuck?</span>
            <button
              type="button"
              onClick={handleContactClick}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-sans text-sm font-semibold transition-colors"
              style={{ background: "#e89a2e", color: "#0a0a0a" }}
            >
              <MessageCircle className="h-4 w-4" />
              Contact support
            </button>
          </div>
        </div>
      </div>

      <p className="font-sans text-xs text-muted-foreground">
        Looking for general account, billing, or room help? Visit the <Link href="/support" className="underline">support page</Link>.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Dev-server check**

```
cd Jukebox-Frontend
pnpm dev
# Open http://localhost:3000/help/listening
```

Expected: page loads, 5 rows render, only one opens at a time. `#gated` in the URL opens row 1 on load. "Contact support" logs to console.

- [ ] **Step 3: Type-check**

```
cd Jukebox-Frontend
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```
cd Jukebox-Frontend
git add app/help/listening/page.tsx
git commit -m "feat(help): add /help/listening troubleshooter page"
```

---

## Task 9: `ContactSupportForm` modal component

**Why:** The form itself — all fields, client validation, submission handling, confirmation and error states. Kept in its own component so the help page just wires it in.

**Files:**
- Create: `Jukebox-Frontend/components/help/contact-support-form.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface ContactSupportFormProps {
  open: boolean
  onClose: () => void
  defaultCategory?: "gated" | "no-audio" | "out-of-sync" | "other"
  roomSlug?: string
  trackId?: string
  trackTitle?: string
  trackArtist?: string
  playbackPositionSec?: number
}

type Status = "idle" | "submitting" | "success" | "rate_limited" | "error"

export function ContactSupportForm({
  open,
  onClose,
  defaultCategory = "other",
  roomSlug = "",
  trackId = "",
  trackTitle = "",
  trackArtist = "",
  playbackPositionSec = 0,
}: ContactSupportFormProps) {
  const { user } = useAuth()
  const isAnon = !user

  const openedAtRef = useRef(Date.now())
  const [category, setCategory] = useState<ContactSupportFormProps["defaultCategory"]>(defaultCategory)
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [canContactBack, setCanContactBack] = useState(true)
  const [website, setWebsite] = useState("") // honeypot
  const [status, setStatus] = useState<Status>("idle")
  const [clientError, setClientError] = useState<string>("")

  // Reset openedAt whenever the modal re-opens (so the min-submit-time check is honest).
  useEffect(() => {
    if (open) {
      openedAtRef.current = Date.now()
      setStatus("idle")
      setClientError("")
      setCategory(defaultCategory)
      setMessage("")
      setEmail("")
      setCanContactBack(true)
      setWebsite("")
    }
  }, [open, defaultCategory])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setClientError("")

    if (message.trim().length < 10 || message.trim().length > 2000) {
      setClientError("Please write a 10–2000 character description.")
      return
    }
    if (isAnon) {
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        setClientError("Please enter a valid email address.")
        return
      }
    }

    setStatus("submitting")

    const payload = {
      category,
      message: message.trim(),
      contactEmail: isAnon ? email : "",
      canContactBack,
      openedAt: openedAtRef.current,
      website,
      roomSlug,
      trackId,
      trackTitle,
      trackArtist,
      playbackPositionSec,
    }

    try {
      const res = await fetch("/api/support/listener-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setStatus("success")
        return
      }
      if (res.status === 429) {
        setStatus("rate_limited")
        return
      }
      setStatus("error")
    } catch {
      setStatus("error")
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-support-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border/40 p-6 shadow-xl"
        style={{ background: "oklch(0.12 0.02 280)" }}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id="contact-support-title" className="font-sans text-lg font-bold text-foreground">Contact support</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {status === "success" ? (
          <div className="space-y-4">
            <p className="font-sans text-sm text-foreground">
              Thanks — we'll reply within 24–48 hours.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg px-4 py-2 font-sans text-sm font-semibold"
              style={{ background: "#e89a2e", color: "#0a0a0a" }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-sans text-xs font-medium text-muted-foreground mb-1">
                Issue
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ContactSupportFormProps["defaultCategory"])}
                className="w-full rounded-lg border border-border/40 px-3 py-2 font-sans text-sm text-foreground"
                style={{ background: "oklch(0.14 0.01 280 / 0.5)" }}
              >
                <option value="gated">Video wants me to sign in (bot check)</option>
                <option value="no-audio">I can't hear anything</option>
                <option value="out-of-sync">I'm out of sync with others</option>
                <option value="other">Something else</option>
              </select>
            </div>

            <div>
              <label className="block font-sans text-xs font-medium text-muted-foreground mb-1">
                What's happening?
              </label>
              <textarea
                aria-label="What's happening?"
                required
                minLength={10}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border/40 px-3 py-2 font-sans text-sm text-foreground"
                style={{ background: "oklch(0.14 0.01 280 / 0.5)" }}
                placeholder="Describe what you're seeing or hearing…"
              />
            </div>

            {isAnon && (
              <div>
                <label className="block font-sans text-xs font-medium text-muted-foreground mb-1">
                  Your email
                </label>
                <input
                  type="email"
                  aria-label="Your email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border/40 px-3 py-2 font-sans text-sm text-foreground"
                  style={{ background: "oklch(0.14 0.01 280 / 0.5)" }}
                  placeholder="you@example.com"
                />
              </div>
            )}

            <label className="flex items-center gap-2 font-sans text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={canContactBack}
                onChange={(e) => setCanContactBack(e.target.checked)}
              />
              It's okay to reply to me.
            </label>

            {/* Honeypot — hidden from real users, off the tab order */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />

            {clientError && (
              <p className="font-sans text-xs" style={{ color: "oklch(0.70 0.20 25)" }}>{clientError}</p>
            )}

            {status === "rate_limited" && (
              <p className="font-sans text-xs" style={{ color: "oklch(0.70 0.20 25)" }}>
                You've sent a lot of reports — please email support@jukebox-app.com directly.
              </p>
            )}
            {status === "error" && (
              <p className="font-sans text-xs" style={{ color: "oklch(0.70 0.20 25)" }}>
                Couldn't send. Please email support@jukebox-app.com directly.
              </p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-lg px-4 py-2 font-sans text-sm font-semibold disabled:opacity-60"
              style={{ background: "#e89a2e", color: "#0a0a0a" }}
            >
              {status === "submitting" ? "Sending…" : "Send"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```
cd Jukebox-Frontend
pnpm exec tsc --noEmit
```

Expected: no errors. If `useAuth` returns a different shape for `user`, adjust the `isAnon = !user` check accordingly.

- [ ] **Step 3: Commit**

```
cd Jukebox-Frontend
git add components/help/contact-support-form.tsx
git commit -m "feat(help): add ContactSupportForm modal with tier-A anti-spam"
```

---

## Task 10: Wire `ContactSupportForm` into `/help/listening` page

**Why:** Hook up the "Contact support" button to open the modal, pass in the room/track context from the query params, and prefill the category.

**Files:**
- Modify: `Jukebox-Frontend/app/help/listening/page.tsx`

- [ ] **Step 1: Update the page to manage modal state**

In `Jukebox-Frontend/app/help/listening/page.tsx`:

1. Add an import for the form:
```tsx
import { ContactSupportForm } from "@/components/help/contact-support-form"
```

2. In the component, add modal state:
```tsx
const [modalOpen, setModalOpen] = useState(false)
```

3. Map the currently-open row to the form's default category:
```tsx
const defaultCategory: "gated" | "no-audio" | "out-of-sync" | "other" =
  openId === "gated" || openId === "no-audio" || openId === "out-of-sync" ? openId : "other"
```

4. Change `handleContactClick` to:
```tsx
const handleContactClick = () => setModalOpen(true)
```

5. Render the modal below the main layout (inside the outer `<div>`):
```tsx
<ContactSupportForm
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  defaultCategory={defaultCategory}
  roomSlug={roomSlug}
  trackId={trackId}
  trackTitle={trackTitle}
  trackArtist={trackArtist}
  playbackPositionSec={playbackPositionSec}
/>
```

All context fields are read from URL query params (`room`, `track`, `trackTitle`, `trackArtist`, `pos`) already wired in Task 8. If the query string is missing a field (e.g., someone visits `/help/listening` directly), the backend tolerates missing values → `"(unknown)"` in the email body.

- [ ] **Step 2: Dev-server manual check**

```
cd Jukebox-Frontend
pnpm dev
# Open http://localhost:3000/help/listening?room=test-room&track=abc#gated
```

Verify:
- Row 1 (`gated`) is open.
- Click "Contact support" — modal opens, category is "gated".
- Fill in message + email, click Send — assuming the backend is running with dev email mode, the email should be logged to the backend's console.
- On success, confirmation replaces form.

- [ ] **Step 3: Commit**

```
cd Jukebox-Frontend
git add app/help/listening/page.tsx
git commit -m "feat(help): wire ContactSupportForm into troubleshooter page"
```

---

## Task 11: "Trouble listening?" link on listener view

**Why:** Entry point from the listener view. A low-emphasis text link at the bottom of the layout with the active room slug and current track ID threaded through.

**Files:**
- Modify: `Jukebox-Frontend/app/room/[slug]/room-client.tsx` (add near the bottom of the rendered listener tree)

- [ ] **Step 1: Find the right place in the listener branch**

Open `Jukebox-Frontend/app/room/[slug]/room-client.tsx`. There will be a branch that renders the listener (non-DJ) view. Look for the bottom of that JSX block — typically below `<ListenerChatColumn>` or after the main grid. The link should not be visible on the DJ view.

- [ ] **Step 2: Grab current track context in scope**

The `slug` prop is already in scope. `useRoomCurrentTrack()` is already imported from `@/hooks/room-store` (see the top of `room-client.tsx`). Its return type is `APITrack | null` (from `lib/api.ts:274`) with fields `id`, `title`, `artist`. If `useRoomCurrentTrack` is already called elsewhere in the component, reuse that value; otherwise:

```tsx
const currentTrack = useRoomCurrentTrack()
const trackId = currentTrack?.id ?? ""
const trackTitle = currentTrack?.title ?? ""
const trackArtist = currentTrack?.artist ?? ""
```

Playback position is *derived* from `useRoomPlaybackState()` — the state has `startedAt` (unix ms), `isPlaying` (bool), `pausePosition` (seconds). Compute the approximate "now" position:

```tsx
const playbackState = useRoomPlaybackState()
let rawPos = 0
if (playbackState) {
  rawPos = playbackState.isPlaying && playbackState.startedAt > 0
    ? Math.max(0, (Date.now() - playbackState.startedAt) / 1000)
    : playbackState.pausePosition
}
const playbackPos = Math.round(rawPos * 10) / 10 // one decimal, cleaner URL
```

This is computed at render time. It'll be a snapshot at the moment the user clicks — close enough for a support report.

- [ ] **Step 3: Add the link in the listener branch**

Render a footer-style link at the bottom of the listener view:

```tsx
<div className="flex justify-center py-4">
  <Link
    href={`/help/listening?${new URLSearchParams({
      room: slug,
      ...(trackId ? { track: trackId } : {}),
      ...(trackTitle ? { trackTitle } : {}),
      ...(trackArtist ? { trackArtist } : {}),
      ...(playbackPos ? { pos: String(playbackPos) } : {}),
    }).toString()}`}
    className="font-sans text-xs underline underline-offset-2"
    style={{ color: "rgba(232,230,234,0.4)" }}
  >
    Trouble listening?
  </Link>
</div>
```

`URLSearchParams` handles the encoding. Ensure `import Link from "next/link"` is already present (it is).

- [ ] **Step 4: Manual check**

```
cd Jukebox-Frontend
pnpm dev
# Open a listener-view room, e.g., http://localhost:3000/room/some-slug
```

Verify:
- The "Trouble listening?" link is visible at the bottom of the listener layout.
- Clicking it takes you to `/help/listening?room=some-slug&track=...`.
- The DJ view (if you're signed in as a DJ for the room) does not render the link.

- [ ] **Step 5: Commit**

```
cd Jukebox-Frontend
git add app/room/[slug]/room-client.tsx
git commit -m "feat(room): add Trouble listening? link on listener view"
```

---

## Task 12: Cross-link from `/support` page

**Why:** Users who go to the global support page should find the listening troubleshooter.

**Files:**
- Modify: `Jukebox-Frontend/app/support/page.tsx`

- [ ] **Step 1: Add a one-line pointer near the top of the page**

The file currently has (near the top of `SupportPage`):

```tsx
<p className="font-sans text-sm text-muted-foreground mb-10">
  Find answers to common questions or get in touch with our team.
</p>
```

**Insert the following block immediately after that `<p>` element** (so the new callout appears above the FAQ):

```tsx
<div
  className="mb-10 rounded-xl border border-border/40 px-4 py-3 flex items-center justify-between"
  style={{ background: "oklch(0.14 0.01 280 / 0.5)" }}
>
  <span className="font-sans text-sm text-muted-foreground">Playback or audio problem? Check the listening troubleshooter.</span>
  <Link href="/help/listening" className="font-sans text-sm font-semibold underline underline-offset-2" style={{ color: "#e89a2e" }}>
    Trouble listening? →
  </Link>
</div>
```

Add `import Link from "next/link"` at the top of the file if not already present (grep: it isn't — the file currently uses `<a href>` for mailto, not `Link`).

- [ ] **Step 2: Type-check + dev check**

```
cd Jukebox-Frontend
pnpm exec tsc --noEmit
pnpm dev
# Open http://localhost:3000/support
```

Verify the new pointer is visible above the FAQ, links to `/help/listening`.

- [ ] **Step 3: Commit**

```
cd Jukebox-Frontend
git add app/support/page.tsx
git commit -m "docs(support): link to /help/listening from support page"
```

---

## Task 13: Playwright E2E — troubleshooter flow

**Why:** Covers the user-visible contract end-to-end with a mocked backend. First spec in this repo's `e2e/` directory.

**Files:**
- Create: `Jukebox-Frontend/e2e/listener-troubleshooter.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from "@playwright/test"

test.describe("Listener troubleshooter", () => {
  test("renders all 5 rows and expands one at a time", async ({ page }) => {
    await page.goto("/help/listening")

    await expect(page.getByRole("heading", { name: "Trouble listening?" })).toBeVisible()

    const gatedRow = page.getByRole("button", { name: /Sign in to confirm you're not a bot/i })
    const noAudioRow = page.getByRole("button", { name: /I can't hear anything/i })

    // Both initially collapsed.
    await expect(gatedRow).toHaveAttribute("aria-expanded", "false")
    await expect(noAudioRow).toHaveAttribute("aria-expanded", "false")

    // Open gated row.
    await gatedRow.click()
    await expect(gatedRow).toHaveAttribute("aria-expanded", "true")

    // Open no-audio; gated should collapse.
    await noAudioRow.click()
    await expect(noAudioRow).toHaveAttribute("aria-expanded", "true")
    await expect(gatedRow).toHaveAttribute("aria-expanded", "false")
  })

  test("deep-link #gated opens the gated row on load", async ({ page }) => {
    await page.goto("/help/listening#gated")
    const gatedRow = page.getByRole("button", { name: /Sign in to confirm you're not a bot/i })
    await expect(gatedRow).toHaveAttribute("aria-expanded", "true")
  })

  test("anonymous submission — happy path", async ({ page }) => {
    let capturedPayload: any = null
    await page.route("**/api/support/listener-report", async (route) => {
      capturedPayload = JSON.parse(route.request().postData() || "{}")
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    })

    await page.goto("/help/listening?room=test-room&track=track-1#gated")
    await page.getByRole("button", { name: /Contact support/i }).click()

    // Modal is open with "gated" as default category.
    const dialog = page.getByRole("dialog", { name: /Contact support/i })
    await expect(dialog).toBeVisible()

    // Force the min-submit-time check to pass by waiting.
    await page.waitForTimeout(2100)

    await dialog.getByRole("textbox", { name: /What's happening/i }).fill("Video is asking me to sign in to confirm im not a bot.")
    await dialog.getByRole("textbox", { name: /Your email/i }).fill("listener@example.com")
    await dialog.getByRole("button", { name: /^Send$/ }).click()

    // Confirmation appears.
    await expect(dialog.getByText(/Thanks — we'll reply within 24–48 hours/i)).toBeVisible()

    // Payload assertions.
    expect(capturedPayload.category).toBe("gated")
    expect(capturedPayload.contactEmail).toBe("listener@example.com")
    expect(capturedPayload.roomSlug).toBe("test-room")
    expect(capturedPayload.trackId).toBe("track-1")
    expect(capturedPayload.website).toBe("")
    expect(typeof capturedPayload.openedAt).toBe("number")
  })

  test("rate-limited response shows fallback message", async ({ page }) => {
    await page.route("**/api/support/listener-report", async (route) => {
      await route.fulfill({ status: 429, contentType: "text/plain", body: "rate limited" })
    })

    await page.goto("/help/listening")
    await page.getByRole("button", { name: /Contact support/i }).click()

    const dialog = page.getByRole("dialog", { name: /Contact support/i })
    await page.waitForTimeout(2100)

    await dialog.getByRole("textbox", { name: /What's happening/i }).fill("Some kind of issue that is longer than ten chars.")
    await dialog.getByRole("textbox", { name: /Your email/i }).fill("listener@example.com")
    await dialog.getByRole("button", { name: /^Send$/ }).click()

    await expect(dialog.getByText(/please email support@jukebox-app.com directly/i)).toBeVisible()
  })

  test("network error shows Couldn't send fallback", async ({ page }) => {
    await page.route("**/api/support/listener-report", async (route) => {
      await route.abort()
    })

    await page.goto("/help/listening")
    await page.getByRole("button", { name: /Contact support/i }).click()

    const dialog = page.getByRole("dialog", { name: /Contact support/i })
    await page.waitForTimeout(2100)

    await dialog.getByRole("textbox", { name: /What's happening/i }).fill("Some kind of issue that is longer than ten chars.")
    await dialog.getByRole("textbox", { name: /Your email/i }).fill("listener@example.com")
    await dialog.getByRole("button", { name: /^Send$/ }).click()

    await expect(dialog.getByText(/Couldn't send/i)).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the E2E spec**

```
cd Jukebox-Frontend
pnpm test:e2e listener-troubleshooter.spec.ts
```

Expected: all five tests PASS. If the `/api/support/listener-report` hitting a real backend causes non-deterministic fallthroughs, the `page.route` stubs should intercept before that — double-check the URL pattern `**/api/support/listener-report` matches how the frontend calls it (relative path vs absolute).

- [ ] **Step 3: Commit**

```
cd Jukebox-Frontend
git add e2e/listener-troubleshooter.spec.ts
git commit -m "test(e2e): add listener-troubleshooter flow coverage"
```

---

## Task 14: Manual smoke test (cross-repo)

**Why:** Unit + E2E tests stub the backend. Before declaring done, verify the whole pipeline — including real Resend delivery if configured — works end-to-end.

- [ ] **Step 1: Run both services locally**

Backend:
```
cd Jukebox-Backend
go run ./cmd/server
```

Frontend:
```
cd Jukebox-Frontend
pnpm dev
```

Ensure the backend has:
- `RESEND_API_KEY` set (otherwise emails go to stdout — still fine for smoke).
- `ADMIN_EMAIL` set (otherwise `SendListenerReport` logs a warning and drops).
- `REDIS_URL` pointing at a running Redis (rate limiter requires it).

- [ ] **Step 2: Walk through the user flow**

1. Open a listener room (e.g., an autoplay one) as a logged-out browser.
2. Scroll to the bottom — click "Trouble listening?".
3. Verify the URL has `?room=...&track=...` in the query.
4. Expand row 1. Verify the YouTube instructions render. (You don't actually need to trigger the bot gate; this is verifying the content.)
5. Click "Contact support" — modal opens with category = `gated`.
6. Enter a short message (< 10 chars) → confirm inline error appears.
7. Enter a valid message + email. Click Send.
8. Confirm the Resend inbox (or backend stdout in dev mode) shows a well-formatted email containing:
   - Category, room name, track title/artist, playback position, user-agent, client IP.
   - The user's message in a blockquote.
   - "Contact back: yes/no" at the top.

- [ ] **Step 3: Exercise anti-spam layers**

1. **Honeypot:** use devtools → set the hidden `website` input to something before submitting. Expect the confirmation to appear as if successful, but no email arrives.
2. **Min-submit-time:** open the modal and immediately submit within 2s. Same silent-success, no email.
3. **Rate limit:** submit 6 valid reports within a minute from the same IP. The 6th returns 429 → the rate-limit fallback message shows.

- [ ] **Step 4: Authenticated path**

1. Sign in to Jukebox. Go to `/help/listening`.
2. Click "Contact support" — email field should NOT be rendered.
3. Submit. Confirm the admin inbox shows the user's account email and `UserID`, not whatever the request body contained.

- [ ] **Step 5: Report results**

Write a short paragraph summarizing: email was/was not delivered, context fields were correct, all anti-spam layers behaved as intended, both auth paths work.

---

## Self-Review Notes

**Spec coverage check:**
- ✅ `/help/listening` page with 5 accordion rows — Task 8
- ✅ `TroubleshooterRow` extension — Task 7
- ✅ `ContactSupportForm` modal with all fields + honeypot — Task 9
- ✅ "Trouble listening?" link on listener view — Task 11
- ✅ Support page cross-link — Task 12
- ✅ `POST /api/support/listener-report` with all processing steps — Task 5 + Task 6
- ✅ `antispam.RateLimiter.AllowSupportReport` reuse — Task 3
- ✅ `ListenerReportContext` + `SendListenerReport` + `composeListenerReportHTML` tests — Task 4
- ✅ `ClientIP` helper + refactor — Tasks 1 + 2
- ✅ Backend tests for pure validators (`validateListenerReport`, `isLikelyBot`) — Task 5
- ✅ Frontend E2E tests — Task 13
- ✅ Manual smoke — Task 14

**Deliberate omissions** (all noted in the spec or plan):
- No Redis-integration unit test for `AllowSupportReport` (matches the existing convention — `AllowSignup` and `AllowLogin` are similarly unit-untested).
- No Playwright stub for the honeypot / min-submit-time silent-drop (covered by backend unit tests instead; adding E2E for silent-drop would require asserting on a non-observable outcome).
- `trackTitle` / `trackArtist` passed from client rather than looked up server-side (simpler; trust is acceptable because the only consumer is the admin inbox).

**Open decision (reiterated):** Set `ADMIN_EMAIL` to `admin@jukebox-app.com` or `support@jukebox-app.com`? Env-var-driven so easy to flip.
