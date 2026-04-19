# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: checkin-flow.spec.ts >> Check-in flow smoke test >> 1 · Morning plan — set capacity and submit
- Location: e2e/checkin-flow.spec.ts:53:3

# Error details

```
TimeoutError: locator.waitFor: Timeout 8000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Morning plan' }) to be visible

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications alt+T"
  - generic [ref=e4]:
    - generic [ref=e6]:
      - img [ref=e8]
      - generic [ref=e11]: Continuary
    - generic [ref=e15]:
      - generic [ref=e16]:
        - heading "Welcome to Continuary." [level=2] [ref=e17]
        - paragraph [ref=e18]: This is a private beta. Enter your invite code to continue.
      - generic [ref=e19]:
        - text: Invite code
        - textbox "e.g. A1B2C3D4E5F6" [active] [ref=e20]
      - button "Continue" [disabled]:
        - text: Continue
        - img
      - paragraph [ref=e21]: Don’t have a code? Reach out to the Continuary team.
      - button "✦ Have a beta tester code?" [ref=e23] [cursor=pointer]
    - paragraph [ref=e24]: Built for minds that move fast.
```

# Test source

```ts
  1   | /**
  2   |  * E2E Smoke Test — Full Check-In Flow
  3   |  * =====================================
  4   |  * Covers the critical user path:
  5   |  *   Morning plan → Midday check-in → Evening closure → Thread view verification
  6   |  *
  7   |  * Strategy
  8   |  * --------
  9   |  * - Uses a pre-seeded test user (see global-setup.ts) with a valid JWT session
  10  |  *   cookie injected via Playwright storageState, so no OAuth redirect is needed.
  11  |  * - Each check-in step submits the minimum required fields.
  12  |  * - The LLM calls are real (dev server is live) but the rate limiter allows 10
  13  |  *   calls/minute, so three sequential check-ins are well within budget.
  14  |  * - After all three check-ins the ThreadView component should show today's dots
  15  |  *   as filled and the thread strength section should be visible.
  16  |  *
  17  |  * Running
  18  |  * -------
  19  |  *   pnpm test:e2e                  # run all E2E tests
  20  |  *   pnpm test:e2e --headed         # watch in browser
  21  |  *   pnpm test:e2e --debug          # step-through mode
  22  |  */
  23  | 
  24  | import { test, expect, type Page } from "@playwright/test";
  25  | import { FIXTURE_PATH } from "./global-setup";
  26  | 
  27  | // ── Helpers ──────────────────────────────────────────────────────────────────
  28  | 
  29  | /** Wait for the home page to be fully hydrated (auth check done, no spinner). */
  30  | async function waitForHome(page: Page) {
  31  |   await page.waitForURL("**/", { timeout: 15_000 });
  32  |   // The check-in cards are the reliable "app is ready" signal
  33  |   await page.getByText("Morning plan").waitFor({ state: "visible", timeout: 15_000 });
  34  | }
  35  | 
  36  | /** Click a CheckInCard by its label text. */
  37  | async function openCheckIn(page: Page, label: string) {
  38  |   const card = page.getByRole("button", { name: label, exact: false });
> 39  |   await card.waitFor({ state: "visible", timeout: 8_000 });
      |              ^ TimeoutError: locator.waitFor: Timeout 8000ms exceeded.
  40  |   await card.click();
  41  |   // The form panel should appear
  42  |   await page.getByText(`${label.split(" ")[0]!.toLowerCase()} check-in`, { exact: false })
  43  |     .first()
  44  |     .waitFor({ state: "visible", timeout: 8_000 });
  45  | }
  46  | 
  47  | // ── Test suite ────────────────────────────────────────────────────────────────
  48  | 
  49  | test.describe("Check-in flow smoke test", () => {
  50  |   test.use({ storageState: FIXTURE_PATH });
  51  | 
  52  |   // ── 1. Morning plan ────────────────────────────────────────────────────────
  53  |   test("1 · Morning plan — set capacity and submit", async ({ page }) => {
  54  |     await page.goto("http://localhost:3000/");
  55  |     await waitForHome(page);
  56  | 
  57  |     // Open the morning check-in card
  58  |     await openCheckIn(page, "Morning plan");
  59  | 
  60  |     // Select "partial" capacity (middle button — always present, no projects needed)
  61  |     await page.getByRole("button", { name: /partial/i }).click();
  62  | 
  63  |     // Add an optional note
  64  |     await page.getByPlaceholder(/Appointments, constraints/i).fill(
  65  |       "E2E smoke test — morning plan"
  66  |     );
  67  | 
  68  |     // Submit
  69  |     const submitBtn = page.getByRole("button", { name: /Set today's plan/i });
  70  |     await submitBtn.click();
  71  | 
  72  |     // The form should close and the morning card should show as completed
  73  |     await expect(
  74  |       page.getByRole("button", { name: /Morning plan/i }).first()
  75  |     ).toBeDisabled({ timeout: 30_000 });
  76  |   });
  77  | 
  78  |   // ── 2. Midday check-in ────────────────────────────────────────────────────
  79  |   test("2 · Midday check-in — submit alignment pulse", async ({ page }) => {
  80  |     await page.goto("http://localhost:3000/");
  81  |     await waitForHome(page);
  82  | 
  83  |     // Morning must already be done (seeded by test 1 in the same run)
  84  |     // If morning card is still enabled, the morning check-in was not persisted —
  85  |     // that's a failure in test 1, not here.
  86  |     await openCheckIn(page, "Midday check-in");
  87  | 
  88  |     // Fill required "worked on" field
  89  |     await page.getByPlaceholder(/What actually got done/i).fill(
  90  |       "Reviewed E2E test suite, fixed push cron jitter"
  91  |     );
  92  | 
  93  |     // Mark "was on plan" = yes (first radio/button)
  94  |     await page.getByRole("button", { name: /yes/i }).first().click();
  95  | 
  96  |     // Submit
  97  |     await page.getByRole("button", { name: /Submit midday check-in/i }).click();
  98  | 
  99  |     // Midday card becomes disabled after success
  100 |     await expect(
  101 |       page.getByRole("button", { name: /Midday check-in/i }).first()
  102 |     ).toBeDisabled({ timeout: 30_000 });
  103 |   });
  104 | 
  105 |   // ── 3. Evening closure ────────────────────────────────────────────────────
  106 |   test("3 · Evening closure — close the day", async ({ page }) => {
  107 |     await page.goto("http://localhost:3000/");
  108 |     await waitForHome(page);
  109 | 
  110 |     await openCheckIn(page, "Evening closure");
  111 | 
  112 |     // Required: whatMoved
  113 |     await page.getByPlaceholder(/What actually got done/i).fill(
  114 |       "Completed E2E smoke test for check-in flow"
  115 |     );
  116 | 
  117 |     // Required: tomorrowFirst
  118 |     await page.getByPlaceholder(/The first concrete action tomorrow/i).fill(
  119 |       "Review Playwright report and push to main"
  120 |     );
  121 | 
  122 |     // Submit
  123 |     await page.getByRole("button", { name: /Close the day/i }).click();
  124 | 
  125 |     // Evening card becomes disabled
  126 |     await expect(
  127 |       page.getByRole("button", { name: /Evening closure/i }).first()
  128 |     ).toBeDisabled({ timeout: 30_000 });
  129 |   });
  130 | 
  131 |   // ── 4. Thread view verification ───────────────────────────────────────────
  132 |   test("4 · Thread view — today shows all three dots filled", async ({ page }) => {
  133 |     await page.goto("http://localhost:3000/");
  134 |     await waitForHome(page);
  135 | 
  136 |     // ThreadView renders "Your thread this week" once there is at least one day with data
  137 |     const threadSection = page.getByText("Your thread this week");
  138 |     await threadSection.waitFor({ state: "visible", timeout: 15_000 });
  139 | 
```