/**
 * Wren video and image asset registry.
 * All URLs are served from the Manus CDN — no local paths.
 * Use mix-blend-mode: screen on all video elements to remove black backgrounds.
 */

const BASE = "https://static-assets.manus.space";

export const WREN_CLIPS = {
  // ── Onboarding ──────────────────────────────────────────────────────────────
  /** Wren drops from above and hovers — cinematic intro */
  dropsAndHovers:   `${BASE}/wren_drops_and_hovers_bf49b21a.mp4`,
  /** Wren peeking from the edge of the screen — name input background */
  peeking:          `${BASE}/wren_peeking_f4ff53e7.mp4`,
  /** Wren winks with a jiggly ripple — tone interstitial reaction */
  winksRipple:      `${BASE}/wren_winks_ripple_3db8b54c.mp4`,
  /** Wren closes eyes in concentration — tone selection / thoughtful */
  closesEyes:       `${BASE}/wren_closes_eyes_cae13804.mp4`,
  /** Wren hovers with energy thread — focus hours step */
  hoversThread:     `${BASE}/wren_hovers_thread_5b70ca6e.mp4`,
  /** Wren perched on a digital document — project setup step */
  perchedDoc:       `${BASE}/wren_perched_doc_5eaa0b45.mp4`,
  /** Wren flies at camera for a hug — done/celebration screen */
  fliesHug:         `${BASE}/wren_flies_hug_1a72230a.mp4`,

  // ── Home & Dashboard ────────────────────────────────────────────────────────
  /** Wren's main corner wave — ambient home dashboard widget */
  mainCornerWave:   `${BASE}/wren_main_corner_wave_f8dd5fe0.mp4`,
  /** Wren corner wave (alternate) */
  cornerWave:       `${BASE}/wren_corner_wave_2bfde996.mp4`,
  /** Wren taps screen and points down — CTA/prompt widget */
  tapsPointsDown:   `${BASE}/wren_taps_points_down_3f5ff731.mp4`,
  /** Wren hits the screen — attention-grabbing nudge */
  hitsScreen:       `${BASE}/wren_hits_screen_e4cc8e0a.mp4`,
  /** Wren wipes screen, points, and dances — onboarding complete / feature tour */
  wipesDances:      `${BASE}/wren_wipes_dances_acba44e6.mp4`,

  // ── Check-ins ───────────────────────────────────────────────────────────────
  /** Wren pops head and wings — morning check-in greeting */
  popsHead:         `${BASE}/wren_pops_head_0f490e05.mp4`,
  /** Wren winking — playful acknowledgment */
  winking:          `${BASE}/wren_winking_3535a4dc.mp4`,
  /** Wren winking (alternate take) */
  winking2:         `${BASE}/wren_winking_2_62d255a4.mp4`,
  /** Wren kissing screen — affectionate farewell / evening check-in done */
  kissingScreen:    `${BASE}/wren_kissing_screen_8669f336.mp4`,

  // ── Celebrations & Milestones ───────────────────────────────────────────────
  /** Wren does bouncy cartwheels — streak milestone */
  cartwheels:       `${BASE}/wren_cartwheels_1f54a92e.mp4`,
  /** Wren happy split in two — big milestone / level up */
  happySplit:       `${BASE}/wren_happy_split_5cf217c0.mp4`,
  /** Wren bouncing having fun — emotional cycle high period */
  bouncingFun:      `${BASE}/wren_bouncing_fun_b8895f2b.mp4`,
  /** Wren morphs into golden heart — love/appreciation moment */
  morphsHeart:      `${BASE}/wren_morphs_heart_7b7f7724.mp4`,
  /** Wren turns into heart (alternate) */
  turnsHeart:       `${BASE}/wren_turns_heart_86a442c2.mp4`,
  /** Wren checkmark — task/goal completed */
  checkmark:        `${BASE}/wren_checkmark_3f428437.mp4`,
  /** Wren barrel roll — energetic transition */
  barrelRoll:       `${BASE}/wren_barrel_roll_c9716813.mp4`,
  /** Wren turning flips — playful celebration */
  turningFlips:     `${BASE}/wren_turning_flips_7d6c8d9e.mp4`,

  // ── Focus & Work ────────────────────────────────────────────────────────────
  /** Wren hovers above journal — evidence log / journaling */
  hoversJournal:    `${BASE}/wren_hovers_journal_e19fc0a3.mp4`,
  /** Wren blob journal — journal/notes page */
  blobJournal:      `${BASE}/wren_blob_journal_9f66692b.mp4`,
  /** Wren holding glowing memory orb — memory/evidence feature */
  holdingOrb:       `${BASE}/wren_holding_orb_4e96f5a9.mp4`,
  /** Wren memory orb (alternate) */
  memoryOrb:        `${BASE}/wren_memory_orb_2271fc91.mp4`,
  /** Wren carrying thread — continuity/thread metaphor */
  carryingThread:   `${BASE}/wren_carrying_thread_863ab9aa.mp4`,
  /** Wren pulling thread — pulling together loose ends */
  pullingThread:    `${BASE}/wren_pulling_thread_16e7da5d.mp4`,
  /** Wren tugging golden thread — energy/focus thread */
  tuggingThread:    `${BASE}/wren_tugging_thread_0d910da6.mp4`,
  /** Wren letter — communication/message feature */
  letter:           `${BASE}/wren_letter_d2047080.mp4`,
  /** Wren perched on document (alias) */
  watchingLetter:   `${BASE}/wren_perched_doc_5eaa0b45.mp4`,

  // ── Emotional Cycle ─────────────────────────────────────────────────────────
  /** Wren inflates and deflates — emotional cycle low period, empathetic */
  inflates:         `${BASE}/wren_inflates_95801164.mp4`,
  /** Wren extended wing floating — calm, neutral state */
  extendedWing:     `${BASE}/wren_extended_wing_08d6a69a.mp4`,
  /** Wren stretches gummy wing — gentle, soft moment */
  stretchesWing:    `${BASE}/wren_stretches_wing_d7327661.mp4`,
  /** Wren riding wave — going with the flow */
  ridingWave:       `${BASE}/wren_riding_wave_f639cf18.mp4`,

  // ── Motion / Transitions ────────────────────────────────────────────────────
  /** Wren flying fast — fast navigation / loading */
  flyingFast:       `${BASE}/wren_flying_fast_f9726bd7.mp4`,
  /** Wren swoops with light trail — fast transition */
  swoopsTrail:      `${BASE}/wren_swoops_trail_031c6b43.mp4`,
  /** Wren rockets across screen — dramatic transition */
  rockets:          `${BASE}/wren_rockets_b9e5d61d.mp4`,
  /** Wren sticky flying — playful hover */
  stickyFlying:     `${BASE}/wren_sticky_flying_504808fd.mp4`,
  /** Wren blob and flying fun — playful ambient */
  blobFlyingFun:    `${BASE}/wren_blob_flying_fun_46891740.mp4`,

  // ── Interaction / UI ────────────────────────────────────────────────────────
  /** Wren taps glass with wing — attention tap */
  tapsGlass:        `${BASE}/wren_taps_glass_a4f228c1.mp4`,
  /** Wren pops head and wings (alias) */
  popsHeadWings:    `${BASE}/wren_pops_head_0f490e05.mp4`,

  // ── Privacy & Security ──────────────────────────────────────────────────────
  /** Wren privacy lock — settings/privacy page */
  privacyLock:      `${BASE}/wren_privacy_lock_897e6167.mp4`,

  // ── Premium / 3D ────────────────────────────────────────────────────────────
  /** Premium 3D Wren character — premium/upgrade page */
  premium3d:        `${BASE}/wren_premium_3d_93f448b8.mp4`,
  /** Wren glowing silicone hovers — premium ambient */
  glowingHovers:    `${BASE}/wren_glowing_hovers_7c80be85.mp4`,
  /** Wren luminous silicone floats — premium ambient */
  luminousFloats:   `${BASE}/wren_luminous_floats_61b5f54e.mp4`,
  /** Wren hovering in archway — premium/welcome */
  hoveringArchway:  `${BASE}/wren_hovering_archway_dfb9f5cc.mp4`,

  // ── Untitled (review to assign) ─────────────────────────────────────────────
  untitled8:        `${BASE}/wren_untitled_8_521f0318.mp4`,
  untitled9:        `${BASE}/wren_untitled_9_f8651c46.mp4`,
  untitled11:       `${BASE}/wren_untitled_11_066c001d.mp4`,
} as const;

