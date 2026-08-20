import { useEffect, useRef, useState } from "react";
import createGlobe, { type COBEOptions, type Globe } from "cobe";

const SF: [number, number] = [37.78, -122.44];
const NYC: [number, number] = [40.71, -74.01];

type PresetName = "light" | "dark" | "dusk";

type Preset = Pick<
  COBEOptions,
  | "dark"
  | "baseColor"
  | "markerColor"
  | "glowColor"
  | "arcColor"
  | "mapBrightness"
  | "diffuse"
> & { background: string; foreground: string };

const PRESETS: Record<PresetName, Preset> = {
  light: {
    dark: 0,
    baseColor: [1, 1, 1],
    markerColor: [0.98, 0.36, 0.22],
    glowColor: [1, 1, 1],
    arcColor: [0.95, 0.42, 0.25],
    mapBrightness: 6,
    diffuse: 1.2,
    background: "#f4f1ec",
    foreground: "#1c1917",
  },
  dark: {
    dark: 1,
    baseColor: [0.3, 0.3, 0.3],
    markerColor: [0.15, 0.8, 1],
    glowColor: [1, 1, 1],
    arcColor: [0.3, 0.85, 1],
    mapBrightness: 6,
    diffuse: 1.2,
    background: "#0a0a0c",
    foreground: "#e7e5e4",
  },
  dusk: {
    dark: 1,
    baseColor: [0.45, 0.3, 0.6],
    markerColor: [1, 0.62, 0.3],
    glowColor: [0.5, 0.22, 0.55],
    arcColor: [1, 0.66, 0.35],
    mapBrightness: 4.5,
    diffuse: 1.6,
    background: "#160b22",
    foreground: "#ece3f5",
  },
};

const AUTO_SPIN = 0.0032;
const DRAG_SENSITIVITY = 1 / 160;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<Globe | null>(null);
  const [preset, setPreset] = useState<PresetName>("dusk");

  useEffect(() => {
    const canvas = canvasRef.current!;
    const dpr = Math.min(window.devicePixelRatio, 2);

    // cobe reads size once at creation; track viewport changes and push them
    // through globe.update() only when they actually change (setting
    // canvas.width clears the drawing buffer).
    let width = window.innerWidth;
    let height = window.innerHeight;
    let sizeDirty = false;
    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      sizeDirty = true;
    };
    window.addEventListener("resize", onResize);

    // phi = 0 roughly centers longitude -90°, so the US (and both markers)
    // face the viewer on load.
    let phi = 0;
    let velocity = 0;
    let dragging = false;
    let lastX = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      phi += dx * DRAG_SENSITIVITY;
      velocity = dx * DRAG_SENSITIVITY;
    };
    const onPointerUp = () => {
      dragging = false;
      canvas.style.cursor = "grab";
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    const initial = PRESETS.dusk;
    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width,
      height,
      phi,
      theta: 0.28,
      dark: initial.dark,
      diffuse: initial.diffuse,
      mapSamples: 16000,
      mapBrightness: initial.mapBrightness,
      baseColor: initial.baseColor,
      markerColor: initial.markerColor,
      glowColor: initial.glowColor,
      arcColor: initial.arcColor,
      arcWidth: 0.4,
      arcHeight: 0.4,
      markers: [
        { location: SF, size: 0.08, id: "sf" },
        { location: NYC, size: 0.08, id: "nyc" },
      ],
      arcs: [{ from: SF, to: NYC }],
    });
    globeRef.current = globe;

    // cobe v2 has no internal loop: every globe.update() renders one frame.
    let raf = 0;
    const frame = () => {
      if (!dragging) {
        phi += AUTO_SPIN + velocity;
        velocity *= 0.94;
        if (Math.abs(velocity) < 1e-5) velocity = 0;
      }
      const state: Partial<COBEOptions> = { phi };
      if (sizeDirty) {
        state.width = width;
        state.height = height;
        sizeDirty = false;
      }
      globe.update(state);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      globe.destroy();
      globeRef.current = null;
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  useEffect(() => {
    const p = PRESETS[preset];
    globeRef.current?.update({
      dark: p.dark,
      baseColor: p.baseColor,
      markerColor: p.markerColor,
      glowColor: p.glowColor,
      arcColor: p.arcColor,
      mapBrightness: p.mapBrightness,
      diffuse: p.diffuse,
    });
    document.documentElement.style.setProperty("--bg", p.background);
    document.documentElement.style.setProperty("--fg", p.foreground);
  }, [preset]);

  return (
    <>
      <div className="globe-wrap">
        <canvas ref={canvasRef} className="globe-canvas" />
      </div>
      <span className="city-label city-label-sf">San Francisco</span>
      <span className="city-label city-label-nyc">New York</span>
      <header className="chrome chrome-top">
        <h1>cobe</h1>
        <p>drag the globe &middot; SF &rarr; NYC</p>
      </header>
      <nav className="chrome chrome-bottom">
        {(Object.keys(PRESETS) as PresetName[]).map((name) => (
          <button
            key={name}
            className={name === preset ? "preset active" : "preset"}
            onClick={() => setPreset(name)}
          >
            {name}
          </button>
        ))}
      </nav>
    </>
  );
}
