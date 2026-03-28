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
