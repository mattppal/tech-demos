import { clamp, easeInOut, lerp, solveTwoBone, type Vec } from "./ik";
import type { GridModel } from "./grid";

export const PALETTE = [
  "#e63b2e",
  "#2757d6",
  "#129d61",
  "#f28f16",
  "#8d4fd3",
  "#e8589f",
  "#12a4b4",
  "#d9a410",
];

interface Step {
  fromX: number;
  fromY: number;
  t: number;
  dur: number;
  lift: number;
}

export interface Foot {
  /** Claimed grid vertex. */
  vi: number;
  vj: number;
  /** Current drawn position; only moves via animated steps, never teleports. */
  x: number;
  y: number;
  step: Step | null;
}

interface Pose {
  s: number;
  hip: Vec;
  chest: Vec;
  neck: Vec;
  head: Vec;
  headR: number;
  knees: [Vec, Vec];
  elbows: [Vec, Vec];
  hands: [Vec, Vec];
}

/** Bone lengths as fractions of the figure scale `s`. */
const LEG_UPPER = 0.66;
const LEG_LOWER = 0.62;
const ARM_UPPER = 0.42;
const ARM_LOWER = 0.4;

export class Figure {
  readonly color: string;
  readonly phase: number;
  readonly feet: [Foot, Foot];
  /** Scene-managed idle-wander schedule (absolute seconds). */
  wanderAt = 0;

  private handL: Vec | null = null;
  private handR: Vec | null = null;
  private lean = 0;
  private stepCooldown = 0;
  private settleT = 0;
  private pose: Pose | null = null;

  constructor(color: string, i: number, j: number, grid: GridModel) {
    this.color = color;
    this.phase = Math.random() * Math.PI * 2;
    this.feet = [
      { vi: i, vj: j, x: grid.vertexX(i), y: grid.vertexY(j), step: null },
      { vi: i + 1, vj: j, x: grid.vertexX(i + 1), y: grid.vertexY(j), step: null },
    ];
  }

  isStepping(): boolean {
    return this.feet[0].step !== null || this.feet[1].step !== null;
  }

  /** Point feet at a new stance; they will walk there via animated steps. */
  setStance(i: number, j: number): void {
    this.feet[0].vi = i;
    this.feet[0].vj = j;
    this.feet[1].vi = i + 1;
    this.feet[1].vj = j;
  }

  update(dt: number, time: number, grid: GridModel): void {
    this.updateFeet(dt, grid);
    this.updatePose(dt, time, grid);
  }

  private updateFeet(dt: number, grid: GridModel): void {
    const cellMin = Math.min(grid.cellW, grid.cellH);

    for (const foot of this.feet) {
      const step = foot.step;
      if (!step) continue;
      // Target is re-read live so a mid-step foot tracks a moving vertex.
      const tx = grid.vertexX(foot.vi);
      const ty = grid.vertexY(foot.vj);
      step.t += dt / step.dur;
      if (step.t >= 1) {
        foot.x = tx;
        foot.y = ty;
        foot.step = null;
      } else {
        const e = easeInOut(step.t);
        foot.x = lerp(step.fromX, tx, e);
        foot.y = lerp(step.fromY, ty, e) - Math.sin(Math.PI * step.t) * step.lift;
      }
    }

    if (this.isStepping()) {
      this.settleT = 0;
      return;
    }

    this.stepCooldown -= dt;
    if (this.stepCooldown > 0) return;

    const errs = this.feet.map((f) =>
      Math.hypot(grid.vertexX(f.vi) - f.x, grid.vertexY(f.vj) - f.y),
    );
    const idx = errs[0] >= errs[1] ? 0 : 1;
    const err = errs[idx];

    // Feet stay planted while the grid slides beneath them, then catch up in
    // quick alternating steps. A slow "settle" step cleans up sub-threshold
    // drift once the grid stops moving.
    const threshold = Math.max(6, cellMin * 0.14);
    this.settleT = err > 1 ? this.settleT + dt : 0;
    if (err <= threshold && this.settleT < 0.7) return;

    const foot = this.feet[idx];
    const s = this.scale(grid);
    foot.step = {
      fromX: foot.x,
      fromY: foot.y,
      t: 0,
      dur: clamp(0.14 + err * 0.0012, 0.16, 0.34),
      lift: clamp(err * 0.35, 0.16 * s, 0.9 * s),
    };
    this.stepCooldown = 0.05;
    this.settleT = 0;
  }

  private scale(grid: GridModel): number {
    return clamp(Math.sqrt(grid.cellW * grid.cellH) * 0.9, 26, 110);
  }

