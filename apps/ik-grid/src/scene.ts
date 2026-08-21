import { Figure, PALETTE } from "./figures";
import { GridModel } from "./grid";
import { clamp } from "./ik";

export type Density = "sparse" | "cozy" | "packed";

interface DensityConfig {
  cols: number;
  rows: number;
  figures: number;
}

export const DENSITIES: Record<Density, DensityConfig> = {
  sparse: { cols: 5, rows: 3, figures: 4 },
  cozy: { cols: 6, rows: 4, figures: 6 },
  packed: { cols: 9, rows: 5, figures: 8 },
};

const BG = "#f6f2e8";
const GRID_LINE = "rgba(62, 52, 30, 0.22)";
const GRID_DOT = "rgba(62, 52, 30, 0.4)";
const HANDLE_STROKE = "rgba(62, 52, 30, 0.55)";
const HANDLE_HIT = 16;
const MIN_CELL = 24;
const EDGE_PAD = 10;

type Corner = 0 | 1 | 2 | 3;
const CORNERS: readonly Corner[] = [0, 1, 2, 3];

type Drag =
  | { kind: "corner"; corner: Corner }
  | { kind: "move"; offsetX: number; offsetY: number };

function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export class Scene {
  readonly grid: GridModel;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly figures: Figure[] = [];
  private readonly resizeObserver: ResizeObserver;
  private drag: Drag | null = null;
  private hoverCorner: Corner | null = null;
  private raf = 0;
  private lastNow = 0;

  constructor(canvas: HTMLCanvasElement, density: Density) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d canvas context unavailable");
    this.ctx = ctx;

    const cfg = DENSITIES[density];
    this.grid = new GridModel(cfg.cols, cfg.rows);
    this.fitCanvas();
    this.centerGrid();
    this.populate(cfg.figures);

    this.resizeObserver = new ResizeObserver(() => {
      this.fitCanvas();
      this.clampRect();
    });
    this.resizeObserver.observe(canvas);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);

    this.lastNow = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
  }

  setDensity(density: Density): void {
    const cfg = DENSITIES[density];
    this.grid.cols = cfg.cols;
    this.grid.rows = cfg.rows;
    this.clampRect();
    this.populate(cfg.figures);
  }

  // ----- placement ----------------------------------------------------------
  //
  // Invariants (this is what keeps the crowd readable):
  // - every figure lives in exactly one cell and its feet own that cell's two
  //   bottom corner vertices;
  // - no two figures ever share a column, so feet can never collapse onto the
  //   same vertical line while chasing a dragged grid;
  // - figures in horizontally adjacent columns sit on different rows, so no
  //   grid vertex is ever shared between two figures.

  /** Re-seat the cast (grid may have changed shape underneath them). */
  private populate(count: number): void {
    const g = this.grid;
    const seats = Math.min(count, g.cols);
    this.figures.length = Math.min(this.figures.length, seats);

    const columns = shuffled([...Array(g.cols).keys()])
      .slice(0, seats)
      .sort((a, b) => a - b);

    const rows: number[] = [];
    for (let idx = 0; idx < columns.length; idx++) {
      let r = Math.floor(Math.random() * g.rows);
      const adjacentToPrev = idx > 0 && columns[idx] - columns[idx - 1] === 1;
      if (adjacentToPrev && g.rows > 1) {
        while (r === rows[idx - 1]) r = Math.floor(Math.random() * g.rows);
      }
      rows.push(r);
    }

    // Hand columns out left-to-right in the figures' current order so nobody
    // has to walk across the whole grid on a preset change.
    const cast = [...this.figures].sort((a, b) => a.ci - b.ci);
    for (let idx = 0; idx < columns.length; idx++) {
      const fig = cast[idx];
      if (fig) {
        fig.ci = columns[idx];
        fig.cj = rows[idx];
      } else {
        const used = new Map<string, number>();
        for (const f of this.figures) used.set(f.color, (used.get(f.color) ?? 0) + 1);
        const color = [...PALETTE].sort((a, b) => (used.get(a) ?? 0) - (used.get(b) ?? 0))[0];
        const newcomer = new Figure(color, columns[idx], rows[idx], this.grid);
        newcomer.wanderAt = performance.now() / 1000 + 1 + Math.random() * 4;
        this.figures.push(newcomer);
      }
    }
  }

  private maybeWander(fig: Figure, time: number): void {
    if (time < fig.wanderAt || fig.isStepping() || this.drag) return;
    fig.wanderAt = time + 3 + Math.random() * 5;

    const g = this.grid;
    const others = this.figures.filter((f) => f !== fig);
    const options: { ci: number; cj: number }[] = [];

    for (const dj of [-1, 1]) {
      const cj = fig.cj + dj;
      if (cj < 0 || cj >= g.rows) continue;
      if (others.some((f) => Math.abs(f.ci - fig.ci) === 1 && f.cj === cj)) continue;
      options.push({ ci: fig.ci, cj });
    }
    for (const di of [-1, 1]) {
      const ci = fig.ci + di;
      if (ci < 0 || ci >= g.cols) continue;
      if (others.some((f) => f.ci === ci)) continue;
      if (others.some((f) => Math.abs(f.ci - ci) === 1 && f.cj === fig.cj)) continue;
      options.push({ ci, cj: fig.cj });
    }

    if (options.length === 0) return;
    const target = options[Math.floor(Math.random() * options.length)];
    fig.ci = target.ci;
    fig.cj = target.cj;
  }

  // ----- canvas & rect ----------------------------------------------------

  private fitCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = this.canvas;
    this.canvas.width = Math.max(1, Math.round(clientWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(clientHeight * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private centerGrid(): void {
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    this.grid.w = cw * 0.62;
    this.grid.h = ch * 0.56;
    this.grid.x = (cw - this.grid.w) / 2;
    this.grid.y = (ch - this.grid.h) / 2 + ch * 0.03;
    this.clampRect();
  }

  private clampRect(): void {
    const g = this.grid;
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    g.w = clamp(g.w, g.cols * MIN_CELL, Math.max(g.cols * MIN_CELL, cw - EDGE_PAD * 2));
    g.h = clamp(g.h, g.rows * MIN_CELL, Math.max(g.rows * MIN_CELL, ch - EDGE_PAD * 2));
    g.x = clamp(g.x, EDGE_PAD, Math.max(EDGE_PAD, cw - g.w - EDGE_PAD));
    g.y = clamp(g.y, EDGE_PAD, Math.max(EDGE_PAD, ch - g.h - EDGE_PAD));
  }

  // ----- pointer ----------------------------------------------------------

  private cornerAt(px: number, py: number): Corner | null {
    for (const c of CORNERS) {
      const { x, y } = this.grid.corner(c);
      if (Math.hypot(px - x, py - y) <= HANDLE_HIT) return c;
    }
    return null;
  }

  private onPointerDown = (e: PointerEvent) => {
    const px = e.offsetX;
    const py = e.offsetY;
    const corner = this.cornerAt(px, py);
    if (corner !== null) {
      this.drag = { kind: "corner", corner };
    } else if (this.grid.contains(px, py)) {
      this.drag = { kind: "move", offsetX: px - this.grid.x, offsetY: py - this.grid.y };
    } else {
      return;
    }
    this.canvas.setPointerCapture(e.pointerId);
    this.updateCursor(px, py);
  };

  private onPointerMove = (e: PointerEvent) => {
    const px = e.offsetX;
    const py = e.offsetY;
    if (this.drag?.kind === "corner") {
      this.resizeFromCorner(this.drag.corner, px, py);
    } else if (this.drag?.kind === "move") {
      this.grid.x = px - this.drag.offsetX;
      this.grid.y = py - this.drag.offsetY;
      this.clampRect();
    } else {
      this.hoverCorner = this.cornerAt(px, py);
    }
    this.updateCursor(px, py);
  };

  private onPointerUp = (e: PointerEvent) => {
    this.drag = null;
    this.updateCursor(e.offsetX, e.offsetY);
  };

  private resizeFromCorner(corner: Corner, px: number, py: number): void {
    const g = this.grid;
    const anchorIndex = ((corner + 2) % 4);
    const anchor = g.corner(CORNERS[anchorIndex]);
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    const x = clamp(px, EDGE_PAD, cw - EDGE_PAD);
    const y = clamp(py, EDGE_PAD, ch - EDGE_PAD);
    const minW = g.cols * MIN_CELL;
    const minH = g.rows * MIN_CELL;
    const rightSide = corner === 1 || corner === 2;
    const bottomSide = corner === 2 || corner === 3;

    g.w = Math.max(minW, rightSide ? x - anchor.x : anchor.x - x);
    g.h = Math.max(minH, bottomSide ? y - anchor.y : anchor.y - y);
    g.x = rightSide ? anchor.x : anchor.x - g.w;
    g.y = bottomSide ? anchor.y : anchor.y - g.h;
  }

  private updateCursor(px: number, py: number): void {
    let cursor = "default";
    const corner = this.drag?.kind === "corner" ? this.drag.corner : this.cornerAt(px, py);
    if (corner !== null) {
      cursor = corner === 0 || corner === 2 ? "nwse-resize" : "nesw-resize";
    } else if (this.drag?.kind === "move") {
      cursor = "grabbing";
    } else if (this.grid.contains(px, py)) {
      cursor = "grab";
    }
    this.canvas.style.cursor = cursor;
  }

  // ----- loop -------------------------------------------------------------

  private tick = (now: number) => {
    const dt = Math.min(0.05, (now - this.lastNow) / 1000);
    this.lastNow = now;
    const time = now / 1000;

    for (const fig of this.figures) {
      this.maybeWander(fig, time);
      fig.update(dt, time, this.grid);
    }
    this.draw();
    this.raf = requestAnimationFrame(this.tick);
  };

  private draw(): void {
    const ctx = this.ctx;
    const g = this.grid;
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= g.cols; i++) {
      const x = g.vertexX(i);
      ctx.moveTo(x, g.y);
      ctx.lineTo(x, g.y + g.h);
    }
    for (let j = 0; j <= g.rows; j++) {
      const y = g.vertexY(j);
      ctx.moveTo(g.x, y);
      ctx.lineTo(g.x + g.w, y);
    }
    ctx.stroke();

    ctx.fillStyle = GRID_DOT;
    for (let i = 0; i <= g.cols; i++) {
      for (let j = 0; j <= g.rows; j++) {
        ctx.beginPath();
        ctx.arc(g.vertexX(i), g.vertexY(j), 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Painter's order: figures on lower rows draw over the ones above them.
    for (const fig of [...this.figures].sort((a, b) => a.cj - b.cj)) fig.draw(ctx);

    for (const c of CORNERS) {
      const { x, y } = g.corner(c);
      const active =
        this.hoverCorner === c || (this.drag?.kind === "corner" && this.drag.corner === c);
      ctx.beginPath();
      ctx.arc(x, y, active ? 9 : 6, 0, Math.PI * 2);
      ctx.fillStyle = BG;
      ctx.fill();
      ctx.strokeStyle = HANDLE_STROKE;
      ctx.lineWidth = active ? 2.5 : 1.5;
      ctx.stroke();
    }
  }
}
