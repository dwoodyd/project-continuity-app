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

function Router() {
  return (
    <Switch>
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/focus" component={FocusModePage} />
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/vault" component={VaultPage} />
            <Route path="/projects" component={ProjectsPage} />
            <Route path="/projects/:id" component={ProjectDetailPage} />
            <Route path="/weekly" component={WeeklyReviewPage} />
            <Route path="/compass" component={WeeklyCompassPage} />
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
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
