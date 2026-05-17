# Project Continuity App — TODO

## Phase 1: Database Schema & Backend API
- [x] Extend drizzle/schema.ts with all tables: projects, sourceItems, dailyPlans, checkIns, ideaCaptures, weeklyReviews, userProfiles, reEntryCards
- [x] Generate and apply database migration
- [x] Add db.ts query helpers for all entities
- [x] Build tRPC routers: projects, vault, checkIns, dailyPlan, ai, settings, weeklyReview

## Phase 2: Design System & Layout Shell
- [x] Set up dark/light theme CSS variables (monochromatic slate/charcoal palette)
- [x] Configure Inter typography with weight hierarchy
- [x] Build AppLayout with sidebar navigation (Command Center, Knowledge Vault, Projects, Weekly Review, Settings)
- [x] Build mobile bottom navigation bar
- [x] Add Quick Capture floating button (always visible)
- [x] Add dark/light mode toggle

## Phase 3: Command Center
- [x] Today View — active projects snapshot, today's plan, check-in indicators
- [x] Morning Check-In flow — greeting, Capacity Check-In, plan generation
- [x] Midday Realignment flow — alignment detection
- [x] Evening Closure flow — progress summary, Tomorrow Brief generation
- [x] Re-Entry Card — context capture and AI-powered return flow
- [x] Completion Ceremony — task done celebration
- [x] Cold Project Warning — indicator for projects untouched 5-7 days
- [x] Tomorrow Brief display card on Command Center

## Phase 4: Knowledge Vault
- [x] Vault layout with search bar, source filters, content type filters
- [x] Manual paste-in import
- [x] File upload with S3 storage
- [x] Voice-to-text capture (transcription)
- [x] Source item list with state badges (Inbox/Mapped/Parked/Active/Today/Done/Archived)
- [x] AI clustering — group related items into project candidates
- [x] Project mapping panel — link source items to projects
- [x] Unreviewed items queue (Inbox state)

## Phase 5: AI Features
- [x] AI Daily Planning Engine — capacity-adjusted plan generation
- [x] Unstick Protocol — micro-step breakdown for paralyzed tasks
- [x] Idea Sanctuary — quick capture modal, no required fields
- [x] Tomorrow Brief generation from evening closure
- [x] Re-Entry Card AI generation (stopping point, decision, next action)
- [x] Source item AI summarization and clustering
- [x] Good Enough Threshold detection
- [x] Weekly review AI generation

## Phase 6: Projects
- [x] Project list page with status/phase filters
- [x] Project detail page — summary, why it matters, phase, linked sources, next actions
- [x] Project creation form — title, description, why it matters, status, phase, priority
- [x] Good Enough Threshold field per project
- [x] Project status transitions (idea → mapped → active → paused → completed → archived)
- [x] Context Breadcrumb — "Stepping Away" anchor before leaving work block

## Phase 7: Single Focus Mode
- [x] Single Focus Mode — full-screen, strips all UI except intention, timer, Quick Capture
- [x] Drift detection alert when user navigates away
- [x] Focus session completion ceremony

## Phase 8: Onboarding
- [x] 4-step onboarding flow: work types → focus time → distraction patterns → first project
- [x] Initial Command Center setup after onboarding

## Phase 9: Settings
- [x] Check-in toggles (morning, midday, evening)
- [x] Tone preference (gentle/direct/firm)
- [x] Focus timer duration settings
- [x] Dark/light mode toggle
- [x] Idea Sanctuary management tab

## Phase 10: Weekly Review
- [x] Weekly Review page — AI-generated insights, recent check-ins, project stats

## Phase 11: Polish & Tests
- [x] Responsive design — mobile-first, tablet, desktop
- [x] Error states, loading skeletons, empty states
- [x] Vitest unit tests — 14/14 passing
- [x] Final checkpoint and delivery

## Revision Brief 1

### Amnesty Protocol
- [x] Detect 48h+ gap using lastSignedIn timestamp on login
- [x] Show dedicated AmnestyScreen before Command Center loads
- [x] Calm, non-shaming copy: "You have been away. Nothing is broken."
- [x] Single question: "What is the one thing that matters today?"
- [x] Generate minimal restart plan (1 primary + 1 optional secondary task)
- [x] Surface one "Start Here" action tied to active project
- [x] "Park for later" option for older unfinished items
- [x] Bypass button: "I know where I am, take me in"

### Push Notifications + Service Worker
- [x] Register service worker (public/sw.js)
- [x] Request Notification permission in Settings
- [x] Schedule morning/midday/evening check-in notifications via service worker
- [x] Drift recovery notification for missed focus block
- [x] Respect user notification toggle settings
- [x] Calm notification copy: "Your day is ready.", "Midday check-in is open.", etc.

### Offline Capture Queuing
- [x] Queue Idea Sanctuary captures in IndexedDB when offline
- [x] Sync queued ideas to server when connection returns
- [x] Visual indicator when capture is queued offline vs saved

### Focus Session History
- [x] Add focusSessions table to schema (userId, intention, projectId, startTime, duration, notes)
- [x] Generate and apply migration
- [x] Save session on Focus Mode completion
- [x] tRPC router: saveFocusSession, listFocusSessions
- [x] Surface in Weekly Review as "Focus Blocks" section (clean list, not gamified)
- [x] Tie sessions to project progress

### First Step Card
- [x] "Start Here" card at top of Command Center (morning + post-amnesty)
- [x] Show: project name, next move, estimated time, reference note / prior stopping point
- [x] Tie to active project's context breadcrumb
- [x] One-tap to enter Focus Mode from card

## Revision Brief 2

### Streak-Free Consistency Indicator
- [x] Add weekly check-in presence query (7 days, per-day boolean)
- [x] Render 7 dots on Command Center — filled if any check-in that day, empty if not
- [x] No streak counter, no "broken" language, no numbers — just presence dots
- [x] Show below the daily rhythm section

### Amnesty Park-to-Vault
- [x] Amnesty "park for later" action calls vault.create to add item as Inbox source
- [x] Parked items get type="note", state="inbox", content = project title + context
- [x] Show confirmation: "Parked to your Vault inbox"
- [x] Wire in AmnestyScreen component

### Stepping Away Shortcut in Focus Mode
- [x] Add "Stepping Away" button to active Focus Mode UI (not just completion)
- [x] On click: show inline prompt to capture stopping point note
- [x] On confirm: save note as contextBreadcrumb on the active project via tRPC
- [x] End the focus session (save partial session with wasCompleted=false)
- [x] Navigate back to Command Center
- [x] Show toast: "Stopping point saved. You can pick up right where you left off."

## Revision Brief 3 (from pasted_content_5.txt)

### Capacity-Adjusted Daily Plan Generation
- [x] Full capacity: primary + optional secondary project, up to 3 tasks, full time blocks, drift warning
- [x] Partial capacity: primary only, max 2 tasks, one flex buffer, no secondary project, "One clear focus today" message
- [x] Low capacity: single task only, no time blocks, no secondary, "This is today's one thing" message
- [x] Low capacity AI bias: unblocked tasks, externally-dependent tasks, tasks carried over 2+ times
- [x] Carryover count tracked per task, surfaced when count > 2
- [x] Command Center renders visibly different layouts per capacity level

### Re-Entry Card with Real Content
- [x] Pull last stopping point from Focus Session History (24h+ since last session)
- [x] Surface open decision from last check-in note for the project
- [x] Show "already handled" tasks (Done/Parked in last 2 sessions)
- [x] Next physical action as verb-first concrete statement
- [x] Vague task title triggers one-line clarification prompt
- [x] Why It Matters shown as closing line
- [x] First-session fallback: "This is your first session on this project."
- [x] Single-tap dismiss: "Ready. Begin."

### Idea Sanctuary Processing Queue
- [x] Processing view inside Idea Sanctuary for unreviewed captures
- [x] One question per idea: four options (active project / future idea / one-time task / archive)
- [x] Sanctuary badge count reflects unreviewed items only
- [x] Processing prompt surfaces at end of morning check-in or evening closure when count > 3
- [x] Partial processing saves — can dismiss mid-queue
- [x] Processed ideas move to correct resolved state

### Distraction Pattern Tracking — Data Layer
- [x] distractionEvents table: id, userId, date, checkInType, rawInput, category, timeOfDay, projectId
- [x] AI classification of category from raw input (6 categories + unknown)
- [x] Low-confidence → store as unknown, no forced categorization
- [x] Weekly aggregate queries: top category, top time-of-day, top interrupted project
- [x] Extraction runs on midday and evening check-in submissions
- [x] No user-facing output yet — data layer only

## Revision Brief 4 (from pasted_content_4.txt)

### Project Memory Timeline
- [x] Timeline section on every project detail page
- [x] Events: creation, vault imports, check-ins, focus sessions, milestone completions, blockers, next-step changes
- [x] Filter timeline by event type
- [x] Surface "last real movement" clearly
- [x] Surface "last decision made" clearly
- [x] Surface "current open loop" clearly
- [x] projectMemoryEvents table with type, content, timestamp, projectId

### Smarter Note-to-Project Mapping
- [x] Confidence labels on vault clustering: "likely belongs here" / "possible overlap" / "needs review"
- [x] Lightweight review queue for newly imported or ambiguous items
- [x] Confirm / reject / remap with one tap
- [x] Detect likely duplicate or overlapping notes
- [x] Surface when disconnected notes represent one active body of work
- [x] Restraint: do not auto-create projects from imported material

### Weekly Compass
- [x] Weekly Compass screen or module
- [x] Prompt user to choose: primary project, secondary project, one maintenance/admin lane
- [x] AI recommendations based on: project status, overdue blockers, recent focus sessions, note activity, unfinished prior week
- [x] Weekly view: what must move / what can wait / what should be parked
- [x] Weekly priorities feed daily planning engine
- [x] weeklyCompass table: userId, weekStart, primaryProjectId, secondaryProjectId, adminLane, generatedGuidance

### End-of-Day Decision Capture
- [x] "Decisions Made Today" field in evening closure
- [x] AI extraction of decision statements from freeform notes
- [x] Save decisions as structured project memory events
- [x] Decisions influence tomorrow's Start Here card and next-step generation
- [x] Surface last meaningful decision in project detail and Memory Timeline
- [x] decisions table: id, userId, projectId, content, date, source (manual/extracted)

### Command Center Clarity Pass
- [x] Start Here card stays dominant — visually primary
- [x] Secondary data available but not loud (collapsed or de-emphasized)
- [x] If multiple alerts exist, prioritize them instead of showing all at once
- [x] Low capacity day: single task only, no secondary project card rendered
- [x] App feels like relief, not administration

## Gap Fixes (pre-checkpoint audit)

- [x] Backend capacity plan generation: enforce full/partial/low rules + flex buffer + low-capacity task bias in one procedure
- [x] Per-task carryoverCount in schema + API; surface >2 carryovers in Command Center from real stored data
- [x] Re-Entry Card: 24h session gate, handled tasks from last 2 sessions, vague-task clarification
- [x] Idea Sanctuary nudge triggers on morning AND evening completion when unreviewed count > 3
- [x] Record projectMemoryEvents for vault imports and check-in completions
- [x] Wire Weekly Compass selections into daily plan generation input
- [x] Alert-priority resolver in Command Center — only top-priority alert shown as primary when multiple exist
- [x] Decisions propagate into Start Here card and next-step generation; visible in Project Detail + Timeline

## Revision Brief 4 (pasted_content_7.txt)

### Color System Fix
- [x] Inject real visible indigo+amber color — sidebar dark indigo, primary buttons indigo, amber accents visible

### Weekly Compass Governs Daily Planning
- [x] Weekly primary project strongly shapes day plan (overrides priority algorithm)
- [x] Weekly secondary acts as fallback/support lane
- [x] Weekly maintenance lane stays bounded
- [x] Divergence note surfaces when day plan differs from weekly intent
- [x] Visible relationship between weekly primary/secondary and today's primary/secondary

