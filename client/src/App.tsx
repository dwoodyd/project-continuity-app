import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import PWAInstallBanner from "./components/PWAInstallBanner";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { AnimatedSplash } from "./components/AnimatedSplash";
import { useState, lazy, Suspense } from "react";
import { OnboardingPageWithCallback } from "./pages/OnboardingPage";

// ── Eagerly loaded: shown on first paint or critical auth path ─────────────
import Home from "./pages/Home";
import OnboardingPage from "./pages/OnboardingPage";
import LandingPage from "./pages/LandingPage";
import NotFound from "@/pages/NotFound";

// ── Lazy loaded: deferred until the route is first visited ─────────────────
const VaultPage           = lazy(() => import("./pages/VaultPage"));
const ProjectsPage        = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage   = lazy(() => import("./pages/ProjectDetailPage"));
const WeeklyReviewPage    = lazy(() => import("./pages/WeeklyReviewPage"));
const WeeklyCompassPage   = lazy(() => import("./pages/WeeklyCompassPage"));
const SettingsPage        = lazy(() => import("./pages/SettingsPage"));
const FocusModePage       = lazy(() => import("./pages/FocusModePage"));
const WelcomePage         = lazy(() => import("./pages/WelcomePage"));
const IntelligencePage    = lazy(() => import("./pages/IntelligencePage"));
const ClarityEnginePage   = lazy(() => import("./pages/ClarityEnginePage"));
const PrivacyPage         = lazy(() => import("./pages/PrivacyPage"));
const TermsPage           = lazy(() => import("./pages/TermsPage"));
const EvidenceLogPage     = lazy(() => import("./pages/EvidenceLogPage"));
const AdminInviteCodesPage = lazy(() => import("./pages/AdminInviteCodesPage"));
const AdminFeedbackPage   = lazy(() => import("./pages/AdminFeedbackPage"));
const AdminBetaCodesPage  = lazy(() => import("./pages/AdminBetaCodesPage"));
const AdminOnboardingFunnelPage = lazy(() => import("./pages/AdminOnboardingFunnelPage"));
const AdminApplicationsPage = lazy(() => import("./pages/AdminApplicationsPage"));
const StudyTrackerPage    = lazy(() => import("./pages/StudyTrackerPage"));
const InviteGatePage      = lazy(() => import("./pages/InviteGatePage"));
const AboutAppPage        = lazy(() => import("./pages/AboutAppPage"));
const ProPage             = lazy(() => import("./pages/ProPage"));
const ProSuccessPage      = lazy(() => import("./pages/ProSuccessPage"));
const ScratchPadPage      = lazy(() => import("./pages/ScratchPadPage"));
const TourPage            = lazy(() => import("./pages/TourPage"));
const EmotionalCyclePage  = lazy(() => import("./pages/EmotionalCyclePage"));
const FoundingMemberPage  = lazy(() => import("./pages/FoundingMemberPage"));
const ApplyPage           = lazy(() => import("./pages/ApplyPage"));
const InviteRedeemPage    = lazy(() => import("./pages/InviteRedeemPage"));
const RedeemReferralPage  = lazy(() => import("./pages/RedeemReferralPage"));
const CoworkingPage       = lazy(() => import("./pages/CoworkingPage"));
const FocusSessionsPage   = lazy(() => import("./pages/FocusSessionsPage"));
const HubPage             = lazy(() => import("./pages/HubPage"));

