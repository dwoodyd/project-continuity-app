import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Home from "./pages/Home";
import VaultPage from "./pages/VaultPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import WeeklyReviewPage from "./pages/WeeklyReviewPage";
import WeeklyCompassPage from "./pages/WeeklyCompassPage";
import SettingsPage from "./pages/SettingsPage";
import FocusModePage from "./pages/FocusModePage";
import OnboardingPage from "./pages/OnboardingPage";
import WelcomePage from "./pages/WelcomePage";
import PWAInstallBanner from "./components/PWAInstallBanner";
import { AnimatedSplash } from "./components/AnimatedSplash";
import { OnboardingFlow } from "./components/OnboardingFlow";
import { useState } from "react";
import IntelligencePage from "./pages/IntelligencePage";
import ClarityEnginePage from "./pages/ClarityEnginePage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import EvidenceLogPage from "./pages/EvidenceLogPage";
import AdminInviteCodesPage from "./pages/AdminInviteCodesPage";
import AdminFeedbackPage from "./pages/AdminFeedbackPage";
import StudyTrackerPage from "./pages/StudyTrackerPage";
import InviteGatePage from "./pages/InviteGatePage";
import AboutAppPage from "./pages/AboutAppPage";
import ProPage from "./pages/ProPage";
import ProSuccessPage from "./pages/ProSuccessPage";
import LandingPage from "./pages/LandingPage";

function Router({ onPreviewIntro }: { onPreviewIntro: () => void }) {
  return (
    <Switch>
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/focus" component={FocusModePage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/invite-gate" component={InviteGatePage} />
      <Route path="/about-app" component={AboutAppPage} />
      <Route path="/landing" component={LandingPage} />
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
            <Route path="/admin/study" component={StudyTrackerPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/pro" component={ProPage} />
            <Route path="/pro/success" component={ProSuccessPage} />
            <Route path="/pro/cancel" component={ProPage} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
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
    setOnboardingDone(true);
    setPreviewMode(false);
  }

  function handlePreviewIntro() {
    setPreviewMode(true);
  }

  const showOnboarding = splashDone && (!onboardingDone && isFirstSession || previewMode);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          {!splashDone && <AnimatedSplash onComplete={handleSplashComplete} isFirstSession={isFirstSession} />}
          {showOnboarding && <OnboardingFlow onSkip={handleOnboardingDone} />}
          <Router onPreviewIntro={handlePreviewIntro} />
          <PWAInstallBanner />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
