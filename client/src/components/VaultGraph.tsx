/**
 * VaultGraph — D3.js force-directed knowledge graph for the Vault.
 * Nodes: item (circle) | project (diamond)
 * Edges: project_link (solid gold) | tag (dashed muted)
 * Features: search/highlight, tag clustering, PNG export,
 *           tag filter lens, D3 node entry animation
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";

export type GraphNode = {
  id: string;
  label: string;
  type: "item" | "project";
  state: string;
  contentClass?: string;
  updatedAt: string;
  tags?: string[];
};

export type GraphEdge = {
  source: string;
  target: string;
  type: "project_link" | "tag";
};

interface SimNode extends GraphNode, d3.SimulationNodeDatum {
  clusterX?: number;
  clusterY?: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  type: "project_link" | "tag";
}

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (id: string, type: "item" | "project") => void;
}

const STATE_COLOR: Record<string, string> = {
  inbox:     "#6B7280",
  mapped:    "#3B82F6",
  active:    "#EAB308",
  today:     "#F97316",
  parked:    "#8B5CF6",
  done:      "#22C55E",
  idea:      "#6B7280",
  planning:  "#3B82F6",
  paused:    "#8B5CF6",
  completed: "#22C55E",
};
const stateColor = (s: string) => STATE_COLOR[s] ?? "#6B7280";

function buildClusterCenters(nodes: GraphNode[], width: number, height: number) {
  const tags = Array.from(new Set(nodes.flatMap((n) => n.tags ?? []))).slice(0, 12);
  const centers: Record<string, { x: number; y: number }> = {};
  tags.forEach((tag, i) => {
    const angle = (i / tags.length) * 2 * Math.PI;
    const r = Math.min(width, height) * 0.32;
    centers[tag] = { x: width / 2 + r * Math.cos(angle), y: height / 2 + r * Math.sin(angle) };
  });
  return centers;
}

export function VaultGraph({ nodes, edges, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [showTagEdges, setShowTagEdges] = useState(true);
  const [showProjectEdges, setShowProjectEdges] = useState(true);
  const [clusterByTag, setClusterByTag] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; state: string } | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");

  const searchLower = search.trim().toLowerCase();

  // Collect all unique tags for the filter dropdown
  const allTags = Array.from(new Set(nodes.flatMap((n) => n.tags ?? []))).sort();

  // Nodes visible under the tag filter lens
  const filteredNodes = tagFilter === "all"
    ? nodes
    : nodes.filter((n) => n.type === "project" || (n.tags ?? []).includes(tagFilter));

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = edges.filter(
    (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
  );

  const exportPng = useCallback(() => {
    const el = svgRef.current;
    if (!el) return;
    const serializer = new XMLSerializer();
    const clone = el.cloneNode(true) as SVGSVGElement;
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", "#0f1117");
    clone.insertBefore(bg, clone.firstChild);
    const svgStr = serializer.serializeToString(clone);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = el.clientWidth || 800;
      canvas.height = el.clientHeight || 560;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `continuary-vault-graph-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    };
    img.src = url;
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const el = svgRef.current;
    const svg = d3.select(el);
    svg.selectAll("*").remove();

    const width = el.clientWidth || 800;
    const height = el.clientHeight || 560;

    const visibleEdges = filteredEdges.filter(
      (e) => (e.type === "project_link" && showProjectEdges) || (e.type === "tag" && showTagEdges)
    );

    const simNodes: SimNode[] = filteredNodes.map((n) => ({ ...n }));
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = visibleEdges
      .map((e) => ({ source: nodeById.get(e.source)!, target: nodeById.get(e.target)!, type: e.type }))
      .filter((e) => e.source && e.target);

    const clusterCenters = clusterByTag ? buildClusterCenters(filteredNodes, width, height) : {};

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        d3.forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((l) => (l.type === "project_link" ? 120 : 80))
          .strength(0.4)
      )
      .force("charge", d3.forceManyBody<SimNode>().strength(-180))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<SimNode>(24));

    if (clusterByTag) {
      simulation.force("cluster", () => {
        simNodes.forEach((d) => {
          const tag = (d.tags ?? [])[0];
          if (!tag || !clusterCenters[tag]) return;
          const { x: cx, y: cy } = clusterCenters[tag];
          const strength = 0.12;
          d.vx = (d.vx ?? 0) + (cx - (d.x ?? 0)) * strength;
          d.vy = (d.vy ?? 0) + (cy - (d.y ?? 0)) * strength;
        });
      });
    }

    const g = svg.append("g");

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    const defs = svg.append("defs");
    (["project_link", "tag"] as const).forEach((t) => {
      defs
        .append("marker")
        .attr("id", `arrow-${t}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 22)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", t === "project_link" ? "rgba(234,179,8,0.6)" : "rgba(107,114,128,0.35)");
    });

    if (clusterByTag) {
      const clusterG = g.append("g").attr("opacity", 0.18);
      Object.entries(clusterCenters).forEach(([tag, { x, y }]) => {
        clusterG.append("circle")
          .attr("cx", x).attr("cy", y).attr("r", 70)
          .attr("fill", "none").attr("stroke", "rgba(255,255,255,0.3)").attr("stroke-dasharray", "4 3");
        clusterG.append("text")
          .attr("x", x).attr("y", y - 74)
          .attr("text-anchor", "middle").attr("font-size", "9px")
          .attr("fill", "rgba(255,255,255,0.5)")
          .text(`#${tag}`);
      });
    }

    const link = g
      .append("g")
      .selectAll<SVGLineElement, SimLink>("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", (d) => d.type === "project_link" ? "rgba(234,179,8,0.45)" : "rgba(107,114,128,0.22)")
      .attr("stroke-width", (d) => (d.type === "project_link" ? 1.5 : 1))
      .attr("stroke-dasharray", (d) => (d.type === "tag" ? "4 3" : null))
      .attr("marker-end", (d) => `url(#arrow-${d.type})`);

    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      });

    const node = g
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .style("cursor", "pointer")
      // ── Entry animation: fade in from opacity 0 ──
      .attr("opacity", 0)
      .call(drag)
      .on("click", (_event, d) => onNodeClick?.(d.id, d.type))
      .on("mouseenter", (event: MouseEvent, d) => {
        const rect = el.getBoundingClientRect();
        setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, label: d.label, state: d.state });
      })
      .on("mouseleave", () => setTooltip(null));

    // Animate nodes in after a short delay
    node.transition()
      .delay((_d, i) => i * 18)
      .duration(300)
      .attr("opacity", 1);

    // Project → diamond
    node
      .filter((d) => d.type === "project")
      .append("rect")
      .attr("width", 18).attr("height", 18).attr("x", -9).attr("y", -9)
      .attr("transform", "rotate(45)")
      .attr("fill", (d) => stateColor(d.state))
      .attr("stroke", "#EAB308").attr("stroke-width", 2).attr("opacity", 0.9);

    // Item → circle
    node
      .filter((d) => d.type === "item")
      .append("circle")
      .attr("r", (d) => {
        const age = Date.now() - new Date(d.updatedAt).getTime();
        return age < 86400000 ? 9 : 7;
      })
      .attr("fill", (d) => stateColor(d.state))
      .attr("stroke", "rgba(255,255,255,0.12)").attr("stroke-width", 1)
      .attr("opacity", (d) => {
        if (!searchLower) return 0.85;
        return d.label.toLowerCase().includes(searchLower) ? 1 : 0.1;
      });

    // Labels
    node
      .filter((d) => d.type === "project" || d.label.length < 20)
      .append("text")
      .text((d) => (d.label.length > 22 ? d.label.slice(0, 20) + "…" : d.label))
      .attr("dy", (d) => (d.type === "project" ? -14 : -11))
      .attr("text-anchor", "middle").attr("font-size", "9px")
      .attr("fill", "rgba(250,250,250,0.65)").attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);
      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { simulation.stop(); };
  }, [filteredNodes, filteredEdges, showTagEdges, showProjectEdges, clusterByTag, onNodeClick, searchLower]);

  const itemCount = filteredNodes.filter((n) => n.type === "item").length;
  const projectCount = filteredNodes.filter((n) => n.type === "project").length;

  return (
    <div className="relative w-full" style={{ height: 560 }}>
      {/* Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-3 bg-background/80 backdrop-blur border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground max-w-[calc(100%-130px)]">
        <span className="font-medium text-foreground">{itemCount} items · {projectCount} projects</span>
        <span className="w-px h-4 bg-border" />

        {/* Search */}
        <input
          type="text"
          placeholder="Search nodes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-6 w-32 rounded border border-border bg-background/60 px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground text-[10px]">✕</button>
        )}

        <span className="w-px h-4 bg-border" />

        {/* Tag filter lens */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Tag lens:</span>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="h-6 rounded border border-border bg-background/60 px-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>#{t}</option>
            ))}
          </select>
          {tagFilter !== "all" && (
            <button onClick={() => setTagFilter("all")} className="text-muted-foreground hover:text-foreground text-[10px]">✕</button>
          )}
        </div>

        <span className="w-px h-4 bg-border" />

        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input type="checkbox" checked={showProjectEdges} onChange={(e) => setShowProjectEdges(e.target.checked)} className="w-3 h-3 accent-yellow-400" />
          <span className="text-yellow-500">Project links</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input type="checkbox" checked={showTagEdges} onChange={(e) => setShowTagEdges(e.target.checked)} className="w-3 h-3 accent-gray-400" />
          <span>Tag edges</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input type="checkbox" checked={clusterByTag} onChange={(e) => setClusterByTag(e.target.checked)} className="w-3 h-3 accent-violet-400" />
          <span className="text-amber-400">Group by tag</span>
        </label>
      </div>

      {/* PNG Export button */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <button
          onClick={exportPng}
          title="Save as PNG"
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/60 backdrop-blur border border-border rounded px-2 py-1 hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 2v8M5 7l3 3 3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Save PNG
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-background/80 backdrop-blur border border-border rounded-lg px-3 py-2 text-[10px] text-muted-foreground space-y-1">
        {[
          { color: "#EAB308", label: "Active" },
          { color: "#3B82F6", label: "Mapped" },
          { color: "#F97316", label: "Today" },
          { color: "#8B5CF6", label: "Parked" },
          { color: "#22C55E", label: "Done" },
          { color: "#6B7280", label: "Inbox" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 pt-1 border-t border-border">
          <span className="inline-block w-2.5 h-2.5 rotate-45 flex-shrink-0" style={{ background: "#EAB308", border: "1px solid #EAB308" }} />
          Project
        </div>
      </div>

      {/* Hint */}
      <div className="absolute bottom-3 right-3 z-10 text-[10px] text-muted-foreground bg-background/60 backdrop-blur px-2 py-1 rounded">
        Scroll to zoom · Drag to pan · Click to open
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 bg-popover text-popover-foreground border border-border rounded px-2 py-1 text-xs pointer-events-none shadow-md max-w-[200px]"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <div className="font-medium truncate">{tooltip.label}</div>
          <div className="text-muted-foreground capitalize">{tooltip.state}</div>
        </div>
      )}

      {/* Empty state */}
      {filteredNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          {tagFilter !== "all" ? `No items tagged #${tagFilter}.` : "Add vault items to see the graph."}
        </div>
      )}

      <svg
        ref={svgRef}
        className="w-full h-full rounded-xl border border-border bg-background"
        style={{ minHeight: 560 }}
      />
    </div>
  );
}
