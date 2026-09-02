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

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  WREN_CLIPS as NEW_CLIPS,
  WREN_STILLS,
  isVerifiedWrenClip,
  type WrenClipKey,
} from "@/lib/wrenClips";

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
  hero:  "w-[clamp(240px,32vw,440px)] h-[clamp(240px,32vw,440px)]",
  heroLg:"w-[clamp(300px,42vw,560px)] h-[clamp(300px,42vw,560px)]",
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
   * Wren's source lighting is authored against a dark field. Keep that stage
   * in either app theme so her glow reads as deliberate, not washed out.
   */
  stage?: boolean;
  /**
   * CSS object-fit for the video element.
   * Defaults to "contain" (original behavior).
   * Use "cover" for stage/full-bleed surfaces where Wren should fill her frame.
   */
  objectFit?: "contain" | "cover";
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
  /** Optional first-frame poster used by the browser while the video buffers. */
  poster?: string;
  /** Hide the initial still during buffering while retaining it for failure and reduced-motion fallback. */
  suppressInitialStill?: boolean;
  /** Omit the native video poster when the surrounding stage should stay visually neutral while buffering. */
  showVideoPoster?: boolean;
  /**
   * Metadata is sufficient for most ambient placements. Focus Sessions opts
   * into auto so its pre-start Wren presence is ready before the member
   * begins, rather than lingering on a generic loading still.
   */
  preload?: "auto" | "metadata" | "none";
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
  stage = true,
  feather = false,
  featherDirection = "radial",
  fallbackStill,
  poster,
  suppressInitialStill = false,
  showVideoPoster = true,
  preload = "metadata",
  objectFit = "contain",
  onEnded,
}: WrenPlayerProps) {
  const requestedSrc = (WREN_CLIPS as Record<string, string>)[clip] ?? NEW_CLIPS.evidenceClean;
  // Focus-session body-doubling has its own intentionally preserved clips. All
  // other autoplaying video sources must be from the independently reviewed
  // registry; unreviewed legacy keys render their still instead of a duplicate
  // or potentially watermarked fallback video.
  const isProtectedFocusClip = clip === "weaving" || clip === "reading" || clip === "lookingup";
  const usesVerifiedVideo = isProtectedFocusClip || isVerifiedWrenClip(clip);
  const src = requestedSrc;
  const resolvedPoster = poster ?? WREN_STILLS[fallbackStill ?? "siliconeNeutral"];
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    setVideoReady(false);
    setVideoFailed(false);
    setPosterFailed(false);
  }, [src]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

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
      className={cn(
        "flex items-center justify-center relative overflow-visible",
        stage && "wren-dark-stage",
        SIZE_CLASSES[size],
        wrapperClassName,
      )}
    >
      {/* A reviewed still keeps Wren present when motion is reduced or video is unavailable. */}
      {(!usesVerifiedVideo || prefersReducedMotion || videoFailed || (!videoReady && !suppressInitialStill)) && !posterFailed && (
        <img
          src={resolvedPoster}
          alt="Wren"
          onError={() => setPosterFailed(true)}
          className={cn(
            "absolute inset-0 w-full h-full",
            objectFit === "cover" ? "object-cover" : "object-contain",
          )}
          style={{ ...maskStyle, mixBlendMode: "screen" }}
        />
      )}
      {usesVerifiedVideo && !prefersReducedMotion && !videoFailed && (
        <video
          key={src}
          poster={showVideoPoster ? resolvedPoster : undefined}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline
          preload={preload}
          onEnded={onEnded}
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
          className={cn(
            "w-full h-full",
            "relative",
            objectFit === "cover" ? "object-cover" : "object-contain",
            className,
          )}
          style={{ ...maskStyle, mixBlendMode: "screen" }}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
    </div>
  );
}

// Re-export stills for convenience
export { WREN_STILLS };
