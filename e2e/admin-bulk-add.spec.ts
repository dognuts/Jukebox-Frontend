import { test, expect } from "./fixtures"

// Mocked admin autoplay room — one empty room, no playlists yet.
const FAKE_ROOM = {
  id: "room-1",
  slug: "the-b-side",
  name: "B-Side",
  genre: "hip-hop",
  isLive: false,
  isAutoplay: true,
}

// Canned search results for specific queries. The admin-bulk-add flow
// hits `GET /api/admin/search-track?q=<query>` for each line; we return a
// deterministic match for "apache" and "donuts", and a 204 for "gibberish".
const SEARCH_RESPONSES: Record<
  string,
  { status: number; body?: unknown }
> = {
  "apache incredible bongo band": {
    status: 200,
    body: {
      primary: {
        title: "Apache",
        artist: "Incredible Bongo Band",
        duration: 284,
        source: "youtube",
        sourceUrl: "https://www.youtube.com/watch?v=apache-id",
        thumbnail: "https://i.ytimg.com/vi/apache-id/mqdefault.jpg",
        channel: "Dusty Fingers",
      },
      alternatives: [
        {
          title: "Apache (Live 1973)",
          artist: "Incredible Bongo Band",
          duration: 390,
          source: "youtube",
          sourceUrl: "https://www.youtube.com/watch?v=apache-live",
          thumbnail: "https://i.ytimg.com/vi/apache-live/mqdefault.jpg",
          channel: "Rare Funk",
        },
      ],
    },
  },
  "j dilla donuts stop": {
    status: 200,
    body: {
      primary: {
        title: "Stop",
        artist: "J Dilla",
        duration: 98,
        source: "youtube",
        sourceUrl: "https://www.youtube.com/watch?v=stop-id",
        thumbnail: "https://i.ytimg.com/vi/stop-id/mqdefault.jpg",
        channel: "Stones Throw",
      },
      alternatives: [],
    },
  },
  "asdkfjh gibberish no match": { status: 204 },
}

test.beforeEach(async ({ page }) => {
  // List admin rooms
  await page.route("**/api/admin/rooms", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([FAKE_ROOM]),
    })
  })
  // List playlists for the selected room (returns empty)
  await page.route(
    "**/api/admin/autoplay/rooms/room-1/playlists",
    (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      })
    },
  )
  // Search-track mock: look up the response by query param
  await page.route("**/api/admin/search-track*", (route) => {
    const url = new URL(route.request().url())
    const q = url.searchParams.get("q") ?? ""
    const canned = SEARCH_RESPONSES[q]
    if (!canned) {
      route.fulfill({ status: 502, body: "no canned response for query" })
      return
    }
    route.fulfill({
      status: canned.status,
      contentType: "application/json",
      body: canned.body ? JSON.stringify(canned.body) : undefined,
    })
  })
})

test("live playlist highlights the currently-playing track (currentIndex = index of playing track)", async ({ page }) => {
  // The admin UI highlights row `i` as "On Air" when i === livePlaylist.currentIndex.
  // Backend semantics: current_index IS the index of the currently-playing
  // track (not "next to play"). This test asserts the contract end-to-end
  // so a future refactor that flips the semantics back is caught immediately.
  await page.route(
    "**/api/admin/autoplay/rooms/room-1/playlists",
    (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "pl-1",
            roomId: "room-1",
            status: "live",
            name: "Test Playlist",
            tracks: [
              { title: "Track A", artist: "Art", duration: 180, source: "youtube", sourceUrl: "https://y/a" },
              { title: "Track B", artist: "Art", duration: 180, source: "youtube", sourceUrl: "https://y/b" },
              { title: "Track C", artist: "Art", duration: 180, source: "youtube", sourceUrl: "https://y/c" },
              { title: "Track D", artist: "Art", duration: 180, source: "youtube", sourceUrl: "https://y/d" },
              { title: "Track E", artist: "Art", duration: 180, source: "youtube", sourceUrl: "https://y/e" },
            ],
            currentIndex: 2, // Track C is currently playing
            createdAt: "2026-04-22T00:00:00Z",
            activatedAt: "2026-04-22T00:00:00Z",
          },
        ]),
      })
    },
  )

  await page.goto("/admin/autoplay")
  await page.getByText("B-Side").click()

  // Scope the search to the row that contains the "Track C" title input
  const trackCRow = page
    .locator("input[value='Track C']")
    .locator("xpath=ancestor::div[contains(@class, 'group')]")
  await expect(trackCRow.getByText("On Air", { exact: true })).toBeVisible()

  // And the OTHER rows must not be marked On Air
  const trackARow = page
    .locator("input[value='Track A']")
    .locator("xpath=ancestor::div[contains(@class, 'group')]")
  await expect(trackARow.getByText("On Air", { exact: true })).toHaveCount(0)
  const trackERow = page
    .locator("input[value='Track E']")
    .locator("xpath=ancestor::div[contains(@class, 'group')]")
  await expect(trackERow.getByText("On Air", { exact: true })).toHaveCount(0)

  // And the position readout reflects 1-based "3 of 5"
  await expect(page.getByText("Position 3/5")).toBeVisible()
})

test("admin autoplay page loads with bulk-add panel visible", async ({ page }) => {
  await page.goto("/admin/autoplay")
  // Wait for the admin room to appear in the sidebar, which confirms the
  // AuthProvider accepted our fake session + the rooms list mock returned.
  await expect(page.getByText("B-Side")).toBeVisible()
  await page.getByText("B-Side").click()
  // The Bulk mode toggle button should be present once a room is selected
  await expect(page.getByRole("button", { name: "URL" }).first()).toBeVisible()
  await expect(page.getByRole("button", { name: /Bulk/ }).first()).toBeVisible()
})

