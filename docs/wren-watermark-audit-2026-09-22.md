# Wren UI Video Watermark Audit

**Date:** September 22, 2026  
**Scope:** Every unique video source rendered by the Continuary client, including onboarding slides and completion states, Today surfaces, tour, Focus/PiP, Weekly Compass, Evidence Log, Clarity Engine, and raw `<video>` call sites outside the central player.

## Method

The audit began from a complete source-code inventory of client video references. Every unique active source was downloaded through the app-owned `/api/media` route and inspected using representative frame sheets. Portrait clips were then rechecked at full resolution because a platform mark can sit in a black sidebar and be invisible in a normal contact sheet. A separate full-video visual analysis was run over the final active set. Direct `<video>` renderers were included; the review did not rely solely on `WrenPlayer`'s verified-key gate.

## Findings and corrective action

| Retired source | Where it could have rendered | Finding | Safe replacement |
|---|---|---|---|
| `wren_main_corner_wave_b211fe78_a4cf1dad.mp4` | Legacy home/onboarding compatibility path | Visible Veo watermark | `wren_hovering_archway_b1c86b40.mp4` |
| `wren_memory_orb_92969214.mp4` | Legacy memory/Weekly Compass compatibility path | Visible Veo watermark | `wren_luminous_floats_fdfcf0c1.mp4` |
| `wren_peeking_9a813da0_b6d5c634.mp4` | Onboarding/tour peeking path | Visible Veo watermark in portrait sidebar | `wren_winks_ripple_44f66820_e99c470c.mp4` |
| `wren_holding_orb_4c6ec928.mp4` | Weekly Compass/Today-afternoon compatibility path | Visible Veo watermark in portrait sidebar | `wren_luminous_floats_fdfcf0c1.mp4` |

All four filenames are now absent from client runtime code. The replacements are explicit registry mappings rather than CSS masking or cropping. No watermark was concealed.

## Final verification result

The final source inventory contains **23 unique renderable videos**. All 23 rendered successfully through the app route and cleared the post-correction video analysis. One intentional in-scene word, **“JOURNAL,”** appears on the rendered book in `hoversJournal`; it is artwork within the scene, not a platform or creator watermark.

The protected Focus body-doubling set—`weaving`, `reading`, and `lookingup`—was not remapped or otherwise modified. The Focus/PiP regression suite passed after the audit.

## Regression protection

`server/onboardingMediaAudit.test.ts` now rejects every retired source filename and asserts the affected onboarding/Weekly Compass mappings. This protects against reintroducing the four confirmed watermarked files in a future edit.
