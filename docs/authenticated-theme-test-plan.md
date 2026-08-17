# Authenticated Theme Audit Plan

## Completed code verification

The persisted theme controller is available at the application root and stores the selected value in browser storage. First-time visitors receive the warm navy/amber interior by default; selecting Studio Wall replaces it with the paper/red system and persists that selection. The unauthenticated sign-in doorway is the deliberate exception: it remains a quiet Studio Wall surface and does not change the selected authenticated interior.

The four Wren product moments are covered by regression tests: Return Brief uses `tuggingThread`, a completed check-in uses `blobJournal`, an active focus session uses the small `cornerWave` companion, and What Wren Remembers uses `memoryOrb`.

## Required real-account pass

The authenticated audit cannot be completed with a seeded username and password because Continuary uses Manus OAuth only. Use a disposable **non-owner Manus OAuth account** in a separate browser profile. Do not use DeWayne Woods' owner account for this pass, so its admin and Pro status remain untouched.

| Step | Expected result |
|---|---|
| Sign in from the quiet light gate | Successful OAuth returns to the app; Wren is absent from the gate. |
| Verify first authenticated load | The app enters warm navy with amber primary actions. |
| Toggle to Studio Wall in Settings or the shell toggle | Paper, graphite, and red pen surfaces appear; after reload, the choice persists. |
| Return to dark mode and reload | Warm navy/amber returns and persists. |
| Return Brief after a gap | `tuggingThread` appears in its protected dark stage. |
| Complete a check-in | `blobJournal` appears at the completion moment. |
| Run an active focus session | A small `cornerWave` appears as an alongside companion, not as a form overlay. |
| Open What Wren Remembers | `memoryOrb` appears in the recall header. |

## Release note

The automated suite verifies source-level theme persistence, token values, sign-in doorway styling, and Wren mapping. The real-account pass remains required for OAuth return flow, media playback, and visual contrast on actual devices.
