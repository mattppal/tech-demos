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

- `CloudField` (Marine Layer), `GatewayFlow` (The Gateway), and `TopoField`
  (Seven Hills) from `@designcodeio/threeui@0.3.0` — the newest version that
  clears the 3-day `minimumReleaseAge` gate. Imported via the `./components/*`
  subpath exports so the rest of the 160-component catalog stays out of the
  bundle. The heroes are self-contained sandboxed iframes, so no package assets
  need copying and nothing breaks under the `/threeui/` preview base.
- Theme presets (Fog / Golden Hour / Night) drive the components'
  `mode`/`hue`/`saturation`/`brightness` props plus a wrapper CSS filter and
  color wash. Lighting maps to a brightness multiplier; motion maps to the
  batch effects' `speed` prop (CloudField has no speed knob, so the control
  hides there).

## Credits

Components by [Meng To — threeui.com](https://threeui.com) (MIT Community
catalog). Pick via
[@trashh_dev's bookmark](https://x.com/trashh_dev/status/2090950343744266383)
of [the launch](https://x.com/MengTo/status/2090817187900780961).