// Minimal fallback shown while a lazy chunk loads (avoids blank flash)
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function Router({ onPreviewIntro }: { onPreviewIntro: () => void }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/focus-mode" component={FocusModePage} />
        {/* /study is Single Focus Mode — full-screen, no sidebar. Must be outside AppLayout. */}
        <Route path="/study" component={StudyTrackerPage} />
        <Route path="/admin/study" component={StudyTrackerPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/invite-gate" component={InviteGatePage} />
        {/* /about-app is a legacy route — the canonical About page is /welcome (WelcomePage).
            Redirect here so old links don't 404 and future builders aren't confused. */}
        <Route path="/about-app">{() => { if (typeof window !== "undefined") window.location.replace("/welcome"); return null; }}</Route>
        <Route path="/landing" component={LandingPage} />
        <Route path="/tour" component={TourPage} />
        <Route path="/apply" component={ApplyPage} />
        <Route path="/invite/:code" component={InviteRedeemPage} />
        <Route path="/redeem-referral" component={RedeemReferralPage} />
        <Route path="/intro">{() => null}</Route>
        {/* Standalone 404 for unauthenticated visitors — must come before the AppLayout catch-all
            so unknown routes show the branded 404 page instead of the sign-in card. */}
        <Route path="/404" component={NotFound} />
        <Route>
          <AppLayout onPreviewIntro={onPreviewIntro}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/vault" component={VaultPage} />
              <Route path="/projects" component={ProjectsPage} />
              <Route path="/projects/:id" component={ProjectDetailPage} />
              <Route path="/weekly" component={WeeklyReviewPage} />
              <Route path="/compass" component={WeeklyCompassPage} />
              <Route path="/welcome" component={WelcomePage} />
              <Route path="/intelligence" component={IntelligencePage} />
              <Route path="/clarity" component={ClarityEnginePage} />
              <Route path="/evidence" component={EvidenceLogPage} />
              <Route path="/admin/invites" component={AdminInviteCodesPage} />
              <Route path="/admin/feedback" component={AdminFeedbackPage} />
              <Route path="/admin/beta" component={AdminBetaCodesPage} />
              {/* /study routes moved outside AppLayout above — prevents double sidebar */}
              <Route path="/admin/onboarding" component={AdminOnboardingFunnelPage} />
              <Route path="/admin/applications" component={AdminApplicationsPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/pro" component={ProPage} />
              <Route path="/pricing" component={ProPage} />
              <Route path="/pro/success" component={ProSuccessPage} />
              <Route path="/pro/cancel" component={ProPage} />
              <Route path="/scratch" component={ScratchPadPage} />
              <Route path="/emotional-cycle" component={EmotionalCyclePage} />
              <Route path="/founding-member" component={FoundingMemberPage} />
              <Route path="/coworking" component={CoworkingPage} />
              <Route path="/focus" component={FocusSessionsPage} />
              <Route path="/hub" component={HubPage} />
              <Route path="/404" component={NotFound} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  // Show splash once per browser session
  const [splashDone, setSplashDone] = useState(
    () => sessionStorage.getItem("splashShown") === "1"
  );
  // First-ever session: localStorage flag not yet set
  const isFirstSession = !localStorage.getItem("continuary_visited");
  // Onboarding flow: shown once to first-session users after splash, or when previewed
  const [onboardingDone, setOnboardingDone] = useState(
    () => localStorage.getItem("continuary_onboarded") === "1"
  );
  // Preview mode: user explicitly triggered the intro replay
  const [previewMode, setPreviewMode] = useState(false);

  function handleSplashComplete() {
    sessionStorage.setItem("splashShown", "1");
    localStorage.setItem("continuary_visited", "1");
    setSplashDone(true);
  }

  function handleOnboardingDone() {
    localStorage.setItem("continuary_onboarded", "1");
    // Signal Home.tsx to show the Wren intro immediately after onboarding.
    // Using sessionStorage so it fires once per session even if the profile
    // query hasn't resolved yet when Home mounts.
    sessionStorage.setItem("justCompletedOnboarding", "1");
    setOnboardingDone(true);
    setPreviewMode(false);
  }

  function handlePreviewIntro() {
    setPreviewMode(true);
  }

  // /intro forces the flow for cold-traffic sharing links (e.g. bio, Product Hunt)
  const isIntroRoute = typeof window !== "undefined" && window.location.pathname === "/intro";
  const showOnboarding = splashDone && ((!onboardingDone && isFirstSession) || previewMode || isIntroRoute);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          {!splashDone && <AnimatedSplash onComplete={handleSplashComplete} isFirstSession={isFirstSession} />}
          {showOnboarding && (
            <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#080a0f" }}>
              <OnboardingPageWithCallback onDone={handleOnboardingDone} />
            </div>
          )}
          <Router onPreviewIntro={handlePreviewIntro} />
          <PWAInstallBanner />
          <UpdatePrompt />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
