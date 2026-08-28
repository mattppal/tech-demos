import { useEffect, useState } from "react";
import { FlowField } from "@designcodeio/threeui/components/FlowField";
import { GatewayFlow } from "@designcodeio/threeui/components/GatewayFlow";
import { ConstellationField } from "@designcodeio/threeui/components/ConstellationField";

type HeroId = "marine" | "gateway" | "baylights";
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
  size?: number;
  density?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
};

type ThemeLook = {
  mode: "light" | "dark";
  hue: number;
  saturation: number;
  brightness: number;
  filter: string;
};

const HEROES: {
  id: HeroId;
  label: string;
  component: string;
  Hero: (props: HeroProps) => React.JSX.Element;
  hasMotion: boolean;
  // Extra ThreeUI knobs: the dashed/thin sources need thicker strokes to
  // stay cinematic on devicePixelRatio-1 screens.
  props?: HeroProps;
  // Per-theme wrapper-filter overrides. FlowField has no light mode, so the
  // Fog preset inverts it into a pale marine layer instead.
  filterByTheme?: Partial<Record<ThemeId, string>>;
}[] = [
  {
    id: "marine",
    label: "Marine Layer",
    component: "FlowField",
    Hero: FlowField,
    hasMotion: true,
    filterByTheme: {
      fog: "invert(1) saturate(0.4) contrast(0.88) brightness(1.04)",
      night: "sepia(0.55) saturate(2.2) hue-rotate(175deg) brightness(1.9)",
    },
  },
  {
    id: "gateway",
    label: "The Gateway",
    component: "GatewayFlow",
    Hero: GatewayFlow,
    hasMotion: true,
    props: { size: 2.5 },
  },
  {
    id: "baylights",
    label: "Bay Lights",
    component: "ConstellationField",
    Hero: ConstellationField,
    hasMotion: true,
    props: { size: 1.5, strokeWidth: 2 },
  },
];

// Each preset drives the ThreeUI props (mode/hue/saturation/brightness) plus a
// wrapper-level CSS filter and color wash, since some heroes render close to
// grayscale and need sepia/hue shifts applied outside the sandboxed iframe.
const THEMES: Record<ThemeId, ThemeLook & { label: string }> = {
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
    saturation: 1,
    brightness: 1.15,
    filter: "sepia(0.3) saturate(1.7) hue-rotate(175deg) brightness(1.3)",
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

// Initial state is shareable via ?hero=&theme=&light=&motion=; invalid or
// missing values fall back to the defaults.
function fromParams() {
  const p = new URLSearchParams(window.location.search);
  const pick = <T extends string>(value: string | null, all: readonly T[], fallback: T): T =>
    all.includes(value as T) ? (value as T) : fallback;
  return {
    hero: pick<HeroId>(p.get("hero"), ["marine", "gateway", "baylights"], "gateway"),
    theme: pick<ThemeId>(p.get("theme"), ["fog", "golden", "night"], "fog"),
    light: pick<LightingId>(p.get("light"), ["marine", "clearing"], "marine"),
    motion: pick<MotionId>(p.get("motion"), ["still", "drift", "alive"], "drift"),
  };
}

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
  const [initial] = useState(fromParams);
  const [heroId, setHeroId] = useState<HeroId>(initial.hero);
  const [themeId, setThemeId] = useState<ThemeId>(initial.theme);
  const [lightingId, setLightingId] = useState<LightingId>(initial.light);
  const [motionId, setMotionId] = useState<MotionId>(initial.motion);

  const hero = HEROES.find((h) => h.id === heroId)!;
  const look = THEMES[themeId];
  const { Hero } = hero;

  useEffect(() => {
    const p = new URLSearchParams();
    p.set("hero", heroId);
    p.set("theme", themeId);
    p.set("light", lightingId);
    p.set("motion", motionId);
    window.history.replaceState(null, "", `?${p}`);
  }, [heroId, themeId, lightingId, motionId]);

  return (
    <div className="stage" data-theme={themeId}>
      <div
        className="hero-layer"
        // Remount (and fade back in) when the hero or the light/dark source
        // document changes: in-place srcdoc swaps can leave a stale document
        // on screen, while a fresh element always boots clean. Lighting and
        // motion changes touch only CSS filters / postMessage, no remount.
        key={`${heroId}-${look.mode}`}
        style={{ filter: hero.filterByTheme?.[themeId] ?? look.filter }}
      >
        <Hero
          mode={look.mode}
          hue={look.hue}
          saturation={look.saturation}
          brightness={look.brightness * LIGHTING[lightingId].brightness}
          {...(hero.hasMotion ? { speed: MOTION[motionId].speed } : {})}
          {...hero.props}
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
