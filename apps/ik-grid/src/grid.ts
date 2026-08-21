/**
 * A rectangular grid of cols x rows cells. Vertices are the (cols+1) x (rows+1)
 * cell corners; figures plant their feet on them. The rect is what the user
 * drags around, so vertex positions are always derived, never stored.
 */
export class GridModel {
  cols: number;
  rows: number;
  x = 0;
  y = 0;
  w = 0;
  h = 0;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
  }

  get cellW(): number {
    return this.w / this.cols;
  }

  get cellH(): number {
    return this.h / this.rows;
  }

  vertexX(i: number): number {
    return this.x + (i * this.w) / this.cols;
  }

  vertexY(j: number): number {
    return this.y + (j * this.h) / this.rows;
  }

  contains(px: number, py: number): boolean {
    return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  }

  /** Corner order: 0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left. */
  corner(c: 0 | 1 | 2 | 3): { x: number; y: number } {
    const right = c === 1 || c === 2;
    const bottom = c === 2 || c === 3;
    return { x: this.x + (right ? this.w : 0), y: this.y + (bottom ? this.h : 0) };
  }
}
