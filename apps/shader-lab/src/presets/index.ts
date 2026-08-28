import type { ShaderLabConfig } from "@basementstudio/shader-lab";

import crt from "./crt.json";
import dither from "./dither.json";
import halftone from "./halftone.json";
import ink from "./ink.json";

export interface Preset {
  id: string;
  name: string;
  description: string;
  provenance: string;
  config: ShaderLabConfig;
}

// JSON modules widen string literals and tuples ("normal" -> string,
// [0, 0] -> number[]), so the configs are asserted back to the package's
// union types. The shapes come straight from the Shader Lab editor (see
// PLAN.md, "Preset provenance").
const asConfig = (config: unknown) => config as ShaderLabConfig;
export const presets: Preset[] = [
  {
    id: "crt",
    name: "Signal",
    description: "Gradient, pattern and type through Bayer dither into a slot-mask CRT.",
    provenance: "The Shader Lab editor's default project, verbatim.",
    config: asConfig(crt),
  },
  {
    id: "dither",
    name: "Bayer",
    description: "The same composition with the CRT and pattern stages removed — raw 4×4 ordered dither.",
    provenance: "Default project, CRT and pattern layers dropped.",
    config: asConfig(dither),
  },
  {
    id: "ink",
    name: "Bleed",
    description: "Ink bleed pulled downward through fluid noise, gradient-mapped to warm glow colors.",
    provenance: "Editor ink layer with its stock parameters.",
    config: asConfig(ink),
  },
  {
    id: "halftone",
    name: "Newsprint",
    description: "CMYK halftone screens at press angles on warm paper, newspaper ink preset.",
    provenance: "Editor halftone layer, stock CMYK parameters.",
    config: asConfig(halftone),
  },
];
