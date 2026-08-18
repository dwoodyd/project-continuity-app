import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Wren presence and coherent voice", () => {
  it("uses the strengthened boxed-video size scale", () => {
    const player = source("client/src/components/WrenPlayer.tsx");
    expect(player).toContain('xs:    "w-20 h-20"');
    expect(player).toContain('sm:    "w-28 h-28"');
    expect(player).toContain('md:    "w-44 h-44"');
    expect(player).toContain('lg:    "w-60 h-60"');
    expect(player).toContain('xl:    "w-80 h-80"');
    expect(player).toContain('"2xl": "w-96 h-96"');
  });

  it("uses the dial-derived bucket in legacy concise prompt consumers", () => {
    const checkIns = source("server/routers/checkIns.ts");
    const intelligence = source("server/routers/intelligence.ts");
    expect(checkIns).toContain('import { getWrenToneBucket } from "../wrenTone"');
    expect(checkIns).not.toContain("profile?.tonePreference");
    expect(intelligence).toContain('import { getWrenToneBucket } from "../wrenTone"');
    expect(intelligence).not.toContain("profile?.tonePreference");
    expect(intelligence).not.toContain("tonePreference: z.enum");
  });

  it("keeps quick presets and fine-tuning in one discoverable settings system", () => {
    const settings = source("client/src/pages/SettingsPage.tsx");
    const clientTone = source("client/src/lib/wrenToneClient.ts");
    const sidebar = source("client/src/components/AppLayout.tsx");
    expect(settings).toContain('id="wren-tone"');
    expect(settings).toContain("WREN_TONE_PRESETS");
    expect(settings).toContain("Tune how Wren talks →");
    expect(settings).toContain("openWrenTone");
    expect(clientTone).toContain("export const WREN_TONE_PRESETS");
    expect(sidebar).toContain('/settings?tab=preferences#wren-tone');
  });
});
