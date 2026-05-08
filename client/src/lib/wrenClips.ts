/**
 * Wren video and image asset registry — v3 (new animated Wren set, May 2026)
 * All paths are served through the app's /manus-storage/ proxy (private CDN).
 * Apply  mix-blend-mode: screen  on every video element to remove black backgrounds.
 */

const BASE = "/manus-storage";

// ─── Video clips ─────────────────────────────────────────────────────────────
export const WREN_CLIPS = {
  // ── Onboarding ──────────────────────────────────────────────────────────────
  /** Wren glowing and floating — cinematic splash / intro */
  luminousFloats:     `${BASE}/wren_luminous_floats_fdfcf0c1.mp4`,
  /** Wren drops from above and hovers — alternate intro */
  dropsAndHovers:     `${BASE}/wren_drops_and_hovers_fe4c3cf4.mp4`,
  /** Wren peeking from the edge — name input background */
  peeking:            `${BASE}/wren_peeking_9a813da0.mp4`,
  /** Wren winks with a jiggly ripple — tone interstitial reaction */
  winksRipple:        `${BASE}/wren_winks_ripple_44f66820.mp4`,
  /** Wren closes eyes in concentration — tone selection / thoughtful */
  closesEyes:         `${BASE}/wren_closes_eyes_ce01aa87.mp4`,
  /** Wren hovers with energy thread — focus hours step */
  hoversThread:       `${BASE}/wren_hovers_thread_29c4964a.mp4`,
  /** Wren perched on a digital document — project setup step */
  perchedDoc:         `${BASE}/wren_perched_doc_463f72f2.mp4`,
  /** Wren flies at camera for a hug — done/celebration screen */
  fliesHug:           `${BASE}/wren_flies_hug_af727f9c.mp4`,

  // ── Home & Dashboard ────────────────────────────────────────────────────────
  /** Wren's main corner wave — ambient home dashboard widget */
  mainCornerWave:     `${BASE}/wren_main_corner_wave_b211fe78.mp4`,
  /** Wren corner wave (alternate) */
  cornerWave:         `${BASE}/wren_corner_wave_0d698f99.mp4`,
  /** Wren taps screen and points down — CTA/prompt widget */
  tapsPointsDown:     `${BASE}/wren_taps_points_down_0d15f96f.mp4`,
  /** Wren taps the glass — gentle nudge / reminder */
  tapsGlass:          `${BASE}/wren_taps_glass_69da4407.mp4`,
  /** Wren hits the screen — attention-grabbing nudge */
  hitsScreen:         `${BASE}/wren_hits_screen_bbeaab44.mp4`,
  /** Wren wipes screen, points, and dances — feature tour / onboarding complete */
  wipesDances:        `${BASE}/wren_wipes_dances_3c262da6.mp4`,
  /** Wren holding a glowing orb — intelligence / insight widget */
  holdingOrb:         `${BASE}/wren_holding_orb_4c6ec928.mp4`,
  /** Wren hovering under an archway — welcome / portal moment */
  hoveringArchway:    `${BASE}/wren_hovering_archway_b1c86b40.mp4`,
  /** Wren glowing and hovering — ambient background */
  glowingHovers:      `${BASE}/wren_glowing_hovers_6ea04f47.mp4`,
  /** Wren blob flying fun — playful ambient */
  blobFlyingFun:      `${BASE}/wren_blob_flying_fun_2d23867d.mp4`,

  // ── Check-ins ───────────────────────────────────────────────────────────────
  /** Wren pops head and wings — morning check-in greeting */
  popsHead:           `${BASE}/wren_pops_head_1568d1e1.mp4`,
  /** Wren winking — playful acknowledgment */
  winking:            `${BASE}/wren_winking_9eafd128.mp4`,
  /** Wren winking (alternate take) */
  winking2:           `${BASE}/wren_winking_2_1eeaac3c.mp4`,
  /** Wren kissing screen — affectionate farewell / evening check-in done */
  kissingScreen:      `${BASE}/wren_kissing_screen_500d4812.mp4`,
  /** Wren hovering over a journal — evidence log / reflection */
  hoversJournal:      `${BASE}/wren_hovers_journal_ef4ca92d.mp4`,
  /** Wren blob journal — journaling / writing mode */
  blobJournal:        `${BASE}/wren_blob_journal_952097cf.mp4`,

  // ── Celebrations & Milestones ───────────────────────────────────────────────
  /** Wren does bouncy cartwheels — streak milestone */
  cartwheels:         `${BASE}/wren_cartwheels_feefa3ef.mp4`,
  /** Wren happy split in two — big milestone / level up */
  happySplit:         `${BASE}/wren_happy_split_65367046.mp4`,
  /** Wren bouncing having fun — emotional cycle high period */
  bouncingFun:        `${BASE}/wren_bouncing_fun_52e9a11d.mp4`,
  /** Wren morphs into golden heart — love/appreciation moment */
  morphsHeart:        `${BASE}/wren_morphs_heart_9c861404.mp4`,
  /** Wren turns into heart (alternate) */
  turnsHeart:         `${BASE}/wren_turns_heart_a0b21e56.mp4`,
  /** Wren checkmark — task/goal completed */
  checkmark:          `${BASE}/wren_checkmark_37ecf545.mp4`,
  /** Wren barrel roll — energetic celebration */
  barrelRoll:         `${BASE}/wren_barrel_roll_d4e1a2ad.mp4`,
  /** Wren rockets upward — breakthrough / launch moment */
  rockets:            `${BASE}/wren_rockets_bf178e85.mp4`,
  /** Wren flying fast — speed / momentum */
  flyingFast:         `${BASE}/wren_flying_fast_e3412629.mp4`,
  /** Wren turning flips — playful energy */
  turningFlips:       `${BASE}/wren_turning_flips_f704f75e.mp4`,
  /** Wren swoops with a trail — smooth transition / flow state */
  swoopsTrail:        `${BASE}/wren_swoops_trail_20cb647c.mp4`,
  /** Wren riding a wave — going with the flow */
  ridingWave:         `${BASE}/wren_riding_wave_a000ee50.mp4`,

  // ── Emotional / Empathy ─────────────────────────────────────────────────────
  /** Wren inflates gently — emotional cycle low / empathy */
  inflates:           `${BASE}/wren_inflates_37c3a62a.mp4`,
  /** Wren memory orb — memory / reflection */
  memoryOrb:          `${BASE}/wren_memory_orb_92969214.mp4`,
  /** Wren carrying a thread — continuity / connection */
  carryingThread:     `${BASE}/wren_carrying_thread_4789c9c5.mp4`,
  /** Wren tugging a thread — pulling things together */
  tuggingThread:      `${BASE}/wren_tugging_thread_7bf624a9.mp4`,
  /** Wren pulling a thread — persistence */
  pullingThread:      `${BASE}/wren_pulling_thread_1e9367f3.mp4`,
  /** Wren stretches wing — reaching out */
  stretchesWing:      `${BASE}/wren_stretches_wing_ab0268ad.mp4`,
  /** Wren extends wing — welcoming gesture */
  extendedWing:       `${BASE}/wren_extended_wing_c05c2f67.mp4`,
  /** Wren sticky flying — persistent effort */
  stickyFlying:       `${BASE}/wren_sticky_flying_c7ea84d4.mp4`,

  // ── Utility / Special ───────────────────────────────────────────────────────
  /** Wren privacy lock — security / vault page */
  privacyLock:        `${BASE}/wren_privacy_lock_9355f8a8.mp4`,
  /** Wren premium 3D — upgrade / pro page */
  premium3d:          `${BASE}/wren_premium_3d_d1631d91.mp4`,
  /** Wren letter — notifications / messages */
  letter:             `${BASE}/wren_letter_3a012f38.mp4`,
  /** Wren untitled 8 — extra clip A */
  extra8:             `${BASE}/wren_untitled_8_d1ab1787.mp4`,
  /** Wren untitled 9 — extra clip B */
  extra9:             `${BASE}/wren_untitled_9_6a2ee8e4.mp4`,
  /** Wren untitled 11 — extra clip C */
  extra11:            `${BASE}/wren_untitled_11_82cd59f1.mp4`,

  // ── Legacy aliases (backward compat — map to best new equivalent) ──────────
  floatingMemories:   `${BASE}/wren_glowing_hovers_6ea04f47.mp4`,
  floatingMemories2:  `${BASE}/wren_glowing_hovers_6ea04f47.mp4`,
  pathOfProgress:     `${BASE}/wren_hovers_thread_29c4964a.mp4`,
  celebrationFlying:  `${BASE}/wren_flies_hug_af727f9c.mp4`,
  withLetters:        `${BASE}/wren_luminous_floats_fdfcf0c1.mp4`,
  greeting:           `${BASE}/wren_pops_head_1568d1e1.mp4`,
  welcome:            `${BASE}/wren_drops_and_hovers_fe4c3cf4.mp4`,
  workspace:          `${BASE}/wren_perched_doc_463f72f2.mp4`,
  focus:              `${BASE}/wren_hovers_thread_29c4964a.mp4`,
  celebration:        `${BASE}/wren_flies_hug_af727f9c.mp4`,
  celebration2:       `${BASE}/wren_cartwheels_feefa3ef.mp4`,
  reflection:         `${BASE}/wren_hovers_journal_ef4ca92d.mp4`,
  idle:               `${BASE}/wren_main_corner_wave_b211fe78.mp4`,
} as const;

