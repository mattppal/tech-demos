import { useState } from "react";
import { CloudField } from "@designcodeio/threeui/components/CloudField";
import { GatewayFlow } from "@designcodeio/threeui/components/GatewayFlow";
import { TopoField } from "@designcodeio/threeui/components/TopoField";

type HeroId = "cloud" | "gateway" | "topo";
type ThemeId = "fog" | "golden" | "night";
type LightingId = "marine" | "clearing";
type MotionId = "still" | "drift" | "alive";

type HeroProps = {
  mode?: "light" | "dark";
  hue?: number;
  saturation?: number;
  brightness?: number;
  speed?: number;
  opacity?: number;
  style?: React.CSSProperties;
};

const HEROES: {
  id: HeroId;
  label: string;
  component: string;
  Hero: (props: HeroProps) => React.JSX.Element;
  hasMotion: boolean;
}[] = [
  { id: "cloud", label: "Marine Layer", component: "CloudField", Hero: CloudField, hasMotion: false },
  { id: "gateway", label: "The Gateway", component: "GatewayFlow", Hero: GatewayFlow, hasMotion: true },
  { id: "topo", label: "Seven Hills", component: "TopoField", Hero: TopoField, hasMotion: true },
];

// Each preset drives the ThreeUI props (mode/hue/saturation/brightness) plus a
// wrapper-level CSS filter and color wash, since some heroes render close to
// grayscale and need sepia/hue shifts applied outside the sandboxed iframe.
const THEMES: Record<
  ThemeId,
  {
    label: string;
    mode: "light" | "dark";
    hue: number;
    saturation: number;
    brightness: number;
    filter: string;
  }
> = {
  fog: {
    label: "Fog",
    mode: "light",
    hue: 0,
    saturation: 0.1,
    brightness: 1.02,
    filter: "saturate(0.6) contrast(0.92)",
  },
  golden: {
    label: "Golden Hour",
    mode: "dark",
    hue: 0,
    saturation: 1,
    brightness: 1.05,
    filter: "sepia(0.55) saturate(2.1) hue-rotate(-16deg) contrast(1.05)",
  },
  night: {
    label: "Night",
    mode: "dark",
    hue: 0,
    saturation: 0.9,
    brightness: 0.85,
    filter: "sepia(0.35) saturate(1.5) hue-rotate(170deg) brightness(0.9)",
  },
};

const LIGHTING: Record<LightingId, { label: string; brightness: number }> = {
  marine: { label: "Marine layer", brightness: 0.86 },
  clearing: { label: "Clearing", brightness: 1.14 },
};

const MOTION: Record<MotionId, { label: string; speed: number }> = {
  still: { label: "Still", speed: 0.12 },
  drift: { label: "Drift", speed: 0.7 },
  alive: { label: "Alive", speed: 1.8 },
};

function Segmented<T extends string>({
  legend,
  value,
  onChange,
  options,
}: {
  legend: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="seg" role="group" aria-label={legend}>
      <span className="seg-legend">{legend}</span>
      <div className="seg-buttons">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={o.id === value ? "on" : ""}
            aria-pressed={o.id === value}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [heroId, setHeroId] = useState<HeroId>("gateway");
  const [themeId, setThemeId] = useState<ThemeId>("fog");
  const [lightingId, setLightingId] = useState<LightingId>("marine");
  const [motionId, setMotionId] = useState<MotionId>("drift");

  const hero = HEROES.find((h) => h.id === heroId)!;
  const theme = THEMES[themeId];
  const { Hero } = hero;

  return (
    <div className="stage" data-theme={themeId}>
      <div
        className="hero-layer"
        // Remount (and fade back in) when the srcdoc actually changes:
        // hero swap or light/dark mode swap. Filter tweaks stay live.
        key={`${heroId}-${theme.mode}`}
        style={{ filter: theme.filter }}
      >
        <Hero
          mode={theme.mode}
          hue={theme.hue}
          saturation={theme.saturation}
          brightness={theme.brightness * LIGHTING[lightingId].brightness}
          {...(hero.hasMotion ? { speed: MOTION[motionId].speed } : {})}
        />
      </div>
      <div className="wash" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />

      <header className="chrome top">
        <div className="wordmark">
          <span className="rule" aria-hidden="true" />
          <h1>Karl</h1>
          <p>ThreeUI &times; San Francisco</p>
        </div>
        <Segmented
          legend="Hero"
          value={heroId}
          onChange={setHeroId}
          options={HEROES.map((h) => ({ id: h.id, label: h.label }))}
        />
      </header>

      <footer className="chrome bottom">
        <div className="credit">
          <p>
            Heroes by <a href="https://threeui.com">Meng To — threeui.com</a> (MIT Community)
          </p>
          <p>
            via <a href="https://x.com/trashh_dev/status/2090950343744266383">@trashh_dev&rsquo;s bookmark</a> of{" "}
            <a href="https://x.com/MengTo/status/2090817187900780961">the launch</a> &middot;{" "}
            <span className="mono">{hero.component}</span>
          </p>
        </div>
        <div className="controls">
          <Segmented
            legend="Theme"
            value={themeId}
            onChange={setThemeId}
            options={(Object.keys(THEMES) as ThemeId[]).map((id) => ({ id, label: THEMES[id].label }))}
          />
          <Segmented
            legend="Light"
            value={lightingId}
            onChange={setLightingId}
            options={(Object.keys(LIGHTING) as LightingId[]).map((id) => ({ id, label: LIGHTING[id].label }))}
          />
          {hero.hasMotion && (
            <Segmented
              legend="Motion"
              value={motionId}
              onChange={setMotionId}
              options={(Object.keys(MOTION) as MotionId[]).map((id) => ({ id, label: MOTION[id].label }))}
            />
          )}
        </div>
      </footer>
    </div>
  );
}
