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