export type WrenClipKey = keyof typeof WREN_CLIPS;

// ─── Still images ─────────────────────────────────────────────────────────────
export const WREN_STILLS = {
  // Luminous series (glowing, transparent-friendly)
  luminousFront:      `${BASE}/wren_luminous_front_8c475599.png`,
  luminousIdle:       `${BASE}/wren_luminous_idle_511550a0.png`,
  luminousSwoop:      `${BASE}/wren_luminous_swoop_97e87ab1.png`,
  concept:            `${BASE}/wren_concept_93ac636b.png`,
  // Silicone series (high-detail 3D renders)
  siliconeCheckpoints:`${BASE}/wren_silicone_checkpoints_e7c210c4.png`,
  siliconeEyesClosed: `${BASE}/wren_silicone_eyes_closed_a5a7c1c1.png`,
  siliconeFlyingPng:  `${BASE}/wren_silicone_flying_b96be934.png`,
  siliconeJournal:    `${BASE}/wren_silicone_journal_9226f9bd.png`,
  siliconeLogo:       `${BASE}/wren_silicone_logo_87b64148.png`,
  siliconeLookingDown:`${BASE}/wren_silicone_looking_down_f683a2b5.png`,
  siliconeMemory:     `${BASE}/wren_silicone_memory_62eed637.png`,
  siliconeNeutral:    `${BASE}/wren_silicone_neutral_a1b60983.png`,
  siliconePeekCorner: `${BASE}/wren_silicone_peek_corner_149f87d2.png`,
  siliconePeekSide:   `${BASE}/wren_silicone_peek_side_5c8f1be8.png`,
  siliconeSecure:     `${BASE}/wren_silicone_secure_9fd80377.png`,
  siliconeThread:     `${BASE}/wren_silicone_thread_985aa362.png`,
  siliconeTugging:    `${BASE}/wren_silicone_tugging_ed175b17.png`,
  siliconeWatching:   `${BASE}/wren_silicone_watching_860abe08.png`,
} as const;

export type WrenStillKey = keyof typeof WREN_STILLS;
