import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { isPrivateStorageKey, privateStorageOwnerId } from "./_core/storageProxy";
import { isOwnedCaptureAudioKey } from "./routers/transcribe";

const ROOT = "/home/ubuntu/project-continuity-app";

describe("capture audio privacy", () => {
  it("treats new vault captures and legacy captures as member-owned private storage", () => {
    expect(isPrivateStorageKey("vault/42/captures/7/chunk-999.webm")).toBe(true);
    expect(isPrivateStorageKey("captures/42/7/chunk-999.webm")).toBe(true);
    expect(privateStorageOwnerId("vault/42/captures/7/chunk-999.webm")).toBe(42);
    expect(privateStorageOwnerId("captures/42/7/chunk-999.webm")).toBe(42);
    expect(isPrivateStorageKey("wren/focus/clip.mp4")).toBe(false);
  });

  it("accepts an audio key only for the owning member and supported capture shape", () => {
    expect(isOwnedCaptureAudioKey("vault/42/captures/7/chunk-999.webm", 42)).toBe(true);
    expect(isOwnedCaptureAudioKey("captures/42/7/chunk-999.mp4", 42)).toBe(true);
    expect(isOwnedCaptureAudioKey("vault/43/captures/7/chunk-999.webm", 42)).toBe(false);
    expect(isOwnedCaptureAudioKey("vault/42/captures/7/other.webm", 42)).toBe(false);
  });

  it("does not return provider URLs or permissive media CORS for capture audio", () => {
    const router = fs.readFileSync(`${ROOT}/server/routers/transcribe.ts`, "utf8");
    const proxy = fs.readFileSync(`${ROOT}/server/_core/storageProxy.ts`, "utf8");
    const capturePage = fs.readFileSync(`${ROOT}/client/src/pages/CapturePage.tsx`, "utf8");

    expect(router).toContain("const key = `vault/${ctx.user.id}/captures/");
    expect(router).toContain("return { key };");
    expect(router).toContain("storageGet(input.audioKey)");
    expect(router).not.toContain("return { key, url }");
    expect(proxy).toContain('key.startsWith("captures/")');
    expect(proxy).toContain('res.set("Cache-Control", "private, no-store")');
    expect(proxy).not.toContain('res.set("Access-Control-Allow-Origin", "*")');
    expect(capturePage).toContain("audioKey: upload.key");
    expect(capturePage).not.toContain("audioUrl: upload.url");
  });
});