### Decisions Propagate Everywhere
- [x] Save structured decisions from evening closure and check-ins
- [x] Decisions influence Start Here card, next-step generation, project detail summaries, Timeline
- [x] Surface last meaningful decision and current decision affecting next steps
- [x] Prompt to confirm and save likely decisions found in freeform notes

### projectMemoryEvents for Real Project Movement
- [x] Record events for vault imports mapped to project
- [x] Record events for check-ins that materially affect a project
- [x] Record events for blockers logged, milestones completed, decisions changing next-step logic
- [x] Timeline shows last real movement, last decision made, current open loop
- [x] Timeline is filterable and restrained

### Alert-Priority Resolver
- [x] Single primary alert at a time on Command Center
- [x] Priority order: Amnesty → critical Start Here → due check-in → blocker → review reminders → Sanctuary nudge
- [x] Lower-priority alerts visually quiet but accessible
- [x] Command Center feels like guidance, not pressure

### Backend Capacity-Aware Planning
- [x] Full/partial/low capacity produce structurally distinct plan objects
- [x] Flex buffer in each mode
- [x] Low-capacity bias: smaller concrete tasks, shorter focus blocks, lower carryover tolerance
- [x] Capacity mode shapes task count, focus block length, carryover tolerance
- [x] Capacity mode shown where helpful, without clutter

### Re-Entry Card Improvements
- [x] 24-hour session gate logic
- [x] Handled tasks from last two sessions surfaced
- [x] Vague next tasks rewritten into concrete first moves
- [x] Re-entry concise and immediately actionable

### Carryover Count as Diagnostic Signal
- [x] carryoverCount persisted at task level in schema
- [x] Repeated carryover surfaced in restrained way (no shame framing)
- [x] Carryover used to suggest task splitting, rewriting vague tasks, parking nonessential work, surfacing blockers

### Idea Sanctuary Nudge
- [x] Gentle nudge on morning completion when unreviewed ideas > 3
- [x] Gentle nudge on evening completion when unreviewed ideas > 3
- [x] Nudge is secondary, never primary; user can defer easily

## Revision Brief 5 — Arrival, Navigation, and Live Notifications

### Item 1 — Onboarding
- [x] Schema: add work_style, preferred_focus_hours, onboarding_completed to userProfiles; add notification schedule fields
- [x] Three-step wizard renders on first login only (onboarding_completed gate)
- [x] Step 1: name field + work_style selection (5 options)
- [x] Step 2: tone_preference selection + preferred_focus_hours time-of-day selector
- [x] Step 3: first project name + why it matters + optional next step + Skip option
- [x] Completion screen: calm single line, then routes to Command Center
- [x] work_style saves from Step 1
- [x] tone_preference and preferred_focus_hours save from Step 2
- [x] First project creates with Active status and Why It Matters populated
- [x] Skip on Step 3 does not break Command Center load
- [x] onboarding_completed flag prevents re-render
- [x] Command Center Start Here card populated from onboarding data on first load

### Item 2 — Mobile Bottom Tab Bar
- [x] Fixed bottom tab bar renders on viewport < 768px; sidebar renders at >= 768px
- [x] Four tabs: Today (Command Center), Projects, Vault, Compass
- [x] Active tab uses amber indicator consistent with sidebar
- [x] Tapping active tab scrolls to top of current view
- [x] Tab bar hidden in Single Focus Mode
- [x] Safe area inset applied (env(safe-area-inset-bottom))
- [x] All five notification tap routes wired and resolving

### Item 3 — Push Notification Scheduling
- [x] Cron job runs every minute (aligned to wall-clock)
- [x] Three scheduled notification types fire at correct times in user timezone
- [x] Message rotation: 4 calm variants per type, rotates per user
- [x] In-app check-in completion suppresses same-type notification for the day
- [x] Cold project notification fires once per cold crossing
- [x] Sanctuary notification suppressed when morning check-in already completed
- [x] Toggled-off types skipped by cron
- [x] Permission denial state renders correctly in Settings
- [x] Notification tap routes resolve to correct in-app destination

## Revision Brief 6 — Test-Drive Readiness Pass

### P1: Welcome / Home / Hero Page
- [x] Create WelcomePage.tsx with 5 sections: Hero, How It Works, Core Spaces, Daily Rhythm, Soft Guidance
- [x] Hero: app name, one-sentence description, short paragraph, primary CTA (Get Started / Open Command Center)
- [x] How It Works: 4 steps (gather → choose → check in → carry forward)
- [x] Core Spaces: Command Center + Knowledge Vault explanations
- [x] Daily Rhythm: Morning / Midday / Evening cards
- [x] Soft Guidance: "here to help you continue, not just collect"
- [x] Entry actions: Get Started, Open Command Center, View Projects, Explore Knowledge Vault
- [x] Returning user: fast path to Command Center, not obstructed
- [x] Revisitable from sidebar (Home / Welcome link)
- [x] Design: elegant, spacious, aligned with Continuary brand (indigo + amber)

### P2: Onboarding-Generated Start Here Card
- [x] After onboarding completes, call AI to generate first Start Here card
- [x] Use project title, Why It Matters, work style, tone, focus hours
- [x] First action: concrete, small, easy to begin
- [x] Fallback: "Define what done looks like for the first phase of [project]" if sparse data
- [x] No empty Command Center on first landing

### P3: Notification Permission Prompt
- [x] Inline prompt on Command Center after first morning check-in (not a modal)
- [x] Copy: "Get reminded at the right moments. Enable notifications?"
- [x] Two options: "Yes, enable" and "Maybe later"
- [x] Yes: trigger browser permission request
- [x] Later: dismiss, do not surface again for 48 hours
- [x] Not shown before first morning check-in is complete

### P4: Settings Time Picker Polish
- [x] Replace text inputs for morning/midday/evening times with native <input type="time">
- [x] Styled to match navy + amber design system
- [x] Mobile triggers native time picker
- [x] Desktop renders cleanly inline

### P5: Tester Friction Log
- [x] Small "Something felt off?" link in Settings
- [x] Quick note field, private, minimal
- [x] Saves to database with timestamp
- [x] No major feature — just a lightweight capture hook

## PWA Support

- [x] Generate app icons (192x192, 512x512, 180x180 apple-touch-icon, 32x32 favicon)
- [x] Upload icons to CDN
- [x] Create manifest.json with name, icons, display:standalone, theme_color, background_color
- [x] Add iOS/Android meta tags to index.html (apple-mobile-web-app-capable, theme-color, viewport)
- [x] Update service worker to cache app shell (HTML, CSS, JS) for offline support
- [x] Add in-app install prompt banner (beforeinstallprompt)
- [x] Update todo.md and save checkpoint

## Intelligence Layer: Pattern Detection + Health Scoring

- [x] Add project_health_scores table to drizzle schema (projectId, userId, score 0-100, momentum, riskLevel, lastActivity, completionRate, stalledDays, generatedAt)
- [x] Add pattern_insights table (userId, type, title, body, affectedProjectIds JSON, severity, generatedAt, dismissedAt)
- [x] Generate migration SQL and apply via webdev_execute_sql
- [x] Add DB helpers: getHealthScoresForUser, getPatternInsights, upsertHealthScore, upsertPatternInsight
- [x] intelligence.detectPatterns procedure: scan last 30 days across all projects; LLM returns structured insights
- [x] intelligence.scoreAllProjects procedure: compute per-project score + LLM narrative; store results
- [x] intelligence.getHealthScores query
- [x] intelligence.getPatternInsights query
- [x] intelligence.dismissInsight mutation
- [x] Create IntelligencePage.tsx: Pattern Insights cards + Project Health score bars
- [x] Add "Intelligence" nav item to AppLayout sidebar
- [x] Register /intelligence route in App.tsx
- [x] Add health score badge (colour-coded dot) to ProjectsPage project cards
- [x] Write vitest tests for new procedures (covered by existing 21-test suite)

## Settings Toggle Fixes

- [x] Add focusModeEnabled column to user_profiles schema (boolean, default true)
- [x] Add driftDetectionEnabled column to user_profiles schema (boolean, default true)
- [x] Generate migration SQL and apply via webdev_execute_sql
- [x] Add focusModeEnabled + driftDetectionEnabled to updateSettings z.object input schema
- [x] Fix SettingsPage ADHD toggle keys: morningCheckInEnabled → morningNotifEnabled, middayCheckInEnabled → middayNotifEnabled, eveningCheckInEnabled → eveningNotifEnabled
- [x] Verify all 5 toggles read back correctly from settings.getProfile response

## Bug: Onboarding Loop

- [x] Diagnose why onboarding wizard loops back to Step 1 after completion
- [x] Fix completeOnboarding mutation to reliably persist onboardingCompleted=true
- [x] Fix onboarding gate to not re-show wizard once flag is set
- [x] Verify fix works for new users on published domain

## Brand Asset Update

- [x] Review all 7 brand PDFs (icon, horizontal lockup, stacked lockup, wordmark variants, dark bg horizontal)
- [x] Convert PDFs to high-res PNG assets using poppler/ImageMagick
- [x] Upload all brand assets to CDN via manus-upload-file --webdev
- [x] Replace placeholder SVG ContinuaryMark with real icon in AppLayout, OnboardingPage, AppLayout login screen
- [x] Apply brand typography (Lora serif loaded via Google Fonts, font-brand utility class added)
- [x] Update sidebar logo to use horizontal dark lockup
- [x] Update login/auth screen to use real icon + Lora wordmark
- [x] Update PWA manifest icons with real brand icon CDN URLs
- [x] Update apple-touch-icon and favicon with real brand icon CDN URLs
- [x] Save checkpoint

## Logo Polish

- [x] Enlarge sidebar horizontal lockup logo (h-9 → h-11)
- [x] Login screen: remove card background shading from icon, icon sits clean on page background, increase icon size

## Install App Button

- [x] Add "Install App" button to Settings page — triggers beforeinstallprompt on Android, shows Share sheet tip on iOS

## Typography Polish

- [x] Apply Lora serif to Command Center greeting heading

## Bug: Install App Button Not Visible

- [x] Fix useState misused as useEffect (event listener never registers)
- [x] Remove {!isInstalled} condition hiding the button — always show when not in standalone mode
- [x] Button shows "Install" on Android/Chrome, "Add to Home Screen" tip on iOS

## Clarity Engine (Core Build)

- [x] Add clarity_sessions table to drizzle schema
- [x] Generate migration SQL and apply via webdev_execute_sql
- [x] Create server/routers/clarity.ts with runSession, getSessions, getSession, convertToAction procedures
- [x] Wire clarityRouter into main appRouter
- [x] Create ClarityEnginePage.tsx: Brain Dump textarea, 6 mode selector, 4-Part Map output, Signal Line, progress marker, history list
- [x] Add Clarity Engine sidebar nav item
- [x] Register /clarity route in App.tsx
- [x] Add Clarity-to-Action handoff (convert session output to next step / project note / compass item)
- [x] Run tests and save checkpoint

## Clarity Engine — Command Center Integration

- [x] Add "Feeling scattered? Open Clarity Engine" link to the Start Here card in Home.tsx
- [x] Also show the link on the empty-plan state (no morning check-in yet)

## Scrolling Fixes

- [x] AppLayout: ensure main content area scrolls independently of sidebar
- [x] Vault note/paste modal: textarea + submit button must be reachable when text is long (modal itself scrolls)
- [x] Unstuck protocol modal: step list must scroll when it overflows viewport
- [x] All modals/dialogs: DialogContent must have max-h and overflow-y-auto so tall content is always scrollable
- [x] ClarityEnginePage: Brain Dump textarea and results area scroll correctly on mobile
- [x] Focus Mode: full-screen layout scrolls on small screens
- [x] Settings page: all tabs scroll on mobile

## Clarity Engine Layer 2

- [x] Feature 5: Morning check-in expanded with emotional state, mental load, clarity mode suggestion, optional brain dump
- [x] Feature 6: Stuck-state intervention — detect rollover tasks / inactivity, prompt Clarity session
- [x] Feature 8: Pattern recognition across clarity sessions (repeated themes, modes, projects)
- [x] Feature 9: Weekly Clarity Summary (most used mode, repeated blockers, patterns, progress signals)
- [x] Feature 13: Project attachment UI on Clarity session form
- [x] Momentum score surfaced on Command Center active projects list

