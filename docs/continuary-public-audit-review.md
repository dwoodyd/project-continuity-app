# Continuary Public-Surface Audit Review

## Preliminary verified findings

- `AnimatedSplash` currently remains mounted for approximately 4.22 seconds and creates an `AudioContext` from a timer rather than a user gesture. This supports the audit's boot-delay and autoplay-warning findings.
- `PWAInstallBanner` can display on first visit after a short delay and does not currently exclude `/pricing` or require prior engagement.
- The public-route app shell mounts both the splash and install banner globally, so these behaviors affect deep links unless route-aware conditions are introduced.

## Still being compared

- Production CSP and inline public-page styles/scripts.
- `/pricing` mobile overflow, heading hierarchy, icon labels, target sizes, and semantic landmarks.
- Public-page typography and focus visibility.

## Confirmed gaps after source comparison

The production CSP permits only self-hosted and CDN scripts, while `WelcomePage` renders an inline style block with no nonce. That is consistent with the audit's CSP errors. The splash remains global and retains users for roughly 4.22 seconds; its timed chime creates an `AudioContext` before a user gesture. The PWA banner has no engagement threshold or route exclusion, so it can compete with pricing conversion.

The pricing page still contains an unlabelled back icon, two H1 elements, and a non-wrapping invite banner with a `whitespace-nowrap` CTA. The public Welcome page contains 10px and 12px copy and does not establish a top-level main landmark.

## Findings that are stale or already addressed

The audit's claim that no error boundary or public loading state exists is no longer current: `App.tsx` wraps the application in `ErrorBoundary` and supplies a lazy-route `PageLoader`. The older `/landing` experience is now an external redirect, so its historic form-control findings belong to the separate marketing site, not this repository.

## Additional confirmed defect

`PageMeta` appends ` — Continuary` unless its input is exactly `Continuary`. Public-page callers that already include the brand therefore generate duplicated browser and social titles. This should use the same brand-presence guard as the shared application shell.

## Exact CSP sources

The public HTML includes two executable inline scripts: the synchronous theme bootstrap and analytics-loader script. Both are blocked by the production `script-src` directive, which has no script nonce or hash. `WelcomePage` also includes an inline style block, while production `style-src` accepts only nonce-bearing styles. The remediation is to move executable bootstrap and analytics logic into bundled modules and move the Welcome animation rules into the application stylesheet; structured-data JSON scripts remain non-executable metadata.
