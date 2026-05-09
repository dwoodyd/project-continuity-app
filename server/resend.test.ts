/**
 * Validates that the RESEND_API_KEY is set and accepted by the Resend API.
 * Uses the /domains list endpoint — a lightweight read-only call that confirms
 * the key is valid without sending any email.
 */
import { describe, it, expect } from "vitest";

describe("Resend API key validation", () => {
  it("RESEND_API_KEY is set in environment", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key).toBeTruthy();
    expect(key?.startsWith("re_")).toBe(true);
  });

  it("Resend API key is accepted by the Resend API", async () => {
    const key = process.env.RESEND_API_KEY;
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    // 200 = valid key, 401 = invalid key
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
  }, 10000);
});
