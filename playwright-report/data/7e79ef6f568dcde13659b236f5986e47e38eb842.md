# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: checkin-flow.spec.ts >> Check-in flow smoke test >> 5 · Completed check-in cards are disabled (no double-submit)
- Location: e2e/checkin-flow.spec.ts:156:3

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator: getByRole('button', { name: /Morning plan/i }).first()
Expected: disabled
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeDisabled" with timeout 10000ms
  - waiting for getByRole('button', { name: /Morning plan/i }).first()

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
  140 |     // The section should also show "thread strength" percentage
  141 |     await expect(page.getByText("thread strength")).toBeVisible();
  142 | 
  143 |     // Today should show as an active day — "1 of 7 days active" or more
  144 |     const daysActive = page.getByText(/of 7 days active/i);
  145 |     await expect(daysActive).toBeVisible();
  146 | 
  147 |     // Verify the count is at least 1 (today)
  148 |     const daysText = await daysActive.textContent();
  149 |     const match = daysText?.match(/(\d+) of 7/);
  150 |     expect(match).not.toBeNull();
  151 |     const count = parseInt(match![1]!, 10);
  152 |     expect(count).toBeGreaterThanOrEqual(1);
  153 |   });
  154 | 
  155 |   // ── 5. Idempotency guard — re-opening a completed check-in is blocked ─────
  156 |   test("5 · Completed check-in cards are disabled (no double-submit)", async ({ page }) => {
  157 |     await page.goto("http://localhost:3000/");
  158 |     await waitForHome(page);
  159 | 
  160 |     // All three should be disabled after the previous tests ran
  161 |     const morningCard  = page.getByRole("button", { name: /Morning plan/i }).first();
  162 |     const middayCard   = page.getByRole("button", { name: /Midday check-in/i }).first();
  163 |     const eveningCard  = page.getByRole("button", { name: /Evening closure/i }).first();
  164 | 
> 165 |     await expect(morningCard).toBeDisabled({ timeout: 10_000 });
      |                               ^ Error: expect(locator).toBeDisabled() failed
  166 |     await expect(middayCard).toBeDisabled({ timeout: 10_000 });
  167 |     await expect(eveningCard).toBeDisabled({ timeout: 10_000 });
  168 |   });
  169 | });
  170 | 
```