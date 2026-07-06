/**
 * pushSubscribe — shared helper for push notification opt-in.
 *
 * Handles the full flow:
 *  1. Request browser notification permission (if not already granted)
 *  2. Subscribe to the push manager with the VAPID key
 *  3. Send the subscription to the server via tRPC notifications.registerPush
 *
 * Used by all three opt-in paths:
 *  - PushPermissionInterstitial (post-onboarding)
 *  - WelcomePage (landing page opt-in)
 *  - SettingsPage (notifications tab)
 *
 * Returns: "granted" | "denied" | "unsupported" | "error"
 */

export type PushSubscribeResult = "granted" | "denied" | "unsupported" | "error";

export interface RegisterPushFn {
  mutateAsync: (args: { endpoint: string; p256dh: string; auth: string }) => Promise<unknown>;
}

export async function subscribePush(
  registerPush: RegisterPushFn
): Promise<PushSubscribeResult> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return "unsupported";
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return "denied";
    }

    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn("[Push] VITE_VAPID_PUBLIC_KEY not set — skipping push registration");
      return "granted"; // permission granted but no VAPID key; non-fatal
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });

    const key = sub.getKey("p256dh");
    const authKey = sub.getKey("auth");
    if (!key || !authKey) {
      console.warn("[Push] Could not extract push subscription keys");
      return "error";
    }

    await registerPush.mutateAsync({
      endpoint: sub.endpoint,
      p256dh: btoa(String.fromCharCode(...Array.from(new Uint8Array(key)))),
      auth: btoa(String.fromCharCode(...Array.from(new Uint8Array(authKey)))),
    });

    return "granted";
  } catch (err) {
    console.warn("[Push] subscribePush failed:", err);
    return "error";
  }
}
