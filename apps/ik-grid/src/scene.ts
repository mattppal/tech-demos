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
  sparse: { cols: 4, rows: 3, figures: 4 },
  cozy: { cols: 6, rows: 4, figures: 6 },
  packed: { cols: 9, rows: 6, figures: 8 },
};

const BG = "#f6f2e8";
const GRID_LINE = "rgba(62, 52, 30, 0.16)";
const GRID_DOT = "rgba(62, 52, 30, 0.32)";
const HANDLE_STROKE = "rgba(62, 52, 30, 0.55)";
const HANDLE_HIT = 16;
const MIN_CELL = 24;
const EDGE_PAD = 10;

type Corner = 0 | 1 | 2 | 3;
const CORNERS: readonly Corner[] = [0, 1, 2, 3];

type Drag =
  | { kind: "corner"; corner: Corner }
  | { kind: "move"; offsetX: number; offsetY: number };

export class Scene {
  readonly grid: GridModel;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly figures: Figure[] = [];
  private readonly occupied = new Set<string>();
  private readonly resizeObserver: ResizeObserver;
  private drag: Drag | null = null;
  private hoverCorner: Corner | null = null;
  private raf = 0;
  private lastNow = 0;
  private paletteCursor = 0;

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

  // ----- figures & stances ------------------------------------------------

  private static vKey(i: number, j: number): string {
    return `${i},${j}`;
  }

  private isStanceFree(i: number, j: number, ignore?: Figure): boolean {
    if (i < 0 || i + 1 > this.grid.cols || j < 0 || j > this.grid.rows) return false;
    const own = new Set(
      ignore ? ignore.feet.map((f) => Scene.vKey(f.vi, f.vj)) : [],
    );
    for (const key of [Scene.vKey(i, j), Scene.vKey(i + 1, j)]) {
      if (this.occupied.has(key) && !own.has(key)) return false;
    }
    return true;
  }

  private claimStance(fig: Figure, i: number, j: number): void {
    for (const f of fig.feet) this.occupied.delete(Scene.vKey(f.vi, f.vj));
    fig.setStance(i, j);
    this.occupied.add(Scene.vKey(i, j));
    this.occupied.add(Scene.vKey(i + 1, j));
  }

  private allStances(): { i: number; j: number }[] {
    const out: { i: number; j: number }[] = [];
    for (let j = 0; j <= this.grid.rows; j++) {
      for (let i = 0; i < this.grid.cols; i++) out.push({ i, j });
    }
    return out;
  }

  private nearestFreeStance(pi: number, pj: number, ignore?: Figure): { i: number; j: number } | null {
    let best: { i: number; j: number } | null = null;
    let bestD = Infinity;
    for (const st of this.allStances()) {
      if (!this.isStanceFree(st.i, st.j, ignore)) continue;
      const d = Math.abs(st.i - pi) + Math.abs(st.j - pj);
      if (d < bestD) {
        bestD = d;
        best = st;
      }
    }
    return best;
  }

  /** Adjust the cast to `count`, re-seating everyone on the (possibly new) grid. */
  private populate(count: number): void {
    this.occupied.clear();
    this.figures.length = Math.min(this.figures.length, count);

    for (const fig of this.figures) {
      const pi = clamp(fig.feet[0].vi, 0, this.grid.cols - 1);
      const pj = clamp(fig.feet[0].vj, 0, this.grid.rows);
      const st = this.nearestFreeStance(pi, pj);
      if (st) this.claimStance(fig, st.i, st.j);
    }

    const shuffled = this.allStances().sort(() => Math.random() - 0.5);
    while (this.figures.length < count) {
      // First pass prefers breathing room (no occupied vertex adjacent).
      const spaced = shuffled.find(
        (st) =>
          this.isStanceFree(st.i, st.j) &&
          this.isStanceFree(st.i - 1, st.j) &&
          this.isStanceFree(st.i + 1, st.j),
      );
      const st = spaced ?? shuffled.find((s) => this.isStanceFree(s.i, s.j));
      if (!st) break;
      const color = PALETTE[this.paletteCursor++ % PALETTE.length];
      const fig = new Figure(color, st.i, st.j, this.grid);
      fig.wanderAt = performance.now() / 1000 + 1 + Math.random() * 4;
      this.figures.push(fig);
      this.claimStance(fig, st.i, st.j);
    }
  }

  private maybeWander(fig: Figure, time: number): void {
    if (time < fig.wanderAt || fig.isStepping() || this.drag) return;
    const shifts = [
      { di: -1, dj: 0 },
      { di: 1, dj: 0 },
      { di: 0, dj: -1 },
      { di: 0, dj: 1 },
    ].sort(() => Math.random() - 0.5);
    const i = fig.feet[0].vi;
    const j = fig.feet[0].vj;
    for (const { di, dj } of shifts) {
      if (this.isStanceFree(i + di, j + dj, fig)) {
        this.claimStance(fig, i + di, j + dj);
        break;
      }
    }
    fig.wanderAt = time + 2 + Math.random() * 5;
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

    for (const fig of this.figures) fig.draw(ctx);

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
