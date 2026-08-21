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

- [x] B1: OAuth callback URLs — Manus auto-registers on custom domain; confirmed working
- [x] B2: Resend sending domain — verified via Cloudflare auto-configure (Jun 04 2026)
- [x] B3: Application form → admin queue — verified: /apply writes to founding_applications, appears in Admin → Applications
- [x] B4: "In queue" email fires on submission — verified: buildApplicationConfirmationEmail fires on submit via Resend
- [x] B5: Approval action sends invite email with code — verified: approve generates founding-member code + fires approval email with /invite/:code deep link
- [x] B6: /invite/:code magic-link redemption — verified: route stores code in sessionStorage, redeems at invite gate, grants founding flags, routes to /founding-member

## Polish Items (P-series, May 2026)

- [x] P1: Marketing site header — add "Sign in" link pointing to https://app.continuary.app (MARKETING SITE — separate codebase, not this app)
- [x] P2: Renamed "Study Mode" → "Single Focus Mode" in sidebar, More sheet, command palette, ProPage (tier + comparison table)
- [x] P3: Weekly Review header copy updated to Wren voice: "Ask Wren to read your week" + new description
- [x] P4: /founding-member status page verified: locked rate + exact 5 value props + redirect non-members to /apply
- [x] P5: PayPal confirmed across the board (no Stripe); pricing page footer already says PayPal
- [x] P6: Cloudflare Worker (continuary-route) — decide keep/delete (DEWAYNE DECISION — awaiting confirmation)
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

## Focus Sessions with Wren (Continuary-FocusSessions-Feature-Spec.md)
- [x] Upload 4 Wren videos to CDN (weaving, reading, writing, lookingup) via manus-upload-file --webdev
- [x] Extend focus_sessions schema (durationMinutes, whatMoved, closingNote, threadAddedUnits, wasCompleted)
- [x] Add focus_session_artifact table (userId, totalSegments)
- [x] Run drizzle-kit generate and apply migration via webdev_execute_sql
- [x] tRPC procedures: start, complete, getArtifact, getTodayStats, checkWeeklyLimit
- [x] Build /focus page (FocusSessionsPage.tsx) with full session flow
- [x] Wren workspace: video rotation (reading/writing/weaving/lookingup) via mix-blend-mode:screen
- [x] Session phases: idle → intake → duration → active (timer) → closure → reveal
- [x] Mid-session moment: Wren looks up at halfway mark with "We're halfway."
- [x] Procedural woven artifact: canvas drawing grows per session, color-coded by whatMoved
- [x] Thread Strength bump on session complete
- [x] Closing note saved to Knowledge Vault (sourceItems table)
- [x] Ambient sound presets: silence / rain / café (Web Audio API)
- [x] Free tier limit: 1 session/week, paywall card with upgrade CTA to /pro
- [x] Today dashboard widget in Home.tsx (shows session count + minutes)
- [x] Sidebar nav item (Focus Sessions) in AppLayout.tsx
- [x] Route registered in App.tsx (/focus → FocusSessionsPage, /focus-mode → FocusModePage)

## Focus Sessions Build Updates (Continuary-FocusSessions-Build-Updates.md)
- [x] Remove Body Doubling nav item from AppLayout sidebar and More sheet
- [x] Fix "1 sessions" → "1 session" pluralization
- [x] Add pre-session breath option on duration picker ("Take a breath first" link)
- [x] Remember ambient sound choice in localStorage (rain/café persists across sessions)
- [x] Wren status line rotates every 6–10 min (reading/writing/weaving/lookingup variants)
- [x] Time-of-day vibe shifts on session opening line (7 time buckets)

## Single Focus Mode Generalization (Continuary-SingleFocusMode-Generalization-Spec.md)
- [x] Add userFocusConfigs table to schema (focusTopic, focusDescription, sessionDurationMinutes, cadence, wrenPromptsEnabled, wrenLine, status, pausedUntil, endedAt)
- [x] Run drizzle migration and apply to DB
- [x] Add tRPC procedures: study.createConfig, study.updateConfig, study.getActiveConfig, study.logDay, study.getRecentDays
- [x] Rewrite StudyTrackerPage as generalized Single Focus Mode with first-run setup flow
- [x] Setup flow: focus topic, description, session duration, cadence, Wren prompts toggle
- [x] Replace hardcoded Python curriculum with user-defined focus topic/description
- [x] Wren continuity line from config (replaces streak/progress bar)
- [x] Day navigator with check-in form (intention, notes, energy, mood, duration)
- [x] Settings panel (change focus, extend, pause, end)

## Focus Sessions Phase 1.5 Wave 1 (Continuary-FocusSessions-Phase1.5-Addendum.md)
- [x] Add wrenChat tRPC procedure to focusSessions router (hard rail system prompt: companion-only, no task assistance)
- [x] Time-of-day vibe shifts on session opening line (7 buckets)
- [x] Wren-initiated check-ins: 50min → 1 check-in at 27min; 90min → 2 check-ins at 30min and 70min
- [x] In-session chat panel UI: collapsible, message thread, input with Enter-to-send
- [x] Auto-collapse chat after 5 min of inactivity
- [x] Chat history passed as context to wrenChat (last 12 messages, 400 char limit each)

## In-App Surface Updates (pasted_content_3.txt)
- [x] /pricing route alias added (points to ProPage, same as /pro)
- [x] ProPage feature table updated: Focus Sessions row added (1/week free, unlimited Pro), Single Focus Mode row added (Wren prompts = Pro)
- [x] AboutAppPage: Focus Sessions added to SPACES list, WREN_APPEARANCES, and features section; Soul Engineer link added in footer; spaces count updated
- [x] OnboardingPage: Focus Sessions intro step added as step 6 (between StepProject and DoneScreen); DoneScreen moved to step 7; progressMap updated
- [x] TourPage: 2 new steps added — focus_sessions (step 9) and single_focus (step 10); invite moved to step 11; STEPS array and STEP_META updated
- [x] Paywall audit: no Stripe references found in frontend; all CTAs point to /pro; FocusSessionsPage paywall card uses correct copy ($4.99/mo founding rate)
- [x] Payment system confirmed: PayPal only throughout (ProPage.tsx uses trpc.paypal.* exclusively)

## Fix Specs (May 17 2026)

### Pricing Page Fix Spec
- [x] Rewrite Free tier card: "Start here. No card required." headline, 5 correct bullet points
- [x] Rewrite Founding Member card: "Lock in your rate forever." headline, 7 correct bullet points, founding member badge
- [x] Rewrite Pro card: "Everything, always." headline, 7 correct bullet points
- [x] Reconcile feature table: 14 rows with correct tier access per spec
- [x] Pattern C CTAs: Founding Member = "Become a Founding Member", Pro = "Start Pro — $9.99/mo"
- [x] Add "Founding Member spots are limited" scarcity banner above tier cards
- [x] Add "Questions? Read the tour" and "Back to the app" footer links
- [x] Verify PayPal only — no Stripe references anywhere

### About Page Fix Spec
- [x] Fix feature grid names: "Clarity Engine" (not Clarity Mode), "Knowledge Vault" (not just Vault), Body Doubling removed
- [x] Fix spaces header count to 7
- [x] Update Focus Sessions tile copy per spec
- [x] Update Single Focus Mode copy per spec
- [x] Fix Wren section: remove "AI assistant" framing, add voice doctrine paragraph
- [x] Add sidebar dot (amber) to Focus Sessions in spaces list
- [x] Fix features worth knowing names: "Continuity Notes", "Thread Strength", "Evidence Log"
- [x] Add /pricing link in CTA section
- [x] Add Soul Engineer footer link
- [x] Fix tagline and CTA headline per spec

### Tour Fix Spec
- [x] Slide 1: Add Wren voice doctrine ("She will not solve your problems. She will sit with you while you figure them out.")
- [x] Slide 3: Add Focus Sessions + Single Focus Mode to the daily rhythm list
- [x] Slide 7 (Thread Strength): Remove score/bar, rewrite as relationship signal not gamification
- [x] Slide 9 (Focus Sessions): Fix direction (Wren left, controls right), add ambient sound note
- [x] Add slide: Re-Entry Protocol (how Continuary helps you pick up where you left off)
- [x] Add slide: Evidence Log (what it is, how it builds over time)
- [x] Add slide: Threshold Diagnosis (Clarity Engine overwhelm detection)
- [x] Rename "Vault" → "Knowledge Vault" throughout tour
- [x] Fix nav bug: prev/next buttons work correctly on all 14 slides
- [x] Rewrite final invite slide per spec

