import { useEffect, useRef, useState } from "react";
import { Scene, type Density } from "./scene";

const DENSITY_ORDER: readonly Density[] = ["sparse", "cozy", "packed"];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const [density, setDensity] = useState<Density>("cozy");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = new Scene(canvas, "cozy");
    sceneRef.current = scene;
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  const pickDensity = (d: Density) => {
    setDensity(d);
    sceneRef.current?.setDensity(d);
  };

  return (
    <div className="stage">
      <canvas ref={canvasRef} className="scene-canvas" />
      <header className="chrome">
        <h1>ik-grid</h1>
        <p>drag the grid or a corner — the figures keep up</p>
        <div className="presets" role="group" aria-label="grid density">
          {DENSITY_ORDER.map((d) => (
            <button
              key={d}
              type="button"
              className={d === density ? "active" : ""}
              onClick={() => pickDensity(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </header>
      <footer className="credit">
        after{" "}
        <a href="https://x.com/measure_plan/status/2077380797464559769" target="_blank" rel="noreferrer">
          @measure_plan
        </a>{" "}
        · idea by kiel.d.m
      </footer>
    </div>
  );
}
