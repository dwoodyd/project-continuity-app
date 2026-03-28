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