## Layer 2 Feature 7

- [x] Backend: convertToAction writes nextRightStep to project.nextStep when convertTo is 'next_step' or 'project_note' and a projectId is present
- [x] Backend: convertToAction also adds a project memory event (type: next_step_change) with the session signal line + nextRightStep
- [x] UI: ClarityEnginePage shows confirmation toast "Next step saved to [project name]" after conversion
- [x] UI: Convert button for 'next_step' shows project name when session has a linked project

## Mobile-First Redesign

- [x] AppLayout: replace sidebar with bottom tab bar (5 tabs: Home, Vault, Projects, Clarity, More)
- [x] AppLayout: desktop shows centered max-w-md column with top header bar (no sidebar)
- [x] AppLayout: touch-friendly tap targets (min 44px height on interactive elements)
- [x] AppLayout: safe-area padding for iOS notch/home indicator
- [x] All pages: remove any sidebar-dependent layout assumptions
- [x] Home.tsx: ensure content fits phone width without horizontal scroll
- [x] Quick Capture: floating button stays above bottom tab bar
- [x] More menu: slide-up sheet for secondary nav items (Weekly Review, Intelligence, Settings, etc.)

## Next 3 Features

- [x] Backend: generateHealthScores procedure — compute score/momentum/riskLevel per project and upsert into project_health_scores
- [x] Backend: getEmotionalTrend procedure — return last 14 days of emotionalState from daily_plans
- [x] Intelligence page: "Refresh scores" button calls generateHealthScores mutation
- [x] Intelligence page: 14-day emotional trend sparkline using emotionalState data
- [x] Project Detail page: Clarity tab listing all sessions linked to that project

## Next Batch: Distraction Dashboard + Clarity Export + Auto Health Scores

- [x] Backend: getDistractionPatterns procedure — aggregate last 7 days of distractionEvents by category, timeOfDay, projectId
- [x] Backend: auto-call scoreAllProjects at end of evening closure (submitEvening mutation)
- [x] Intelligence page: Distraction Patterns card — top category, peak time-of-day, most-interrupted project
- [x] ClarityEnginePage: "Copy summary" button on completed session — copies signal line + next right step to clipboard
- [x] ClarityEnginePage: toast confirmation "Copied to clipboard" after copy

## Splash Screen Fix

- [x] Update splash/loading screen to use the correct logo with typography instead of the old icon

## Landing Screen Animation + Public Welcome Page

- [x] Sign-in landing screen: staggered fade-in animation on logo, tagline, and sign-in card
- [x] Public /welcome page: hero section with logo, tagline, and sign-in CTA
- [x] Public /welcome page: feature highlights (6 core features with icons)
- [x] Public /welcome page: "How it works" 3-step section
- [x] Public /welcome page: final CTA section
- [x] Public /welcome page: accessible without authentication (no redirect)

## Logo Update

- [x] Upload stacked Continuary logo to CDN
- [x] Replace all BRAND_LOGO_DARK references with new stacked logo URL
- [x] Update sign-in landing screen logo
- [x] Update welcome page hero and footer logo

## Favicon + PWA Manifest

- [x] Generate favicon.ico and PNG icon sizes from the Continuary bird mark (DarkBackgroundMonochrome.png source)
- [x] Upload icon PNGs to CDN (all 11 sizes: 16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512px)
- [x] Add manifest.json with app name, icons, display:standalone, theme_color
- [x] Update index.html with PWA meta tags (apple-touch-icon, theme-color, manifest link)
- [x] Update index.html favicon link to use new icon

## Brand Asset Update (New Logo Files)

- [x] Wire DarkBackgroundMonochrome.png (white bird on navy rounded square) as app icon in header
- [x] Wire ContinuaryDark-backgroundstackedlockup.png as sign-in screen logo
- [x] Update WelcomePage hero and footer to use dark-background stacked lockup
- [x] Regenerate all 11 PWA icon sizes from DarkBackgroundMonochrome.png
- [x] Upload all new icon sizes to CDN
- [x] Update manifest.json with new CDN icon URLs (all 11 sizes)
- [x] Update index.html favicon, apple-touch-icon, OG image with new CDN URLs

## Beta Readiness Fixes

- [x] Add .max() input guards to all LLM-feeding string fields (brainDump, vault content, intelligence notes, checkIn fields)
- [x] Wrap clarity.runSession LLM call in try/catch with graceful user-facing error
- [x] Build per-user LLM rate limiter (10 calls/min in-memory) and apply to all 15 AI mutation procedures
- [x] Fix pushNotifications.ts ECONNRESET loop with try/catch + exponential backoff (5-tick skip window)
- [x] Add "Delete my account" to Settings page (wipes all user data, requires typing DELETE)
- [x] Add deleteAccount tRPC procedure that removes all rows for ctx.user.id in FK-safe order
- [x] Create minimal /privacy page accessible without login
- [x] Register /privacy route in App.tsx

## Post-Audit Hardening (Pass 2)

- [x] Update @aws-sdk/client-s3 to 3.1024.0 (fast-xml-parser 5.5.8, above patched threshold 5.3.5)
- [x] Verify pnpm audit shows no runtime CVEs after update
- [x] Add beta_invites table to drizzle schema (code, label, usedAt, usedByUserId, createdAt)
- [x] Add revoked_sessions table to drizzle schema (jti, userId, revokedAt, expiresAt)
- [x] Generate and apply migration SQL for both new tables (0011_previous_logan.sql)
- [x] Add db helpers: createInviteCode, validateInviteCode, markInviteUsed, listInviteCodes
- [x] Add db helpers: revokeSession, isSessionRevoked
- [x] Add invites tRPC router (admin: generate, list; public: validate; protected: redeem)
- [x] Wire invite code validation into onboarding UI (validate before profile setup, redeem on finish)
- [x] Update logout mutation to insert jti into revoked_sessions
- [x] Update authenticateRequest to check revoked_sessions blacklist on every request
- [x] Add invite code input field to onboarding UI (step -1, before profile setup steps)
- [x] Add invite code management panel to Settings (admin only: generate with label, copy, list with status)
- [x] Write 13 regression tests for invite gate and 5 for session revocation (66 total tests, all passing)

## Desktop Layout Mode

- [x] Audit AppLayout for max-width constraints and mobile-only padding (was locked to max-w-md on all screens)
- [x] Auto-expand to full-width sidebar + content layout on lg+ screens (auto on >= 1024px)
- [x] Add compact/expanded view toggle: Monitor icon in compact header, PanelLeft in desktop sidebar footer
- [x] Persist layout preference in localStorage under "continuary-layout-mode"
- [x] Widen content grids on desktop: max-w-4xl mx-auto on all 9 major pages
- [x] Desktop sidebar: full labeled nav with Command/Review sections, user avatar, admin badge
- [x] Mobile bottom nav shows only in compact mode; desktop sidebar shows only in desktop mode
- [x] Fix JSX parse error (em dash in SettingsPage placeholder caused Babel parse failure)
- [x] All 66 tests passing, zero TypeScript errors

## Two-Column Today Page Layout

- [x] Audit Today page sections and plan left/right column split
- [x] Implement lg:grid-cols-[3fr_2fr] responsive grid on Today page (lines 935-1228)
- [x] Left column (60%): Check-in form, Carryover tasks, Stuck-state, Today tasks, Focus CTA, First Step card, Re-Entry card
- [x] Right column (40%): Weekly Presence Dots, Active Projects quick access, Recent Decisions
- [x] Full-width below grid: Empty state, Notification prompt, Modals
- [x] Single-column stacking on mobile (below lg breakpoint)
- [x] Fix JSX inline comments on closing div tags (caused Babel parse error)
- [x] All 66 tests passing, zero TypeScript errors

## Two-Column Projects Page Layout

- [x] Audit ProjectsPage card structure and filter/header layout
- [x] Apply lg:grid-cols-2 to the project card list (line 307)
- [x] Status/phase filter bar stays full-width above the grid
- [x] Empty state and "New Project" CTA remain full-width
- [x] Single-column stacking on mobile (below lg breakpoint)
- [x] All 66 tests passing, zero TypeScript errors

## Old Logo/Icon Replacement

- [x] Found 2 files with old icon URLs: PWAInstallBanner.tsx and sw.js
- [x] PWAInstallBanner.tsx: replaced icon-96x96_2086d45d with icon-96_e5c53296 (new DarkBackgroundMonochrome)
- [x] sw.js push notification handler: replaced icon-192x192_1aa1c846 and icon-96x96_2086d45d with new CDN URLs
- [x] Full scan confirms zero remaining old icon filenames across all client files
- [x] manifest.json, index.html, AppLayout.tsx, WelcomePage.tsx were already using correct new icons

## Voice Dictation for Brain Dump

- [x] Add `transcribeDirectly` tRPC procedure: accepts base64 audio string, calls Whisper, returns transcript text (no S3 storage)
- [x] Build reusable `VoiceDictationButton` component: mic icon, recording pulse animation, stop button, loading spinner, error toast
- [x] Wire `VoiceDictationButton` into Clarity Engine brain dump textarea (appends transcript to existing text)
- [x] Wire `VoiceDictationButton` into morning check-in "What's on your mind?" field
- [x] Wire `VoiceDictationButton` into evening closure notes field
- [x] Handle mic permission denied gracefully (show instructional toast)
- [x] Handle recording too short (<1s) gracefully
- [x] Write vitest for transcribeDirectly procedure (mock Whisper, verify no S3 call)

## Bug: One-character-at-a-time typing in textareas

- [x] Diagnose root cause of single-character typing bug in brain dump textarea (inline sub-components inside parent caused remount on every render)
- [x] Fix ClarityEnginePage brain dump textarea (hoisted NewSessionView, ResultView, HistoryView, PatternsView, WeeklyView to top-level)
- [x] Audit and fix all other textareas in Home.tsx (morning notes, evening fields — already top-level, no fix needed)
- [x] Audit all other pages with textareas for same issue (FocusModePage, OnboardingPage, ProjectDetailPage, ProjectsPage, VaultPage — all clean)
- [x] Verify fix across all affected fields — 83 tests passing, zero TypeScript errors

## Bug: Focus lost after every keystroke (textarea loses focus on each character)

- [x] Find the true root cause: QueryClient created without defaultOptions; React Query's default refetchOnWindowFocus:true was active. Every keystroke caused a window focus event → stale-query refetches → AppLayout re-render → textarea lost focus.
- [x] Fix: set refetchOnWindowFocus:false in QueryClient defaultOptions in main.tsx
- [x] Audit all other textareas — same root cause, same fix covers all
- [x] Verify fix — 83 tests passing, zero TypeScript errors

## Premium Social Media Graphic (Upgraded)

- [x] Locate brand logo asset (CDN URL or local file)
- [x] Generate 1080x1350 luxury-minimal graphic with new copy: "Starting shouldn't / feel this hard.", body copy, BETA CTA pill, tagline, continuary.app URL
- [x] Deliver final graphic to user

## Manus Mega-Prompt: Continuary Beta Landing Page

- [x] Draft full Manus mega-prompt for soulengineer.online/continuary landing page
- [x] Include complete image asset specification list
- [x] Update graphic: remove continuary.app, replace with continuary.soulengineer.online

## Feature: First Movable Step Generator (Book Companion — Ch. 6)

- [x] Add `first_movable_steps` table to drizzle schema
- [x] Generate and apply migration SQL
- [x] Add DB helpers: createFirstMovableStep, markFirstMovableStepUsed, getFirstMovableStepHistory
- [x] Add `threshold.generateFirstMovableStep` tRPC procedure
- [x] Add `threshold.markUsed` tRPC mutation
- [x] Build `FirstMovableStepCard` component: theMove (large, verb-first), whereItEnds, "Start session" CTA, MVC fallback
- [x] Build `FirstMovableStepModal` sheet: avoidedTask input → generate → show card → start session or dismiss
- [x] Wire into Home.tsx Start Here card (🪶 button)
- [x] Wire into ProjectDetailPage next step row (🪶 button)
- [x] Wire into ClarityEnginePage result screen

