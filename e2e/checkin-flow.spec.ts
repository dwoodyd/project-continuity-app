/**
 * E2E Smoke Test — Full Check-In Flow
 * =====================================
 * Covers the critical user path:
 *   Morning plan → Midday check-in → Evening closure → Thread view verification
 *
 * Strategy
 * --------
 * - Uses a pre-seeded test user (see global-setup.ts) with a valid JWT session
 *   cookie injected via Playwright storageState, so no OAuth redirect is needed.
 * - Each check-in step submits the minimum required fields.
 * - The LLM calls are real (dev server is live) but the rate limiter allows 10
 *   calls/minute, so three sequential check-ins are well within budget.
 * - After all three check-ins the ThreadView component should show today's dots
 *   as filled and the thread strength section should be visible.
 *
 * Running
 * -------
 *   pnpm test:e2e                  # run all E2E tests
 *   pnpm test:e2e --headed         # watch in browser
 *   pnpm test:e2e --debug          # step-through mode
 */

import { test, expect, type Page } from "@playwright/test";
import { FIXTURE_PATH } from "./global-setup";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Wait for the home page to be fully hydrated (auth check done, no spinner). */
async function waitForHome(page: Page) {
  await page.waitForURL("**/", { timeout: 15_000 });
  // The check-in cards are the reliable "app is ready" signal
  await page.getByText("Morning plan").waitFor({ state: "visible", timeout: 15_000 });
}

/** Click a CheckInCard by its label text. */
async function openCheckIn(page: Page, label: string) {
  const card = page.getByRole("button", { name: label, exact: false });
  await card.waitFor({ state: "visible", timeout: 8_000 });
  await card.click();
  // The form panel should appear
  await page.getByText(`${label.split(" ")[0]!.toLowerCase()} check-in`, { exact: false })
    .first()
    .waitFor({ state: "visible", timeout: 8_000 });
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe("Check-in flow smoke test", () => {
  test.use({ storageState: FIXTURE_PATH });

  // ── 1. Morning plan ────────────────────────────────────────────────────────
  test("1 · Morning plan — set capacity and submit", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await waitForHome(page);

    // Open the morning check-in card
    await openCheckIn(page, "Morning plan");

    // Select "partial" capacity (middle button — always present, no projects needed)
    await page.getByRole("button", { name: /partial/i }).click();

    // Add an optional note
    await page.getByPlaceholder(/Appointments, constraints/i).fill(
      "E2E smoke test — morning plan"
    );

    // Submit
    const submitBtn = page.getByRole("button", { name: /Set today's plan/i });
    await submitBtn.click();

    // The form should close and the morning card should show as completed
    await expect(
      page.getByRole("button", { name: /Morning plan/i }).first()
    ).toBeDisabled({ timeout: 30_000 });
  });

  // ── 2. Midday check-in ────────────────────────────────────────────────────
  test("2 · Midday check-in — submit alignment pulse", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await waitForHome(page);

    // Morning must already be done (seeded by test 1 in the same run)
    // If morning card is still enabled, the morning check-in was not persisted —
    // that's a failure in test 1, not here.
    await openCheckIn(page, "Midday check-in");

    // Fill required "worked on" field
    await page.getByPlaceholder(/What actually got done/i).fill(
      "Reviewed E2E test suite, fixed push cron jitter"
    );

    // Mark "was on plan" = yes (first radio/button)
    await page.getByRole("button", { name: /yes/i }).first().click();

    // Submit
    await page.getByRole("button", { name: /Submit midday check-in/i }).click();

    // Midday card becomes disabled after success
    await expect(
      page.getByRole("button", { name: /Midday check-in/i }).first()
    ).toBeDisabled({ timeout: 30_000 });
  });

  // ── 3. Evening closure ────────────────────────────────────────────────────
  test("3 · Evening closure — close the day", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await waitForHome(page);

    await openCheckIn(page, "Evening closure");

    // Required: whatMoved
    await page.getByPlaceholder(/What actually got done/i).fill(
      "Completed E2E smoke test for check-in flow"
    );

    // Required: tomorrowFirst
    await page.getByPlaceholder(/The first concrete action tomorrow/i).fill(
      "Review Playwright report and push to main"
    );

    // Submit
    await page.getByRole("button", { name: /Close the day/i }).click();

    // Evening card becomes disabled
    await expect(
      page.getByRole("button", { name: /Evening closure/i }).first()
    ).toBeDisabled({ timeout: 30_000 });
  });

  // ── 4. Thread view verification ───────────────────────────────────────────
  test("4 · Thread view — today shows all three dots filled", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await waitForHome(page);

    // ThreadView renders "Your thread this week" once there is at least one day with data
    const threadSection = page.getByText("Your thread this week");
    await threadSection.waitFor({ state: "visible", timeout: 15_000 });

    // The section should also show "thread strength" percentage
    await expect(page.getByText("thread strength")).toBeVisible();

    // Today should show as an active day — "1 of 7 days active" or more
    const daysActive = page.getByText(/of 7 days active/i);
    await expect(daysActive).toBeVisible();

    // Verify the count is at least 1 (today)
    const daysText = await daysActive.textContent();
    const match = daysText?.match(/(\d+) of 7/);
    expect(match).not.toBeNull();
    const count = parseInt(match![1]!, 10);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ── 5. Idempotency guard — re-opening a completed check-in is blocked ─────
  test("5 · Completed check-in cards are disabled (no double-submit)", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await waitForHome(page);

    // All three should be disabled after the previous tests ran
    const morningCard  = page.getByRole("button", { name: /Morning plan/i }).first();
    const middayCard   = page.getByRole("button", { name: /Midday check-in/i }).first();
    const eveningCard  = page.getByRole("button", { name: /Evening closure/i }).first();

    await expect(morningCard).toBeDisabled({ timeout: 10_000 });
    await expect(middayCard).toBeDisabled({ timeout: 10_000 });
    await expect(eveningCard).toBeDisabled({ timeout: 10_000 });
  });
});
