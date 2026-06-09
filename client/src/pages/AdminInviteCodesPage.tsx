/**
 * AdminInviteCodesPage — admin-only page for managing beta invite codes.
 *
 * Features:
 *  - Single code generation with optional label
 *  - Bulk generation (1–20 codes at once) with optional label prefix
 *  - Copy individual codes to clipboard
 *  - Copy all unused codes to clipboard as a plain list
 *  - Usage stats (available vs redeemed)
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Plus, Ticket, CheckCircle2, Clock, Layers, ClipboardList } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminInviteCodesPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [label, setLabel] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | "">("");
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkPrefix, setBulkPrefix] = useState("");
  const [bulkExpiresInDays, setBulkExpiresInDays] = useState<number | "">("");
  const [copied, setCopied] = useState<string | null>(null);

  // Redirect non-admins
  if (user && user.role !== "admin") {
    navigate("/");
    return null;
  }

  const { data: codes, isLoading, refetch } = trpc.invites.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const generate = trpc.invites.generate.useMutation({
    onSuccess: (newCode) => {
      toast.success(`Code ${newCode.code} created`);
      setLabel("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkGenerate = trpc.invites.bulkGenerate.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.count} codes generated`);
      setBulkPrefix("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleCopyAll = () => {
    const unused = codes?.filter((c) => c.usedAt === null).map((c) => c.code) ?? [];
    if (unused.length === 0) {
      toast.info("No unused codes to copy.");
      return;
    }
    navigator.clipboard.writeText(unused.join("\n")).then(() => {
      toast.success(`${unused.length} codes copied to clipboard`);
    });
  };

  const usedCount = codes?.filter((c) => c.usedAt !== null).length ?? 0;
  const unusedCount = codes?.filter((c) => c.usedAt === null).length ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Ticket className="w-5 h-5 text-amber-500" />
          <h1 className="text-xl font-semibold tracking-tight">Invite Codes</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate single-use codes for beta readers. Each code can only be redeemed once.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="pt-5 pb-4">
            <p className="text-2xl font-bold text-foreground">{unusedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Available</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-5 pb-4">
            <p className="text-2xl font-bold text-foreground">{usedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Redeemed</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-5 pb-4">
            <p className="text-2xl font-bold text-foreground">{codes?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Single code generation */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Generate a single code
          </CardTitle>
          <CardDescription className="text-xs">
            Add an optional label (e.g. the reader's name) to track who you sent it to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (optional — e.g. Jane Smith)"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && generate.mutate({ label: label.trim() || undefined, expiresInDays: expiresInDays || undefined })}
            />
            <Input
              type="number"
              min={1}
              max={365}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value ? Math.min(365, Math.max(1, parseInt(e.target.value))) : "")}
              placeholder="Expires in days"
              className="w-36"
            />
            <Button
              onClick={() => generate.mutate({ label: label.trim() || undefined, expiresInDays: expiresInDays || undefined })}
              disabled={generate.isPending}
              className="gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk generation */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Bulk generate codes
          </CardTitle>
          <CardDescription className="text-xs">
            Create multiple codes at once for your first beta cohort. Max 20 per batch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-center">
            <label className="text-xs text-muted-foreground shrink-0 w-14">Count</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={bulkCount}
              onChange={(e) => setBulkCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-20"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-muted-foreground shrink-0 w-14">Prefix</label>
            <Input
              value={bulkPrefix}
              onChange={(e) => setBulkPrefix(e.target.value)}
              placeholder="Optional — e.g. Beta Wave 1"
              className="flex-1"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-muted-foreground shrink-0 w-14">Expires</label>
            <Input
              type="number"
              min={1}
              max={365}
              value={bulkExpiresInDays}
              onChange={(e) => setBulkExpiresInDays(e.target.value ? Math.min(365, Math.max(1, parseInt(e.target.value))) : "")}
              placeholder="Days until expiry (optional)"
              className="flex-1"
            />
          </div>
          <Button
            onClick={() => bulkGenerate.mutate({ count: bulkCount, labelPrefix: bulkPrefix.trim() || undefined, expiresInDays: bulkExpiresInDays || undefined })}
            disabled={bulkGenerate.isPending}
            variant="outline"
            className="w-full gap-1.5"
          >
            <Layers className="w-4 h-4" />
            {bulkGenerate.isPending ? "Generating..." : `Generate ${bulkCount} codes`}
          </Button>
        </CardContent>
      </Card>

      {/* Code list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            All codes ({codes?.length ?? 0})
          </p>
          {unusedCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCopyAll}>
              <ClipboardList className="w-3.5 h-3.5" />
              Copy all unused ({unusedCount})
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && codes?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No codes yet. Generate your first one above.
          </div>
        )}

        {!isLoading && codes && codes.length > 0 && (
          <div className="space-y-2">
            {codes.map((c) => {
              const isUsed = c.usedAt !== null;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card"
                >
                  {/* Status icon */}
                  {isUsed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}

                  {/* Code + label */}
                  <div className="flex-1 min-w-0">
                    <p className="font-log text-sm font-semibold tracking-widest text-foreground">{c.code}</p>
                    {c.label && (
                      <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                    )}
                    {c.expiresAt && !isUsed && (
                      <p className={`text-xs mt-0.5 ${
                        new Date(c.expiresAt) < new Date()
                          ? "text-red-500"
                          : "text-amber-500"
                      }`}>
                        {new Date(c.expiresAt) < new Date()
                          ? "Expired"
                          : `Expires ${new Date(c.expiresAt).toLocaleDateString()}`
                        }
                      </p>
                    )}
                  </div>

                  {/* Badge */}
                  <Badge
                    variant={isUsed ? "secondary" : "outline"}
                    className={isUsed ? "text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800" : ""}
                  >
                    {isUsed ? "Redeemed" : "Available"}
                  </Badge>

                  {/* Copy button (only for unused codes) */}
                  {!isUsed && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 w-8 h-8"
                      onClick={() => handleCopy(c.code)}
                      title="Copy code"
                    >
                      {copied === c.code ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
