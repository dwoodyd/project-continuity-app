/**
 * The app shell may wait briefly for the session and profile queries to resolve,
 * but it must never leave a person on placeholder UI indefinitely.
 */
export const AUTH_RESOLUTION_TIMEOUT_MS = 8_000;
export const AUTH_SIGNOUT_ATTEMPT_TIMEOUT_MS = 1_500;

export function shouldShowAuthStartupRecovery(
  authGateResolving: boolean,
  resolutionTimedOut: boolean,
) {
  return authGateResolving && resolutionTimedOut;
}
