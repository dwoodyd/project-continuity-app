# Launch Blocker Audit — 2026-08-20

## PayPal live configuration

A read-only API audit confirmed `PAYPAL_ENV=live` and successfully obtained a live access token. All eight current `PAYPAL_PLAN_*` identifiers are unset. The two configured legacy variables, `PAYPAL_PLAN_ID` and `PAYPAL_KEEPER_PLAN_ID`, each return `404 RESOURCE_NOT_FOUND` from the live PayPal plan endpoint. This explains the reported `INVALID_RESOURCE_ID` checkout failure.

`PAYPAL_WEBHOOK_ID` resolves successfully in the live account and is registered at `https://app.continuary.app/api/paypal/webhook`. It must be retained.

The safe next configuration action is to clear only the two stale legacy plan values. The existing plan-resolution logic then falls back to creating valid live plans on the next checkout attempt. No subscription is charged until a user approves it in PayPal.

## OAuth identity

The platform-managed `VITE_APP_TITLE` was set to the approved title, `Continuary`, and a regression test confirms the runtime build environment receives that value. The live consent screen still requires a logged-out end-user handoff check after configuration propagation.

## Browser observation

The authenticated owner session renders `/signin` as an in-app 404 route, so it cannot be used to inspect the logged-out OAuth consent handoff without ending the current signed-in session. No account state was changed during this audit.

The subsequent live pricing-route verification reached `https://app.continuary.app/pricing` and initially displayed its loading state. No checkout action or subscription approval has been performed at this point.

A later deployed-route retry also remained in its loading state and exposed no subscription control to the browser session. The page therefore could not be used as an alternative approval-link validation path, and no financial action was attempted.

After the post-publish deployment, the live pricing route rendered successfully for the authenticated owner. It exposed the current subscription state and an interactive **Upgrade to Keeper** control. The control has not yet been activated in this verification record.

With user approval, the Keeper upgrade control was activated. The interface entered its **Redirecting to PayPal** state, but the browser did not reach a PayPal approval page within the follow-up observation window. No approval, charge, activation, or cancellation action was performed. Application diagnostics must be inspected next to distinguish a delayed redirect from a rejected checkout request.

Production diagnostics showed that the live backend successfully created the expected Keeper Founding Monthly plan, proving the invalid-plan failure no longer blocks plan resolution. The remaining browser failure was client-side: the page requested `window.open()` only after an asynchronous checkout mutation, a pattern browsers can block as a popup. The handoff now uses same-tab navigation to PayPal, which preserves the configured return URLs and avoids popup blocking.

The authenticated home-route reload reached the application shell but remained in its initial loading state, so the current browser session could not safely reach the sign-out control needed to inspect the logged-out OAuth consent handoff.

## Bounded live verification status

After the legacy fallback was removed, type-checking and the complete regression suite passed (31 test files, 453 tests). A user-approved, approval-link-only live PayPal verification was attempted without approving any payment. The sandbox transport reset its TLS connection to `api-m.paypal.com` before the application could request a fresh live plan identifier. No plan, subscription, approval, charge, or account entitlement was created by that failed transport attempt.

The earlier read-only audit had already completed a successful live token exchange, so this transport failure does not change the diagnosis: the invalid legacy plan identifiers were the direct checkout blocker, and the application now ignores them even if a stale runtime environment continues injecting them.
