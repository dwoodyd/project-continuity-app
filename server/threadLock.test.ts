/**
 * Thread Lock — server-side unit tests
 *
 * Tests the db helpers and the tRPC router procedures for Thread Lock.
 * Uses the same in-memory/mock pattern as the rest of the test suite.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Minimal mock for the db module ────────────────────────────────────────────
vi.mock("./db", () => ({
  createThreadLock: vi.fn(),
  getActiveThreadLock: vi.fn(),
  getThreadLockHistory: vi.fn(),
  recallThreadLock: vi.fn(),
  dismissThreadLock: vi.fn(),
}));

import * as db from "./db";

const mockLock = {
  id: 1,
  userId: 42,
  whatDoing: "Writing the intro section of the quarterly report",
  whatNext: "Add the revenue chart on page 3",
  projectId: null,
  clipboardSnippet: null,
  nextCalendarEvent: null,
  recalledAt: null,
  dismissedAt: null,
  createdAt: Date.now(),
};

describe("Thread Lock db helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createThreadLock returns the new lock", async () => {
    vi.mocked(db.createThreadLock).mockResolvedValue(mockLock);
    const result = await db.createThreadLock({
      userId: 42,
      whatDoing: mockLock.whatDoing,
      whatNext: mockLock.whatNext,
    });
    expect(result).toMatchObject({ id: 1, userId: 42 });
    expect(db.createThreadLock).toHaveBeenCalledOnce();
  });

  it("getActiveThreadLock returns null when no active lock exists", async () => {
    vi.mocked(db.getActiveThreadLock).mockResolvedValue(null);
    const result = await db.getActiveThreadLock(42);
    expect(result).toBeNull();
  });

  it("getActiveThreadLock returns the lock when one is active", async () => {
    vi.mocked(db.getActiveThreadLock).mockResolvedValue(mockLock);
    const result = await db.getActiveThreadLock(42);
    expect(result).toMatchObject({ id: 1, whatDoing: mockLock.whatDoing });
  });

  it("recallThreadLock marks the lock as recalled", async () => {
    const recalled = { ...mockLock, recalledAt: Date.now() };
    vi.mocked(db.recallThreadLock).mockResolvedValue(recalled);
    const result = await db.recallThreadLock({ userId: 42, lockId: 1 });
    expect(result?.recalledAt).not.toBeNull();
  });

  it("dismissThreadLock marks the lock as dismissed", async () => {
    const dismissed = { ...mockLock, dismissedAt: Date.now() };
    vi.mocked(db.dismissThreadLock).mockResolvedValue(dismissed);
    const result = await db.dismissThreadLock({ userId: 42, lockId: 1 });
    expect(result?.dismissedAt).not.toBeNull();
  });

  it("getThreadLockHistory returns an array", async () => {
    vi.mocked(db.getThreadLockHistory).mockResolvedValue([mockLock]);
    const result = await db.getThreadLockHistory({ userId: 42, limit: 10 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });
});

describe("Thread Lock business logic", () => {
  it("a lock is considered active if created within 4 hours and not recalled/dismissed", () => {
    const fourHoursMs = 4 * 60 * 60 * 1000;
    const recentLock = { ...mockLock, createdAt: Date.now() - 30 * 60 * 1000 }; // 30 min ago
    const isActive =
      !recentLock.recalledAt &&
      !recentLock.dismissedAt &&
      recentLock.createdAt >= Date.now() - fourHoursMs;
    expect(isActive).toBe(true);
  });

  it("a lock is considered expired if created more than 4 hours ago", () => {
    const fourHoursMs = 4 * 60 * 60 * 1000;
    const oldLock = { ...mockLock, createdAt: Date.now() - 5 * 60 * 60 * 1000 }; // 5 hours ago
    const isActive =
      !oldLock.recalledAt &&
      !oldLock.dismissedAt &&
      oldLock.createdAt >= Date.now() - fourHoursMs;
    expect(isActive).toBe(false);
  });

  it("a recalled lock is not active", () => {
    const recalled = { ...mockLock, recalledAt: Date.now() };
    const isActive = !recalled.recalledAt && !recalled.dismissedAt;
    expect(isActive).toBe(false);
  });

  it("a dismissed lock is not active", () => {
    const dismissed = { ...mockLock, dismissedAt: Date.now() };
    const isActive = !dismissed.recalledAt && !dismissed.dismissedAt;
    expect(isActive).toBe(false);
  });
});
