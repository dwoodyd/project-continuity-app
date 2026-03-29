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
