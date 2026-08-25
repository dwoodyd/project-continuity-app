import { describe, expect, it } from "vitest";

describe("OAuth application identity", () => {
  it("uses the approved Continuary display name in the platform-managed application title", () => {
    expect(process.env.VITE_APP_TITLE).toBe("Continuary");
  });
});
