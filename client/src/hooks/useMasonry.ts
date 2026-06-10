import { useEffect, useRef } from "react";

/**
 * useMasonry — applies Pinterest-style packing to a CSS grid container.
 *
 * How it works:
 *  1. The grid uses `grid-auto-rows: 8px` (tiny row units).
 *  2. After each render, this hook measures each direct child's scrollHeight
 *     and sets `grid-row-end: span N` where N = ceil(height / (rowSize + gap)).
 *  3. Cards pack by content height — no holes from mismatched heights.
 *
 * Usage:
 *   const gridRef = useMasonry();
 *   <div ref={gridRef} className="masonry-grid"> ... </div>
 */
export function useMasonry(rowSize = 8, gap = 12) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = ref.current;
    if (!grid) return;

    function reflow() {
      if (!grid) return;
      const children = Array.from(grid.children) as HTMLElement[];
      children.forEach((child) => {
        // Reset first so we measure natural height
        child.style.gridRowEnd = "";
        const height = child.getBoundingClientRect().height;
        const spans = Math.ceil((height + gap) / (rowSize + gap));
        child.style.gridRowEnd = `span ${spans}`;
      });
    }

    // Run on mount and whenever content changes
    reflow();

    // Re-run on resize
    const ro = new ResizeObserver(reflow);
    ro.observe(grid);
    // Also observe each child (content changes like expanding accordions)
    Array.from(grid.children).forEach((child) => ro.observe(child));

    return () => ro.disconnect();
  });

  return ref;
}
