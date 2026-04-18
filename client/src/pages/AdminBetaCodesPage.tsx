import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Download, RefreshCw } from "lucide-react";

export default function AdminBetaCodesPage() {
  const { data: codes, isLoading, refetch } = trpc.beta.listCodes.useQuery();
  const generateCodes = trpc.beta.generateCodes.useMutation({ onSuccess: () => refetch() });
  const [genCount, setGenCount] = useState(10);

  const used = codes?.filter((c) => c.usedBy).length ?? 0;
  const available = (codes?.length ?? 0) - used;

  const copyAll = () => {
    const unused = codes?.filter((c) => !c.usedBy).map((c) => c.code).join("\n") ?? "";
    navigator.clipboard.writeText(unused);
    toast.success("Copied unused codes to clipboard");
  };

  const downloadCSV = () => {
    const rows = ["code,status,usedAt"];
    codes?.forEach((c) => rows.push(`${c.code},${c.usedBy ? "used" : "available"},${c.usedAt ? new Date(c.usedAt).toISOString() : ""}`));
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "beta-codes.csv"; a.click();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Beta Codes</h1>
          <p className="text-sm text-muted-foreground mt-1">{available} available · {used} used · {codes?.length ?? 0} total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyAll}><Copy className="w-4 h-4 mr-1" /> Copy unused</Button>
          <Button variant="outline" size="sm" onClick={downloadCSV}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
        </div>
      </div>

      <div className="flex items-center gap-2 p-4 rounded-lg border border-border bg-card">
        <span className="text-sm text-muted-foreground">Generate</span>
        <Input type="number" min={1} max={100} value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} className="w-20 h-8 text-sm" />
        <span className="text-sm text-muted-foreground">new codes</span>
        <Button size="sm" onClick={() => generateCodes.mutate({ count: genCount })} disabled={generateCodes.isPending}>
          <RefreshCw className="w-3 h-3 mr-1" /> Generate
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading codes…</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Code</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Used At</th>
              </tr>
            </thead>
            <tbody>
              {codes?.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2 font-mono text-xs">{c.code}</td>
                  <td className="px-4 py-2">
                    {c.usedBy ? (
                      <Badge variant="secondary" className="text-xs">Used</Badge>
                    ) : (
                      <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Available</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {c.usedAt ? new Date(c.usedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
