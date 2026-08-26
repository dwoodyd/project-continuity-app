import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("frictionless founding admission", () => {
  it("uses an environment-backed cap with a safe marketing-aligned default", () => {
    const source = read("server/foundingCap.ts");
    expect(source).toContain('process.env.FOUNDING_CAP ?? "100"');
    expect(source).toContain("export const FOUNDING_CAP");
  });

  it("uses an atomic conditional counter update so concurrent claims cannot exceed the cap", () => {
    const source = read("server/foundingCap.ts");
    expect(source).toContain("return db.transaction(async (tx) =>");
    expect(source).toMatch(/UPDATE founding_seat_capacity[\s\S]*SET claimed = claimed \+ 1[\s\S]*claimed < \$\{FOUNDING_CAP\}/);
    expect(source).toContain("return { granted: false, full: true }");
  });

  it("returns a reserved public seat when a concurrent manual grant wins the same account", () => {
    const source = read("server/foundingCap.ts");
    expect(source).toContain("isNull(users.inviteCode)");
    expect(source).toContain("const userGrant = await tx.update(users)");
    expect(source).toContain("if (affectedRows(userGrant) !== 1)");
    expect(source).toMatch(/UPDATE founding_seat_capacity[\s\S]*SET claimed = GREATEST\(claimed - 1, 0\)/);
    expect(source).toContain("return { granted: true, alreadyClaimed: true }");
  });

  it("keeps manual codes and referrals available after the public allocation is full", () => {
    const source = read("server/routers/beta.ts");
    expect(source).toContain("assignManualInviteCohort");
    expect(source).not.toContain('message: "No cohort slots available."');
  });

  it("auto-claims on authenticated entry while preserving the invite-code route", () => {
    const source = read("client/src/components/AppLayout.tsx");
    expect(source).toContain("trpc.beta.claimFoundingSeat.useMutation()");
    expect(source).toContain("pendingManualInvite");
    expect(source).toContain('navigate("/invite-gate")');
  });

  it("makes /apply use instant sign-in while seats remain and the waitlist when full", () => {
    const source = read("client/src/pages/ApplyPage.tsx");
    expect(source).toContain("trpc.founding.slots.useQuery");
    expect(source).toContain("const seatsAreFull = slots?.remaining === 0");
    expect(source).toContain('href={getLoginUrl()}');
    expect(source).toContain("Sign in to claim your seat →");
    expect(source).toContain("trpc.waitlist.join.useMutation");
    expect(source).toContain("Founding seats are full.");
    expect(source).toContain("Join the waitlist");
    expect(source).not.toContain("applications.submit");
    expect(source).not.toContain("Submit application");
  });

  it("keeps direct invitation and referral paths visible in both public admission states", () => {
    const source = read("client/src/pages/ApplyPage.tsx");
    expect(source).toContain('href="/invite-gate"');
    expect(source).toContain('href="/redeem-referral"');
  });
});
