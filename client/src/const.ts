export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Returns the path/URL to redirect unauthenticated users to.
 * With Clerk, sign-in is handled by Clerk's hosted page — the SDK's
 * RedirectToSignIn component uses this path internally.
 * We keep getLoginUrl() so all existing call sites continue to compile.
 */
export const getLoginUrl = (_returnPath?: string): string => {
  // Clerk's RedirectToSignIn handles the actual redirect.
  // Return "/sign-in" as a fallback path for any imperative redirects.
  return "/sign-in";
};
