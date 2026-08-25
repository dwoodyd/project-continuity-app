import { useEffect, useRef } from "react";
import { WREN_CLIPS, type WrenClipKey } from "@/lib/wrenClips";

type TodayGreetingWrenProps = {
  clip: WrenClipKey;
};

/**
 * The non-negotiable Today greeting treatment: same fixed 102px placement,
 * but no card surface, stage, border, or radius. It deliberately owns its
 * playback path so the locked Focus Sessions renderer remains untouched.
 */
export function TodayGreetingWren({ clip }: TodayGreetingWrenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const startPlayback = () => video.play().catch(() => {});
    startPlayback();
    video.addEventListener("canplay", startPlayback);
    return () => video.removeEventListener("canplay", startPlayback);
  }, [clip]);

  return (
    <video
      ref={videoRef}
      src={WREN_CLIPS[clip]}
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      className="h-full w-full object-cover mix-blend-screen"
      style={{
        WebkitMaskImage: "radial-gradient(ellipse 76% 82% at 50% 50%, black 45%, transparent 100%)",
        maskImage: "radial-gradient(ellipse 76% 82% at 50% 50%, black 45%, transparent 100%)",
      }}
    />
  );
}
