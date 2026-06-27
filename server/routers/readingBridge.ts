import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserProfile, updateUserProfile, upsertUserProfile } from "../db";

// ── Chapter manifest ──────────────────────────────────────────────────────────
// Static config — update here if chapter titles change.
export const PERMISSION_TO_START_CHAPTERS = [
  { key: "intro", part: "Introduction", title: "Introduction: You Have Permission to Start" },
  { key: "ch1",   part: "Part I — The Starting Problem", title: "Chapter 1: The Real Problem Is Not Laziness" },
  { key: "ch2",   part: "Part I — The Starting Problem", title: "Chapter 2: Why Productivity Advice Fails at the Threshold" },
  { key: "ch3",   part: "Part I — The Starting Problem", title: "Chapter 3: What Resistance May Be Protecting" },
  { key: "ch4",   part: "Part I — The Starting Problem", title: "Chapter 4: Permission Before Performance" },
  { key: "ch5",   part: "Part II — The Method", title: "Chapter 5: The Threshold Moment" },
  { key: "ch6",   part: "Part II — The Method", title: "Chapter 6: The First Movable Step" },
  { key: "ch7",   part: "Part II — The Method", title: "Chapter 7: Lower the Friction" },
  { key: "ch8",   part: "Part II — The Method", title: "Chapter 8: When the Timer Ends" },
  { key: "ch9",   part: "Part III — Using the Method in Real Life", title: "Chapter 9: Different Kinds of Stuck" },
  { key: "ch10",  part: "Part III — Using the Method in Real Life", title: "Chapter 10: Creative Block, Shame, and Return" },
  { key: "ch11",  part: "Part III — Using the Method in Real Life", title: "Chapter 11: Build a Practice You Can Return To" },
  { key: "ch12",  part: "Part III — Using the Method in Real Life", title: "Chapter 12: When This Is Not Enough" },
  { key: "conclusion", part: "Closing", title: "Conclusion: Start Small, Return Often" },
] as const;

export type ChapterKey = typeof PERMISSION_TO_START_CHAPTERS[number]["key"];

// Brief concept summaries Wren can reference per chapter
export const CHAPTER_CONCEPTS: Record<string, string> = {
  intro:       "the idea that you already have permission — you don't need to earn the right to start",
  ch1:         "the real problem not being laziness, but the weight of starting itself",
  ch2:         "why standard productivity advice breaks down at the moment of beginning",
  ch3:         "what resistance might actually be protecting — and why that matters",
  ch4:         "giving yourself permission before performance, not after",
  ch5:         "the threshold moment — that specific instant before action where everything stalls",
  ch6:         "finding the first movable step when everything feels immovable",
  ch7:         "lowering friction so starting becomes the path of least resistance",
  ch8:         "what to do when the timer ends and the session is over",
  ch9:         "the different kinds of stuck and how to recognize which one you're in",
  ch10:        "creative block, shame, and the practice of returning without judgment",
  ch11:        "building a practice you can actually return to — not a perfect one",
  ch12:        "knowing when this method is not enough and what to do then",
  conclusion:  "starting small and returning often as the whole practice",
};

export const readingBridgeRouter = router({
  /** Get the user's current Reading Bridge state */
  get: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserProfile(ctx.user.id);
    return {
      chapter: profile?.readingBridgeChapter ?? null,
      finished: profile?.readingBridgeFinished ?? false,
      dismissed: profile?.readingBridgeDismissed ?? false,
      chapters: PERMISSION_TO_START_CHAPTERS,
    };
  }),

  /** Set the current chapter (or finished/dismissed state) */
  set: protectedProcedure
    .input(z.object({
      chapter: z.string().max(64).nullable().optional(),
      finished: z.boolean().optional(),
      dismissed: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertUserProfile({ userId: ctx.user.id });
      await updateUserProfile(ctx.user.id, {
        ...(input.chapter !== undefined ? { readingBridgeChapter: input.chapter } : {}),
        ...(input.finished !== undefined ? { readingBridgeFinished: input.finished } : {}),
        ...(input.dismissed !== undefined ? { readingBridgeDismissed: input.dismissed } : {}),
      });
      return { success: true };
    }),
});
