import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (...parts: string[]) => readFileSync(resolve(process.cwd(), ...parts), "utf8");

describe("AI cost controls", () => {
  it("records model usage through the shared invocation layer with a bounded rich-generation default", () => {
    const schema = source("drizzle", "schema.ts");
    const llm = source("server", "_core", "llm.ts");
    expect(schema).toContain('mysqlTable("llm_usage"');
    expect(schema).toContain('index("llm_usage_user_created_idx").on(table.userId, table.createdAt)');
    expect(llm).toContain('feature = "unlabeled"');
    expect(llm).toContain('model = "gemini-3-flash-preview"');
    expect(llm).toContain('payload.max_tokens = params.maxTokens ?? params.max_tokens ?? 2048');
    expect(llm).toContain("await db.insert(llmUsage).values");
  });

  it("keeps low-stakes parsing and classification on the live catalog economical model", () => {
    const capture = source("server", "routers", "capture.ts");
    const checkIns = source("server", "routers", "checkIns.ts");
    const threshold = source("server", "routers", "threshold.ts");
    const crisis = source("server", "crisisSafety.ts");
    for (const file of [capture, checkIns, threshold, crisis]) {
      expect(file).toContain('model: "gpt-5-nano"');
    }
    expect(crisis).toContain('feature: "crisis_safety_prefilter"');
    expect(crisis).toContain('return "elevated"');
  });

  it("limits only Free members on marked heavy routes and keeps paid members outside the daily budget", () => {
    const limiter = source("server", "_core", "rateLimiter.ts");
    const clarity = source("server", "routers", "clarity.ts");
    const focus = source("server", "routers", "focusSessions.ts");
    const workspace = source("server", "routers", "workspace.ts");
    const intelligence = source("server", "routers", "intelligence.ts");
    expect(limiter).toContain("const FREE_HEAVY_DAILY_CAP = 8");
    expect(limiter).toContain("if (heavy && !hasPaidAccess)");
    expect(limiter).toContain("That's today's AI — it resets tomorrow, or upgrade for more.");
    expect(clarity).toContain("heavy: true");
    for (const file of [focus, workspace, intelligence]) {
      expect(file).toContain("checkHeavyLLMRateLimit(ctx.user)");
    }
  });

  it("preserves manual zero-AI mode and the Focus body-doubling presentation contract", () => {
    const consent = source("client", "src", "hooks", "useAiConsentGate.ts");
    const focusStage = source("client", "src", "pages", "FocusSessionsPage.tsx");
    expect(consent).toContain("aiConsent");
    expect(consent).toContain("/settings");
    expect(focusStage).toContain("WrenPlayer");
    expect(focusStage).toContain("ACTIVITY_CLIP");
  });
});
