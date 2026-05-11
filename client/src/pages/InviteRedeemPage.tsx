/**
 * InviteRedeemPage — handles deep links from approval emails.
 *
 * Route: /invite/:code
 *
 * Flow:
 *  1. Extract the code from the URL param
 *  2. Store it in sessionStorage so InviteGatePage can pick it up
 *  3. If user is already signed in → navigate to /invite-gate (which auto-submits)
 *  4. If user is NOT signed in → navigate to Manus OAuth login with return path = /invite-gate
 *
 * This page renders nothing visible — it's a redirect bridge.
 */
import { useEffect } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function InviteRedeemPage() {
  const { code } = useParams<{ code: string }>();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (code) {
      // Store the raw code so InviteGatePage can auto-submit it
      sessionStorage.setItem("pendingInviteCode", code.toUpperCase());
    }

    if (user) {
      // Already signed in — go straight to the invite gate (will auto-redeem)
      window.location.replace("/invite-gate");
    } else {
      // Not signed in — send to OAuth login, return to /invite-gate after
      // Store return path so OAuth callback can redirect back to invite-gate
      sessionStorage.setItem("continuary_return_path", "/invite-gate");
      window.location.replace(getLoginUrl());
    }
  }, [loading, user, code]);

  // Minimal loading state while auth resolves
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#080a0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "2px solid rgba(245,166,35,0.3)",
          borderTopColor: "oklch(0.80 0.17 65)",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
