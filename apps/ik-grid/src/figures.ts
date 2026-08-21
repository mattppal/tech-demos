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

/** Darken a #rrggbb color for hair/hats/pants. */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 0xff) * f);
  const g = Math.round(((n >> 8) & 0xff) * f);
  const b = Math.round((n & 0xff) * f);
  return `rgb(${r}, ${g}, ${b})`;
}

function rand(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type Hair = "none" | "crop" | "beanie" | "bun" | "antenna";
type Flavor = "stand" | "sit" | "lean" | "flamingo";

/**
 * Per-figure genome: proportions are fractions of the *cell*, so every
 * character keeps filling its apartment as the grid is dragged around.
 */
interface Dna {
  hipF: number; // standing hip height / cellH (long vs short legs)
  torsoF: number; // torso length / cellH
  headF: number; // head radius / cellH
  shoulderF: number; // shoulder half-width / min(cellW, cellH)
  hipWF: number; // hip half-width / min(cellW, cellH)
  bendF: number; // leg slack: straight-legged vs bendy
  armF: number;
  hangSpread: number; // how far hanging hands sit from the body
  hair: Hair;
  flavor: Flavor;
  side: 1 | -1; // lean/flamingo/wave side
  kneeIn: boolean; // knock-kneed instead of knees-out
  akimbo: boolean; // resting hands on hips instead of hanging
  pants: boolean; // darker legs
}

function rollDna(): Dna {
  return {
    hipF: rand(0.26, 0.6),
    torsoF: rand(0.2, 0.38),
    headF: rand(0.08, 0.16),
    shoulderF: rand(0.09, 0.24),
    hipWF: rand(0.07, 0.13),
    bendF: rand(1.02, 1.3),
    armF: rand(0.85, 1.15),
    hangSpread: rand(0, 0.12),
    hair: pick(["none", "crop", "crop", "beanie", "bun", "antenna"] as const),
    flavor: pick(["stand", "stand", "sit", "sit", "lean", "flamingo"] as const),
    side: Math.random() < 0.5 ? 1 : -1,
    kneeIn: Math.random() < 0.25,
    akimbo: Math.random() < 0.3,
    pants: Math.random() < 0.35,
  };
}

interface Step {
  fromX: number;
  fromY: number;
  t: number;
  dur: number;
  lift: number;
}

interface Foot {
  x: number;
  y: number;
  step: Step | null;
}

interface Pose {
  hipL: Vec;
  hipR: Vec;
  shoulderL: Vec;
  shoulderR: Vec;
  head: Vec;
  headR: number;
  knees: [Vec, Vec];
  elbows: [Vec, Vec];
  hands: [Vec, Vec];
  displayFeet: [Vec, Vec];
  legW: number;
  look: number; // -1..1 gaze/lean direction
}

export class Figure {
  readonly color: string;
  readonly dna: Dna;
  /** The cell this figure lives in; feet own its two bottom corners. */
  ci: number;
  cj: number;
  /** Scene-managed idle-wander schedule (absolute seconds). */
  wanderAt = 0;

  private readonly phase: number;
  private readonly feet: [Foot, Foot];
  private handL: Vec | null = null;
  private handR: Vec | null = null;
  private lean = 0;
  private flavorK = 0; // 0 = plain stand (while moving), 1 = full flavor pose
  private settledFor = 0;
  private stepCooldown = 0;
  private settleT = 0;
  private waveAt = 2 + Math.random() * 8;
  private pose: Pose | null = null;

  constructor(color: string, ci: number, cj: number, grid: GridModel) {
    this.color = color;
    this.dna = rollDna();
    this.phase = Math.random() * Math.PI * 2;
    this.ci = ci;
    this.cj = cj;
    this.feet = [
      { x: grid.vertexX(ci), y: grid.vertexY(cj + 1), step: null },
      { x: grid.vertexX(ci + 1), y: grid.vertexY(cj + 1), step: null },
    ];
  }

  isStepping(): boolean {
    return this.feet[0].step !== null || this.feet[1].step !== null;
  }

  private footTarget(k: 0 | 1, grid: GridModel): Vec {
    return { x: grid.vertexX(this.ci + k), y: grid.vertexY(this.cj + 1) };
  }

  update(dt: number, time: number, grid: GridModel): void {
    this.updateFeet(dt, grid);
    this.updatePose(dt, time, grid);
  }

  private updateFeet(dt: number, grid: GridModel): void {
    const targets = [this.footTarget(0, grid), this.footTarget(1, grid)];

    for (let k = 0; k < 2; k++) {
      const foot = this.feet[k];
      const step = foot.step;
      if (!step) continue;
      // Target is re-read live so a mid-step foot tracks a moving vertex.
      const { x: tx, y: ty } = targets[k];
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

    const errs = [0, 1].map((k) =>
      Math.hypot(targets[k].x - this.feet[k].x, targets[k].y - this.feet[k].y),
    );
    const idx = errs[0] >= errs[1] ? 0 : 1;
    const err = errs[idx];

    // Feet stay planted while the grid slides beneath them, then catch up in
    // quick alternating steps. A slow "settle" step cleans up sub-threshold
    // drift once the grid stops moving.
    const cellMin = Math.min(grid.cellW, grid.cellH);
    const threshold = Math.max(6, cellMin * 0.14);
    this.settleT = err > 1 ? this.settleT + dt : 0;
    if (err <= threshold && this.settleT < 0.7) return;

    const foot = this.feet[idx];
    foot.step = {
      fromX: foot.x,
      fromY: foot.y,
      t: 0,
      dur: clamp(0.14 + err * 0.0012, 0.16, 0.34),
      lift: clamp(err * 0.35, grid.cellH * 0.08, grid.cellH * 0.5),
    };
    this.stepCooldown = 0.05;
    this.settleT = 0;
  }

  private updatePose(dt: number, time: number, grid: GridModel): void {
    const dna = this.dna;
    const cw = grid.cellW;
    const ch = grid.cellH;
    const sMin = Math.min(cw, ch);
    const [fl, fr] = this.feet;
    const midX = (fl.x + fr.x) / 2;
    const groundY = (fl.y + fr.y) / 2;

    // Flavor poses fade in once the figure has been standing still a moment
    // and collapse quickly while it is walking somewhere.
    const stepping = this.feet.find((f) => f.step !== null) ?? null;
    this.settledFor = stepping ? 0 : this.settledFor + dt;
    const flavorTarget = this.settledFor > 0.5 ? 1 : 0;
    this.flavorK = lerp(this.flavorK, flavorTarget, 1 - Math.exp(-dt * 4));
    const fk = dna.flavor === "stand" ? 0 : this.flavorK;

    const breathe = Math.sin(time * 1.5 + this.phase) * 0.015 * ch;
    const sway = Math.sin(time * 0.7 + this.phase) * 0.02 * cw;

    const leanTarget = stepping
      ? clamp((grid.vertexX(this.ci) + cw / 2 - midX) * 0.1, -0.12 * cw, 0.12 * cw)
      : dna.flavor === "lean"
        ? dna.side * 0.1 * cw * fk
        : 0;
    this.lean = lerp(this.lean, leanTarget, 1 - Math.exp(-dt * 8));

    // Body heights are cell fractions; crouch if the apartment ceiling is low.
    const headR = clamp(dna.headF * ch, 3, 0.24 * cw);
    let hipH = dna.hipF * ch;
    let torsoLen = dna.torsoF * ch;
    const flavorHip =
      dna.flavor === "sit" ? 0.18 : dna.flavor === "lean" ? 0.82 : dna.flavor === "flamingo" ? 1.06 : 1;
    hipH *= lerp(1, flavorHip, fk);
    const avail = ch * 0.96 - 2.2 * headR;
    if (hipH + torsoLen > avail) {
      hipH = Math.max(avail - torsoLen, 0.16 * ch);
      torsoLen = clamp(avail - hipH, torsoLen * 0.5, torsoLen);
    }
    hipH += breathe;

    const hipHalf = dna.hipWF * sMin;
    const shoulderHalf = dna.shoulderF * sMin;
    const hipX = midX + sway + this.lean;
    const hipY = groundY - Math.max(hipH, 0.08 * ch);
    const hipL = { x: hipX - hipHalf, y: hipY };
    const hipR = { x: hipX + hipHalf, y: hipY };
    const shoulderY = hipY - torsoLen;
    const shoulderX = hipX + this.lean * 0.6;
    const shoulderL = { x: shoulderX - shoulderHalf, y: shoulderY };
    const shoulderR = { x: shoulderX + shoulderHalf, y: shoulderY };

    const look = clamp(this.lean / (0.08 * cw + 1e-6), -1, 1);
    const head = {
      x: shoulderX + this.lean * 0.5,
      y: shoulderY - 0.05 * ch - headR + breathe * 0.5,
    };

    // Legs are sized to the standing geometry of the current cell, so
    // resizing the grid stretches limbs smoothly instead of breaking IK.
    const nominal = Math.hypot(cw / 2 - hipHalf, dna.hipF * ch) * dna.bendF;
    const l1 = nominal * 0.52;
    const l2 = nominal * 0.48;

    // Flamingo: one foot tucks up against the other knee while settled. Only
    // the drawn position moves; the planted position keeps owning its corner.
    const tuckIdx = dna.side === -1 ? 0 : 1;
    const tuckK = dna.flavor === "flamingo" ? fk : 0;
    const displayFeet: [Vec, Vec] = [
      { x: fl.x, y: fl.y },
      { x: fr.x, y: fr.y },
    ];
    if (tuckK > 0.01) {
      const tuck = { x: hipX + dna.side * hipHalf * 0.6, y: hipY + hipH * 0.42 };
      displayFeet[tuckIdx] = {
        x: lerp(displayFeet[tuckIdx].x, tuck.x, tuckK),
        y: lerp(displayFeet[tuckIdx].y, tuck.y, tuckK),
      };
    }

    // Knee fold direction is part of the silhouette: knees-out by default,
    // knock-kneed for some, and knees-up when sitting on the floor.
    const foldFlip = dna.kneeIn || (dna.flavor === "sit" && fk > 0.5);
    const bendL: 1 | -1 = foldFlip ? -1 : 1;
    const bendR: 1 | -1 = foldFlip ? 1 : -1;
    const tuckScale = (k: number) => (tuckK > 0.01 && k === tuckIdx ? 1 - 0.5 * tuckK : 1);
    const knees: [Vec, Vec] = [
      solveTwoBone(hipL.x, hipL.y, displayFeet[0].x, displayFeet[0].y, l1 * tuckScale(0), l2 * tuckScale(0), bendL),
      solveTwoBone(hipR.x, hipR.y, displayFeet[1].x, displayFeet[1].y, l1 * tuckScale(1), l2 * tuckScale(1), bendR),
    ];

    // Hands: balance while stepping; otherwise flavor/habit decides, with an
    // occasional overhead wave so the crowd feels alive.
    const armLen = (torsoLen * 0.75 + hipH * 0.25) * dna.armF;
    const armSway = Math.sin(time * 1.1 + this.phase * 1.7) * 0.03 * cw;
    const waving =
      !stepping && dna.flavor !== "sit" && dna.flavor !== "lean" && time > this.waveAt && time < this.waveAt + 1.4;
    if (time > this.waveAt + 1.4) this.waveAt = time + 6 + Math.random() * 9;
    let targetL: Vec;
    let targetR: Vec;
    if (stepping) {
      targetL = { x: shoulderL.x - 0.28 * cw, y: shoulderY + 0.08 * ch };
      targetR = { x: shoulderR.x + 0.28 * cw, y: shoulderY + 0.08 * ch };
    } else if (waving) {
      const wig = Math.sin(time * 9 + this.phase) * headR * 0.6;
      const up = { x: head.x + dna.side * headR * 1.8 + wig, y: head.y - headR * 1.7 };
      const rest = {
        x: shoulderX - dna.side * (shoulderHalf + dna.hangSpread * 0.2 * cw),
        y: shoulderY + armLen * 0.95,
      };
      targetL = dna.side > 0 ? rest : up;
      targetR = dna.side > 0 ? up : rest;
    } else if (dna.flavor === "sit" && fk > 0.5) {
      targetL = { x: knees[0].x, y: knees[0].y };
      targetR = { x: knees[1].x, y: knees[1].y };
    } else if (dna.flavor === "lean" && fk > 0.5) {
      // Brace one hand against the figure's own cell wall.
      const wallX = grid.vertexX(this.ci + (dna.side > 0 ? 1 : 0));
      const brace = { x: wallX, y: shoulderY + 0.15 * ch };
      const hang = { x: shoulderX - dna.side * 0.14 * cw + armSway, y: hipY + 0.1 * ch };
      targetL = dna.side > 0 ? hang : brace;
      targetR = dna.side > 0 ? brace : hang;
    } else if (dna.akimbo) {
      targetL = { x: hipL.x - hipHalf * 0.6, y: hipY };
      targetR = { x: hipR.x + hipHalf * 0.6, y: hipY };
    } else {
      // Arms hang beside the torso, not out in a starfish.
      const spread = dna.hangSpread * 0.2 * cw;
      targetL = { x: shoulderL.x - spread + armSway, y: shoulderY + armLen * 0.95 };
      targetR = { x: shoulderR.x + spread + armSway, y: shoulderY + armLen * 0.95 };
    }
    const k = 1 - Math.exp(-dt * 9);
    this.handL = this.handL ?? targetL;
    this.handR = this.handR ?? targetR;
    this.handL = { x: lerp(this.handL.x, targetL.x, k), y: lerp(this.handL.y, targetL.y, k) };
    this.handR = { x: lerp(this.handR.x, targetR.x, k), y: lerp(this.handR.y, targetR.y, k) };

    // Elbows fold down-and-out when hands rest on the knees, not up in spikes.
    const armFlip = dna.flavor === "sit" && fk > 0.5 && !stepping && !waving;
    const armBendL: 1 | -1 = armFlip ? -1 : 1;
    const armBendR: 1 | -1 = armFlip ? 1 : -1;
    const elbows: [Vec, Vec] = [
      solveTwoBone(shoulderL.x, shoulderL.y, this.handL.x, this.handL.y, armLen * 0.52, armLen * 0.48, armBendL),
      solveTwoBone(shoulderR.x, shoulderR.y, this.handR.x, this.handR.y, armLen * 0.52, armLen * 0.48, armBendR),
    ];

    this.pose = {
      hipL,
      hipR,
      shoulderL,
      shoulderR,
      head,
      headR,
      knees,
      elbows,
      hands: [this.handL, this.handR],
      displayFeet,
      legW: Math.max(2.5, hipHalf * 0.7),
      look,
    };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const pose = this.pose;
    if (!pose) return;
    const { hipL, hipR, shoulderL, shoulderR, head, headR, knees, elbows, hands, displayFeet, legW, look } = pose;
    const dark = shade(this.color, 0.62);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Legs (optionally "pants" in the darker shade).
    ctx.strokeStyle = this.dna.pants ? dark : this.color;
    ctx.lineWidth = legW;
    ctx.beginPath();
    ctx.moveTo(displayFeet[0].x, displayFeet[0].y);
    ctx.lineTo(knees[0].x, knees[0].y);
    ctx.lineTo(hipL.x, hipL.y);
    ctx.moveTo(displayFeet[1].x, displayFeet[1].y);
    ctx.lineTo(knees[1].x, knees[1].y);
    ctx.lineTo(hipR.x, hipR.y);
    ctx.stroke();

    // Filled torso: hips up to shoulders with a waist curve.
    const waistOut = (shoulderR.x - shoulderL.x) * 0.08;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(hipL.x, hipL.y);
    ctx.quadraticCurveTo(
      (hipL.x + shoulderL.x) / 2 - waistOut,
      (hipL.y + shoulderL.y) / 2,
      shoulderL.x,
      shoulderL.y,
    );
    ctx.quadraticCurveTo(
      (shoulderL.x + shoulderR.x) / 2,
      shoulderL.y - (shoulderR.x - shoulderL.x) * 0.3,
      shoulderR.x,
      shoulderR.y,
    );
    ctx.quadraticCurveTo(
      (hipR.x + shoulderR.x) / 2 + waistOut,
      (hipR.y + shoulderR.y) / 2,
      hipR.x,
      hipR.y,
    );
    ctx.closePath();
    ctx.fill();
    // Rounded hip line so legs join a body, not a rectangle edge.
    ctx.beginPath();
    ctx.ellipse(
      (hipL.x + hipR.x) / 2,
      hipL.y,
      Math.max(1, (hipR.x - hipL.x) / 2),
      legW * 0.8,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Arms over the torso.
    ctx.strokeStyle = this.color;
    ctx.lineWidth = legW * 0.8;
    ctx.beginPath();
    ctx.moveTo(hands[0].x, hands[0].y);
    ctx.lineTo(elbows[0].x, elbows[0].y);
    ctx.lineTo(shoulderL.x, shoulderL.y);
    ctx.moveTo(hands[1].x, hands[1].y);
    ctx.lineTo(elbows[1].x, elbows[1].y);
    ctx.lineTo(shoulderR.x, shoulderR.y);
    ctx.stroke();

    // Head.
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(head.x, head.y, headR, 0, Math.PI * 2);
    ctx.fill();

    this.drawHair(ctx, head, headR, dark);

    // Eyes, if the head is big enough to carry them.
    if (headR > 4) {
      const eyeR = headR * 0.22;
      const ey = head.y - headR * 0.08;
      for (const side of [-1, 1]) {
        const ex = head.x + side * headR * 0.38 + look * headR * 0.12;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#26200f";
        ctx.beginPath();
        ctx.arc(ex + look * eyeR * 0.4, ey, eyeR * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawHair(ctx: CanvasRenderingContext2D, head: { x: number; y: number }, headR: number, dark: string): void {
    ctx.fillStyle = dark;
    ctx.strokeStyle = dark;
    switch (this.dna.hair) {
      case "none":
        return;
      case "crop":
        ctx.beginPath();
        ctx.arc(head.x, head.y - headR * 0.12, headR * 1.02, Math.PI * 1.05, Math.PI * 1.95);
        ctx.closePath();
        ctx.fill();
        return;
      case "beanie":
        ctx.beginPath();
        ctx.arc(head.x, head.y - headR * 0.1, headR * 1.06, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(head.x - headR * 1.06, head.y - headR * 0.28, headR * 2.12, headR * 0.24);
        return;
      case "bun":
        ctx.beginPath();
        ctx.arc(head.x, head.y - headR * 0.12, headR * 1.02, Math.PI * 1.1, Math.PI * 1.9);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(head.x, head.y - headR * 1.25, headR * 0.34, 0, Math.PI * 2);
        ctx.fill();
        return;
      case "antenna": {
        ctx.lineWidth = Math.max(1.5, headR * 0.14);
        ctx.beginPath();
        ctx.moveTo(head.x, head.y - headR);
        ctx.lineTo(head.x, head.y - headR * 1.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(head.x, head.y - headR * 1.75, headR * 0.2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      default: {
        const _exhaustive: never = this.dna.hair;
        return _exhaustive;
      }
    }
  }
}