export type WrenClipKey = keyof typeof WREN_CLIPS;

/** Static PNG fallback frames (for slow connections / no-autoplay) */
export const WREN_STILLS = {
  neutral:          `${BASE}/wren_silicone_neutral_a718e338.png`,
  eyesClosed:       `${BASE}/wren_silicone_eyes_closed_ef42eb19.png`,
  flying:           `${BASE}/wren_silicone_flying_7037015d.png`,
  memory:           `${BASE}/wren_silicone_memory_f7bd5052.png`,
  thread:           `${BASE}/wren_silicone_thread_8a5d35e9.png`,
  journal:          `${BASE}/wren_silicone_journal_78cd46a8.png`,
  logo:             `${BASE}/wren_silicone_logo_2a83e276.png`,
  lookingDown:      `${BASE}/wren_silicone_looking_down_bb396381.png`,
  peekCorner:       `${BASE}/wren_silicone_peek_corner_eaa21cbd.png`,
  peekSide:         `${BASE}/wren_silicone_peek_side_22b5542d.png`,
  secure:           `${BASE}/wren_silicone_secure_2a80159b.png`,
  checkpoints:      `${BASE}/wren_silicone_checkpoints_034a83cf.png`,
  tugging:          `${BASE}/wren_silicone_tugging_41e5881f.png`,
  watching:         `${BASE}/wren_silicone_watching_51750ff9.png`,
  luminousFront:    `${BASE}/wren_luminous_front_11a098c4.png`,
  luminousIdle:     `${BASE}/wren_luminous_idle_1162ec5d.png`,
  luminousSwoop:    `${BASE}/wren_luminous_swoop_3c7bcf0b.png`,
  concept:          `${BASE}/wren_concept_5b39e085.png`,
} as const;

export type WrenStillKey = keyof typeof WREN_STILLS;