## Fix Specs Wave 2 (May 17 2026 — follow-up)
### Pricing Page Polish
- [x] Keeper card border visual weight matches Pro card
- [x] Annual savings note more prominent
- [x] Feature table toggle arrow direction fix
### About Page Polish
- [x] SPACES list: Intelligence, Scratch Pad, Projects names corrected
- [x] Focus Sessions tile updated
- [x] Single Focus Mode tile rewritten
- [x] Wren doctrine 4 lines present
- [x] Soul Engineer footer present
- [x] Pricing link present
- [x] Tagline "non-linear minds" present
- [x] Notification dot on About nav item confirmed absent (never existed)
### Tour Polish
- [x] McKinsey stat replaced with generic sample in Knowledge Vault slide
- [x] Focus Sessions step 4 softened: Wren weaves artifact, user always picks next

## About Page Root Cause Fix (May 17 2026)
- [x] Identified that /welcome routes to WelcomePage.tsx (not AboutAppPage.tsx which is at /about-app)
- [x] Applied all About fix spec changes to WelcomePage.tsx (the correct live component):
  - [x] FEATURES array: "Distraction Insights" → "Intelligence", "Idea Sanctuary" → "Scratch Pad", "Project Memory" → "Projects"
  - [x] Single Focus Mode description rewritten (no longer conflated with Focus Sessions)
  - [x] Focus Sessions tile added to FEATURES grid
  - [x] Feature grid heading: "Nine spaces" → "Ten spaces"
  - [x] Wren caption: added 4-line voice doctrine below "Wren — your Continuary companion"
  - [x] Footer: tagline → "Built for non-linear minds.", added "Founding member pricing" link (/pricing), added "Soul Engineer ecosystem" link
  - [x] Footer nav labels updated: Vault → Knowledge Vault, Clarity → Clarity Engine, Evidence → Evidence Log
  - [x] PhoneMockup sidebar preview updated with correct nav labels (Today / Knowledge Vault / Projects / Clarity Engine / Evidence Log)
  - [x] "Who it's for" section: "Distraction Insights" → "Focus Sessions and Single Focus Mode"

## UX Bottleneck Fixes (May 17 2026)
- [x] UX1: FocusSessionsPage — add persistent visible "Exit Session" / "Back to Dashboard" button so users aren't trapped without the sidebar
- [x] UX2: EvidenceLogPage (or wherever the Evidence Log splash lives) — add localStorage guard so splash only shows on first visit, not every visit
- [x] UX3: WeeklyCompassPage — turn the "connect Google Calendar in Settings" prompt into a clickable deep link to /settings#calendar (or the exact calendar integration section)
- [x] UX4: ScratchPadPage — add a CTA button ("+ Create Your First Note") inside the empty state so novice users know what to do

## Application Review Report Bugs (May 17 2026)
- [x] BUG1: Double sidebar in Single Focus Mode (/study) — page renders two sidebars side-by-side, breaking the focused experience
- [x] BUG2: Heatmap month labels overflow container in Evidence Log — labels overlap sidebar on smaller screens
- [x] BUG3: tRPC unauthorized fetch noise on early render — scratchPad.list, checkIns.getStreak, settings.getProfile fire before auth resolves

## Launch-Readiness Review Fixes (May 18 2026)

### P0 — Critical
- [x] P0-1: Root URL / — confirmed sign-in card IS shown (AppLayout gate); no change needed
- [x] P0-2: /redeem-referral — form now shows before auth; code stored in sessionStorage, auto-redeemed after OAuth

### P1 — High
- [x] P1-1: Renamed 'Watch the intro' → 'Take the tour' in AppLayout sign-in card
- [x] P1-2: /apply question changed to 'What’s your relationship with consistency?'
- [x] P1-3: Standalone /404 route added outside AppLayout; NotFound page already branded with CTA
- [x] P1-5: Splash contrast verified correct — wordmark is oklch(0.97) near-white on dark bg; no change needed

### P2 — Code-fixable
- [x] P2-3: Terms of Service — removed 'will be updated before public launch' clause
- [x] P2-4: External links verified — all target=_blank links already have rel=noopener noreferrer
- [x] P2-5: <title>Continuary</title> already in index.html line 7 — no change needed
- [x] P2-7: /invite-gate now has 'Apply for founding access' link to /apply + 'email us' fallback
- [x] P2-8: 'June 15th' not found in app codebase — only user-facing book ref is 'Companion app to Permission to Start' (no date). Likely on marketing site (separate codebase)

### P2 — External/Not code (note only)
- [x] P1-4: Mobile nav on continuary.app marketing site (SEPARATE CODEBASE — not this app)
- [x] P2-1: Pricing page "Clarity Engine" terminology not in signup flow (low priority, terminology is correct in app)
- [x] P2-2: Privacy/Terms updated to June 2026 (LEGAL REVIEW — owner action needed)
- [x] P2-6: Social proof avatars are initials only (CONTENT — owner to provide real photos)
- [x] P2-9: Cross-domain transitions between continuary.app and app.continuary.app (ACCEPTABLE — standard practice)
- [x] P2-10: og:tags for social sharing on app routes (INFRASTRUCTURE — SSR or meta proxy needed)

## Revision Brief 6 — Ground Mode

- [x] DB: ground_sessions table (id, userId, enteredAt, entryMethod, exitedAt, exitMethod, durationMs)
- [x] DB: app_config table or row for spiral_check_threshold (default: 3) and spiral_read_window (default: 2 turns)
- [x] Backend: groundMode tRPC router — logSession mutation, checkSpiralOffer query, groundModeAsk mutation
- [x] Backend: Ground Mode system prompt stored as GROUND_MODE_SYSTEM_PROMPT constant in groundMode.ts
- [x] Backend: AI session ground_mode_active flag — client-side React state (groundModeActive) passed as input to AI calls
- [x] Backend: crisis override — groundModeAsk detects crisis signals, exits mode and responds with care
- [x] Backend: spiral detection helper — detectSpiral() reads last N check-in texts, fires on 3+ signals or clear escalation
- [x] Backend: alert-priority resolver — spiral_offer alert type added after blocker, before sanctuary_nudge in Home.tsx
- [x] Frontend: manual entry Anchor button in Command Center header (always visible when not in Ground Mode)
- [x] Frontend: manual entry available via header button (check-in and project surfaces share the same Home.tsx state)
- [x] Frontend: groundModeActive state available to all surfaces via Home.tsx (project detail uses separate page)
- [x] Frontend: spiral_offer alert card with 'Enter Ground Mode' and 'Not now' buttons wired to enterGroundMode
- [x] Frontend: Ground Mode banner (slate, 'Ground Mode: facts only' label, countdown, Exit button) shown when groundModeActive
- [x] Frontend: soft-expiry timer — 15-minute setTimeout in useEffect, exits silently via exitGroundMode('soft_expire')
- [x] Frontend: on exit — logSession mutation fires, groundModeActive resets, AI returns to normal system prompt
- [x] Tests: vitest for spiral detection helper (true positives, false positives, crisis exclusion) — 9/9 passing
- [x] Tests: vitest for groundMode enter/exit/log procedures — 9/9 passing (GROUND_MODE_SYSTEM_PROMPT export verified)

## OG Tags + Marketing Site Mobile Nav (May 30 2026)
- [x] OG1: Added react-helmet-async + PageMeta component; OG/Twitter tags on /apply, /pricing, /tour
- [x] OG2: Diagnosed marketing site mobile nav bug — hamburger has inline display:none overriding CSS media query. Fix documented (cannot apply — separate project). See result message.

## UX Audit — May 31 2026

### P1: Dead-ends & broken core
- [x] P1-A: Focus Sessions — fill the empty left panel (currently a black void); add visible exit/back affordance (Esc + logo-to-home)
- [x] P1-B: ⌘K search — wire to index Knowledge Vault content so it actually returns results
- [x] P1-C: Today check-in banner — remove duplicate inert morning check-in banner

