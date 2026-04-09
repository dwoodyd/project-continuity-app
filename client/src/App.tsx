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
import { useState } from "react";
import IntelligencePage from "./pages/IntelligencePage";
import ClarityEnginePage from "./pages/ClarityEnginePage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import EvidenceLogPage from "./pages/EvidenceLogPage";
import AdminInviteCodesPage from "./pages/AdminInviteCodesPage";
import StudyTrackerPage from "./pages/StudyTrackerPage";
import InviteGatePage from "./pages/InviteGatePage";
import AboutAppPage from "./pages/AboutAppPage";

function Router() {
  return (
    <Switch>
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/focus" component={FocusModePage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/invite-gate" component={InviteGatePage} />
      <Route path="/about-app" component={AboutAppPage} />
      <Route>
        <AppLayout>
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
            <Route path="/admin/study" component={StudyTrackerPage} />
            <Route path="/settings" component={SettingsPage} />
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
  const [splashDone, setSplashDone] = useState(() => {
    // Only show splash when running as installed PWA
    const isPWA = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as any).standalone === true;
    if (!isPWA) return true;
    return sessionStorage.getItem("splashShown") === "1";
  });

  function handleSplashComplete() {
    sessionStorage.setItem("splashShown", "1");
    setSplashDone(true);
  }

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          {!splashDone && <AnimatedSplash onComplete={handleSplashComplete} />}
          <Router />
          <PWAInstallBanner />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
