/**
 * WrenPlayer — renders a Wren mascot animation video
 *
 * Usage:
 *   <WrenPlayer clip="luminousFloats" size="lg" />
 *   <WrenPlayer clip="peeking" size="xl" feather />
 *
 * All clips loop by default. Pass loop={false} to play once.
 * Pass feather={true} for the immersive floating treatment (radial fade edges).
 * All clips use mix-blend-mode: screen to remove black backgrounds.
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { WREN_CLIPS as NEW_CLIPS, WREN_STILLS, type WrenClipKey } from "@/lib/wrenClips";

// ─── Legacy clip map — maps old names to new equivalents ─────────────────────
// This ensures any component still using old clip names continues to work.
const LEGACY_CLIPS: Record<string, string> = {
  // Old originals → best new equivalent
  welcome:           NEW_CLIPS.hoveringArchway,
  workspace:         NEW_CLIPS.holdingOrb,
  threadLight:       NEW_CLIPS.carryingThread,
  knowledge:         NEW_CLIPS.hoversJournal,
  connected:         NEW_CLIPS.tuggingThread,
  thinking:          NEW_CLIPS.closesEyes,
  flying:            NEW_CLIPS.flyingFast,
  resting:           NEW_CLIPS.inflates,
  greeting:          NEW_CLIPS.popsHead,
  celebrate:         NEW_CLIPS.cartwheels,
  digest:            NEW_CLIPS.letter,
  // Old May 2026 batch → new equivalents
  withLetters:       NEW_CLIPS.luminousFloats,
  floatingMemories:  NEW_CLIPS.memoryOrb,
  floatingMemories2: NEW_CLIPS.glowingHovers,
  pathOfProgress:    NEW_CLIPS.checkmark,
  homeVideo:         NEW_CLIPS.mainCornerWave,
  journal:           NEW_CLIPS.hoversJournal,
  celebration2:      NEW_CLIPS.happySplit,
  celebrationFlying: NEW_CLIPS.fliesHug,
  tablet:            NEW_CLIPS.perchedDoc,
  playful:           NEW_CLIPS.bouncingFun,
  idol:              NEW_CLIPS.glowingHovers,
  sleeping:          NEW_CLIPS.closesEyes,
  withTablet:        NEW_CLIPS.perchedDoc,
  darkOpener:        NEW_CLIPS.dropsAndHovers,
  darkOpening2:      NEW_CLIPS.luminousFloats,
  turning:           NEW_CLIPS.turningFlips,
  letters2:          NEW_CLIPS.luminousFloats,
  opening3:          NEW_CLIPS.dropsAndHovers,
};

// Combined clip map: new keys take priority, legacy keys as fallback
export const WREN_CLIPS = {
  ...LEGACY_CLIPS,
  ...NEW_CLIPS,
} as const;

export type WrenClip = WrenClipKey | keyof typeof LEGACY_CLIPS;

const SIZE_CLASSES: Record<string, string> = {
  xs:    "w-16 h-16",
  sm:    "w-24 h-24",
  md:    "w-36 h-36",
  lg:    "w-52 h-52",
  xl:    "w-72 h-72",
  "2xl": "w-96 h-96",
  full:  "w-full h-full",
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
  /** Static PNG fallback shown while video loads */
  fallbackStill?: keyof typeof WREN_STILLS;
  onEnded?: () => void;
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
  fallbackStill,
  onEnded,
}: WrenPlayerProps) {
  const src = (WREN_CLIPS as Record<string, string>)[clip] ?? NEW_CLIPS.luminousFloats;
  const [videoReady, setVideoReady] = useState(false);

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
      className={cn("flex items-center justify-center relative", SIZE_CLASSES[size], wrapperClassName)}
      style={maskStyle}
    >
      {/* Static fallback shown while video loads — hidden once video is ready */}
      {fallbackStill && !videoReady && (
        <img
          src={WREN_STILLS[fallbackStill]}
          alt="Wren"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ mixBlendMode: "screen" }}
        />
      )}
      <video
        key={src}
        src={src}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        onEnded={onEnded}
        onCanPlay={() => setVideoReady(true)}
        className={cn("w-full h-full object-contain relative", className)}
        style={{ mixBlendMode: "screen" }}
      />
    </div>
  );
}

// Re-export stills for convenience
export { WREN_STILLS };
