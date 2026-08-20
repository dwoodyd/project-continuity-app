import { useEffect, useRef } from "react";

type IntroWrenSceneProps = {
  src: string;
  eyebrow: string;
  title: string;
  body: string;
  children?: React.ReactNode;
  className?: string;
};

/**
 * The product-scale Wren composition from /intro, reused only at emotional
 * milestone routes. It does not use the shared WrenPlayer so Focus Sessions
 * and its playback path remain unchanged.
 */
export function IntroWrenScene({ src, eyebrow, title, body, children, className = "" }: IntroWrenSceneProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const startPlayback = () => { video.play().catch(() => {}); };
    startPlayback();
    video.addEventListener("canplay", startPlayback);
    return () => video.removeEventListener("canplay", startPlayback);
  }, [src]);

  return (
    <section className={`relative isolate min-h-[min(72vh,680px)] overflow-hidden bg-[#161815] text-[#F5EEE2] ${className}`}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover mix-blend-screen"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(22,24,21,0.96)_0%,rgba(22,24,21,0.46)_34%,transparent_70%)]" />
      <div className="relative z-10 flex min-h-[min(72vh,680px)] max-w-2xl flex-col justify-end px-6 pb-8 pt-24 sm:px-10 sm:pb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F3BF68]">{eyebrow}</p>
        <h2 className="mt-3 font-brand text-3xl font-normal leading-tight tracking-[-0.03em] sm:text-5xl">{title}</h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#F5EEE2]/75 sm:text-base">{body}</p>
        {children && <div className="mt-7">{children}</div>}
      </div>
    </section>
  );
}
