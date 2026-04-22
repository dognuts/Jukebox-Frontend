import { test as base, type Page } from "@playwright/test"

// A fake admin user the mocks return for `GET /api/auth/me`. Matches the
// AuthUser interface from lib/auth-context.tsx.
export const FAKE_ADMIN_USER = {
  id: "admin-test-1",
  email: "admin@test.local",
  emailVerified: true,
  displayName: "Admin Test",
  avatarColor: "#e89a3c",
  bio: "",
  favoriteGenres: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  isAdmin: true,
}

/**
 * Signs the browser context in as a fake admin by setting a localStorage
 * token that the AuthProvider reads on boot. Must be called before page.goto.
 *
 * Call `mockAdminAuth(page)` alongside this to intercept the
 * `/api/auth/me` call that the AuthProvider fires on mount.
 */
export async function seedAdminSession(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("jukebox_access_token", "fake-admin-token")
    window.localStorage.setItem("jukebox_session_id", "fake-session-id")
  })
}

/**
 * Intercepts auth-related API calls and returns a fake admin user. Covers
 * the `GET /api/auth/me` call the AuthProvider makes on mount (and the
 * periodic 12-minute refresh).
 */
export async function mockAdminAuth(page: Page) {
  await page.route("**/api/auth/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FAKE_ADMIN_USER),
    })
  })
  // Session endpoint is hit by getSession() elsewhere — keep it benign.
  await page.route("**/api/session", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "fake-session-id",
        displayName: "Admin Test",
        avatarColor: "#e89a3c",
        createdAt: "2026-01-01T00:00:00Z",
        expiresAt: "2027-01-01T00:00:00Z",
      }),
    })
  })
}

// Custom fixture that sets up admin auth automatically.
export const test = base.extend({
  page: async ({ page }, use) => {
    await seedAdminSession(page)
    await mockAdminAuth(page)
    await use(page)
  },
})

export { expect } from "@playwright/test"
