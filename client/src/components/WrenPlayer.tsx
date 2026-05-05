/**
 * WrenPlayer — renders a Wren mascot animation video
 *
 * Usage:
 *   <WrenPlayer clip="welcome" size="lg" />
 *   <WrenPlayer clip="withLetters" size="xl" feather />
 *
 * All clips loop by default. Pass loop={false} to play once.
 * Pass feather={true} for the immersive floating treatment (radial fade edges).
 * All new-batch clips are watermark-free (bottom-right cropped).
 */

import React from "react";
import { cn } from "@/lib/utils";

// ─── CDN URLs for every Wren animation ───────────────────────────────────────
export const WREN_CLIPS = {
  // ── Original clips (pre-May 2026) ────────────────────────────────────────
  /** Onboarding slide 1 — Wren at archway doorway, dark magical forest, golden thread */
  welcome: "/manus-storage/wren-welcome_bfb5c9e0.mp4",
  /** Onboarding slide 2 — Wren chirping at glowing digital tile, dark abstract space */
  workspace: "/manus-storage/wren-workspace_27219685.mp4",
  /** Onboarding slide 3 — Wren holding thread to golden arch, clean white bg */
  threadLight: "/manus-storage/wren-thread-light_d2d48aa7.mp4",
  /** Onboarding slide 4 — Wren pulling thread from open book, warm study */
  knowledge: "/manus-storage/wren-knowledge_3e94b5f7.mp4",
  /** Onboarding slide 5 — Wren connecting thread through multiple framed scenes */
  connected: "/manus-storage/wren-connected_78554aed.mp4",
  /** AI Chat idle/thinking — Wren chirping, blue energy on arch string */
  thinking: "/manus-storage/wren-thinking_24c81a35.mp4",
  /** Loading / page transitions — Wren gently flapping wings, golden arch */
  flying: "/manus-storage/wren-flying_6a19a349.mp4",
  /** Empty state — Wren eyes closed, resting, orange arch pulsing */
  resting: "/manus-storage/wren-resting_2f1d8dd5.mp4",
  /** AI Chat greeting — Wren blinking, looking at viewer, orange arch */
  greeting: "/manus-storage/wren-greeting_d3ff926c.mp4",
  /** Success / celebration — Wren singing, golden checkmarks shooting upward */
  celebrate: "/manus-storage/wren-celebrate_7f817f1c.mp4",
  /** Weekly digest / notifications — Wren with envelope and sun drawing */
  digest: "/manus-storage/wren-digest_4cf3040a.mp4",

  // ── New clips (May 2026) — watermark-free ────────────────────────────────
  /** Onboarding intro full-bleed — Wren holding glowing golden thread, floating papers, dark bg */
  withLetters: "/manus-storage/WrenwithLetters_cropped_419991e0.mp4",
  /** Tone interstitial full-bleed — Wren holding thread weaving through arched memory windows, dark bg */
  floatingMemories: "/manus-storage/WrenFloatingmemories_cropped_c0578533.mp4",
  /** Done screen — Wren observing glowing path of checkmarks, dark bg, square */
  pathOfProgress: "/manus-storage/WRENPATHOFPROGRESS(4)_cropped_79f18ab7.mp4",
  /** Sidebar footer ambient — Wren standing still with golden particles, dark bg, square */
  homeVideo: "/manus-storage/WrenhomeVideo_cropped_99fbf0c0.mp4",
  /** Knowledge Vault empty state — Wren writing with golden light on book, dark bg, vertical */
  journal: "/manus-storage/WrenJournal_cropped_6860f108.mp4",
  /** Streak milestone celebration — Wren flying with golden halo, white bg, square */
  celebration2: "/manus-storage/WrenCelebration2_cropped_6844abc7.mp4",
  /** Clarity Engine empty state — Wren at tablet/screen, focused energy */
  tablet: "/manus-storage/WrenTablet2_cropped_b38c5778.mp4",
  /** Playful energy — Wren bouncing/dancing, warm amber bg, square */
  playful: "/manus-storage/WrenPlayful_cropped_831df5a5.mp4",
  /** Floating memories v2 — Wren with memory windows, dark bg */
  floatingMemories2: "/manus-storage/WrenFloatingMemories2_cropped_61e802db.mp4",
  /** Idol/statue pose — Wren glowing on pedestal, dark bg, square */
  idol: "/manus-storage/WrenIdol_cropped_d8f3cffd.mp4",
  /** Sleeping — Wren eyes closed, peaceful, dark bg, square */
  sleeping: "/manus-storage/WrenSleeping_cropped_ddf803ee.mp4",
  /** With tablet (alt) — Wren at glowing tablet, warm study bg */
  withTablet: "/manus-storage/WrenwithTablet_cropped_6f8036d0.mp4",
  /** Dark opener — Wren emerging from dark archway, cinematic */
  darkOpener: "/manus-storage/WrenDarkOpener_cropped_d8a8bd3a.mp4",
  /** Dark opening 2 — Wren in dark archway variant 2 */
  darkOpening2: "/manus-storage/WrenDarkOpening2_cropped_5aeb1b66.mp4",
  /** Celebration flying — Wren flying with golden halo (alt) */
  celebrationFlying: "/manus-storage/WrenCelebrationFlying_cropped_599ef6de.mp4",
  /** Turning / Star Wars style — Wren spinning with dramatic lighting */
  turning: "/manus-storage/WrenTurningStarWars_cropped_90bd96b9.mp4",
  /** Letters v2 — Wren with floating letters, warm bg */
  letters2: "/manus-storage/Wrenletters2_cropped_1dab9395.mp4",
  /** Opening 3 — Wren cinematic dark opening variant 3 */
  opening3: "/manus-storage/wRENoPENING3_cropped_d4bdc148.mp4",
} as const;

