/**
 * ShareEvidenceModal
 *
 * Shows a styled preview of the current month's identity sentence and lets the
 * user either copy the text or download it as a PNG image (generated via Canvas).
 *
 * The canvas card matches the Continuary brand:
 *   - Dark navy background (#0f172a)
 *   - Amber accent line (#f59e0b)
 *   - White / off-white text
 *   - "Continuary" wordmark at the bottom
 */
import { useRef, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Download, Share2 } from "lucide-react";

// ─── Brand CDN icon (white bird on navy) ─────────────────────────────────────
const BRAND_ICON_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663270045694/VnvNaoJZPVnHWmB8F3cwwo/icon-monochrome-dark_502b7aa6.png";

// ─── Canvas drawing ───────────────────────────────────────────────────────────

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  maxWidth: number,
  lineHeight: number
): { lines: string[]; totalHeight: number } {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return { lines, totalHeight: lines.length * lineHeight };
}

function drawCard(
  canvas: HTMLCanvasElement,
  sentence: string,
  month: string,
  iconImg: HTMLImageElement | null
) {
  const W = 1080;
  const H = 1080;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, W, H);

  // Subtle top-left grid texture (very faint)
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let i = 0; i < W; i += 60) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
  }
  for (let j = 0; j < H; j += 60) {
    ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke();
  }

  // Amber accent bar (top)
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(80, 100, 60, 4);

  // "YOUR EVIDENCE" label
  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 22px 'Arial', sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText("YOUR EVIDENCE", 80, 160);
  ctx.letterSpacing = "0px";

  // Month label
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "22px 'Arial', sans-serif";
  ctx.fillText(month.toUpperCase(), 80, 200);

  // Sentence (large, italic, serif-style)
  ctx.fillStyle = "#f8fafc";
  ctx.font = "italic 52px Georgia, serif";
  const { lines } = wrapText(ctx, `"${sentence}"`, 80, W - 160, 72);
  const startY = 320;
  lines.forEach((line, i) => {
    ctx.fillText(line, 80, startY + i * 72);
  });

  // Bottom amber line
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(80, H - 160, W - 160, 2);

  // Continuary wordmark
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "bold 28px 'Arial', sans-serif";
  ctx.fillText("Continuary", W - 80 - ctx.measureText("Continuary").width, H - 100);

  // Icon (if loaded)
  if (iconImg) {
    const iconSize = 44;
    const iconX = W - 80 - ctx.measureText("Continuary").width - iconSize - 12;
    const iconY = H - 100 - iconSize + 8;
    ctx.drawImage(iconImg, iconX, iconY, iconSize, iconSize);
  }

  // "Permission to Start" tagline
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.font = "italic 22px Georgia, serif";
  ctx.fillText("companion to Permission to Start", 80, H - 100);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ShareEvidenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summaryLine: string;
  month: string; // "YYYY-MM"
}

function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ShareEvidenceModal({
  open,
  onOpenChange,
  summaryLine,
  month,
}: ShareEvidenceModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [iconImg, setIconImg] = useState<HTMLImageElement | null>(null);
  const [rendered, setRendered] = useState(false);

  // Pre-load the brand icon
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setIconImg(img);
    img.onerror = () => setIconImg(null); // graceful fallback
    img.src = BRAND_ICON_URL;
  }, []);

  // Draw whenever the modal opens or data changes
  useEffect(() => {
    if (!open || !canvasRef.current) return;
    drawCard(canvasRef.current, summaryLine, formatMonth(month), iconImg);
    setRendered(true);
  }, [open, summaryLine, month, iconImg]);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(summaryLine)
      .then(() => toast.success("Sentence copied to clipboard."))
      .catch(() => toast.error("Copy failed — please try manually."));
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `continuary-evidence-${month}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
    toast.success("Image downloaded.");
  };

  const handleShare = async () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) { toast.error("Could not generate image."); return; }
      const file = new File([blob], `continuary-evidence-${month}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "My Evidence Log",
            text: summaryLine,
          });
        } catch {
          // User cancelled — no toast needed
        }
      } else {
        // Fallback: download
        handleDownload();
      }
    }, "image/png");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-400" />
            Share your evidence
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sentence preview */}
          <div className="px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <p className="text-xs font-semibold text-amber-400/70 uppercase tracking-widest mb-1">
              {formatMonth(month)}
            </p>
            <p className="text-sm text-foreground/90 italic leading-relaxed">
              "{summaryLine}"
            </p>
          </div>

          {/* Canvas preview (scaled down) */}
          <div className="rounded-xl overflow-hidden border border-border/40 bg-slate-900">
            <canvas
              ref={canvasRef}
              className="w-full h-auto"
              style={{ display: rendered ? "block" : "none" }}
            />
            {!rendered && (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Generating preview…
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex-1 gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy text
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex-1 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download image
            </Button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <Button
                size="sm"
                onClick={handleShare}
                className="flex-1 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground/50 text-center">
            1080×1080 image — ready for Instagram, Twitter, or LinkedIn.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
