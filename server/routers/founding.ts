import { publicProcedure, router } from "../_core/trpc";
import { getFoundingSlots } from "../foundingSlots";

export const foundingRouter = router({
  slots: publicProcedure.query(() => getFoundingSlots()),
});
