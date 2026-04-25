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
