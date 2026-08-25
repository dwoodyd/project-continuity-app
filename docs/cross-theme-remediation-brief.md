# Cross-Theme Contrast and Wren Stage Remediation

The supplied Claude artifact URL returned a public “Page not found” response on 2026-08-17. The implementation scope therefore follows the user-provided audit text exactly.

## Required fixes

1. Repair the invisible light-mode Continuary wordmark, low-contrast “See what’s inside” link, and green-on-green pricing savings badge.
2. Replace legacy dark-theme opacity values that remain below readable contrast on the landing and pricing surfaces.
3. Remove route-level hard-locking of light or dark mode. The persisted user-controlled theme must apply consistently to public and authenticated routes.
4. Preserve Wren’s existing glow treatment by placing Wren within an intentional dark stage in both themes. The stage must use contained media with protected padding so wing edges are not clipped.
5. Add regression coverage for the critical contrast values and route-consistent theme behavior.
