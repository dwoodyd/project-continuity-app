/**
 * notify — Continuary's single toast API.
 *
 * Every call site imports from here instead of calling toast() directly.
 * This keeps Wren's voice consistent and makes future copy changes a one-file edit.
 *
 * Usage:
 *   notify.saved("Context captured.")
 *   notify.saved("Thread held.", { description: "Pick it back up whenever you return." })
 *   notify.info("Syncing ideas…")
 *   notify.error("That didn't go through", { description: "Try again in a moment.", action: { label: "Retry", onClick: fn } })
 */

import { toast, type ExternalToast } from "sonner";

type NotifyOptions = Omit<ExternalToast, "description"> & {
  description?: string;
};

export const notify = {
  /**
   * Confirmation / success — something was saved, completed, or sent.
   * Duration: 4 s (enough to read, not long enough to annoy).
   */
  saved: (message: string, opts?: NotifyOptions) =>
    toast.success(message, { duration: 4000, ...opts }),

  /**
   * Neutral info — progress update, background sync, informational note.
   * Duration: 3.5 s.
   */
  info: (message: string, opts?: NotifyOptions) =>
    toast(message, { duration: 3500, ...opts }),

  /**
   * Error — something didn't go through. Always give a path forward.
   * Duration: 6 s (longer so the user can read and act).
   */
  error: (message: string, opts?: NotifyOptions) =>
    toast.error(message, { duration: 6000, ...opts }),

  /**
   * Loading — returns the toast id so it can be dismissed or updated.
   * Caller is responsible for dismissing with toast.dismiss(id).
   */
  loading: (message: string, opts?: NotifyOptions) =>
    toast.loading(message, opts),

  /** Dismiss a specific toast by id (returned from notify.loading). */
  dismiss: (id?: string | number) => toast.dismiss(id),
};

export default notify;
