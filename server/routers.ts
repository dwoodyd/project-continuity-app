import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { projectsRouter } from "./routers/projects";
import { vaultRouter } from "./routers/vault";
import { checkInsRouter } from "./routers/checkIns";
import { aiRouter } from "./routers/ai";
import { settingsRouter } from "./routers/settings";
import { dailyPlanRouter } from "./routers/dailyPlan";
import { focusSessionsRouter } from "./routers/focusSessions";
import { intelligenceRouter } from "./routers/intelligence";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  projects: projectsRouter,
  vault: vaultRouter,
  checkIns: checkInsRouter,
  ai: aiRouter,
  settings: settingsRouter,
  dailyPlan: dailyPlanRouter,
  focusSessions: focusSessionsRouter,
  intelligence: intelligenceRouter,
});

export type AppRouter = typeof appRouter;