  private updatePose(dt: number, time: number, grid: GridModel): void {
    const s = this.scale(grid);
    const [fl, fr] = this.feet;
    const midX = (fl.x + fr.x) / 2;
    const midY = (fl.y + fr.y) / 2;

    const breathe = Math.sin(time * 1.6 + this.phase) * 0.025 * s;
    const sway = Math.sin(time * 0.7 + this.phase) * 0.05 * s;

    // Lean into the step that is currently in flight.
    const stepping = this.feet.find((f) => f.step !== null);
    const leanTarget = stepping
      ? clamp((grid.vertexX(stepping.vi) - midX) * 0.1, -0.16 * s, 0.16 * s)
      : 0;
    this.lean = lerp(this.lean, leanTarget, 1 - Math.exp(-dt * 8));

    const hipX = midX + sway + this.lean * 0.5;
    // Keep the hip within leg reach of both planted feet; when cells get very
    // wide the hip sinks toward the ground and the figure does the splits.
    const legReach = (LEG_UPPER + LEG_LOWER) * s * 0.99;
    let hipH = s + breathe;
    for (const f of this.feet) {
      const dx = hipX - f.x;
      const lim = Math.sqrt(Math.max(legReach * legReach - dx * dx, (0.22 * s) ** 2));
      hipH = Math.min(hipH, lim);
    }
    const hip = { x: hipX, y: midY - hipH };

    const chest = { x: hipX + this.lean * 0.8 + sway * 0.3, y: hip.y - 0.52 * s + breathe * 0.5 };
    const headR = 0.17 * s;
    const neck = { x: chest.x + this.lean * 0.3, y: chest.y - 0.1 * s };
    const head = { x: neck.x + this.lean * 0.3, y: neck.y - 0.06 * s - headR };

    const knees: [Vec, Vec] = [
      solveTwoBone(hip.x, hip.y, fl.x, fl.y, LEG_UPPER * s, LEG_LOWER * s, 1),
      solveTwoBone(hip.x, hip.y, fr.x, fr.y, LEG_UPPER * s, LEG_LOWER * s, -1),
    ];

    // Hands hang and sway at rest, flare out for balance while stepping.
    const armSway = Math.sin(time * 1.1 + this.phase * 1.7) * 0.06 * s;
    const balance = stepping ? 1 : 0;
    const handTargetL = {
      x: chest.x - lerp(0.3 * s, 0.6 * s, balance) + armSway,
      y: chest.y + lerp(0.62 * s, 0.12 * s, balance),
    };
    const handTargetR = {
      x: chest.x + lerp(0.3 * s, 0.6 * s, balance) + armSway,
      y: chest.y + lerp(0.62 * s, 0.12 * s, balance),
    };
    const k = 1 - Math.exp(-dt * 9);
    this.handL = this.handL ?? handTargetL;
    this.handR = this.handR ?? handTargetR;
    this.handL = { x: lerp(this.handL.x, handTargetL.x, k), y: lerp(this.handL.y, handTargetL.y, k) };
    this.handR = { x: lerp(this.handR.x, handTargetR.x, k), y: lerp(this.handR.y, handTargetR.y, k) };

    const elbows: [Vec, Vec] = [
      solveTwoBone(chest.x, chest.y, this.handL.x, this.handL.y, ARM_UPPER * s, ARM_LOWER * s, 1),
      solveTwoBone(chest.x, chest.y, this.handR.x, this.handR.y, ARM_UPPER * s, ARM_LOWER * s, -1),
    ];

    this.pose = {
      s,
      hip,
      chest,
      neck,
      head,
      headR,
      knees,
      elbows,
      hands: [this.handL, this.handR],
    };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const pose = this.pose;
    if (!pose) return;
    const { s, hip, chest, neck, head, headR, knees, elbows, hands } = pose;
    const [fl, fr] = this.feet;

    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = Math.max(2.5, 0.11 * s);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(fl.x, fl.y);
    ctx.lineTo(knees[0].x, knees[0].y);
    ctx.lineTo(hip.x, hip.y);
    ctx.lineTo(knees[1].x, knees[1].y);
    ctx.lineTo(fr.x, fr.y);
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(chest.x, chest.y);
    ctx.lineTo(neck.x, neck.y);
    ctx.moveTo(hands[0].x, hands[0].y);
    ctx.lineTo(elbows[0].x, elbows[0].y);
    ctx.lineTo(chest.x, chest.y);
    ctx.lineTo(elbows[1].x, elbows[1].y);
    ctx.lineTo(hands[1].x, hands[1].y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(head.x, head.y, headR, 0, Math.PI * 2);
    ctx.fill();
  }
}
