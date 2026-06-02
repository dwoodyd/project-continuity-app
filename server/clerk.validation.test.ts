import { describe, it, expect } from "vitest";

describe("Clerk API key validation", () => {
  it("CLERK_SECRET_KEY is set and starts with sk_", () => {
    const key = process.env.CLERK_SECRET_KEY ?? "";
    expect(key.length).toBeGreaterThan(10);
    expect(key.startsWith("sk_")).toBe(true);
  });

  it("VITE_CLERK_PUBLISHABLE_KEY is set and starts with pk_", () => {
    const key = process.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";
    expect(key.length).toBeGreaterThan(10);
    expect(key.startsWith("pk_")).toBe(true);
  });

  it("Clerk secret key is accepted by the Clerk API", async () => {
    const key = process.env.CLERK_SECRET_KEY ?? "";
    const res = await fetch("https://api.clerk.com/v1/users?limit=1", {
      headers: { Authorization: `Bearer ${key}` },
    });
    // 200 = valid key with users list, 401/403 = invalid key
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(res.ok || res.status === 200).toBe(true);
  });
});