## Feature: Threshold Diagnosis (Book Companion — Ch. 3–4)

- [x] Add `threshold_diagnoses` table to drizzle schema
- [x] Generate and apply migration SQL
- [x] Add DB helpers: createThresholdDiagnosis, getThresholdDiagnosisHistory
- [x] Add `threshold.diagnose` tRPC procedure: 3 responses → ThresholdCard (6 patterns)
- [x] Build `ThresholdDiagnosisFlow` component: 3 plain-language questions, max 90 seconds, no multi-select
- [x] ThresholdCard: pattern name, protection sentence, calibrated FMS, "You have permission to begin."
- [x] Wire into Home.tsx Start Here card (🚪 button)
- [x] Wire into ProjectDetailPage next step row (🚪 button)
- [x] Auto-surface "What's at the door?" on Command Center when task avoided 2+ days — DEFERRED: requires a separate avoided-task tracking system (carryover counter exists but not wired to per-task avoidance detection); scoped out of this build intentionally
- [x] ThresholdCard → FirstMovableStepCard handoff (Threshold output feeds FMS session start)
- [x] Write 30 vitest tests for threshold logic (LLM parsing, pattern validation, input validation, 4-quality structure, all 6 patterns)

## Next Steps (Post-Book-Companion Build)

- [x] Build avoided-task auto-trigger: use existing carryoverCount >= 2 as avoidedDays signal; surface Threshold Diagnosis banner on Command Center Start Here card when any task has carryoverCount >= 2
- [x] Auto-surface ThresholdDiagnosisFlow on Command Center / Start Here card when a task has carryoverCount >= 2
- [x] Add Threshold History tab to ClarityEnginePage: "Threshold log" nav button appears once diagnoses exist; full history with pattern frequency bar chart, individual diagnosis cards with protection sentence + first move + permission line
- [x] Run all tests (113 passing), verify 0 TypeScript errors, save publish-ready checkpoint

## Feature: Evidence Log (Book Companion — Identity Evidence)

- [x] Add `evidence_log_summaries` table to drizzle schema: id, userId, month (YYYY-MM), sessionsStarted, returnsAfterGap, hardDaySessions, genuinePermissions, summaryLine (AI-generated), generatedAt
- [x] Generate and apply migration SQL
- [x] Add DB helpers: upsertEvidenceSummary, getEvidenceSummaries, getEvidenceSummaryForMonth
- [x] Add `evidence.getMonthly` tRPC query: returns last 6 months of summaries
- [x] Add `evidence.generateSummary` tRPC mutation: computes stats for a given month, calls LLM to produce the single identity sentence, upserts result
- [x] Add `evidence.getStreakData` tRPC query: returns raw session/check-in data for the last 30 days for the heatmap
- [x] Build EvidenceLogPage.tsx: monthly summary sentence (large, serif), stat row (sessions started / returns after gap / hard-day sessions / genuine permissions), 6-month history list, 30-day presence heatmap
- [x] Add "Evidence" nav item to AppLayout (sidebar + mobile More menu)
- [x] Register /evidence route in App.tsx
- [x] Auto-generate current month summary after evening closure completes (call evidence.generateSummary in submitEvening mutation)
- [x] Surface current month's summary sentence on Command Center (below presence dots, small italic)
- [x] Write vitest tests for evidence.generateSummary (stat computation, LLM parsing, month boundary logic)

## Feature: Threshold Diagnosis on Clarity Engine Result Screen

- [x] Add "What's at the door?" button to ClarityEnginePage ResultView
- [x] Wire ThresholdDiagnosisModal into the Clarity Engine result screen
- [x] Show button only when result is available (not on loading/empty states)

## Feature: Evidence Log Share Card

- [x] Add "Share your evidence" button to EvidenceLogPage (current month card)
- [x] Build ShareEvidenceModal: renders identity sentence in a styled card preview
- [x] Add copy-to-clipboard for the sentence text
- [x] Add canvas-based image generation (draw sentence + Continuary branding onto canvas, download as PNG)
- [x] Show only when summaryLine exists for the current month

## Welcome Page SEO: OG Image + Social Meta Tags

- [x] Add og:image, og:title, og:description, og:url meta tags to index.html
- [x] Add twitter:card, twitter:image, twitter:title, twitter:description meta tags
- [x] Use existing brand CDN image as og:image (1200x630 or closest available)
- [x] Set canonical URL to the deployed domain

## Push Notification Opt-In on Welcome Page

- [x] Add a subtle "Get notified when we launch" / opt-in section to WelcomePage
- [x] Use existing push notification subscription logic (VAPID) — request permission on click
- [x] Show only when Notification API is supported and permission is not yet granted
- [x] Style as a low-friction banner or CTA row near the bottom of the Welcome page

## Bug Fix: PWA Icon Shows Old/Wrong Icon on Home Screen

- [x] Update manifest.json to use correct Continuary icon CDN URLs for all sizes
- [x] Bump service worker cache version to force icon refresh on existing installs

## Apple Touch Icon + iOS Meta Tags

- [x] Add apple-touch-icon link tag to index.html pointing to 180px CDN icon
- [x] Add apple-mobile-web-app-capable and apple-mobile-web-app-status-bar-style meta tags
- [x] Add apple-mobile-web-app-title meta tag

## Welcome Notification on First Login

- [x] Add `welcomeNotified` boolean column to users table in drizzle schema
- [x] Generate and apply migration SQL
- [x] In the OAuth callback: detect new user (no existing row before upsert)
- [x] Fire notifyOwner with new user details (name, email) after first login
- [x] Mark welcomeNotified = true so it only fires once per user

## Invite-Only Gate

- [x] Add `beta_invites` table to drizzle schema: id, code (unique), createdByUserId, usedByUserId (nullable), usedAt (nullable), createdAt, label
- [x] Generate and apply migration SQL
- [x] Add DB helpers: createInviteCode, getInviteCodes, validateInviteCode, markInviteUsed, setUserInviteCode, markWelcomeNotified
- [x] Add `invites.validate` public tRPC query: checks if code is valid and unused
- [x] Add `invites.redeem` protected tRPC mutation: marks code as used by current user, stores code on user record
- [x] Add `invites.generate` admin tRPC mutation: generates a new invite code with optional label
- [x] Add `invites.list` admin tRPC query: lists all codes with status
- [x] Add `inviteCode` column to users table to record which code they used
- [x] Invite gate enforced in OnboardingPage (step -1): new users must enter valid code before proceeding
- [x] Build AdminInviteCodesPage: stats (available/redeemed), generate form with label, code list with copy button
- [x] Add admin-only Invite Codes nav item to AppLayout sidebar (amber Admin section, Ticket icon)
- [x] Add admin-only Invite Codes entry to mobile More sheet
- [x] Register /admin/invites route in App.tsx
- [x] Write vitest tests for invite code format, validation logic, race condition guard, welcome notification gate

## Security Audit (Pre-Marketplace — 20 Items)

### Block 1: Secrets & Environment
- [x] 1. Scan all frontend JS/TS files for hardcoded API keys, tokens, or secrets — PASS
- [x] 2. Check git history for .env file commits; verify .gitignore — PASS
- [x] 3. Verify JWT secret strength (256-bit random minimum) — PASS

### Block 2: Authentication & Session Management
- [x] 4. Add rate limiting to login/auth endpoints — FIXED: added express-rate-limit (10/15min OAuth, 300/min tRPC)
- [x] 5. Verify JWTs stored in httpOnly cookies, not localStorage — PASS
- [x] 6. Verify all auth tokens have expiration set — PASS (1-year exp claim)
- [x] 7. Verify session invalidated server-side on logout — PASS (jti blacklist in revokedSessions table)
- [x] 8. Confirm no MD5/SHA1 password hashing (app uses OAuth — no passwords) — PASS

### Block 3: Authorization & Access Control
- [x] 9. Verify all admin tRPC procedures enforce server-side role check — PASS
- [x] 10. Audit every tRPC procedure for auth middleware — PASS (only auth.me and auth.logout are public)
- [x] 11. Check all resource-by-ID queries for ownership validation (IDOR prevention) — FIXED: clarity.convertToAction

### Block 4: Data & Query Security
- [x] 12. Scan for SQL queries built with string concatenation / template literals — PASS (Drizzle ORM only)
- [x] 13. Verify file upload MIME type validation is server-side — FIXED: added magic byte validation via file-type
- [x] 14. Verify error responses strip stack traces, table names, file paths — FIXED: voiceTranscription.ts sanitised

### Block 5: Network & Infrastructure
- [x] 15. Verify CORS is not set to wildcard (*) — PASS (no CORS middleware; Helmet referrerPolicy set)
- [x] 16. Confirm HTTPS enforcement at server level — PASS (Helmet HSTS in production)
- [x] 17. Confirm app process does not run as root — PASS (ubuntu user)
- [x] 18. Confirm database port is not publicly exposed — PASS (platform-managed TiDB)

### Block 6: Dependencies & Redirects
- [x] 19. Run npm audit; fix all critical/high vulnerabilities — 14 high in dev/build tooling only (not runtime)
- [x] 20. Audit OAuth callback and post-login redirect logic for open redirect vulnerabilities — PASS

## Security Hardening Round 2

### CSP Hardening
- [x] Add explicit script-src 'self' + CDN domain to Helmet CSP config
- [x] Add img-src restricted to 'self', CDN domain, and data: URIs
- [x] Add connect-src for tRPC/API and CDN endpoints
- [x] Add font-src for Google Fonts CDN
- [x] Add media-src for S3/CDN audio/video
- [x] Add frame-ancestors 'none' to prevent clickjacking
- [x] Verify CSP does not break any existing functionality

### Push Subscription Endpoint Validation
- [x] Add ALLOWED_PUSH_ENDPOINTS allowlist (fcm.googleapis.com, push.apple.com, updates.push.services.mozilla.com, notify.windows.com)
- [x] Validate endpoint URL hostname in notifications.subscribe procedure before saving
- [x] Throw TRPC BAD_REQUEST if endpoint domain not in allowlist
- [x] Write vitest test for endpoint validation logic

## Weekly Distraction Insights Card

- [x] Audit distraction data schema (distractionEvents table with category + timeOfDay columns)
- [x] Add `checkIns.getWeeklyDistractionInsights` tRPC query: top category + time-of-day pattern for last 7 days
- [x] Build DistractionInsightsCard component: top category pill, time-of-day bar chart, category breakdown mini-bars, insight sentence
- [x] Wire card into WeeklyReviewPage between AI review and Focus Blocks sections
- [x] Show empty state when no distraction data exists for the week
- [x] Write vitest tests for the insights aggregation logic (10 tests)

## Welcome Page Restructure

- [x] Rewrite hero section: lead with identity-change framing ("You don't need more productivity. You need proof you're already moving.")
- [x] Add signature feature spotlight: Evidence Log — large, prominent, explains the monthly identity sentence concept
- [x] Add signature feature spotlight: Threshold Diagnosis — explains the "What's at the door?" blocker identification flow
- [x] Add Amnesty Protocol section — non-shaming return after a gap
- [x] Add Re-Entry Card as a named feature in the features grid
- [x] Add Single Focus Mode to the features grid
- [x] Add Project Memory Timeline to the features grid
- [x] Add Distraction Insights to the Intelligence/features section
- [x] Update daily rhythm steps to reflect the full morning/midday/evening + evidence loop (4 steps)
- [x] Keep "who it's for" personas but update copy to reference the new features
- [x] Ensure all new sections are visually distinct and use the existing design tokens

## Beta Tester Bug Fixes (Apr 2026)

### MAJOR
- [x] Fix Quick Capture (Idea Sanctuary modal) — ideas parked via lightbulb button are not saved to Knowledge Vault (CONFIRMED ALREADY FIXED: captureIdea writes to both idea_captures AND source_items; vault.list is invalidated on success)
- [x] Verify the mutation payload and tRPC route linking the modal to the vault.addSource procedure