test("bulk mode: pasting two valid queries adds two rows in input order", async ({ page }) => {
  await page.goto("/admin/autoplay")
  await page.getByText("B-Side").click()

  // Switch the staged-playlist add-track to Bulk mode.
  // There are two Bulk buttons (live + staged) — use the second one, which
  // belongs to the staged builder.
  const bulkButtons = page.getByRole("button", { name: /Bulk/ })
  await bulkButtons.last().click()

  // Paste two queries, one per line
  const textarea = page.getByPlaceholder(/Paste one song per line/).last()
  await textarea.fill("apache incredible bongo band\nj dilla donuts stop")

  // Click Find on YouTube
  await page.getByRole("button", { name: "Find on YouTube" }).last().click()

  // Two rows should appear in input order — Apache (row 1), Stop (row 2)
  await expect(page.locator("input[value='Apache']")).toBeVisible()
  await expect(page.locator("input[value='Stop']")).toBeVisible()

  // Apache should land above Stop (row indices 1 and 2 respectively)
  const apacheRow = page.locator("input[value='Apache']").locator("xpath=ancestor::div[contains(@class,'group')]")
  const stopRow = page.locator("input[value='Stop']").locator("xpath=ancestor::div[contains(@class,'group')]")
  const apacheBox = await apacheRow.boundingBox()
  const stopBox = await stopRow.boundingBox()
  expect(apacheBox).toBeTruthy()
  expect(stopBox).toBeTruthy()
  if (apacheBox && stopBox) {
    expect(apacheBox.y).toBeLessThan(stopBox.y)
  }
})

test("bulk mode: unmatched query renders as a failed-state row", async ({ page }) => {
  await page.goto("/admin/autoplay")
  await page.getByText("B-Side").click()

  const bulkButtons = page.getByRole("button", { name: /Bulk/ })
  await bulkButtons.last().click()

  const textarea = page.getByPlaceholder(/Paste one song per line/).last()
  await textarea.fill("asdkfjh gibberish no match")
  await page.getByRole("button", { name: "Find on YouTube" }).last().click()

  // Failed row shows the original query as its title and a "(not found...)"
  // artist label
  await expect(page.locator("input[value='asdkfjh gibberish no match']")).toBeVisible()
  await expect(page.locator("input[value^='(not found']")).toBeVisible()
})

test("authRequest transparently refreshes on 401 and retries", async ({ page }) => {
  // First call to search-track returns 401 (simulating an expired JWT).
  // Second call returns the real response. authRequest should:
  //   1) See the 401
  //   2) Call /api/auth/refresh (default fixture mock returns a fresh token)
  //   3) Retry the original search-track request
  //   4) Succeed
  // Net effect: the user never sees the 401, the track just lands.
  let searchTrackCallCount = 0
  let refreshCalled = false

  await page.route("**/api/admin/search-track*", (route) => {
    searchTrackCallCount++
    if (searchTrackCallCount === 1) {
      route.fulfill({ status: 401, body: "token expired" })
      return
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        primary: {
          title: "Apache",
          artist: "Incredible Bongo Band",
          duration: 284,
          source: "youtube",
          sourceUrl: "https://www.youtube.com/watch?v=apache-id",
          thumbnail: "https://img/apache.jpg",
          channel: "Dusty Fingers",
        },
        alternatives: [],
      }),
    })
  })

  // Override the default refresh mock to track calls
  await page.route("**/api/auth/refresh", (route) => {
    refreshCalled = true
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: "refreshed-admin-token",
        refreshToken: "refreshed-refresh-token",
        user: {
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
        },
      }),
    })
  })

  await page.goto("/admin/autoplay")
  await page.getByText("B-Side").click()

  const bulkButtons = page.getByRole("button", { name: /Bulk/ })
  await bulkButtons.last().click()

  const textarea = page.getByPlaceholder(/Paste one song per line/).last()
  await textarea.fill("apache incredible bongo band")
  await page.getByRole("button", { name: "Find on YouTube" }).last().click()

  // The track should have landed despite the 401 on the first attempt
  await expect(page.locator("input[value='Apache']")).toBeVisible()

  // And we should see exactly: one failed call, one refresh, one successful retry
  expect(searchTrackCallCount).toBe(2)
  expect(refreshCalled).toBe(true)
})

test("bulk mode: picking an alternative replaces the row atomically", async ({ page }) => {
  await page.goto("/admin/autoplay")
  await page.getByText("B-Side").click()

  const bulkButtons = page.getByRole("button", { name: /Bulk/ })
  await bulkButtons.last().click()

  // This query has 1 alternative in SEARCH_RESPONSES
  const textarea = page.getByPlaceholder(/Paste one song per line/).last()
  await textarea.fill("apache incredible bongo band")
  await page.getByRole("button", { name: "Find on YouTube" }).last().click()

  // Primary "Apache" row should land
  await expect(page.locator("input[value='Apache']")).toBeVisible()

  // Hover the row to surface the action buttons (they're opacity-0 until hover),
  // then click the Sparkles icon ("Show alternatives" title).
  const apacheRow = page.locator("input[value='Apache']").locator(
    "xpath=ancestor::div[contains(@class,'group')]",
  )
  await apacheRow.hover()
  await apacheRow.getByTitle("Show alternatives").click()

  // The alternatives panel should now be expanded with "Apache (Live 1973)"
  await expect(page.getByText("Apache (Live 1973)")).toBeVisible()

  // Click the alternative — should replace the row's title with the live version
  await page.getByText("Apache (Live 1973)").click()
  await expect(page.locator("input[value='Apache (Live 1973)']")).toBeVisible()
  // Original "Apache" is gone
  await expect(page.locator("input[value='Apache']")).toHaveCount(0)
})
