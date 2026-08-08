/**
 * useCrisisCheck
 *
 * Shared hook for the 5 surfaces that need crisis detection.
 * Usage:
 *   const { crisisLevel, checkAndMaybeFlag, dismissCrisis } = useCrisisCheck("ground_mode");
 *   // After user submits text:
 *   await checkAndMaybeFlag(text);
 *   // In JSX:
 *   {crisisLevel && <CrisisSupportCard level={crisisLevel} onDismiss={dismissCrisis} />}
 */
import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export type CrisisLevel = "elevated" | "acute";

export function useCrisisCheck(surface: string) {
  const [crisisLevel, setCrisisLevel] = useState<CrisisLevel | null>(null);
  const checkMutation = trpc.crisis.check.useMutation();

  const checkAndMaybeFlag = useCallback(
    async (text: string) => {
      if (!text || text.trim().length < 5) return;
      try {
        const result = await checkMutation.mutateAsync({ text, surface });
        if (result.risk === "elevated" || result.risk === "acute") {
          setCrisisLevel(result.risk);
        }
      } catch {
        // Fail open — never block the user's flow
      }
    },
    [checkMutation, surface],
  );

  const dismissCrisis = useCallback(() => setCrisisLevel(null), []);

  return { crisisLevel, checkAndMaybeFlag, dismissCrisis };
}