### Debug / Rendering Leakage
- [x] Remove raw JSON blob ({"mode":"full","isActive":true,"isUserDisabled":false}) from rendered DOM (NOT PRESENT in current code — was a cached/old version artifact)
- [x] Fix greeting whitespace: "Good evening , DeWayne ." → "Good evening, DeWayne." (CONFIRMED CLEAN in current code — no extra spaces)
- [x] Fix null/undefined interpolation in greeting fallback states

### Header Controls
- [x] Fix "DarkCompactSign out" collapsed header — added w-px h-5 bg-white/10 dividers between theme, compact, and sign-out buttons in sidebar footer
- [x] Ensure header controls are properly spaced on mobile and compact layouts

### Loading States
- [x] Add loading spinner/state to Clarity Engine "Run" button while processing (CONFIRMED ALREADY PRESENT: RefreshCw animate-spin + "Processing…" text)
- [x] Add loading states to all save routines that currently have no feedback (CONFIRMED: all check-in submit buttons have Loader2 spinners)
- [x] Protect Brain Dump textarea input from state loss on scroll/focus change (debounced autosave to localStorage with 500ms debounce; restored on page load; cleared on successful session run)

### Strategic (from review)
- [x] Allow saving/archiving Clarity Engine output to Evidence Log or Vault (added "Save to Vault" button in ResultView header; saves full Clarity Map as draft source item with title from signal line)
- [x] Add compact mode tooltip onboarding on first run (toast notification on first switch to compact mode, pointing users to the More tab for hidden features)

## QA Review Fixes (Apr 4, 2026)

### CRITICAL
- [x] Fix re-entry screen routing bug — persisted amnestyDismissed in sessionStorage; page refresh no longer re-shows the screen within the same browser session
- [x] Fix theme persistence — added anti-flash inline script to index.html that applies dark class before first paint; changed ThemeProvider defaultTheme to "dark" to match app design

### MEDIUM
- [x] Fix Morning Check-In textarea — code audit confirmed textarea is correctly wired; root cause was scroll position (form renders at top, CTA is at bottom). Fixed by adding checkInRef + openCheckIn() that scrolls form into view on open
- [x] Fix "Start morning check-in" CTA button — now uses openCheckIn() which scrolls to the form after opening
- [x] Fix Privacy Policy link on Settings page — changed from target=_blank anchor (blocked by popup blockers) to navigate() button using wouter

### MINOR
- [x] Audit Idea Sanctuary FAB on all pages — FAB is in AppLayout and renders consistently on ALL AppLayout-wrapped routes including Admin Invite Codes. Only /privacy, /onboarding, /focus are outside AppLayout (intentional — no quick capture needed there)
- [x] Add 404 page for invalid routes — redesigned to match Continuary's emotional design language
- [x] Add tablet responsive breakpoint — AppLayout already uses 1024px breakpoint (desktop sidebar vs compact bottom tab); content pages use max-w-4xl mx-auto for proper tablet rendering. The tester's "600px" observation was a CSS variable, not a layout breakpoint.

## New Features (Apr 4, 2026 - Round 2)

- [x] Streak counter: days-in-motion badge in Command Center header — getStreak() db helper computes current + longest streak from dailyPlans; badge shown in sidebar header and compact bottom bar
- [x] Clarity Engine history search — search bar appears when >2 sessions exist; real-time client-side filtering by signal line, mode, or next step; shows result count and clear button
- [x] Weekly digest — weeklyDigest.ts compiles last week's completed tasks, Clarity sessions, active projects; cron fires Monday 8 AM; manual trigger button added to Settings > Preferences tab; delivered via Manus notification system

## Clarity Engine Mode Recommendations (Apr 4, 2026)

- [x] Backend: getModeRecommendation tRPC procedure analyzes last 20 sessions; day-of-week pattern (2+ occurrences) takes priority over overall frequency pattern (35%+ threshold)
- [x] Backend: returns modeLabel, nudge copy, context line, mode key, and confidence level; returns null when < 5 sessions (not enough data)
- [x] Frontend: ClarityNudge card in Command Center right column — Sparkles icon, "Pattern detected" label, mode label, nudge text, context line, "Start a session" link
- [x] Frontend: one-tap link navigates to /clarity?mode=<mode> which pre-selects the mode via URL search param on page init
- [x] Tests: 6 unit tests covering null (< 5 sessions), day_pattern, overall_pattern, null (no dominant mode), and mode priority; 182/182 passing

## Final Polish (Apr 4, 2026)

- [x] ClarityNudge dismiss button (X) — hides card for 24h via localStorage; clarityNudgeDismissed state initialized from localStorage on mount
- [x] Distraction pattern insights card in Weekly Review — DistractionInsightsCard component already fully implemented and placed in WeeklyReviewPage (confirmed existing)
- [x] Project health score badge — HealthDot component (green ≥70, amber ≥45, red <45) already rendering on every project card via trpc.insights.getHealthScores (confirmed existing)

## Personal Study Tracker — Owner Only (Apr 4, 2026)

- [x] DB: studyDayLogs table (userId, day 1-30, capacity, learned, built, drifted, driftWhere, returnStep, whatMoved, fuzzy, summary, carryForward, completedAt)
- [x] DB: studyFocusBlocks table (userId, date, startTime, duration, capacity, lesson, tinyProject, intention, actualWork, drifted, driftWhere, returnPoint, whatMoved, nextStep)
- [x] DB: studyWeeklyReviews table (userId, weekNum, meaningfulMovement, lessonsCompleted, buildsCompleted, fuzzy, driftedMost, whatHelped, newUnderstanding, openLoop, startHereNext)
- [x] Backend: study router with CRUD for all 3 tables
- [x] Frontend: StudyTrackerPage — admin-only at /admin/study with 5 tabs
- [x] Frontend: 5 tabs — Daily Tracker (30-day curriculum), Weekly Compass (static content), Focus Log, Weekly Review, Re-Entry + Success Markers
- [x] Nav: Study Tracker link added to admin sidebar section (GraduationCap icon, amber highlight)

## Invite-Only Hard Gate (Apr 4, 2026)

- [x] Backend: inviteCode field already on users table; gate is enforced on the frontend via user object from auth.me
- [x] Frontend: InviteGatePage created at /invite-gate — clean dark-mode page with code entry form, instant validation feedback, and sign-out option
- [x] Frontend: AppLayout useEffect gate — authenticated non-admin users with inviteCode === null are redirected to /invite-gate; fires after onboarding check
- [x] Admin accounts bypass the gate entirely (user.role === "admin" check)
- [x] On successful redemption: auth.me is invalidated and user is redirected to / after 600ms

## Five Productivity Enhancements (Apr 4, 2026)
- [x] Energy/voltage tags on tasks (high/medium/low badge + morning sort)
- [x] Planning Mode vs Doing Mode toggle (survey-pass view vs execution view)
- [x] Next Best Step engine card on Command Center (shortest task, stalled task priority)
- [x] Project Check-In nudge (5+ days no activity → "keep contact" card)
- [x] Inbox Bankruptcy button in Vault (bulk archive inbox with confirmation)

## First-Login About Screen (Apr 5, 2026)
- [x] Add `seenAbout` boolean column to user_profiles table
- [x] Add `markAboutSeen` tRPC mutation (sets seenAbout = true)
- [x] Build /about-app page: About Continuary content + "Enter the app" CTA
- [x] Wire AppLayout: redirect new users (seenAbout = false) to /about-app after first sign-in
- [x] Ensure admin users also see it once (same flag)

## Vault Graph View
- [x] Add `vault.getGraphData` tRPC procedure (nodes + edges from items, projects, tags)
- [x] Build VaultGraph D3.js force-directed component
- [x] Add "Graph" tab to VaultPage filter tabs
- [x] Node click shows item title/state toast

## Vault Graph Follow-ups
- [x] Click-to-open item detail panel from graph node (slide-in drawer)
- [x] Search/highlight input in VaultGraph (dims non-matching nodes)
- [x] Onboarding nudge to Graph tab after 10+ vault items

## Graph Enhancement Round 3
- [x] Project link selector in graph node drawer
- [x] Tag clustering toggle in VaultGraph
- [x] Export graph as PNG button

## Premium UI Redesign (Orizon-inspired)
- [x] Rewrite index.css global tokens: dark palette, Inter variable font, spacing, radius, shadows, animations
- [x] Redesign AppLayout sidebar: dark bg, accent active states, smooth transitions
- [x] Redesign Command Center (Home): premium card hierarchy, motion, typography
- [x] Redesign Vault page: dark cards, graph tab polish
- [x] Redesign Projects page: status badges, timeline polish
- [x] Redesign Settings, Weekly Review, onboarding, About page
- [x] Polish modals, dialogs, drawers, toasts

## Graph Enhancement Round 4 (Final)
- [x] Multi-project linking in graph node drawer (multi-select, not single select)
- [x] Tag filter lens dropdown above graph (hides non-matching nodes)
- [x] D3 node entry animation (fade-in from opacity 0 over 300ms on first load)

## About Screen Copy (Apr 7, 2026)
- [x] Write and apply three personalised core principles to AboutAppPage

## Security Audit Fixes (Apr 7, 2026)
- [x] Add .max() length constraints to 15 bare z.string() inputs (oversized string vector)
- [x] Reduce express body limit from 50mb to 10mb (only audio uploads need large bodies; scope it)
- [x] Add null guard before updateSourceItem in vault.ts line 287 (item used without check)

## Security Hardening Round 2 (Apr 7, 2026)
- [x] Add z.string().regex(/^\d{4}-\d{2}-\d{2}$/) to all date inputs in dailyPlan and study routers

## Performance Engineering (Apr 7, 2026)
- [x] Fix confirmed N+1 queries (archiveBankruptcy + buildProjectTimeline batch ops)
- [x] LLM streaming for aiProcess procedure (skipped — returns small structured JSON, not suitable for streaming)
- [x] React memo/callback optimizations on hotspot components (TaskItem + SourceItemCard wrapped with React.memo)

## Pre-Beta Launch Steps (Apr 7, 2026)
- [x] Content-Type enforcement middleware on /api/trpc (reject non-JSON POST requests)
- [x] Invite code admin UI enhanced with bulk generate (1-20 at once), copy-all button, 3-stat grid
- [x] Custom domain CNAME setup instructions provided to user

## App Store Compliance (Apr 7, 2026)
- [x] Add aiConsentGiven field to userProfiles schema + migration
- [x] Add AI data transparency consent modal (5.1.2i) — shown once before first AI feature use

## App Store Compliance Round 2 (Apr 7, 2026)
- [x] Add revokeAiConsent procedure + Settings toggle (AI Data & Privacy section with revoke/enable)
- [x] Write Privacy Policy page content (AI data processing section: Google Gemini, retention, GDPR)
- [x] Add GDPR Article 6(1)(a) paragraph to AiConsentModal for EU distribution

## App Store Compliance Round 3 (Apr 7, 2026)
- [x] Data export: settings.exportData procedure + Settings download button
- [x] Consent regression tests: revokeAiConsent + giveAiConsent in security3.integration.test.ts
- [x] Terms of Service page (/terms) + links from consent modal and sign-in screen

## Input Validation Hardening (Apr 7, 2026)
- [x] Add .max() to free-text fields: focusSessions (intention, notes), study (21 fields), intelligence (adminLane), settings (timezone, workStyle, time fields)

## Homepage UX (Apr 7, 2026)
- [x] Add social proof avatar badges + member count before CTA on sign-in screen

## AI Provider Transparency (Apr 7, 2026)
- [x] Name AI provider (Google Gemini 2.5 Flash via Manus AI platform) explicitly in onboarding step 2, AiConsentModal, and PrivacyPage

## Beta Launch Features (Apr 8, 2026)
- [x] Dynamic member count: publicProcedure returning live user count, wired to sign-in screen
- [x] expiresAt on invite codes: schema migration, expiry enforcement in invites.redeem, expiry picker + expiry display in admin UI

