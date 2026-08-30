import { useEffect, useRef, useState } from "react";
import { WREN_CLIPS, WREN_STILLS, type WrenClipKey, type WrenStillKey } from "@/lib/wrenClips";

type TodayGreetingWrenProps = {
  clip: WrenClipKey;
  fallbackStill?: WrenStillKey;
};

/**
 * The non-negotiable Today greeting treatment: same fixed 102px placement,
 * but no card surface, stage, border, or radius. It deliberately owns its
 * playback path so the locked Focus Sessions renderer remains untouched.
 */
export function TodayGreetingWren({ clip, fallbackStill = "siliconeNeutral" }: TodayGreetingWrenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    setVideoFailed(false);
    const video = videoRef.current;
    if (!video) return;
    const startPlayback = () => video.play().catch(() => {});
    startPlayback();
    video.addEventListener("canplay", startPlayback);
    return () => video.removeEventListener("canplay", startPlayback);
  }, [clip]);

  const sceneStyle = {
    WebkitMaskImage: "radial-gradient(ellipse 76% 82% at 50% 50%, black 45%, transparent 100%)",
    maskImage: "radial-gradient(ellipse 76% 82% at 50% 50%, black 45%, transparent 100%)",
  };

  return videoFailed ? (
    <img
      src={WREN_STILLS[fallbackStill]}
      alt=""
      aria-hidden="true"
      className="h-full w-full object-cover mix-blend-screen"
      style={sceneStyle}
    />
  ) : (
    <video
      ref={videoRef}
      src={WREN_CLIPS[clip]}
      poster={WREN_STILLS[fallbackStill]}
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      onError={() => setVideoFailed(true)}
      className="h-full w-full object-cover mix-blend-screen"
      style={sceneStyle}
    />
  );
}
