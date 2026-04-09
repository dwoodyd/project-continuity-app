import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { insertFeedback, getFeedbackList, resolveFeedback } from "../db";
import { notifyOwner } from "../_core/notification";

export const feedbackRouter = router({
  submit: protectedProcedure
    .input(z.object({
      category: z.enum(["bug", "suggestion", "question", "other"]),
      message: z.string().min(1).max(2000),
      deviceInfo: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await insertFeedback({
        userId: ctx.user.id,
        category: input.category,
        message: input.message,
        deviceInfo: input.deviceInfo ?? null,
      });

      const categoryLabel = {
        bug: "🐛 Bug Report",
        suggestion: "💡 Suggestion",
        question: "❓ Question",
        other: "📬 Feedback",
      }[input.category];

      await notifyOwner({
        title: `${categoryLabel} from ${ctx.user.name ?? "a user"}`,
        content: `**Category:** ${input.category}\n**User:** ${ctx.user.name ?? "Unknown"} (ID: ${ctx.user.id})\n\n${input.message}${input.deviceInfo ? `\n\n_Device: ${input.deviceInfo}_` : ""}`,
      });

      return { success: true };
    }),

  // Admin only: list all feedback
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") return [];
    return getFeedbackList(100);
  }),

  // Admin only: mark feedback as resolved/unresolved
  resolve: protectedProcedure
    .input(z.object({ id: z.number(), resolved: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Forbidden");
      await resolveFeedback(input.id, input.resolved);
      return { success: true };
    }),
});
