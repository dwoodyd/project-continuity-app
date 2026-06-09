/**
 * Push subscription helpers.
 *
 * `PushManager.subscribe` is most reliably given `applicationServerKey` as a
 * BufferSource (Uint8Array). Passing the raw base64url VAPID string works in
 * some browsers but is rejected by others/older versions — so always convert.
 */

/** Convert a base64url-encoded VAPID public key into the Uint8Array subscribe() expects. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  // Back the view with an explicit ArrayBuffer so the type is a valid BufferSource.
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