export type WrenClip = keyof typeof WREN_CLIPS;

const SIZE_CLASSES: Record<string, string> = {
  xs:  "w-16 h-16",
  sm:  "w-24 h-24",
  md:  "w-36 h-36",
  lg:  "w-52 h-52",
  xl:  "w-72 h-72",
  "2xl": "w-96 h-96",
  full: "w-full h-full",
};

interface WrenPlayerProps {
  clip: WrenClip;
  /** Tailwind size preset or "full" */
  size?: keyof typeof SIZE_CLASSES;
  loop?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  /** Extra wrapper className */
  wrapperClassName?: string;
  /**
   * Feathered / floating treatment — applies a radial CSS mask that fades
   * the video edges into the background, making Wren feel painted onto the
   * page rather than embedded in a container.
   */
  feather?: boolean;
  /**
   * Direction of the feather fade. Defaults to "radial" (all edges).
   * "bottom" fades only the bottom edge (good for full-bleed hero clips).
   * "top-bottom" fades top and bottom (good for mid-page clips).
   */
  featherDirection?: "radial" | "bottom" | "top-bottom";
}

export default function WrenPlayer({
  clip,
  size = "md",
  loop = true,
  autoPlay = true,
  muted = true,
  className,
  wrapperClassName,
  feather = false,
  featherDirection = "radial",
}: WrenPlayerProps) {
  const maskStyle: React.CSSProperties = feather
    ? {
        WebkitMaskImage:
          featherDirection === "bottom"
            ? "linear-gradient(to bottom, black 50%, transparent 100%)"
            : featherDirection === "top-bottom"
            ? "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)"
            : "radial-gradient(ellipse 85% 85% at 50% 50%, black 40%, transparent 100%)",
        maskImage:
          featherDirection === "bottom"
            ? "linear-gradient(to bottom, black 50%, transparent 100%)"
            : featherDirection === "top-bottom"
            ? "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)"
            : "radial-gradient(ellipse 85% 85% at 50% 50%, black 40%, transparent 100%)",
      }
    : {};

  return (
    <div
      className={cn("flex items-center justify-center", SIZE_CLASSES[size], wrapperClassName)}
      style={maskStyle}
    >
      <video
        key={clip}
        src={WREN_CLIPS[clip]}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        className={cn("w-full h-full object-contain", className)}
      />
    </div>
  );
}