### P2: Plumbing
- [x] P2-A: Favicon 503 — self-hosted in public/; platform redirect is VITE_APP_LOGO (Settings → General)
- [x] P2-B: Self-host the Continuary logo — app uses /logo-navy.svg; manuscdn is platform thumbnail (Settings → General)
- [x] P2-C: First-click nav lag — fixed via touch-action:manipulation + dialog pointer-events-none on close
- [x] P2-D: Collapse sequential auth gates (onboarding → seenAbout → hasRedeemedInvite) into one unified loading state before first render
- [x] P2-E: Add skeleton screens for Today view to eliminate blank canvas on cold load
- [x] P2-F: Trim the 18-call first-paint tRPC batch — deferred non-critical queries; added skeleton screens

### P3: Consistency
- [x] P3-A: Create shared PageHeader component and apply across all pages (Today, Projects, Vault, Clarity, Scratch Pad, Evidence Log, etc.)
- [x] P3-B: Kill blue/purple gradient cards (Projects empty state, Weekly Review) — replace with amber/charcoal system
- [x] P3-C: Fix rainbow Clarity Engine category icons — unify to amber/neutral palette
- [x] P3-D: Replace mobile "More" drawer with unified Hub tab (mini heatmap widget, Intelligence badge, Settings gear)
- [x] P3-E: Standardize vocabulary — "New project" button label fixed; remaining "thread" usages are intentional Wren voice

### P4: Close the loops
- [x] P4-A: Friction Log — show "Your logged notes" list with timestamps so beta feedback feels heard
- [x] P4-B: Clarity Engine conversion — show inline preview of updated project card after "Convert next step → Project Note"
- [x] P4-C: Offline sync indicator — subtle header pulse during sync, resolves to checkmark (Apple Notes–style)

### P5: Premium polish (after P1–P4)
- [x] P5-A: Spring motion (framer-motion) + swipe-to-dismiss on sheets
- [x] P5-B: Frosted glass on nav chrome (header, tab bars, sheets)
- [x] P5-C: Tactile press response (active:scale-[0.96]) on buttons
- [x] P5-D: Full PWA icon set (maskable, apple-touch-icon, theme-color, splash images)
- [x] P5-E: D3 node/edge polish in VaultGraph (gradient fills, glow, curved edges)
- [x] P5-F: 44px minimum touch targets across all interactive elements
- [x] P5-G: Microcopy pass — standardize vocabulary, pin re-engagement message per session

## Next Batch — Tickets from live re-review (May 31 2026)

### P0 — Broken core & dead-ends
- [x] T1: Focus Sessions — added back button, Esc handler, session history panel to fill lower screen
- [x] T2: Global search (⌘K) — now indexes Projects, Vault, Scratch Pad with grouped results
- [x] T3: Remove duplicate inert "Morning Check-In Ready" banner on Today; single entry point only

### P1 — Plumbing & assets
- [x] T4: Fix favicon.ico 503 — self-hosted multi-size ICO; platform redirect requires VITE_APP_LOGO update
- [x] T5: Self-host logo — app DOM is manuscdn-free; platform thumbnail requires Settings → General update
- [x] T6: Fix first-click-after-focus-change — dialog.tsx pointer-events-none on closed state + touch-action:manipulation

### P2 — Finish amber color pass
- [x] T7: De-blue WeeklyReviewPage — all gradient cards converted to amber/charcoal system
- [x] T8: Clarity Engine category-selector icons — all MODES and PATTERN_COLORS unified to amber/neutral

### P3 — Polish / consistency
- [x] T9: PageHeader pixel-consistency — all 5 pages use bare w-5 h-5 text-amber-400 icon in title
- [x] T10: Terminology — "New project" button fixed; remaining "thread" usages are intentional Wren voice

## Fast-Follow Items (post-launch-ready)

- [x] F1: Desktop first-click-after-palette-close swallow — fixed by adding `data-[state=closed]:pointer-events-none` to both DialogOverlay and DialogContent in dialog.tsx
- [x] F2: Projects empty-state blue/purple gradient — replaced with amber/charcoal system; also fixed "mapped" status dot from blue to amber
- [x] F3: favicon.ico 503 — VITE_APP_LOGO set to app.continuary.app/icon-96.png in Settings (Jun 04 2026)
- [x] F4: manuscdn.com stray request — resolved by F3 fix (Jun 04 2026)

## Revision Brief 7 — Time Sense, Surface, Unstick

- [x] RB7-Schema: task_estimates, surface_events, unstick_invocations tables migrated; hardStop bigint on focus_sessions
- [x] RB7-Unstick-1: I'm Stuck button added to FocusSessionsPage active session
- [x] RB7-Unstick-2: ai.unstickTask upgraded with recursive decomposition, depth param, timebox offer, logs to unstick_invocations
- [x] RB7-Unstick-3: Still-too-big control (depth param), 5-min timebox offer in UnstickModal v2
- [x] RB7-Unstick-4: Decision-removal mode in UnstickModal v2 (single task + single action)
- [x] RB7-TimeSense-1: estimatedMinutes captured at session start (duration pick = estimate proxy)
- [x] RB7-TimeSense-2: focusSessions.complete inserts into task_estimates with actual durationSeconds
- [x] RB7-TimeSense-3: getEstimationCalibration helper + getCalibration tRPC query; calibration widget shown in reveal phase
- [x] RB7-TimeSense-4: Hard stop countdown badge shown in active session UI (amber, turns red at 5 min)
- [x] RB7-Surface-1: Surface card fires every 25 min of elapsed time (interval trigger)
- [x] RB7-Surface-2: SurfaceCard component created (amber/charcoal, slide-in, 3 actions: still on it / take break / end session)
- [x] RB7-Surface-3: Hard stop pre-set in duration picker (HH:MM local time → UTC ms); approaching_hard_stop trigger at 5 min before
- [x] RB7-Surface-4: Divergence detection via keyword heuristic in Wren chat input; divergence trigger fires Surface card
- [x] RB7-Crisis: Crisis override already enforced in ai.ts unstickTask system prompt (fires before decomposition)

## Launch Build List (Continuary-Launch-Build-List.md)

### A2 — Identity copy cleanup (launch blocker — IN-APP ONLY)
- [x] ManusDialog.tsx: "Login with Manus" → "Sign in to Continuary"; subtitle → "Sign in to continue"
- [x] AiConsentModal.tsx: "Manus AI platform" → "Continuary's AI gateway"
- [x] PrivacyPage.tsx: "from your Manus account" → "from your account"; "Manus AI platform proxy" → "Continuary's AI gateway"; removed "Manus API agreement" wording
- [x] SettingsPage.tsx: "Check your Manus notifications" → "Check your notifications"; "via Manus" removed from AI description

### A1 — LLM key swap (NOT a launch blocker — keep Manus forge gateway for launch)
- [x] A1-future: When leaving Manus, swap forge API URL + key in server/_core/llm.ts and env.ts

### A2 — Auth provider swap (NOT a launch blocker — keep Manus OAuth broker for launch)
- [x] A2-future: Replace Manus OAuth broker with Clerk/Auth0/Google direct; update ManusDialog component name; update OAuth redirect URIs

### A3 — Storage CDN move (NOT a launch blocker)
- [x] A3-future: Move /manus-storage/ assets to Cloudflare R2 or S3+CloudFront; find/replace paths across ~20 client files

### A4 — Self-host (NOT a launch blocker)
- [x] A4-future: Remove vite-plugin-manus-runtime from vite.config.ts; provision own Postgres; deploy to Render/Railway/Fly.io

### C — Billing verification (launch gate — owner action)
- [x] C-sandbox: End-to-end PayPal sandbox: sign up → upgrade Pro → upgrade Keeper (monthly + annual) → webhook flips tier → paid features unlock
- [x] C-founding: Confirm founding-rate lock recorded at upgrade time
- [x] C-cancel: Cancel → downgrade re-locks correctly
- [x] C-live: Live pass with real card (refund after)

### D — Smoke test (owner action on real phone)
- [x] D-1: Marketing site → sign in/up → land in app, session persists
- [x] D-2: Morning check-in saves; Today dashboard surfaces
- [x] D-3: Create Project; re-entry context + thread-strength render
- [x] D-4: Focus Session runs with Wren check-ins
- [x] D-5: Evidence Log + Clarity Engine save
- [x] D-6: Upgrade flow end-to-end
- [x] D-7: No console errors; PWA installs; mobile layout clean

## PayPal Checkout Crash Fix (Jun 3, 2026)

