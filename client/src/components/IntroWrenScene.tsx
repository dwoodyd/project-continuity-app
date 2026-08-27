import { useEffect, useRef, useState } from "react";
import { WREN_CLIPS, WREN_STILLS } from "@/lib/wrenClips";

type IntroWrenSceneProps = {
  src: string;
  poster?: string;
  eyebrow: string;
  title: string;
  body: string;
  children?: React.ReactNode;
  className?: string;
  variant?: "standard" | "return";
  bleed?: boolean;
};

/**
 * The product-scale Wren composition from /intro, reused only at emotional
 * milestone routes. It does not use the shared WrenPlayer so Focus Sessions
 * and its playback path remain unchanged.
 */
export function IntroWrenScene({ src, poster, eyebrow, title, body, children, className = "", variant = "standard", bleed = false }: IntroWrenSceneProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const isReturnScene = variant === "return";
  const usesManagedSource = src.includes("continuary-evidence-wren-letter_650c0a8e");
  const resolvedSrc = usesManagedSource ? src : WREN_CLIPS.evidenceClean;
  const resolvedPoster = usesManagedSource ? poster : WREN_STILLS.evidenceCleanPoster;

  useEffect(() => {
    setVideoFailed(false);
    const video = videoRef.current;
    if (!video) return;
    const startPlayback = () => { video.play().catch(() => {}); };
    startPlayback();
    video.addEventListener("canplay", startPlayback);
    return () => video.removeEventListener("canplay", startPlayback);
  }, [src]);

  return (
    <section data-wren-scene={bleed ? "edge-bleed" : "contained"} className={`relative isolate min-h-[min(72vh,680px)] overflow-hidden border-0 rounded-none bg-[#161815] text-[#F5EEE2] ${isReturnScene ? "min-h-[min(78vh,760px)]" : ""} ${bleed ? "w-[calc(100%+2.5rem)] -mx-5 sm:w-[calc(100%+4rem)] sm:-mx-8" : ""} ${className}`}>
      {videoFailed && resolvedPoster && (
        <img
          src={resolvedPoster}
          alt="Wren keeping watch over your Evidence Log"
          className={`absolute inset-0 h-full w-full object-cover mix-blend-screen ${isReturnScene ? "object-[68%_center]" : ""}`}
        />
      )}
      {!videoFailed && (
        <video
          ref={videoRef}
          src={resolvedSrc}
          poster={resolvedPoster}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover mix-blend-screen ${isReturnScene ? "object-[68%_center]" : ""}`}
        />
      )}
      <div className={`pointer-events-none absolute inset-0 ${isReturnScene ? "bg-[linear-gradient(90deg,rgba(22,24,21,0.98)_0%,rgba(22,24,21,0.94)_30%,rgba(22,24,21,0.66)_47%,rgba(22,24,21,0.14)_67%,transparent_82%),linear-gradient(to_top,rgba(22,24,21,0.90)_0%,transparent_48%)]" : bleed ? "bg-[linear-gradient(90deg,rgba(22,24,21,0.96)_0%,rgba(22,24,21,0.82)_35%,rgba(22,24,21,0.40)_54%,transparent_76%),linear-gradient(to_top,rgba(22,24,21,0.86)_0%,transparent_55%)]" : "bg-[linear-gradient(to_top,rgba(22,24,21,0.96)_0%,rgba(22,24,21,0.46)_34%,transparent_70%)]"}`} />
      <div className={`relative z-10 flex min-h-[min(72vh,680px)] flex-col justify-end px-6 pb-8 pt-24 sm:px-10 sm:pb-12 ${isReturnScene ? "max-w-[45%] min-w-[19rem] justify-center pb-14 sm:pl-14 sm:pr-4" : "max-w-2xl"}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F3BF68]">{eyebrow}</p>
        <h2 className={`mt-3 font-brand text-3xl font-normal leading-tight tracking-[-0.03em] text-[#FFF8EC] [text-shadow:0_2px_18px_rgba(0,0,0,0.9)] sm:text-5xl ${isReturnScene ? "sm:text-4xl" : ""}`}>{title}</h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#FFF8EC]/90 [text-shadow:0_1px_12px_rgba(0,0,0,0.85)] sm:text-base">{body}</p>
        {children && <div className="mt-7">{children}</div>}
      </div>
    </section>
  );
}
