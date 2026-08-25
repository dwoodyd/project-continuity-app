import { useState } from "react";
import { trpc } from "@/lib/trpc";
import notify from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [confirmApprove, setConfirmApprove] = useState<{
    id: number;
    name: string;
    email: string;
  } | null>(null);

  const { data: applications, isLoading, refetch } = trpc.applications.list.useQuery(
    statusFilter === "all" ? {} : { status: statusFilter as "pending" | "approved" | "rejected" },
    { refetchOnWindowFocus: false }
  );

  const approveMutation = trpc.applications.approve.useMutation({
    onSuccess: (data) => {
      notify.saved(
        data.emailSent
          ? `Approved! Invite code ${data.code} sent via email.`
          : `Approved with code ${data.code} — but email failed to send. Copy the code manually.`,
        { duration: 8000 }
      );
      setConfirmApprove(null);
      refetch();
    },
    onError: (err) => {
      notify.error(`Approval failed: ${err.message}`);
    },
  });

  const rejectMutation = trpc.applications.reject.useMutation({
    onSuccess: () => {
      notify.saved("Application rejected.");
      refetch();
    },
    onError: (err) => {
      notify.error(`Rejection failed: ${err.message}`);
    },
  });

  const resendInviteMutation = trpc.applications.resendInvite.useMutation({
    onSuccess: () => {
      notify.saved("Invite email re-sent successfully.", { duration: 5000 });
    },
    onError: (err) => {
      notify.error(`Failed to resend invite: ${err.message}`, { duration: 8000 });
    },
  });

  const resendReminderMutation = trpc.applications.resendTrialReminder.useMutation({
    onSuccess: () => {
      notify.saved("Trial reminder email sent.", { duration: 5000 });
    },
    onError: (err) => {
      notify.error(`Could not send reminder: ${err.message}`, { duration: 8000 });
    },
  });

  const handleApprove = (id: number, name: string, email: string) => {
    setConfirmApprove({ id, name, email });
  };

  const confirmApproval = () => {
    if (!confirmApprove) return;
    approveMutation.mutate({
      id: confirmApprove.id,
      applicantName: confirmApprove.name,
      applicantEmail: confirmApprove.email,
      appUrl: window.location.origin,
    });
  };

  const pendingCount = applications?.filter((a) => a.status === "pending").length ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-brand text-2xl text-foreground">
            Founding Member <em className="font-brand font-semibold" style={{ color: "oklch(0.74 0.14 72)" }}>Applications</em>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve applications from the marketing site.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <Badge
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              className="text-xs font-semibold"
            >
              {pendingCount} pending
            </Badge>
          )}
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading applications…</div>
      ) : !applications || applications.length === 0 ? (
        <div className="text-sm text-muted-foreground py-12 text-center border border-border/40 rounded-lg">
          {statusFilter === "pending" ? "No pending applications." : "No applications found."}
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="border border-border/40 rounded-lg p-4 bg-card/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{app.name}</span>
                    <StatusBadge status={app.status} />
                  </div>
                  <a
                    href={`mailto:${app.email}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {app.email}
                  </a>
                  {app.relationship && (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed border-l-2 border-border/40 pl-3">
                      {app.relationship}
                    </p>
                  )}
                  {app.inviteCodeSent && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <p className="text-xs text-muted-foreground font-log">
                        Code: <span style={{ color: "oklch(0.74 0.14 72)" }}>{app.inviteCodeSent}</span>
                      </p>
                      {(app as any).hasRedeemed ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "oklch(0.74 0.14 72 / 0.15)", color: "oklch(0.74 0.14 72)", border: "1px solid oklch(0.74 0.14 72 / 0.35)" }}
                        >
                          FM · Redeemed
                          {(app as any).trialDaysLeft !== null && (
                            <span style={{ opacity: 0.75 }}> · {(app as any).trialDaysLeft}d left</span>
                          )}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "var(--muted)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
                        >
                          FM · Not yet redeemed
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Applied {new Date(app.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0 flex-col items-end">
                  {app.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => rejectMutation.mutate({ id: app.id })}
                        disabled={rejectMutation.isPending}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs font-semibold"
                        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                        onClick={() => handleApprove(app.id, app.name, app.email)}
                        disabled={approveMutation.isPending}
                      >
                        Approve + Send Code
                      </Button>
                    </div>
                  )}
                  {app.status === "approved" && app.inviteCodeSent && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: "oklch(0.74 0.14 72 / 0.5)", color: "oklch(0.74 0.14 72)" }}
                      onClick={() =>
                        resendInviteMutation.mutate({
                          id: app.id,
                          applicantName: app.name,
                          applicantEmail: app.email,
                          inviteCode: app.inviteCodeSent!,
                        })
                      }
                      disabled={resendInviteMutation.isPending}
                      title="Re-send the approval email with the invite deep link"
                    >
                      {resendInviteMutation.isPending ? "Sending…" : "✉ Resend Invite"}
                    </Button>
                  )}
                  {app.status === "approved" && (app as any).hasRedeemed && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: "oklch(0.74 0.14 72 / 0.35)", color: "oklch(0.74 0.14 72)" }}
                      onClick={() =>
                        resendReminderMutation.mutate({ applicantEmail: app.email })
                      }
                      disabled={resendReminderMutation.isPending}
                      title="Re-send the trial expiry reminder email to this founding member"
                    >
                      {resendReminderMutation.isPending ? "Sending…" : "Resend Reminder"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmApprove} onOpenChange={() => setConfirmApprove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {confirmApprove?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a unique invite code and send it to{" "}
              <strong>{confirmApprove?.email}</strong> with a pre-filled activation link.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApproval}
              style={{ background: "oklch(0.74 0.14 72)", color: "#080a0f" }}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Sending…" : "Approve & Send Email"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400">
        Pending
      </Badge>
    );
  }
  if (status === "approved") {
    return (
      <Badge variant="outline" className="text-xs border-green-500/40 text-green-400">
        Approved
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs border-red-500/40 text-red-400">
      Rejected
    </Badge>
  );
}
