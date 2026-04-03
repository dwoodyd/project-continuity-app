import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** JWT ID claim — present when user is authenticated. Used for server-side session revocation. */
  sessionJti: string | null;
  /** JWT expiration (Unix seconds) — used to set the revocation record's expiresAt. */
  sessionExp: number | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let sessionJti: string | null = null;
  let sessionExp: number | null = null;

  try {
    const enrichedUser = await sdk.authenticateRequest(opts.req);
    // Strip the private _session* fields from the User object before storing
    sessionJti = enrichedUser._sessionJti ?? null;
    sessionExp = enrichedUser._sessionExp ?? null;
    const { _sessionJti, _sessionExp, ...plainUser } = enrichedUser as any;
    user = plainUser as User;
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    sessionJti,
    sessionExp,
  };
}