## Security Hardening Round 3 (Apr 8, 2026)
- [x] Fix 1: Reduce JWT session lifetime from ONE_YEAR_MS to THIRTY_DAYS_MS in sdk.ts signSession
- [x] Fix 2: Add Redis scaling warning comment to oauthLimiter and apiLimiter in index.ts
- [x] Fix 3: Reject legacy-JTI tokens issued before 2026-04-08 cutoff in sdk.ts verifySession
- [x] Fix 4: Document unsafe-inline CSP limitation with nonce-based migration path in index.ts
- [x] Fix 5: Add Redis store migration guidance as TODO comments in both rate limiters

## Logo Fix (Apr 8, 2026)
- [x] Remove white background from sidebar logo and favicon — replaced BRAND_LOGO_SIGNIN (white-bg PNG) with composed JSX icon+wordmark; uploaded all 11 clean cropped icons to CDN; updated index.html, manifest.json, sw.js with new URLs; bumped SW cache to v5

## Android Domain Fix (Apr 8, 2026)
- [x] Update manifest.json start_url and scope to use personal domain (continuary.soulengineer.online)
- [x] Update og:url and canonical references in index.html to personal domain
- [x] Bump SW cache version to force manifest refresh on Android (v6)

## Domain Redirect (Apr 8, 2026)
- [x] Add Express middleware: 301 redirect from continuary.manus.space → continuary.soulengineer.online

## UX Fixes (Apr 8, 2026)
- [x] Add undo for accidental task completion — show toast with "Undo" button for 5s after a task is checked off
- [x] Allow reordering / changing next best step during project check-in ("Different step" button in Start Here card opens project picker + custom step input)
- [x] Fix tab/click overflow in Planning Mode and other sections — added min-w-0 + overflow-hidden + truncate to check-in cards
- [x] Add Planning Mode vs Focus Mode explainer in the UI — HelpCircle tooltip on Planning/Doing Mode toggle explains both modes and difference from Focus Mode

## UX Improvements Round 2 (Apr 8, 2026)
- [x] Inline next-step editing in "Different step" picker — type and save new step without leaving Command Center
- [x] Long-press to complete tasks (500ms hold) — prevents accidental completions, replaces single-tap
- [x] Swipe-right gesture on task items to complete — natural mobile interaction, harder to trigger accidentally

## UX Improvements Round 3 (Apr 8, 2026)
- [x] Haptic feedback (navigator.vibrate) on task completion via long-press and swipe
- [x] First-use "Hold to complete" hint label on task circle (localStorage, dismisses after first completion)
- [x] Drag-to-reorder tasks in daily plan — saves new order to criticalTasks JSON field

## In-App Feedback Panel (Apr 8, 2026)
- [x] Add feedbackSubmissions table to drizzle schema and apply migration
- [x] Add submitFeedback tRPC mutation (saves to DB + notifies owner)
- [x] Build FeedbackPanel sheet component (category selector, message, send button)
- [x] Add "Feedback" entry to sidebar nav (desktop sidebar + mobile More sheet)

## Gentle Gamification Plan (Apr 8, 2026)
### Phase 1 — Highest Impact
- [x] Return Markers: calm re-entry messages after 24h/3d/7d absence (once per window, no guilt)
- [x] Daily Rhythm Completion: subtle progress rings/segments for Morning/Midday/Evening on Today view
- [x] Idea Sanctuary Processing Reward: satisfying transition animation + haptic when ideas are processed
- [x] Re-Entry Path Shortcut: "Pick Up the Thread" one-tap guided comeback flow on Today screen

### Phase 2 — Core System Layer
- [x] Continuity Signals: quiet visual indicator (ring/pulse) of return frequency on Today view
- [x] Evidence of Movement Feed: minimal strip of recent meaningful actions (calm, reflective language)
- [x] Thread Strength: private soft metric with 5 descriptive states (Gathering → Deepening), never harsh drop

### Phase 3 — Depth and Retention
- [x] Milestone Acknowledgments: elegant milestone cards for first rhythm, 10 ideas, first weekly review, 30 days
- [x] Weekly Reflection Reward: summary card after Weekly Compass/Review with "week gathered" closure state
- [x] Continuity Archive: clean timeline of returns, rhythms, milestones, and processed ideas

### Schema/DB
- [x] Add continuityEvents table (userId, eventType, metadata, createdAt)
- [x] Add threadStrength table (userId, score, state, lastUpdatedAt)
- [x] Add userMilestones table (userId, milestoneKey, achievedAt, dismissed)

## Animated Splash Screen (Apr 9, 2026)
- [x] Build AnimatedSplash CSS/SVG component (icon draw-on + wordmark fade, 2.5s, transitions to app)
- [x] Wire into App.tsx as first render gate (shows once per session)

## Splash + Admin Round 2 (Apr 9, 2026)
- [x] Splash chime: Web Audio API soft tone on arch completion
- [x] Splash replay button in Settings → General
- [x] Admin feedback inbox at /admin/feedback with category filters

## Accurate Bird Logo Animation (Apr 9, 2026)
- [x] Extract real SVG paths from Continuary bird icon and animate accurately in splash screen — using actual PNG with clip-path bottom-up reveal (filled logo, not fake strokes)

## Splash Polish + Onboarding (Apr 9, 2026)
- [x] Golden dot pulse after splash reveal completes
- [x] Slow scale-up (0.88→1) on icon alongside clip-path reveal
- [x] Onboarding checklist card on Command Center for new users (first check-in, first project, first vault entry)

## Splash Dot Position Fix (Apr 9, 2026)
- [x] Move golden glow dot to match exact orange dot position on bird icon (x=64.5%, y=41.4% of icon bounds)
- [x] Add "Preview intro" button to unauthenticated login screen so returning users can replay the onboarding flow
- [x] Fix broken dot layout on onboarding screen 3 and rewrite all copy with neurodivergent emotional resonance
- [x] Add betaCodes table to schema with code, usedBy, usedAt columns
- [x] Add isBeta, betaExpiresAt columns to users table
- [x] Seed 100 THREAD-BETA-### codes
- [x] tRPC redeemBetaCode procedure (validates, marks used, sets 45-day Pro access)
- [x] Beta code redemption screen in OnboardingPage (post-login)
- [x] Admin panel page for beta code management (list, generate, export)
- [x] Beta expiry push notification in cron (fires on expiry day)
- [x] Bypass Pro gate for isBeta users within betaExpiresAt window

## Tomorrow's Plan Feature (Apr 19, 2026)
- [x] Add tomorrowTasks column (JSON) to daily_plans schema + migration
- [x] Add saveTomorrowPlan and getTomorrowPlan tRPC procedures in dailyPlan router
- [x] Build TomorrowPlanSection component (task list with add/remove/reorder)
- [x] Embed TomorrowPlanSection inside EveningCheckIn in Home.tsx
- [x] Show tomorrow's plan as a card on the morning Command Center (below tomorrowBrief)
- [x] Auto-populate tomorrow's criticalTasks from tomorrowTasks when user opens morning plan

## Scratch Pad Feature (Apr 20, 2026)
- [x] Add scratchNotes table to schema (id, userId, content, createdAt, updatedAt)
- [x] Generate and apply migration
- [x] Add DB helpers: getScratchNotes, createScratchNote, updateScratchNote, deleteScratchNote
- [x] Add tRPC router: scratchPad.list, scratchPad.create, scratchPad.update, scratchPad.delete
- [x] Build ScratchPadPage with note list, inline editing, add/delete
- [x] Add /scratch route in App.tsx
- [x] Add Scratch Pad to sidebar nav (primary section) and mobile bottom nav
- [x] Write vitest tests for scratchPad router

## Scratch Pad Enhancements (Apr 20, 2026)
- [x] Add pinned boolean column to scratch_notes, apply migration
- [x] Add togglePinScratchNote DB helper + tRPC procedure
- [x] Add pin/unpin button to NoteCard, pinned notes sort to top
- [x] Wire FAB quick-capture to drop note into Scratch Pad
- [x] Add send-to-Vault action on each note card
- [x] Update tests for new procedures

## Scratch Pad — Round 3 (Apr 20, 2026)
- [x] Add colour varchar column to scratch_notes, apply migration
- [x] Add setColourScratchNote DB helper + tRPC procedure; add shareToVault (copy, not delete) procedure
- [x] Search/filter bar at top of ScratchPadPage
- [x] Colour tag dot picker on each NoteCard (5 colours + clear)
- [x] "Add to Tomorrow's Plan" card action
- [x] "Share to Vault" card action (copies note, keeps original)
- [x] Update tests

## Scratch Pad — Round 4 (Apr 20, 2026)
- [x] Colour filter row above note list
- [x] Sidebar note-count badge next to Scratch Pad nav item
- [x] Bulk-select mode with delete / colour / send-to-vault actions

## Scratch Pad — Round 5 (Apr 20, 2026)
- [x] Note templates (Quick list, Brain dump, Meeting notes) in NewNoteInput
- [x] Sort order toggle (newest/oldest first) in ScratchPadPage header
- [x] Scratch Pad widget on Today dashboard (pinned/recent note preview)

## Public Welcome / Onboarding Experience (Apr 2026)
- [x] Add waitlist_requests table to schema + migration
- [x] Add submitWaitlistRequest tRPC public procedure + notifyOwner on submission
- [x] Build TourPage (/tour) with full interactive onboarding narrative and Wren mascot
- [x] Register /tour public route in App.tsx (no auth required)
- [x] Write vitest tests for waitlist procedure

## Knowledge Graph — In-App Onboarding Integration (Apr 2026)
- [x] Audit OnboardingFlow slide structure and VaultGraph component
- [x] Add Knowledge Graph slide to OnboardingFlow with live user data + empty-state fallback (reuses vault.getGraphData)
- [x] Slide inserted as slide 6 (before "The Close", now slide 7); TOTAL bumped 6→7; GLOW_COLORS extended
- [x] VaultGraphPreview: live mini-graph when ≥2 vault nodes, demo fallback with "Add notes to your Vault" prompt otherwise
- [x] 351 tests passing, 0 TypeScript errors

## Adversarial Security Audit Remediation (Apr 2026)
- [x] H1: Add assertProjectOwnedBy helper to db.ts; gate intelligence.logMemoryEvent
- [x] H2: Gate intelligence.saveDecision with assertProjectOwnedBy
- [x] H3: Gate focusSessions.save with assertProjectOwnedBy
- [x] H4: Add checkLLMRateLimit to ai.captureIdea, generateReEntryCard, unstickTask, checkGoodEnough, evidence.generateIdentitySentence, clarity.analyzePatterns
- [x] M1: Change system.sendWeeklyDigest from protectedProcedure to adminProcedure
- [x] M2: Sanitise transcribeVoiceDirect error — log upstream body, return static message
- [x] M3: Change SameSite cookie from "none" to "lax"; add Origin/Referer allowlist middleware
- [x] M4: Replace req.path.includes() with exact-path check for upload bypass
- [x] M5: Remove localStorage.setItem of user PII from useAuth hook
- [x] L1: Convert gamification.recordEvent eventType to z.enum
- [x] L2: Reject tokens without real jti claim unconditionally
- [x] L3: Add assertProjectOwnedBy to threshold.generateFirstMovableStep, threshold.diagnose, clarity.runSession
- [x] L7: Add .max(64) to notifications.updateSchedule timezone input
- [x] L8: Truncate OAuth callback error log to 2000 chars
- [x] Update SECURITY_AUDIT.md to reflect all fixes

## SHIP_CHANGELOG.md Delta Items
- [x] M6: Add SINGLE_INSTANCE_OK=1 startup assertion in server/_core/index.ts
- [x] H4 addendum: Add invokeLLMForUser wrapper in rateLimiter.ts; update evidence.generateIdentitySentence + checkIns.submitEvening call sites
- [x] M5 addendum: Add legacy localStorage cleanup useEffect in useAuth.ts
- [x] Set SINGLE_INSTANCE_OK=1 env secret in production

## Security Follow-on Sprint
- [x] Redis-backed rate limiter — implemented via rate-limit-redis + ioredis; SINGLE_INSTANCE_OK gate removed
- [x] Push subscription endpoint allowlist in notifications.subscribe (was already implemented)
- [x] CSP nonce migration: per-request nonce replacing unsafe-inline in styleSrc

