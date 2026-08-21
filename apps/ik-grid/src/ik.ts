export interface Vec {
  x: number;
  y: number;
}

/**
 * Analytic two-bone IK (law of cosines). Returns the middle joint (knee/elbow)
 * for a chain root -> joint -> target with bone lengths l1, l2.
 *
 * `bend` picks which side the joint folds toward: in screen coordinates
 * (y down), +1 folds the joint clockwise from the root->target direction.
 * If the target is out of reach the joint lies on the root->target line and
 * the drawn limb simply stretches, which reads as playful rather than broken.
 *
 * Positional args: this runs per limb per frame.
 */
export function solveTwoBone(
  rootX: number,
  rootY: number,
  targetX: number,
  targetY: number,
  l1: number,
  l2: number,
  bend: 1 | -1,
): Vec {
  const dx = targetX - rootX;
  const dy = targetY - rootY;
  const d = Math.max(1e-6, Math.hypot(dx, dy));
  const reach = Math.min(d, (l1 + l2) * 0.9999);
  const cos = (l1 * l1 + reach * reach - l2 * l2) / (2 * l1 * reach);
  const fold = Math.acos(Math.min(1, Math.max(-1, cos)));
  const angle = Math.atan2(dy, dx) + bend * fold;
  return { x: rootX + Math.cos(angle) * l1, y: rootY + Math.sin(angle) * l1 };
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