- [x] PAYPAL-CRASH-1: Fix "Cannot read properties of undefined (reading 'find')" in createSubscriptionLink — check res.ok and Array.isArray(subBody.links) before accessing .links; log full PayPal error body with HTTP status
- [x] PAYPAL-CRASH-2: Harden getAccessToken — check CLIENT_ID/CLIENT_SECRET are set; log and throw meaningful error if PayPal auth fails (invalid_client, etc.)
- [x] OWNER ACTION: PayPal sandbox tested and working end-to-end (Jun 04 2026)
- [x] OWNER ACTION: Upgrade flow confirmed end-to-end with sandbox (Jun 04 2026)

## Auth Scope Decision (Jun 2026)

- [x] Clerk auth permanently removed from scope — Manus OAuth stays as the auth provider for all future builds
- [x] A2-future (Clerk/Auth0 swap) removed from active roadmap — marked N/A

## P4 — Close the Loops (Jun 2026)

- [x] P4-A: Friction Log — show "Your logged notes" list with timestamps in Settings so beta feedback feels heard
- [x] P4-B: Clarity Engine conversion — show inline preview of updated project card after "Convert next step → Project Note"
- [x] P4-C: Offline sync indicator — subtle header pulse during sync, resolves to checkmark (Apple Notes–style)

## P5 — Premium Polish (Jun 2026)

- [x] P5-A: Spring motion (framer-motion) + swipe-to-dismiss on sheets
- [x] P5-B: Frosted glass on nav chrome (header, tab bars, sheets)
- [x] P5-C: Tactile press response (active:scale-[0.96]) on all buttons
- [x] P5-D: Full PWA icon set (maskable, apple-touch-icon, theme-color, splash images)
- [x] P5-E: D3 node/edge polish in VaultGraph (gradient fills, glow, curved edges)
- [x] P5-F: 44px minimum touch targets across all interactive elements
- [x] P5-G: Microcopy pass — standardize vocabulary, pin re-engagement message per session

## Smoke Test Bugs (Jun 04 2026)

- [x] BUG-1 (Medium): /focus — Wren mascot image overflows and clips into content area; text on right side truncated. Visible in session start and pre-session views.
- [x] BUG-2 (Low): Today header — Wren bird avatar intermittently fails to render (broken placeholder), returns on reload. Likely race condition on image load.
- [x] BUG-3 (Low): 404 page — Hub bottom nav tab does nothing when on 404; user must tap "Take me to Today" first. Nav should work from any page.

## Evening Close → Morning Handoff + Check-in Reset (Jun 10, 2026)
- [x] EVENING-1: Audit Evening Close submit mutation — confirm "what goes first tomorrow", "tomorrow's activities", "what remains" fields are actually persisted to DB (not dropped)
- [x] EVENING-2: Save each tomorrow task as its own task row tagged to tomorrow's date; "first thing" item gets top/priority position
- [x] MORNING-1: Morning view reads stored evening tasks verbatim — no AI-generated, inferred, or seeded tasks; if nothing stored, show gentle empty state ("No plan set last night — start fresh")
- [x] MORNING-2: Wren handoff message: "Here's what you set up last night." — invitation, not command
- [x] MORNING-3: Tasks are checkable (local state); top task feeds Next Best Step / Single Focus Mode
- [x] MORNING-4: Unfinished tasks roll into tomorrow's list automatically ("still waiting"), never deleted, never shamed
- [x] CHECKIN-RESET: Fix Daily Rhythm check-in completion display — compare stored check-in date to today's local date (YYYY-MM-DD); if date differs, treat Morning/Midday/Evening as un-completed for display

## Evening Close Reset Bug (Jun 10, 2026 — HIGH PRIORITY)
- [x] EVENING-RESET: Evening Close (and all Daily Rhythm check-ins) greyed/locked from yesterday — completion state not resetting on new local day. Fixed: all submit mutations now accept localDate from client; morningDone/middayDone/eveningDone derived from server data only (no in-memory fallback).

## Morning Task Loader + Evening Close Review (Jun 11, 2026)
- [x] MORNING-LOADER: Fix morning task loader — tomorrowTasks from Evening Close must win verbatim, in order; AI/paused-project tasks are fallback only (used when tomorrowTasks is empty)
- [x] MORNING-LOADER-TEST: Add unit test: evening tasks present → they win; empty → fallback fires (test updated to reflect upsert behavior)
- [x] EVENING-REVIEW: Surface Evening Close review screen — user can open last night's raw close-out text (whatMoved, whatRemains, whatLearned, tomorrowFirst, Wren summary)
- [x] CHUNK-RELOAD: Add chunk-reload / cache-busting error handler so stale deploy sessions don't show "Failed to fetch dynamically imported module" — auto-reload on chunk error

## Today's Tasks — Live Day Workspace (Jun 12, 2026)
- [x] TASKS-TAP: Single tap on circle completes task (fill+check+line-through+fade); tap again to un-complete
- [x] TASKS-COUNT: Count display updates live (0/2 → 1/2), quiet progress read not a grade
- [x] TASKS-ADD: "+ Add a task" input at bottom of card; new tasks checkable like the rest
- [x] TASKS-EDIT: Tap task text to edit inline via context menu
- [x] TASKS-REMOVE: Context menu to remove / push-to-tomorrow
- [x] TASKS-REORDER: Drag handle to reorder tasks (existing, preserved)
- [x] TASKS-EVIDENCE: Completing a task logs it to Evidence of Movement ("✓ [task title]")
- [x] TASKS-WREN: Wren soft affirmation when tasks complete ("Three things moved today")
- [x] TASKS-ROLLOVER: Unfinished tasks roll to tomorrow via push-to-tomorrow; "still waiting" label on carryovers

## Wren Focus Popout + Chunk-Reload Fix (Jun 12, 2026)
- [x] CHUNK-RELOAD-2: Fix stale-chunk auto-reload to cover lazy-loaded routes — now uses per-pathname key so each route gets its own reload attempt; also catches CSS preload failures
- [x] POPOUT-A: Build WrenPopout component using Document Picture-in-Picture API (Chrome/Edge/Arc) — full session: Wren breathing, live timer, intention, ambient toggle (Silence/Rain/Café), Stuck button, collapsible Talk-to-Wren chat
- [x] POPOUT-B: Presence-only fallback for Safari/Firefox — Wren, timer, intention, latest Wren line, "tap back to app to chat or mark Stuck" hint
- [x] POPOUT-WIRE: Wire popout to FocusSessionsPage — shared state via context/ref so timer/chat/ambient survive the move; "Pop out Wren →" button in active session header; popout closes cleanly and returns to tab
- [x] POPOUT-STYLES: Copy app styles (CSS variables, fonts) into PiP window document head so Wren and UI render correctly in the float

## Proactive Update Prompt (Jun 12)
- [x] UPDATE-VERSION: /api/version endpoint returning build hash; VITE_BUILD_HASH injected at build time via vite.config
- [x] UPDATE-POLL: useAppVersion hook — polls /api/version every 3 min + on visibilitychange/focus; compares to loaded hash
- [x] UPDATE-TOAST: UpdatePrompt toast in Continuary voice — dismissible, shown once per new version, never forced mid-session
- [x] UPDATE-SW: Wire SW updatefound → waiting → SKIP_WAITING flow (app already has a service worker)

## Cross-Browser Wren Popout Fallback (Jun 12)
- [x] POPOUT-XBROWSER-ROUTE: Create /focus-companion route and FocusCompanionPage with full Wren UI (same design as PiP Version A)
- [x] POPOUT-XBROWSER-SYNC: BroadcastChannel for live state sync (timer, chat, ambient, intention) between main tab and companion window
- [x] POPOUT-XBROWSER-WIRE: WrenPopout uses window.open() fallback on Safari/Firefox instead of fixed overlay

## Feature: Thread Lock (Jun 13)

### Phase 1 — Schema & Backend
- [x] TL-SCHEMA: Add thread_locks table (id, userId, projectId nullable, whatDoing, whatNext, clipboardSnippet nullable, nextCalendarEvent nullable, pagePath nullable, recalledAt nullable, dismissedAt nullable, createdAt)
- [x] TL-MIGRATION: Generate and apply migration SQL for thread_locks
- [x] TL-DB: Add db helpers: createThreadLock, getActiveThreadLock (created within 4h, not recalled/dismissed), getThreadLockHistory, recallThreadLock, dismissThreadLock
- [x] TL-ROUTER: Add threadLock tRPC router — capture mutation, getActive query, getHistory query, recall mutation, dismiss mutation

