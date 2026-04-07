/**
 * VaultGraph — D3.js force-directed knowledge graph for the Vault.
 * Nodes: item (circle) | project (diamond)
 * Edges: project_link (solid gold) | tag (dashed muted)
 */

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export type GraphNode = {
  id: string;
  label: string;
  type: "item" | "project";
  state: string;
  contentClass?: string;
  updatedAt: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  type: "project_link" | "tag";
};

interface SimNode extends GraphNode, d3.SimulationNodeDatum {}

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

export function VaultGraph({ nodes, edges, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [showTagEdges, setShowTagEdges] = useState(true);
  const [showProjectEdges, setShowProjectEdges] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; state: string } | null>(null);
  const [search, setSearch] = useState("");
  const searchLower = search.trim().toLowerCase();

  useEffect(() => {
    if (!svgRef.current) return;
    const el = svgRef.current;
    const svg = d3.select(el);
    svg.selectAll("*").remove();

    const width = el.clientWidth || 800;
    const height = el.clientHeight || 560;

    const visibleEdges = edges.filter(
      (e) => (e.type === "project_link" && showProjectEdges) || (e.type === "tag" && showTagEdges)
    );

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = visibleEdges
      .map((e) => ({ source: nodeById.get(e.source)!, target: nodeById.get(e.target)!, type: e.type }))
      .filter((e) => e.source && e.target);

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

    const g = svg.append("g");

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    // Arrow markers
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

    // Edges
    const link = g
      .append("g")
      .selectAll<SVGLineElement, SimLink>("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", (d) => d.type === "project_link" ? "rgba(234,179,8,0.45)" : "rgba(107,114,128,0.22)")
      .attr("stroke-width", (d) => (d.type === "project_link" ? 1.5 : 1))
      .attr("stroke-dasharray", (d) => (d.type === "tag" ? "4 3" : null))
      .attr("marker-end", (d) => `url(#arrow-${d.type})`);

    // Drag
    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    // Node groups
    const node = g
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .style("cursor", "pointer")
      .call(drag)
      .on("click", (_event, d) => onNodeClick?.(d.id, d.type))
      .on("mouseenter", (event: MouseEvent, d) => {
        const rect = el.getBoundingClientRect();
        setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, label: d.label, state: d.state });
      })
      .on("mouseleave", () => setTooltip(null));

    // Project → diamond
    node
      .filter((d) => d.type === "project")
      .append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("x", -9)
      .attr("y", -9)
      .attr("transform", "rotate(45)")
      .attr("fill", (d) => stateColor(d.state))
      .attr("stroke", "#EAB308")
      .attr("stroke-width", 2)
      .attr("opacity", 0.9);

    // Item → circle
    node
      .filter((d) => d.type === "item")
      .append("circle")
      .attr("r", (d) => {
        const age = Date.now() - new Date(d.updatedAt).getTime();
        return age < 86400000 ? 9 : 7;
      })
      .attr("fill", (d) => stateColor(d.state))
      .attr("stroke", "rgba(255,255,255,0.12)")
      .attr("stroke-width", 1)
      .attr("opacity", (d) => {
        if (!searchLower) return 0.85;
        return d.label.toLowerCase().includes(searchLower) ? 1 : 0.1;
      });

    // Labels for projects + short-label items
    node
      .filter((d) => d.type === "project" || d.label.length < 20)
      .append("text")
      .text((d) => (d.label.length > 22 ? d.label.slice(0, 20) + "…" : d.label))
      .attr("dy", (d) => (d.type === "project" ? -14 : -11))
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("fill", "rgba(250,250,250,0.65)")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);
      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { simulation.stop(); };
  }, [nodes, edges, showTagEdges, showProjectEdges, onNodeClick, searchLower]);

  const itemCount = nodes.filter((n) => n.type === "item").length;
  const projectCount = nodes.filter((n) => n.type === "project").length;

  return (
    <div className="relative w-full" style={{ height: 560 }}>
      {/* Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-3 bg-background/80 backdrop-blur border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground max-w-[calc(100%-120px)]">
        <span className="font-medium text-foreground">{itemCount} items · {projectCount} projects</span>
        <span className="w-px h-4 bg-border" />
        <input
          type="text"
          placeholder="Search nodes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-6 w-36 rounded border border-border bg-background/60 px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground text-[10px]">✕ clear</button>
        )}
        <span className="w-px h-4 bg-border" />
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input type="checkbox" checked={showProjectEdges} onChange={(e) => setShowProjectEdges(e.target.checked)} className="w-3 h-3 accent-yellow-500" />
          <span className="text-yellow-500">Project links</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input type="checkbox" checked={showTagEdges} onChange={(e) => setShowTagEdges(e.target.checked)} className="w-3 h-3 accent-gray-400" />
          <span>Tag clusters</span>
        </label>
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
      <div className="absolute top-3 right-3 z-10 text-[10px] text-muted-foreground bg-background/60 backdrop-blur px-2 py-1 rounded">
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
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Add vault items to see the graph.
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
