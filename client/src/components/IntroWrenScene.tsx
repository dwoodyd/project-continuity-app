import { useEffect, useRef, useState } from "react";
import { WREN_STILLS } from "@/lib/wrenClips";

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
  const [posterFailed, setPosterFailed] = useState(false);
  const isReturnScene = variant === "return";
  const resolvedSrc = src;
  const resolvedPoster = poster ?? WREN_STILLS.evidenceCleanPoster;

  useEffect(() => {
    setVideoFailed(false);
    setPosterFailed(false);
    const video = videoRef.current;
    if (!video) return;
    const startPlayback = () => { video.play().catch(() => {}); };
    startPlayback();
    video.addEventListener("canplay", startPlayback);
    return () => video.removeEventListener("canplay", startPlayback);
  }, [src]);

  return (
    <section
      data-wren-scene={bleed ? "edge-bleed" : "contained"}
      className={`relative isolate min-h-0 w-full max-w-none overflow-hidden border-0 rounded-none bg-[#161815] text-[#F5EEE2] md:min-h-[min(72vh,680px)] ${isReturnScene ? "md:min-h-[min(78vh,760px)]" : ""} ${bleed ? "md:w-[calc(100%+4rem)] md:-mx-8" : ""} ${className}`}
    >
      {videoFailed && resolvedPoster && !posterFailed && (
        <img
          src={resolvedPoster}
          alt="Wren keeping watch over your Evidence Log"
          onError={() => setPosterFailed(true)}
          className={`absolute inset-x-0 top-0 h-56 w-full object-cover mix-blend-screen md:inset-0 md:h-full ${isReturnScene ? "md:object-[68%_center]" : ""}`}
        />
      )}
      {!videoFailed && (
        <video
          ref={videoRef}
          poster={resolvedPoster}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
          className={`absolute inset-x-0 top-0 h-56 w-full object-cover mix-blend-screen md:inset-0 md:h-full ${isReturnScene ? "md:object-[68%_center]" : ""}`}
        >
          <source src={resolvedSrc} type="video/mp4" />
        </video>
      )}
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-56 bg-[linear-gradient(to_top,rgba(22,24,21,0.92)_0%,rgba(22,24,21,0.16)_66%,transparent_100%)] md:inset-0 md:h-auto ${isReturnScene ? "md:bg-[linear-gradient(90deg,rgba(22,24,21,0.98)_0%,rgba(22,24,21,0.94)_30%,rgba(22,24,21,0.66)_47%,rgba(22,24,21,0.14)_67%,transparent_82%),linear-gradient(to_top,rgba(22,24,21,0.90)_0%,transparent_48%)]" : bleed ? "md:bg-[linear-gradient(90deg,rgba(22,24,21,0.96)_0%,rgba(22,24,21,0.82)_35%,rgba(22,24,21,0.40)_54%,transparent_76%),linear-gradient(to_top,rgba(22,24,21,0.86)_0%,transparent_55%)]" : "md:bg-[linear-gradient(to_top,rgba(22,24,21,0.96)_0%,rgba(22,24,21,0.46)_34%,transparent_70%)]"}`} />
      <div className={`relative z-10 flex min-h-0 w-full min-w-0 max-w-none flex-col justify-end px-5 pb-8 pt-64 sm:px-10 sm:pb-12 md:min-h-[min(72vh,680px)] md:pt-24 ${isReturnScene ? "md:max-w-[45%] md:min-w-[19rem] md:justify-center md:pb-14 md:pl-14 md:pr-4" : "md:max-w-2xl"}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F3BF68]">{eyebrow}</p>
        <h2 className={`mt-3 font-brand text-3xl font-normal leading-tight tracking-[-0.03em] text-[#FFF8EC] [text-shadow:0_2px_18px_rgba(0,0,0,0.9)] sm:text-5xl ${isReturnScene ? "sm:text-4xl" : ""}`}>{title}</h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#FFF8EC]/90 [text-shadow:0_1px_12px_rgba(0,0,0,0.85)] sm:text-base">{body}</p>
        {children && <div className="mt-7 min-w-0">{children}</div>}
      </div>
    </section>
  );
}
