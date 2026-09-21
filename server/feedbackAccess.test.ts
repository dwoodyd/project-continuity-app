import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  insertFeedback: vi.fn(),
  getFeedbackList: vi.fn(),
  resolveFeedback: vi.fn(),
}));

vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));

import * as db from "./db";
import { feedbackRouter } from "./routers/feedback";

function ctx(role: "admin" | "user"): TrpcContext {
  return {
    user: { id: role === "admin" ? 1 : 2, role, name: role === "admin" ? "Admin" : "Member" },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    sessionJti: null,
    sessionExp: null,
  } as TrpcContext;
}

beforeEach(() => vi.clearAllMocks());

describe("feedback admin boundary", () => {
  it("returns FORBIDDEN rather than an empty success response to non-admin feedback.list callers", async () => {
    const caller = feedbackRouter.createCaller(ctx("user"));

    await expect(caller.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getFeedbackList).not.toHaveBeenCalled();
  });

  it("returns feedback only to an admin caller", async () => {
    vi.mocked(db.getFeedbackList).mockResolvedValueOnce([{ id: 8, message: "A report" }] as any);
    const caller = feedbackRouter.createCaller(ctx("admin"));

    await expect(caller.list()).resolves.toEqual([{ id: 8, message: "A report" }]);
    expect(db.getFeedbackList).toHaveBeenCalledWith(100);
  });

  it("returns FORBIDDEN to non-admin resolve callers without attempting a write", async () => {
    const caller = feedbackRouter.createCaller(ctx("user"));

    await expect(caller.resolve({ id: 8, resolved: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.resolveFeedback).not.toHaveBeenCalled();
  });
});
