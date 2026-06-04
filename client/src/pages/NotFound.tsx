import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="w-full flex items-center justify-center bg-background px-6 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Subtle label */}
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          404 — Page not found
        </p>

        {/* Headline */}
        <h1 className="text-2xl font-semibold text-foreground leading-snug">
          This page doesn't exist.
        </h1>

        {/* Body copy — same emotional register as the rest of the app */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          That's okay. You haven't lost anything important.
          <br />
          Let's get you back to where you were.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate("/")}
            className="w-full sm:w-auto flex items-center justify-between px-5 py-3.5 bg-foreground text-background rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            <span>Take me to Today</span>
            <svg className="w-4 h-4 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => window.history.back()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
