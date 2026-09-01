# iOS Media Repair Audit — Sep 1, 2026

## Reported behavior

On real iPhone Safari, Wren media showed broken-image placeholders and the compact bottom navigation sat under Safari chrome.

## Verified delivery findings

- Active Wren MP4 assets are H.264 / AVC (`avc1`) with `yuv420p` video; the managed Letter source had been HEVC in a `.mov` container and was replaced with an H.264/AAC fast-start MP4.
- The app-domain storage proxy supported HTTP `206` range responses, but the upstream asset source declared several MP4 and PNG files as `application/octet-stream` or `binary/octet-stream` while the response also set `X-Content-Type-Options: nosniff`.
- The storage proxy now normalizes generic upstream types from safe file extensions before sending the application-domain response, returning `video/mp4`, `image/png`, or `image/jpeg` while retaining `Content-Range` and `Accept-Ranges: bytes`.
- A local app-domain probe confirmed active Wren MP4 and PNG paths return `206`, correct corrected MIME types, a `Content-Range`, and `Accept-Ranges: bytes`.

## Client safeguards added

- WrenPlayer, TodayGreetingWren, and IntroWrenScene use `preload="metadata"`, an explicit `video/mp4` source, a supported poster, and a guarded still fallback that does not leave a broken image after both media and poster failure.
- The service worker is versioned to `continuity-v8` and bypasses Cache Storage for `/manus-storage/` and video requests.
- The compact shell uses `100svh`/`100dvh`; the bottom navigation and floating capture control use a larger safe-area minimum of 14px.

## Validation status

- TypeScript passed.
- The full Vitest suite passed: 44 files / 517 tests.
- Sandbox visual capture of the public tour remained blank despite a healthy local server and no browser-console errors; this does not replace real-iPhone confirmation.
