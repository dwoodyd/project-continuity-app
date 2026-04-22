import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { createWaitlistRequest, getWaitlistRequests } from "../db";
import { notifyOwner } from "../_core/notification";
import { TRPCError } from "@trpc/server";

export const waitlistRouter = router({
  join: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().max(255).optional(),
        reason: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createWaitlistRequest(input);
      await notifyOwner({
        title: "New Waitlist Request",
        content: `${input.name ?? "Someone"} (${input.email}) has requested access to Continuary.\n\nReason: ${input.reason ?? "Not provided"}`,
      });
      return { success: true };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getWaitlistRequests();
  }),
});