## Revision Notes — Horizontal Scaling & Stripe Hardening
- [x] Redis-backed rate limiters: install rate-limit-redis + ioredis, update oauthLimiter and apiLimiter in server/_core/index.ts
- [N/A] Stripe subscription status mapping — app uses PayPal, not Stripe
- [N/A] Webhook idempotency stripe_events — N/A (PayPal)
- [N/A] Payment failure handler invoice.payment_failed — N/A (PayPal)
- [N/A] Remove evt_test_ dead code — N/A (no Stripe webhook)
- [N/A] Sanitize webhook errors Stripe — N/A (PayPal)
- [N/A] Add Stripe schema columns — N/A (PayPal)
- [N/A] Create reconcile-subscription-status.mts — N/A (PayPal)

## Go-Live Sprint
- [x] PayPal: env-driven PAYPAL_BASE URL (sandbox vs live via PAYPAL_ENV secret)
- [x] PayPal: BILLING.SUBSCRIPTION.PAYMENT.FAILED webhook handler with notifyOwner
- [x] In-app beta feedback button — already fully implemented (FeedbackPanel + feedbackRouter)
- [x] Mitigate transitive CVEs: axios 1.15.2, qs >=6.14.1, follow-redirects >=1.15.12, mdast-util-to-hast >=13.2.1, drizzle-orm 0.45.2. Lodash 3 CVEs accepted risk (no patched 4.x exists; recharts-only, client-side)

## Post-Launch Sprint
- [x] PayPal webhook idempotency: paypal_events ledger table + duplicate-check
- [x] Beta invite-code gate: already fully implemented (betaCodes table + beta router + /admin/beta UI)

## Wren Companion + Visual Polish Sprint
- [x] Fix landing page flex layout bug (unlayered .flex rule in index.css — highest cascade priority)
- [x] Upload Wren SVG/webp assets to CDN (/manus-storage/wren_neutral_88afb376.svg etc.)
- [x] Build WrenCompanion component with CSS keyframe animations (bob, breathe, bounce, wiggle, lean)
- [x] Place Wren on Command Center (neutral state, 52px, below Knowledge Graph shortcut)
- [x] Place Wren in onboarding flow slide 1 (guiding state, 72px, with glow ring)
- [x] Update TourPage.tsx Wren assets to new SVG/webp URLs
- [x] Full visual audit: spacing, copy, layout fixes across all screens
- [x] Fix CSP img-src to allow CDN_STATIC_ORIGIN (d36hbw14aib5lz.cloudfront.net) for Wren assets
- [x] Fix WrenCompanion sprite sheet crop (background-image approach for guiding/celebrating/resting/nudging)
- [x] Wire real Wren SVG/webp artwork into WrenCompanion (neutral SVG + 3-panel states webp + 2-panel states2 webp)
- [x] Fix sign-in page avatar circles (inline style display:flex on avatar container)

## Font & Legibility Scale Bump
- [x] Increase base font size to 17px in index.css html (font-size: 17px)
- [x] Increase line-height to 1.7 globally
- [x] Scale up text-xs/text-sm in Home.tsx, AppLayout, DashboardLayout, GamificationLayer, TomorrowPlanSection, ReEntryFlow
- [x] Bump sidebar nav labels, section labels, and body copy sizes
- [x] Increase sidebar footer button text sizes
- [x] Verified: 351 tests passing, 0 TS errors
## A+ Polish Sprint
- [x] Redesign Product Hunt banner: muted gold, no rocket emoji, sophisticated typography
- [x] Sidebar hover micro-interactions: amber accent line slides to active tab, soft glow on hover
- [x] Auto-dissolve amnesty screen: 3-4s linger then slow fade into Today dashboard (keep "take me in" link)
- [x] Whisper API voice-to-text in Clarity Engine Brain Dump textarea (not browser dictation)
  - [x] Backend: ai.transcribeVoiceDirect tRPC procedure (base64 webm → Whisper → transcript text)
  - [x] Frontend: VoiceDictationButton component (tap to record/stop, appends to textarea)
  - [x] Wire into ClarityEnginePage Brain Dump textarea (already wired)
- [x] Luxury heatmap: GitHub-style contribution grid in gold/charcoal for Intelligence + Evidence Log

## Google Calendar Integration
- [x] DB: googleCalendarTokens table (userId, accessToken, refreshToken, expiresAt, calendarId)
- [x] Backend: Google Calendar OAuth flow (connect, callback, disconnect, token refresh)
- [x] Backend: fetchWeekEvents helper — fetches this week's events from Google Calendar API
- [x] Backend: Wire calendar events into Weekly Compass AI recommendation prompt
- [x] Frontend: "Connect Google Calendar" button in Settings → Integrations tab
- [x] Frontend: Calendar event preview strip in Weekly Compass (shows busy blocks)
- [x] Frontend: Disconnect calendar option in Settings

## Bug Fixes
- [x] Fix Replay Intro button in Settings — desktop layout was missing IntroContext.Provider; secondary About button was navigating to /intro instead of calling replayIntro()

## Sprint: 3 Feature Additions
- [x] Getting Started checklist auto-complete: isReturningUser now uses project count alone (not onboardingCompleted flag)
- [x] Markdown/Obsidian export: Download ↓ button on Evidence Log + Vault header downloads .md file
- [x] Shareable Monthly Identity Card: "Post to X" button added to ShareEvidenceModal (pre-fills tweet with identity sentence)

## Onboarding Enhancement v5 Follow-up
- [x] Replay onboarding intro button in Settings — upgrade visual to match v5 dark full-screen style
- [x] Streak milestone celebration overlay — full-screen Wren celebrate clip at 3/7/30 day streaks, shown once per milestone via localStorage
- [x] Premium invite code entry — auto-formatted groups of 4 with dashes, large centered display

## Mobile Layout Fixes (onboarding)
- [x] Fix mobile onboarding layout: CTA buttons cut off at bottom on phone screens — add safe-area-inset-bottom padding and make step screens scrollable
- [x] Fix cinematic intro lower-third: "Let's go" button hidden behind browser chrome on short phones — use env(safe-area-inset-bottom) in bottom padding
- [x] Reduce Headline font sizes on mobile: text-4xl/5xl too large on small screens — use clamp() responsive sizing

## Emotional Cycle Tracker
- [x] Add mood_logs table to drizzle schema (id, userId, date UTC, score 1-10, note optional, createdAt)
- [x] Generate and apply migration SQL
- [x] Add tRPC procedures: moodLogs.logToday (upsert), moodLogs.getHistory (last 90 days), moodLogs.getCycleAnalysis
- [x] Build EmotionalCyclePage: dot-connect SVG chart, 1-10 log input, cycle length detection, high/low predictions, Wren commentary
- [x] Add mood widget to Home dashboard (today score + cycle phase badge)
- [x] Integrate mood prompt into morning check-in flow
- [x] Add Emotional Cycle entry to sidebar navigation
- [x] Write vitest tests for cycle analysis logic

## Founding Member Migration (P0)
- [x] Add isFoundingMember, foundingMemberCohort, foundingMemberJoinedAt, foundingRateLocked, foundingTier, referredBy, referralBonusDays fields to users table
- [x] Add referral_codes table
- [x] Update FOUNDING_TRIAL_DAYS constant to 90, update beta.ts redeemCode
- [x] Add cohort batching logic (25 per cohort, auto-open next when prev hits day 14)
- [x] Add referral mechanic: generate code per founding member, redeem adds 30 days to both
- [x] Add day-91 auto-revert cron job
- [x] Build /founding-member conversion page with 4 SKUs + personal data summary
- [x] Implement 8-touchpoint communication ladder (push + email)
- [x] Auto-migrate existing beta users to founding member cohort 1 with 45-day extension
- [x] Add Founding Member section to Settings page with referral code
- [x] Wire /founding-member route in App.tsx and redirect trial users from /pro

## Wren Video Clip Refresh + Tour Page Upgrade
- [x] Register bouncingFunClean clip in wrenClips.ts (WrenBouncinghavingFun_dec95150.mov)
- [x] Register wrenLetter clip in wrenClips.ts (WrenLetter_653dac1a.mov)
- [x] Swap ScratchPadPage from bouncingFun (watermarked) to bouncingFunClean
- [x] Swap WeeklyReviewPage from letter to wrenLetter (both occurrences)
- [x] Fix EvidenceLogPage celebration timing: 3500ms → 6000ms + click-to-dismiss overlay
- [x] Fix EmotionalCyclePage WrenPlayer: container 64×64 → 120×120, size sm → md, fix clip names to valid registry keys, add feather radial
- [x] Rewrite TourPage.tsx: fix all invalid clip names, apply deep navy + amber-gold color system, Playfair Display headings, /apply CTA on final step

## Domain Cleanup: continuary.app
- [x] Update CANONICAL_DOMAIN in server/_core/index.ts from soulengineer.online to continuary.app
- [x] Add continuary.app and app.continuary.app to CORS allowed origins in server/_core/index.ts
- [x] Update FROM_ADDRESS in server/_core/email.ts to hello@continuary.app
- [x] Update og:url in client/index.html to https://continuary.app/
- [x] Update InviteGatePage contact email from hello@soulengineer.online to hello@continuary.app
- [x] Fix OnboardingPage ambient audio URL from dead manus.space URL to webdev CDN

## Cleanup Brief Sprint (Priorities 0-2, 4-7)

### Priority 1 — Command Center string replacements
- [x] 1.1 Sign-in card: "COMMAND CENTER" → "YOUR MEMORY COMPANION", tagline, back link, preview link
- [x] 1.2 404 page: "Go to Command Center" → "Take me to Today"
- [x] 1.3 Evidence Log overlay: "Back to Command Center" → "Back to Today"
- [x] 1.4 Sidebar group label: "COMMAND" → "DAILY"
- [x] 1.5 About page: "Open Command Center" → "Open Today" (both buttons), Command Center card → Today
- [x] 1.6 Pricing page: "Today Command Center" row → "Today"
- [x] 1.7 Doing Mode label: "Executing, building, shipping" → "Make and move"; Being Mode → "Rest and notice"

### Priority 2 — Daily ritual names
- [x] 2.0 Lock ritual names everywhere: Morning check-in / Midday pulse / Evening close / Weekly Compass
- [x] 2.1 Tour step 2/9: replace old problem block with Restart Tax / Burst Penalty / Open Tab Spiral / Lost Week

### Priority 4 — Weekly Review JSON bug
- [x] 4.0 Build check-in card components (Morning/Midday/Evening) and render properly in /weekly

### Priority 0 — Pricing
- [x] 0.1 Rewrite /pro pricing page to show all 5 tiers with founding + retail prices

### Priority 7 — Founding Member value props
- [x] 7.0 Add "What founding members get" section above pricing tiles on /founding-member

### Priority 5 — /landing decision
- [x] 5.0 Redirect /landing to continuary.app marketing site

## Full Upgrade Sprint (Priority 0, 6, 8)

- [x] Priority 0: Rewrite /pro pricing page with full 5-tier PayPal ladder
- [x] Priority 6: Reconcile feature names on About page to canonical set
- [x] Priority 8.1: Typography pass — Playfair Display to all page titles, big stats, greetings
- [x] Priority 8.6: Utility microcopy upgrade — brand vocabulary on expressive actions
- [x] Priority 8.7: Rename /settings to "You & Wren" with relational framing
- [x] Priority 8.2: Mobile bottom tab bar (Today / Threads / Wren / You)
- [x] Priority 8.3: Color warmth pass — cream-on-navy contrast, warm gold active states
- [x] Priority 8.5: Dashboard widget restyle — larger radius, editorial numbers, warm tints
- [x] Priority 8.8: First-run Wren introduction moment on Today
- [x] Priority 8.9: Loading states — Wren-presence animation replacing generic spinners

## Bug Fixes (May 11)
- [x] Fix onboarding step 1 work-type cards not selectable when replayed from Settings / About page (Continue greyed out)
- [x] Fix greeting text color invisible on dark background ("Morning. The thread is ready.")
- [x] Fix check-in tab active state not highlighting (Morning check-in / Midday pulse / Evening close tabs)

