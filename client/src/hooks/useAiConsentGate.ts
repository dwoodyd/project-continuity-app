import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import notify from "@/lib/notify";

/**
 * Keeps manual mode calm: client pages can ask for explicit consent before an AI
 * mutation instead of sending an opaque failing request or silently enabling AI.
 */
export function useAiConsentGate() {
  const [, navigate] = useLocation();
  const { data: profile, isLoading } = trpc.settings.getProfile.useQuery();

  const requireAiConsent = (featureName = "this feature") => {
    if (profile?.aiConsentGiven === true) return true;
    if (isLoading) {
      notify.info("Checking your AI setting. Try again in a moment.");
      return false;
    }
    notify.info("AI is currently off.", {
      description: `${featureName} uses AI only with your permission. You can enable it in You & Wren, or keep using manual tools.`,
      action: {
        label: "Enable AI",
        onClick: () => navigate("/settings?tab=wren"),
      },
      duration: 8000,
    });
    return false;
  };

  return { aiConsentGiven: profile?.aiConsentGiven === true, requireAiConsent };
}