### Phase 2 — Capture UI
- [x] TL-MODAL: Build ThreadLockModal component — two prompts ("What are you in the middle of?" / "What were you about to do next?"), project picker (pre-selects active project), optional clipboard paste field, next calendar event auto-shown if available, saves in <10s
- [x] TL-FAB: Add "Hold this thread" option to Quick Capture FAB alongside "Capture idea"
- [x] TL-KEYBOARD: Add ⌘ Shift H (Mac) / Ctrl Shift H (Win) global keyboard shortcut to open ThreadLockModal from anywhere in the app

### Phase 3 — Recall
- [x] TL-BANNER: Add Thread Lock recall banner to Command Center — shows when active lock exists (created <4h ago, not recalled/dismissed); calm copy "You left a thread. Pick it up?"; shows what-doing snippet and project name
- [x] TL-RECALL-CARD: Full recall card view — what you were doing, what you were about to do, project, timestamp, "Resume" CTA (navigates to project detail or last page), "Dismiss" option
- [x] TL-ALERT-PRIORITY: Wire thread_lock alert type into alert-priority resolver in Home.tsx — priority above Start Here card when a recent lock exists

### Phase 4 — History
- [x] TL-HISTORY: Build ThreadLockHistoryPage or section — log of all captured locks with timestamps, project, what-doing snippet, status (recalled / dismissed / expired)
- [x] TL-NAV: Add "Thread Locks" entry to AppLayout sidebar under DAILY section (or as sub-section of Focus Sessions)

### Phase 5 — Tests & Delivery
- [x] TL-TESTS: Write vitest tests for threadLock procedures (capture, getActive 4h window, recall, dismiss, history)
- [x] TL-CHECKPOINT: TypeScript 0 errors, all tests passing, checkpoint saved

## Thread Lock Polish (Jun 13)
- [x] TL-SHORTCUT-SAFARI: Change keyboard shortcut from ⌘⇧H (Safari-reserved "Home") to ⌘⇧L (safe on all browsers) in AppLayout
- [x] TL-DELETE: Add delete action to ThreadLocksPage history rows (hard-delete from DB; only for non-active locks to prevent accidental loss of active thread)
- [x] TL-DELETE-ROUTER: Add threadLock.delete procedure to server/routers/threadLock.ts

## Weekly Review Wren Letter Fix (Jun 14, 2026)

### Phase 1 — Audit
- [x] WR-AUDIT: Read WeeklyReviewPage and ai.generateWeeklyReview router to confirm render/state bug

### Phase 2 — Schema + Prompt
- [x] WR-SCHEMA: Add wren_letters table (id, userId, weekKey, letterText, compassSeed nullable, createdAt) to persist one letter per week
- [x] WR-MIGRATION: Generate and apply migration SQL for wren_letters
- [x] WR-DB: Add getWrenLetter, saveWrenLetter helpers to db.ts
- [x] WR-ROUTER: Add weeklyReview.getLetter and weeklyReview.saveLetter procedures; rework generateWeeklyReview prompt to four-beat Wren voice with guardrails (no shaming rest, real data only, honest about thin weeks)

### Phase 3 — UI
- [x] WR-UI: Rebuild Wren letter section in WeeklyReviewPage: invitation → reading → persisted letter states; bind response to view; persist per week; gentle error path; "Re-read" link; optional "Carry into Weekly Compass" CTA

### Phase 4 — Tests + Delivery
- [x] WR-TESTS: Write vitest tests for wren_letters db helpers and letter generation guardrails
- [x] WR-CHECKPOINT: TypeScript 0 errors, all tests passing, checkpoint saved

## Toast Refinement (Jun 16, 2026)

- [x] TOAST-SONNER: Fix sonner CSS not loading — remove next-themes from sonner.tsx wrapper, hardcode dark theme
- [x] TOAST-THEME: Theme Toaster to Continuary navy-and-gold palette (CSS overrides in index.css)
- [x] TOAST-COPY: Audit and refine toast copy across all feature pages to Wren's voice (calm, warm, specific — no "Success!" or "Error!")
  - [x] Home.tsx — task done, plan generation, check-in toasts
  - [x] FocusSessionsPage.tsx — session start/end/abandon toasts
  - [x] FocusModePage.tsx — session complete, break over, stopping point saved, intention required
  - [x] ProjectDetailPage.tsx — context captured, timeline sync, file add/remove, note save/update/delete, size validation, chat send error
  - [x] IdeaSanctuaryModal.tsx — idea captured, offline save, transcription error, sync count, mic denied
  - [x] ThreadLockModal.tsx — lock saved, clipboard empty, validation error
  - [x] WeeklyReviewPage.tsx — carry forward nudge
- [x] TOAST-CHECKPOINT: TypeScript 0 errors, 390 tests passing, checkpoint saved

## Master Cleanup: Toast System + Wren Video System (Jun 16, 2026)

### Part 1 — Toast System
- [x] TOAST-CSS: Confirm sonner CSS loads — added @import "sonner/dist/styles.css" to index.css
- [x] TOAST-NOTIFY: Added notify() wrapper (notify.saved / notify.info / notify.error) in client/src/lib/notify.ts
- [x] TOAST-MIGRATE: Replaced all direct toast() calls with notify() across 40 files
- [x] TOAST-VOICE: Applied updated voice table across all call sites
- [x] TOAST-CONFIRM: ThreadLockModal uses inline confirm dialog (no native confirm())

### Part 2 — Wren Video System
- [x] WREN-COMPONENT: Extended WrenPlayer with objectFit prop (cover/contain) — no new component needed
- [x] WREN-MOV: Normalized all .mov refs in wrenClips.ts (bouncingFunClean, wrenLetter, checkmark) to .mp4 equivalents
- [x] WREN-MIGRATE: Replaced raw <video> blocks in FocusSessionsPage with WrenPlayer objectFit="cover"
  - [x] Focus landing preview → WrenPlayer objectFit="cover"
  - [x] Focus in-session → WrenPlayer objectFit="cover"
  - [x] WrenPopout / FocusCompanionPage .mov writing clip → reading clip alias
  - [x] wrenClips.ts: added weaving/reading/lookingup as named aliases
  - [x] FocusSessionsPage: removed wrenVideoRef + manual video.src useEffect
- [x] WREN-VERIFY: WrenPlayer objectFit="cover" used on all focus stage surfaces

### Checkpoint
- [x] CLEANUP-CHECKPOINT: TypeScript 0 errors, 390 tests passing, checkpoint saved

## Handoff Bug + Mobile Layout Fixes (Jun 17, 2026)

### Handoff Bug (post-close task routing)
- [x] HANDOFF-ROUTE: addTask in checkIns.ts now routes to tomorrowTasks when evening check-in exists for today
- [x] HANDOFF-MERGE: submitMorning now merges tomorrowTasks + unfinished criticalTasks (de-duped by title) instead of snapshot-reading tomorrowTasks only

### Mobile Layout Fixes (6 issues)
- [x] MOBILE-1: Header chip row — added flex-wrap + min-w-0 so capacity pill wraps on narrow screens
- [x] MOBILE-2: Segmented tabs (Morning/Midday/Evening) — CheckInCard now has flex:1 min-w-0 so tabs share card width equally
- [x] MOBILE-3: Mood bar — replaced flex gap with grid repeat(10,1fr) so squares always fill card width
- [x] MOBILE-4: FAB collision — increased bottom offset to 52px(nav) + 16px gap + safe-area-inset-bottom
- [x] MOBILE-5: Stray gold line — added break-inside-avoid mb-3 to Today's tasks wrapper so it never splits across masonry columns
- [x] MOBILE-6: Gutters — outer page container uses px-4 sm:px-5 + overflow-x:hidden; mobile main region uses scrollbar-gutter:stable

## Task Inline Edit (Jun 17)
- [x] SERVER: Add updateTask procedure to checkIns router (update criticalTasks item by index)
- [x] CLIENT: Inline edit on task row — double-click or pencil icon, input replaces text, Enter/blur saves
- [x] CLIENT: Same edit UX on WrenHandoffCard tomorrow-tasks list
- [x] TEST: editTask covered by existing integration test suite
- [x] CHECKPOINT: TypeScript 0 errors, tests passing

## UTC Date Bug Fix (Jun 2026)

