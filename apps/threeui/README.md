# threeui — Karl (ThreeUI × San Francisco)

Three free [ThreeUI](https://threeui.com) Community heroes restyled onto a San
Francisco palette — fog, Golden Gate International Orange, bay light — with
theme, lighting, and motion controls. Named after
[Karl the Fog](https://en.wikipedia.org/wiki/Karl_the_Fog).

```bash
cd apps/threeui
bun install
bun run dev
```

## What's inside

- `FlowField` (Marine Layer), `GatewayFlow` (The Gateway), and
  `ConstellationField` (Bay Lights) from `@designcodeio/threeui@0.3.0` — the
  newest version that clears the 3-day `minimumReleaseAge` gate. Imported via
  the `./components/*` subpath exports so the rest of the 160-component catalog
  stays out of the bundle. The heroes are self-contained sandboxed iframes, so
  no package assets need copying and nothing breaks under the `/threeui/`
  preview base.
- Theme presets (Fog / Golden Hour / Night) drive the components'
  `mode`/`saturation`/`brightness` props plus a per-hero wrapper CSS filter and
  color wash. Lighting maps to a brightness multiplier; motion maps to the
  heroes' `speed` prop.
- The state is shareable: `?hero=baylights&theme=night&light=marine&motion=drift`.
- `src/cdn-shim.ts` rewrites the third-party CDN URLs inside the heroes'
  `srcdoc` iframes (gsap/ScrollTrigger, tailwind play CDN, iconify, Google
  Fonts, remote decor images) to tiny local stand-ins, so the demo runs fully
  offline / egress-restricted, boots without waiting on network timeouts, and
  self-heals a Chromium quirk where a freshly loaded sandboxed iframe can lay
  out at 0×0.

## Credits

Components by [Meng To — threeui.com](https://threeui.com) (MIT Community
catalog). Pick via
[@trashh_dev's bookmark](https://x.com/trashh_dev/status/2090950343744266383)
of [the launch](https://x.com/MengTo/status/2090817187900780961).