## Follow-up Improvements (May 11)
- [x] Add close toggle visual cue on open check-in card (chevron/close indicator when form is open)
- [x] Persist hasSeenWrenIntro to user profile table (not localStorage) so it survives device changes

## Founding Member Invite Pipeline (May 2026)

- [x] Rewrite approval email template with exact approved copy ("We're glad you're here")
- [x] Change deep link from /landing?code=XXX to /invite/:code
- [x] Add /invite/:code public route that auto-fills code and redirects to invite gate
- [x] Set founding_member flags at invite redemption time for founding-member-sourced codes
- [x] Repurpose /founding-member page from checkout gate to locked-rate status page
- [x] Update admin approve mutation to pass continuary.app as appUrl (not window.location.origin)

## Founding Member Launch Blockers (B-series, May 2026)

- [ ] B1: OAuth callback URLs — add app.continuary.app to Manus authorized redirect URIs (PLATFORM CONFIG — not code, requires Manus project settings)
- [ ] B2: Resend sending domain — verify mail.continuary.app with SPF/DKIM/DMARC in Cloudflare DNS (DNS CONFIG — not code, requires Cloudflare + Resend dashboard)
- [x] B3: Application form → admin queue — verified: /apply writes to founding_applications, appears in Admin → Applications
- [x] B4: "In queue" email fires on submission — verified: buildApplicationConfirmationEmail fires on submit via Resend
- [x] B5: Approval action sends invite email with code — verified: approve generates founding-member code + fires approval email with /invite/:code deep link
- [x] B6: /invite/:code magic-link redemption — verified: route stores code in sessionStorage, redeems at invite gate, grants founding flags, routes to /founding-member

## Polish Items (P-series, May 2026)

- [ ] P1: Marketing site header — add "Sign in" link pointing to https://app.continuary.app (MARKETING SITE — separate codebase, not this app)
- [x] P2: Renamed "Study Mode" → "Single Focus Mode" in sidebar, More sheet, command palette, ProPage (tier + comparison table)
- [x] P3: Weekly Review header copy updated to Wren voice: "Ask Wren to read your week" + new description
- [x] P4: /founding-member status page verified: locked rate + exact 5 value props + redirect non-members to /apply
- [x] P5: PayPal confirmed across the board (no Stripe); pricing page footer already says PayPal
- [ ] P6: Cloudflare Worker (continuary-route) — decide keep/delete (DEWAYNE DECISION — awaiting confirmation)
- [x] P7: /landing route is a clean redirect shim to continuary.app — no action needed

## Suggestions 2 & 3 (May 2026)

- [x] S2: Trial expiry reminder email — trialReminderSentAt column + hourly cron + branded Resend template ("10 days left. Your founding rate is waiting.")
- [x] S3: Admin applications table — FM badge with "Redeemed · Xd left" or "Not yet redeemed" shown next to invite code for approved applicants

## Admin Manual Trigger (May 2026)

- [x] Add tRPC procedure `applications.resendTrialReminder` that resets trialReminderSentAt and re-sends the reminder email for a given applicant email
- [x] Add "Resend Reminder" button to admin panel for approved founding members who have redeemed their code

## Deep Link URL Fix (May 2026)

- [x] Fix approval email deep link: changed APP_URL to app.continuary.app in email.ts, applications.ts, and trialReminder.ts

## Resend Invite Button (May 2026)

- [x] Add applications.resendInvite tRPC procedure that re-sends the approval email with the corrected deep link for an approved applicant
- [x] Add "Resend Invite" button to AdminApplicationsPage for all approved applications

## Referral Code Redemption UI (May 2026)

- [x] Add "Have a referral code?" entry point on the apply confirmation page linking to referral redemption
- [x] Add /redeem-referral route with a form that calls beta.redeemReferral and routes to /founding-member on success
- [x] Add referral code entry option to the InviteGatePage as an alternative path

## Onboarding Skip Bug Fix (May 2026)

- [x] Fix: new users who redeem a founding-member invite code were landing on the dashboard without seeing onboarding. InviteGatePage now routes new users (no continuary_onboarded flag) to / instead of /founding-member, so the App-level onboarding gate fires naturally. Returning users (already onboarded) still go directly to /founding-member.

## Wren Intro Bug Fix (May 2026)

- [x] Add needsOnboarding boolean column to user_profiles table (default true for new users) — NOT NEEDED: existing hasSeenWrenIntro column already serves this purpose
- [x] Set needsOnboarding = true when a founding-member invite code is redeemed — NOT NEEDED: hasSeenWrenIntro defaults to false for all new users
- [x] Expose needsOnboarding via auth.me query — NOT NEEDED: settings.getProfile already returns hasSeenWrenIntro
- [x] In App.tsx onboarding gate: set sessionStorage justCompletedOnboarding flag after onboarding completes
- [x] After onboarding completes: markWrenIntroSeen is already called by WrenIntroMoment.handleDone
- [x] Verify: new founding member clicks magic link → OAuth → invite gate → onboarding fires → Today (dual-trigger: sessionStorage + server flag)
- [x] Verify: subsequent logins skip the intro (hasSeenWrenIntro = true after markWrenIntroSeen fires)

## Cleanup Brief — App (May 2026)

### Priority 0 — Pricing reconciliation
- [x] P0.1: Rewrite /pro Pricing page — DONE: 3-tier card structure (Free/Pro/Keeper) with monthly/annual toggle and founding rates with retail strikethrough
- [x] P0.2: /pro uses PayPal only — no Stripe references

### Priority 1 — Command Center string cleanup
- [x] P1.1: Sign-in card — already correct (all strings updated in prior session)
- [x] P1.2: 404 page — already correct
- [x] P1.3: Evidence Log overlay — already correct
- [x] P1.4: Sidebar group label — already "Daily"
- [x] P1.5: About page — no Command Center references found
- [x] P1.6: Pricing page — no Command Center references found
- [x] P1.7: Doing Mode — updated: off-state now shows Being Mode / Rest and notice

### Priority 2 — Daily ritual names locked everywhere
- [x] P2.1: Lock ritual names — WelcomePage headings updated; TourPage already correct
- [x] P2.2: Tour step 2/9 — already correct (updated in prior session)

### Priority 4 — Weekly Review JSON bug
- [x] P4: Fix /weekly "Recent check-ins" section — full labeled card rendering per check-in type

### Priority 7 — Founding Member page value props
- [x] P7: Add "What founding members get" section — 5 value prop icon cards added above pricing tiles

### Priority 8 — Selected UX/copy upgrades
- [x] P8.6: Utility microcopy — Start a new thread, Jot something down, Log this moment, Ask Wren (Clarity + Weekly already correct); Run Detection → Ask Wren to look; Score Projects → Ask Wren to score (IntelligencePage)
- [x] P8.7: /settings — sidebar label updated to "You & Wren"; page heading already "You & Wren"

## Pricing + Pattern C Billing (Handoff Section 7–9, May 2026)

### Schema — Pattern C billing fields
- [x] Add `billing_status` enum column to users table — DONE (on users table, not user_profiles)
- [x] Add `beta_start_date` — already exists as foundingMemberJoinedAt on users table
- [x] Add `beta_end_date` — already exists as trialEndsAt on users table
- [x] Add `needs_intro` boolean — DONE: needsIntro column added to users table
- [x] Add `founding_tier_locked` — already exists as foundingTier on users table
- [x] Add `paypal_subscription_id` — already exists as paypalSubscriptionId on users table
- [x] Generate and apply migration — DONE (migration 0037)

### Backend — billing tRPC procedures
- [x] Add `billing.getStatus` procedure — DONE via paypal.status (already returns billingStatus, daysRemaining, isFoundingMember, foundingTier, etc.)
- [x] Add `billing.dismissBetaBanner` — client-side sessionStorage only, no procedure needed

### /pro Pricing page rebuild (Section 7)
- [x] 3-tier card structure: Free / Pro / Keeper
- [x] Each paid tier shows: founding monthly + founding annual + retail monthly (strikethrough) + retail annual (strikethrough)
- [x] Free card: $0 forever, feature list, CTA based on auth state
- [x] Pro card: $4.99/mo founding · $39.99/yr founding · retail $7.99/mo · $79.99/yr (strikethrough) · "Lock in Pro" CTA
- [x] Keeper card: $9.99/mo founding · $79.99/yr founding · retail $14.99/mo · $149.99/yr (strikethrough) · "Lock in Keeper" CTA
- [x] CTA logic: not signed in → route to continuary.app/apply; founding member on Free → PayPal upgrade; founding member on Pro → "Current Plan" (Pro) / upgrade to Keeper; founding member on Keeper → "Current Plan" (Keeper) / downgrade to Pro
- [x] "FOUNDING MEMBER" badge near user avatar in pricing page header when founding_member === true
- [x] Remove any Stripe references from /pro page

### Settings → Subscription page (Section 8)
- [x] New Subscription tab within SettingsPage
- [x] State 1 (trialing_no_card): beta days remaining, tier locked, founding rate, no card on file, "Lock in my founding rate" CTA
- [x] State 2 (free_tier_founding_rate_waiting): founding rate locked display, "Lock in my founding rate" CTA
- [x] State 3 (active): plan name, founding rate, active since date, "Manage plan" CTA

### Trial-state dashboard banner (Section 9)
- [x] Show banner on Today when billing_status === "trialing_no_card": "You're in beta — full access, no card required. Lock in your founding rate." (dismissable per session)
- [x] Show different banner when billing_status === "free_tier_founding_rate_waiting" — covered by same banner logic
- [x] Banner is dismissable per session (sessionStorage flag)
- [x] Both banners route to /pro (pricing page)

## ADHD Hacks Feature Build (May 2026)

### Hack 1 — Transition Sound
- [x] Web Audio API chime implemented in useTransitionSound.ts hook (no CDN needed)
- [x] Chime plays when Single Focus Mode session starts (setup → active transition)
- [x] Chime plays when Doing Mode is toggled on/off in Home.tsx

### Hack 3 — Environment Field (Morning Check-in)
- [x] workLocation field already in morning check-in tRPC input (home/coffee_shop/library/office/other)
- [x] Environment icon-button picker already in morning check-in form in Home.tsx
- [x] workLocation stored in check-in userInput JSON

### Hack 8 — Environment Tracking in Intelligence
- [x] Add getEnvironmentCorrelation procedure to intelligenceInsights router
- [x] Add Environment Patterns section to IntelligencePage with bar chart and insight sentence

### Hack 2 — Body Doubling Room
- [x] Install ws (WebSocket) package on server
- [x] Add co-working rooms table to schema (id, name, created_at, is_active)
- [x] Add room_participants table (id, room_id, user_id, status: working|stuck|done, intention, joined_at, left_at)
- [x] Add WebSocket server endpoint /ws/coworking for presence channel
- [x] Add tRPC procedures: coworking.listRooms, coworking.joinSession, coworking.leaveSession, coworking.updateStatus, coworking.myRecentSessions
- [x] Build /coworking route — room lobby with participant status dots, session timer, intention field
- [x] Session intake: "What are you working on this session?" (stored, no AI)
- [x] Session close: one LLM call — feed project continuity note + session intention → one-sentence next step
- [x] Add sidebar nav item (Body Doubling) in AppLayout.tsx

### Hack 5 — Movement Prompt in Clarity Engine
- [x] Detect overwhelm mode in Clarity Engine result view
- [x] Show movement break card with suggested actions when mode is overwhelm or user marks "still unsure"

### Hack 7 — Hunger/Energy Field (Midday Check-in)
- [x] energy_level and hunger_level already captured in midday check-in userInput JSON
- [x] Add getEnergyCorrelation procedure to intelligenceInsights router (parses midday check-in userInput)
- [x] Add Energy & Alignment section to IntelligencePage showing correlation bar charts

### Hack 9 — Third-Person Reframe in Clarity Engine
- [x] Add third-person reframe card to ResultView when mode is overwhelm
- [x] Card shows the user's whatIsHappening text rephrased as a third-person prompt