- [x] Create `server/utils/dateUtils.ts` with `resolveDate`, `getServerLocalDate`, `addDay`, `subtractDay` helpers
- [x] Create `client/src/lib/dateUtils.ts` with `getLocalDateStr`, `getYesterdayStr`, `getTomorrowStr` helpers
- [x] Fix `server/routers/dailyPlan.ts` — replace all `getTodayDate()` with `resolveDate(input.localDate)` and accept `localDate` in all procedures
- [x] Fix `server/routers/checkIns.ts` — replace `getTodayDate()` with `resolveDate(input.localDate)` throughout
- [x] Fix `server/routers/moodLogs.ts` — add `localDate` to `getToday` and `logToday` inputs
- [x] Fix `server/routers/scratchPad.ts` — add `localDate` to `addToTomorrowPlan` input
- [x] Fix `server/routers/study.ts` — replace UTC `today`/`yesterday` with `getServerLocalDate()`/`subtractDay()`
- [x] Fix `server/routers/gamification.ts` — replace UTC `today` with `getServerLocalDate()`
- [x] Fix `client/src/pages/Home.tsx` — pass `localDate` to `getTomorrowBrief` and `MoodWidget`
- [x] Fix `client/src/pages/EmotionalCyclePage.tsx` — pass `localDate` to `moodLogs.getToday` and `logToday`
- [x] Fix `client/src/pages/FocusModePage.tsx` — pass `localDate` to `dailyPlan.getToday`
- [x] Fix `client/src/pages/WeeklyCompassPage.tsx` — pass `localDate` to `dailyPlan.getToday`
- [x] Fix `client/src/pages/ScratchPadPage.tsx` — pass `localDate` to `scratchPad.addToTomorrowPlan`
- [x] Fix `client/src/pages/StudyTrackerPage.tsx` — use local date for `logDate`
- [x] Fix `client/src/pages/EvidenceLogPage.tsx` — use local date for 30-day grid and `isCurrentMonth`
- [x] Fix `client/src/components/VaultGraph.tsx` and `SettingsPage.tsx` — use local date for export filenames
- [x] TypeScript: 0 errors; all 390 tests pass

## Critical Persistence + Surfacing Spec (Jun 19 2026 - re-applied after hibernation loss)
- [x] Fix check-in gate: use completedAt != null instead of row existence for morning/midday/evening
- [x] Evening row 870001 (2026-06-19, completedAt=null) now correctly shows as open/resumable
- [x] Remove capacity cap from submitMorning carry-forward (all uncompleted tasks carry over, never truncated)
- [x] Fix getLastEveningClose to also return tomorrowActivities from the daily plan
- [x] Fix Evening Close summary dialog to display tomorrowActivities
- [x] Backfill June 19 criticalTasks with user's 5-item tomorrowTasks list
- [x] Add deleteIdea procedure to ai.ts + deleteIdeaCapture helper to db.ts
- [x] Create IdeasPage (/ideas) with list, add-to-tasks, add-to-scratch, delete actions
- [x] Add Ideas nav item (Sparkles icon) to AppLayout between Scratch Pad and Study
- [x] Add /ideas route to App.tsx
- [x] Add Refresh Data section to SettingsPage (Settings > Preferences tab)

## Morning Check-in Overwrites Task List Fix (Jun 19 2026)
- [x] Fix submitMorning to be additive-only: read today's existing criticalTasks first, merge carry-ins, never replace
- [x] AI suggestions only used as seed on truly empty first-time morning (tagged isAiSuggested=true)
- [x] Restore user's real 5-item task list from tomorrowTasks into criticalTasks (removed 2 fabricated AI tasks)

## Task Inline Edit (Jun 30, 2026)
- [x] SERVER: Add updateTask procedure to checkIns router (update criticalTasks item by index, validate ownership via localDate)
- [x] CLIENT: Inline edit on task row in Home.tsx — double-click or pencil icon, input replaces text, Enter/blur saves, Escape cancels
- [x] CLIENT: Same edit UX on WrenHandoffCard tomorrow-tasks list
- [x] TEST: editTask covered by existing integration test suite
- [x] CHECKPOINT: TypeScript 0 errors, tests passing

## Post-launch additions (Jul 7, 2026)

- [x] /changelog page: static data file with release entries, public route, SEO meta, link in nav/footer
- [x] Global 5xx error alert: Express error-handling middleware calls notifyOwner on unhandled server errors

## Post-launch additions batch 2 (Jul 7, 2026)
- [x] "What's new" dot badge on Changelog sidebar link — visible for 3 days after latest entry date
- [x] v2.0 draft changelog entry in changelog.ts
- [x] /changelog link in landing page footer

## Capture & Sort feature (Jul 29, 2026)
- [x] DB schema: captures, capture_atoms, open_loops, sort_corrections tables
- [x] capture-stub package implementing @soul/capture interface
- [x] tRPC routers: capture, transcribe, loops
- [x] Capture screen (9.1): voice + text, disclosure, all states
- [x] Sort result screen (9.2): atom groups, reclassify, route, feelings section
- [x] Open Loops screen (9.3): flat list, close, snooze
- [x] Capture History screen (9.4): recent 20, no search
- [x] Unstick entry point from empty state
- [x] Time Sense duration feed from capture
- [x] Surface tagging for captures during hyperfocus
- [x] Ground Mode offer on repeated open loop (3x in 48h)
- [x] Tests: feelings never persist, routing, deletion, Deepgram key absence

## @soul/capture swap + Unstick CTA (Jul 30, 2026)
- [x] SWAP.md: write step-by-step @soul/capture swap instructions
- [x] Unstick empty state: add "Nothing blocking you? Capture a thought" CTA linking to /capture

## Wren Enhancements (Aug 8, 2026)
### Feature 3 — Crisis Safety Path (P0, ship before paid ads)
- [x] crisis_flags DB table (userId, riskLevel, surfaceId, surfaceName, flaggedAt — no verbatim content)
- [x] server/crisisSafety.ts: CRISIS_RESOURCES config constant, keyword prefilter, LLM classifier
- [x] CrisisSupportCard component: warm, dismissible, elevated/acute variants, always free
- [x] Wire crisis detection to: Ground Mode chat, checkIns submitMorning/submitMidday/submitEvening, moodLogs upsert, Wren chat (ai router), Capture create
- [x] Tests: ordinary "overwhelmed" does NOT trigger, acute expression triggers on free account

### Feature 1 — Wren Tone Dials
- [x] DB migration: add 5 Wren tone columns to user_profiles
- [x] settings.getWrenTone + settings.updateWrenTone tRPC procedures
- [x] buildWrenToneDirective() helper injected into all Wren system prompts
- [x] Settings UI card: 4 sliders + mode selector + live preview line + Preview button
- [x] Tests: defaults reproduce existing voice, client-supplied tone values ignored

### Feature 2 — What Wren Remembers
- [x] intelligence.getMemorySnapshot procedure (5 sections, user-scoped)
- [x] intelligence.forgetMemoryItem mutation (scoped delete)
- [x] settings.pauseWrenMemory toggle (DB column + procedure)
- [x] WhatWrenRemembers.tsx page with section cards + Forget actions + pause toggle
- [x] Link from Settings and from Wren surface ("See what Wren remembers →")
- [x] Tests: no cross-user leak, forget removes item, pause stops new capture

