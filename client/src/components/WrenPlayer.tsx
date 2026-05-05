/**
 * WrenPlayer — renders a Wren mascot animation video
 *
 * Usage:
 *   <WrenPlayer clip="welcome" size="lg" />
 *   <WrenPlayer clip="greeting" size="md" />
 *
 * All clips loop by default. Pass loop={false} to play once.
 * The video plays as-is with no blend mode tricks — backgrounds are handled
 * by the parent container or the optional `bg` prop.
 */

import React from "react";
import { cn } from "@/lib/utils";

// ─── CDN URLs for every Wren animation ───────────────────────────────────────
export const WREN_CLIPS = {
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
  // ── New clips (May 2026) ──────────────────────────────────────────────────
  /** Onboarding intro full-bleed — Wren holding glowing golden thread, floating papers, dark bg */
  withLetters: "/manus-storage/WrenwithLetters_4433d5a9.mp4",
  /** Tone interstitial full-bleed — Wren holding thread weaving through arched memory windows, dark bg */
  floatingMemories: "/manus-storage/WrenFloatingmemories_a67c734a.mp4",
  /** Done screen — Wren observing glowing path of checkmarks, dark bg, square */
  pathOfProgress: "/manus-storage/WRENPATHOFPROGRESS(4)_3c60c159.mp4",
  /** Sidebar footer ambient — Wren standing still with golden particles, dark bg, square */
  homeVideo: "/manus-storage/WrenhomeVideo_48416c0f.mp4",
  /** Knowledge Vault empty state — Wren writing with golden light on book, dark bg, vertical */
  journal: "/manus-storage/WrenJournal_4343c2d0.mp4",
  /** Streak milestone celebration — Wren flying with golden halo, white bg, square */
  celebration2: "/manus-storage/WrenCelebration2_68dd7c1a.mp4",
  /** Clarity Engine empty state — Wren at tablet/screen, focused energy */
  tablet: "/manus-storage/WrenTablet2_e29d161c.mp4",
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
}

export default function WrenPlayer({
  clip,
  size = "md",
  loop = true,
  autoPlay = true,
  muted = true,
  className,
  wrapperClassName,
}: WrenPlayerProps) {
  return (
    <div
      className={cn("flex items-center justify-center", SIZE_CLASSES[size], wrapperClassName)}
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