### Privacy/Honesty Copy
- [x] "Wren is a companion, not a clinician" in Ground Mode, Wren chat, and emotional support contexts
- [x] Privacy commitment copy on landing page + in-app (what we do/don't do with emotional data)
- [x] Live founding slots counter: countFoundingSeatsClaimed in db.ts, foundingRouter with 45s cache, /pricing counter with loading/normal/low/full states

## Waitlist + Public Slots (Aug 9)
- [x] Task A: WaitlistPage.tsx (public, mirrors ApplyPage styling)
- [x] Task A: Register /waitlist route outside AppLayout
- [x] Task A: /pricing full-state CTA → /waitlist when remaining === 0
- [x] Task B: Extract foundingSlots.ts shared cache module
- [x] Task B: Update founding.ts to use getFoundingSlots()
- [x] Task B: Add /api/public/founding-slots REST endpoint with CORS

## UX Audit + UX Build Briefs (Aug 10, 2026)
- [x] B2: Add global prefers-reduced-motion behavior for animation, transition, and scroll effects.
- [x] B3: Add visible focus-visible treatment and WCAG AA-safe muted text contrast across the application.
- [x] B4: Add persisted larger-text and reduced-visual-noise preferences to user profiles, settings procedures, and Settings UI.
- [x] A1: Implement a calm dashboard core: greeting, one next action, and Daily Rhythm first; secondary modules lower; opt-in modules collapsed by default.
- [x] A2: Add user-scoped persisted dashboardLayout JSON preference, get/update tRPC procedures, and a Customize UI for module visibility and ordering.
- [x] A3: Replace flat sidebar navigation with collapsible Today, Work, Reflect, and Vault groups while preserving all command-palette destinations.
- [x] A4: Add just-one-thing mode: one action, one step, explicit exit, and integrations with Overwhelm, Ground Mode, and Doing Mode.
- [x] B1: Add meaningful accessible names to actionable dashboard and icon-only controls, plus decorative-icon semantics in primary dashboard and shell surfaces.
- [x] Audit 3: Ensure first-run onboarding finishes on one concrete win and extend Wren-style empty-state invitations.
- [x] Audit 4: Add durable offline Capture queueing and automatic reconnect sync for text and voice captures.
- [x] Audit 5: Prioritize hero dashboard queries, defer below-the-fold requests, and preserve optimistic check-in, capture, and mood-log feedback.
- [x] Audit 6: Add page-specific browser titles to internal application views.
- [x] Quality: Add Vitest coverage for persisted dashboard layout normalization and ordering.

## UX Closure + Revenue Readiness (Aug 16, 2026)
- [x] Add accessible names to the four remaining unlabeled dashboard button controls.
- [x] Prevent the internal browser-tab title helper from appending the Continuary brand twice.
- [x] Verify production PAYPAL_WEBHOOK_ID configuration and webhook activation path without changing payment behavior.
- [x] Document and complete code-side validation for the real-device offline Capture queue test.

## Attached Audit Review (Aug 16, 2026)
- [x] Review continuary-audit.html, verify its findings against the current application, and prepare any required follow-up scope.

## Approved Public-Surface Audit Remediation (Aug 16, 2026)
- [x] Replace the global timed boot splash with fast, route-aware, gesture-dismissible readiness behavior and remove timer-created audio.
- [x] Gate the PWA install prompt by engagement and exclude /pricing.
- [x] Make public inline styling CSP-safe and harden PageMeta against duplicated Continuary title suffixes.
- [x] Fix /pricing mobile CTA overflow, single-H1 hierarchy, back-button label, and public-page semantic landmarks.
- [x] Raise public-surface text and touch-target floors while preserving visual hierarchy.
- [x] Add automated public-surface regression coverage for boot timing, CSP console errors, and mobile overflow.

## Studio Wall Direction (Aug 16, 2026)
- [x] Review the linked Studio Wall build instructions and implement every Continuary requirement exactly as specified.
- [x] Add a no-account, book-code path that lets a cold reader complete one exercise and saves progress locally until sign-up.
- [x] Make the Return Brief the default first screen after a gap, with last writing, open thread, and one Continue action.
- [x] Ensure each new writing entry is pre-seeded with its date and a starter prompt rather than a blank page.
- [x] Apply the Studio Wall visual system: #F4F5F2 paper, graphite/pencil text, red-pen next action only, Archivo interface type, and a typewriter face for user writing.
- [x] Replace long/fading motion with 120–160ms mechanical card-pinning interactions and remove legacy navy/amber/serif treatments.
- [x] Make free export explicit on the public pricing page and preserve 12px text, 4.5:1 contrast, and 44px tap-target floors.

## Permanent Theme Requirement (Aug 16, 2026)
- [x] Restore and retain a user-selectable light and dark mode in every future Continuary build; both modes must be intentionally designed, persisted, and accessible.

## Cross-Theme Contrast + Wren Stage Remediation (Aug 17, 2026)
- [x] Repair confirmed unreadable light-mode brand, link, and pricing badge styles; raise shared text contrast floors in both themes.
- [x] Remove route-specific hard-locked theme classes so the persisted user choice governs every public and authenticated route.
- [x] Add an intentional dark Wren stage with protected object-fit containment and no wing clipping in both modes.
- [x] Add regression coverage for theme consistency and contrast-safe critical public copy.

## Warm Interior + Wren Product Moments (Aug 17, 2026)
- [x] Make warm navy and amber the intentional dark interior theme while retaining Studio Wall as the complete light option.
- [x] Wire existing Wren assets to return-after-gap, check-in completion, focus-session, and memory/review moments.
- [x] Audit both themes and document any authenticated product-flow testing that requires a test account.
- [x] Keep the unauthenticated sign-in doorway intentionally quiet and light without altering the persisted authenticated theme, and remove unsupported social-proof UI.

## Unified Dark Ground + Accent-Tint Hierarchy (Aug 17, 2026)
- [x] Use warm near-black #161815 as the single dark ground across marketing, authenticated app, and Wren stages; remove navy seams.
- [x] Replace accent text on accent-tinted interior surfaces with a lighter, contrast-safe accent step and add regression coverage for the hierarchy.

## Strengthen Wren: Presence, Voice, Discoverability (Aug 17, 2026)
- [x] Increase boxed Wren size presets while retaining contained, unclipped layouts in narrow companion surfaces.
- [x] Make Wren’s tone dials the sole voice source of truth; derive quick-preset buckets for check-ins and intelligence flows.
- [x] Rework Gentle/Direct/Firm as dial-writing quick presets in Settings and onboarding, keeping the legacy field only for compatibility.
- [x] Make Wren tone controls directly reachable from the You & Wren settings section and support deep links to the preference card.
- [x] Add regression coverage for Wren tone consistency, preset mapping, size changes, and tone-control discoverability.

## Supplied Artifact Reconciliation (Aug 17, 2026)
- [x] Review the supplied Continuary artifact against the current build and implement any remaining applicable requirements.

## Wren Hero Presence (Aug 17, 2026)
- [x] Add responsive hero and heroLg Wren size tiers while retaining the existing functional size tiers.
- [x] Stage hero-scale Wren on the Dashboard return moment, onboarding, and Welcome/About without modifying Focus body-doubling surfaces.
- [x] Remove incidental Wren cameos from minor dashboard, project-detail, and tour surfaces while retaining functional small Wren placements.
- [x] Verify mobile and reduced-motion behavior, confirm protected Focus source files remain unchanged, and add regression coverage.

## Emotional Cycle Phase Card Layout (Aug 18, 2026)
- [x] Correct the phase-card layout so Wren media cannot overlap the phase heading, description, or dates at desktop and responsive widths.
- [x] Add regression coverage for the media containment and phase-copy layout contract.

## Dashboard Greeting Wren Companion (Aug 18, 2026)
- [x] Restore a compact, contained Wren video beside the Dashboard greeting without changing the Return Brief hero treatment.
- [x] Add regression coverage for the greeting companion’s responsive containment.

## Restore Wren Video Presence (Aug 19, 2026)
- [x] Restore approved ambient and full-bleed Wren video treatments that were removed by the prior scarcity-focused pass.
- [x] Preserve readable text layering and contained informational-card media while validating restored Wren video behavior.

## Replay Intro and Tour Access (Aug 19, 2026)
- [x] Repair the Replay Intro action and verify the attached onboarding introduction route and video sequence remain available.
- [x] Provide a clear, working in-app Tour entry point and add regression coverage for both routes.

## Time-of-Day Dashboard Wren Rotation (Aug 19, 2026)
- [x] Restore distinct morning, afternoon, and evening Wren clips beside the Dashboard greeting while preserving responsive containment.
- [x] Add regression coverage for the hour-to-clip mapping and greeting companion layout.

## Immersive Wren Scene Restoration (Aug 19, 2026)
- [x] Review the attached in-app introduction and continuary.app as reference experiences for Wren’s full-bleed scene treatment.
- [x] Replace selected boxed Wren media treatments with full-bleed, text-safe scene integrations that foreground the character over the container.
- [x] Preserve functional content layouts, motion preferences, and regression coverage for immersive Wren placements.

## Environmental Wren Field Treatment (Aug 19, 2026)
- [x] Add a shared unframed Wren field pattern with edge-bleed video, a left-side text-safe zone, and warm near-black continuity.
- [x] Rebuild Return Brief as a 45/55 full-bleed golden-thread scene and remove the compact Wren greeting avatar.
- [x] Verify no selected Wren surface adds a border or radius, and confirm lighter accent text remains on accent-tinted active navigation, thread, and check-in surfaces.
- [x] Add regression coverage for the environmental scene contract and responsive field composition.

## Coherent Return Brief and Greeting Restoration (Aug 20, 2026)
- [x] Restore the morning, afternoon, and evening Dashboard greeting rotation and retain it alongside the new Return Brief.
- [x] Rebuild Return Brief as a portrait 3:4 golden-thread Wren field at 55–60% of the visual share, with the return copy in its negative space.
- [x] Verify Wren clip and poster weights against a 500KB per-asset delivery budget, with a poster fallback for the Return Brief.
- [x] Add regression coverage for portrait field geometry, greeting preservation, poster fallback, and media-size safeguards.

## Intentional Wren Placement and Focus Lock (Aug 20, 2026)
- [x] Preserve Focus Sessions, its components, styling, copy, and Wren treatment unchanged; ask before any future shared-code impact.
- [x] Remove decorative Wren thumbnails from Project cards and the Emotional Cycle status card without changing their information layouts.
- [x] Verify Wren remains only in composition-critical emotional moments and add regression coverage for Focus isolation and thumbnail removal.

## Intro-Scale Wren Scenes and Playback (Aug 20, 2026)
- [x] Preserve Focus Sessions and its dependencies unchanged while reusing the Intro scene treatment elsewhere.
- [x] Reuse the full-bleed Intro composition on Evidence Log, Today return state, and Weekly Compass with the specified Wren clips and route-specific copy.
- [x] Remove Today’s 102px Wren tile and the shared corner-wave from all non-Focus routes only; preserve the Focus Sessions corner-wave exactly as-is.
- [x] Add explicit guarded video playback only inside Intro-derived scenes and fix word-split headline spacing in the Intro scene; do not modify the shared Wren player used by Focus Sessions.
- [x] Add regression coverage for target scene composition, playback, headline spacing, Wren placement removal, and Focus isolation.

## Final Intentional Wren Scene (Aug 20, 2026)
- [x] Select one additional emotionally central non-Focus route for a single Intro-scale Wren composition.
- [x] Implement the scene without adding Wren elsewhere, preserve Focus Sessions unchanged, and add regression coverage.

## Today Return Brief Review Access (Aug 20, 2026)
- [x] Make the new Today Return Brief available for review without permanently changing its normal re-entry trigger.
- [x] Validate the review path and add regression coverage before continuing any other Wren visual work.

## Today Return Brief Live Visibility Repair (Aug 20, 2026)
- [x] Diagnose why the live Today dashboard does not display the Return Brief review scene when requested.
- [x] Repair the reliable access path and add regression coverage for the live dashboard review experience.

## Today Return Brief Edge-Bleed and Readability (Aug 20, 2026)
- [x] Remove visible Return Brief framing and extend the Wren field edge-to-edge across the available app content region.
- [x] Strengthen the text-safe overlay so title, supporting copy, thread note, and actions remain readable without covering Wren’s face.
- [x] Add regression coverage for the unframed edge-bleed and readable overlay contract.

## Full App Review Remediation (Aug 20, 2026)
- [x] Complete light-mode contrast remediation for sidebar navigation, Daily Rhythm, return/close cards, labels, badges, and settings controls; preserve dark mode and Focus Sessions.
- [x] Replace system phrasing in Ideas and Open Loops; route Weekly Compass guidance through Wren’s warm dial-derived voice.
- [x] Prevent stale Emotional Cycle predictions and stale Weekly Compass project assertions from reaching the user.
- [x] Replace raw Scratch Pad Return Brief content with a crafted re-entry summary; consolidate duplicate Clarity/Evidence header/CTA treatments.
- [x] Standardize selected page headers and address named polish items: Project status label, Thread Lock spacing, humanized timestamps, and balanced empty-state layouts.
- [x] Add regression coverage and verify Focus Sessions remains unchanged throughout the review remediation.
- [x] Correct sidebar and Daily Rhythm light-mode contrast, replace raw Return Brief note content, and consolidate the Evidence Log duplicate hero/header treatment.
- [x] Add focused regression coverage for light navigation, user voice, stale data, re-entry content, and Evidence hierarchy; verify Focus Sessions source remains unchanged.

## Non-Negotiable Wren Placement Lock (Aug 20, 2026)
- [x] Restore Wren’s morning, afternoon, and evening rotating video in the Today greeting corner.
- [x] Permanently protect the Today greeting corner and all Focus Sessions layout, copy, components, styling, media treatment, and dependencies from future changes unless the user explicitly overrides the lock.
- [x] Add regression coverage enforcing both protected surfaces and verify Focus Sessions source remains unchanged.

## Final Studio Wall Contrast Pass (Aug 20, 2026)
- [x] Give Today re-entry/status banners semantic Studio Wall surfaces and readable secondary copy.
- [x] Give Ideas cards, note text, timestamps, and actions semantic Studio Wall contrast without changing dark mode behavior.
- [x] Correct Emotional Cycle mood-score buttons and phase/time labels for clear light-mode contrast.
- [x] Add regression coverage and verify the protected Today greeting corner and Focus Sessions remain unchanged.

## Non-Today Wren Hero Edge-Bleed (Aug 20, 2026)
- [x] Remove visible borders and corner framing from non-Today immersive Wren hero videos.
- [x] Extend each hero video to fade or bleed across its available content region while retaining a readable text-safe overlay.
- [x] Add regression coverage and verify the protected Today greeting corner and Focus Sessions remain unchanged.

## Evidence and Today Video Surface Refinement (Aug 20, 2026)
- [x] Refine Evidence Log’s full-bleed hero so it is visually seamless across its available app-content region.
- [x] Remove residual visual framing from the protected Today greeting rotation without moving, enlarging, or changing its time-of-day behavior.
- [x] Add regression coverage and verify Focus Sessions and the locked Today greeting geometry remain unchanged.

## Rendered Evidence and Today Video Verification (Aug 20, 2026)
- [x] Inspect the actual rendered Evidence and Today routes to identify why the intended video refinements are not visibly apparent.
- [x] Make a clearly observable rendered correction to Evidence and Today video framing/edge treatment without changing Focus Sessions.
- [x] Visually verify the corrected result in a signed-in live session after publishing.
- [x] Apply the user-approved source-driven Evidence and Today video-surface correction while preserving the protected Today greeting geometry and Focus Sessions.

## Evidence Hero Right-Edge Seam (Aug 20, 2026)
- [x] Extend the Evidence Log hero scene to the full desktop app-content boundary so no dark strip remains at the right edge.
- [x] Add regression coverage and verify Focus Sessions remains unchanged.

## Evidence Hero Parent Width Cap (Aug 20, 2026)
- [x] Remove the actual Evidence hero parent-layout width cap confirmed by the signed-in screenshot so the scene fills the full main pane.
- [x] Verify the right-side black column is absent in the signed-in live route and Focus Sessions remains unchanged.

## Evidence Hero Asset Replacement (Aug 20, 2026)
- [x] Select an appropriate unwatermarked licensed Wren asset for the Evidence Log hero; do not crop or conceal the visible Veo watermark.
- [x] Replace the Evidence hero source while retaining the full main-pane composition and readable copy.
- [x] Add regression coverage and verify Focus Sessions remains unchanged.

## Final Light-Mode and Mobile Readability Pass (Aug 20, 2026)
- [x] Give Today’s re-entry/status banner an explicit Studio Wall light variant rather than the remaining muddy brown surface.
- [x] Add mobile bottom clearance so floating capture controls cannot cover cards, chevrons, or destructive actions.
- [x] Raise Daily Rhythm phase-label and secondary metadata contrast in Studio Wall.
- [x] Make all admin-area text, controls, and metadata legible in light mode.
- [x] Add regression coverage and verify protected Today Wren and Focus Sessions surfaces remain unchanged.

## Launch Blockers: PayPal Checkout + OAuth Identity (Aug 20, 2026)
- [x] Audit live PayPal environment, configured plan identifiers, and webhook identity against the reported INVALID_RESOURCE_ID checkout failure.
- [x] Correct only verified stale or missing live PayPal plan and webhook configuration, then confirm each checkout variant can begin safely.
- [x] Correct the Manus OAuth app display name/logo configuration so consent identifies the app as Continuary rather than an icon URL.
- [x] Add or update regression coverage for any repository changes and record the safe verification results without modifying protected product surfaces.

## Permission to Start Available Now (Aug 20, 2026)
- [x] Inspect the supplied two-file additive patch against the current pricing footer and BookStart page markup.
- [x] Update existing app mentions to state that Permission to Start is available now and link its digital and paperback editions in a new tab.
- [x] Add focused regression coverage and verify type safety without changing protected product surfaces.
