/**
 * ThreeUI's Neuform heroes render as sandboxed `srcdoc` iframes whose inline
 * HTML loads gsap/ScrollTrigger plus tailwind/iconify from third-party CDNs.
 * The hero canvases themselves animate on requestAnimationFrame, but each
 * source boots its canvas inside the same DOMContentLoaded handler as a
 * leading `gsap.registerPlugin(ScrollTrigger)` call — if gsap is missing the
 * whole hero stays blank.
 *
 * This shim rewrites those URLs to tiny local stand-ins before the iframe
 * document is set: a no-throw gsap stub plus empty stubs for the decor-only
 * scripts. The heroes then render with no third-party CDN dependency, which
 * also makes them work in egress-restricted environments. It must be
 * imported before React renders anything.
 */
import gsapStubUrl from "./vendor-gsap-stub.js?url";
import noopUrl from "./vendor-noop.js?url";

const REWRITES: [from: string, to: string][] = [
  ["https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js", gsapStubUrl],
  ["https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js", noopUrl],
  ["https://cdn.tailwindcss.com", noopUrl],
  ["https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js", noopUrl],
  // GatewayFlow legibility on devicePixelRatio-1 screens: its 1px dashes at
  // 0.35-0.4 alpha average out to near-invisible pixels, so lengthen the
  // dashes, raise stroke alpha, and enlarge the traveling particles. These
  // strings are unique to the GatewayFlow source (verified against the other
  // two heroes).
  ["ctx.setLineDash([1, 4])", "ctx.setLineDash([2, 6])"],
  ["ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';", "ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';"],
  ["ctx.strokeStyle = 'rgba(26, 31, 42, 0.4)';", "ctx.strokeStyle = 'rgba(26, 31, 42, 0.8)';"],
  ["ctx.fillRect(pos.x - 1.5, pos.y - 1.5, 3, 3);", "ctx.fillRect(pos.x - 2.5, pos.y - 2.5, 5, 5);"],
  // GatewayFlow computes each path's startY once at boot; if the iframe lays
  // out before CSS gives it its real height, every path bunches at the top and
  // stays there (resize() only fixes the canvas, not the paths). Re-seed the
  // paths on resize. The 12-space indent makes this line unique to GatewayFlow
  // (FlowField's identical registration is indented differently).
  [
    "            window.addEventListener('resize', resize);",
    "            window.addEventListener('resize', () => { resize(); try { paths.forEach((path, i) => { path.startY = (i / numPaths) * height * 1.4 - height * 0.2; }); } catch (e) {} });",
  ],
];

// Fonts and remote decor images must go too: a hanging stylesheet fetch blocks
// the inline boot script at the end of <body> (and with it DOMContentLoaded,
// which both the canvas boot and ThreeUI's isolation wait on) for the whole
// network timeout on every iframe (re)load.
const BLANK_GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const REGEX_REWRITES: [from: RegExp, to: string][] = [
  [/https:\/\/fonts\.googleapis\.com[^"']*/g, "data:text/css,"],
  [/https:\/\/fonts\.gstatic\.com[^"']*/g, "data:text/css,"],
  [/https:\/\/[a-z0-9]+\.supabase\.co\/[^"']*/g, BLANK_GIF],
  [/https:\/\/static\.cloudflareinsights\.com[^"']*/g, "data:text/javascript,"],
];

// Chromium (headless and headed, at least under software rendering) sometimes
// fails to deliver the embedder's size to a freshly (re)loaded sandboxed
// srcdoc iframe: the inner document lays out at 0x0 — the canvas keeps
// painting into its buffer but nothing shows. A display:none -> restore
// round-trip on the iframe element reliably re-establishes the child layout
// (a 1px resize does not). The iframe can't be reached from outside (opaque
// origin), so inject a watchdog that reports the collapse via postMessage.
const WATCHDOG_MARKER = "data-sf-watchdog";
const WATCHDOG = `<script ${WATCHDOG_MARKER}>
(function () {
  var tries = 0;
  function check() {
    tries += 1;
    var rect = document.documentElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      parent.postMessage({ type: "sf-viewport-collapsed" }, "*");
      if (tries < 10) setTimeout(check, 500);
    } else if (tries < 4) {
      setTimeout(check, 700);
    }
  }
  setTimeout(check, 400);
})();
<\/script>`;

function patchSrcdoc(html: string): string {
  for (const [from, to] of REWRITES) {
    html = html.split(from).join(to);
  }
  for (const [from, to] of REGEX_REWRITES) {
    html = html.replace(from, to);
  }
  if (!html.includes(WATCHDOG_MARKER)) {
    html = html.replace(/<\/body>/i, `${WATCHDOG}</body>`);
  }
  return html;
}

window.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "sf-viewport-collapsed") return;
  for (const frame of document.querySelectorAll<HTMLIFrameElement>("iframe[srcdoc]")) {
    const previous = frame.style.display;
    frame.style.display = "none";
    void frame.getBoundingClientRect().width;
    requestAnimationFrame(() => {
      frame.style.display = previous;
    });
  }
});

// React sets srcDoc through setAttribute; patch the property setter too in
// case anything assigns it directly.
const setAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function (name: string, value: string) {
  if (name === "srcdoc" && typeof value === "string") {
    value = patchSrcdoc(value);
  }
  return setAttribute.call(this, name, value);
};

const srcdocDescriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "srcdoc");
if (srcdocDescriptor?.set) {
  Object.defineProperty(HTMLIFrameElement.prototype, "srcdoc", {
    ...srcdocDescriptor,
    set(value: string) {
      srcdocDescriptor.set!.call(this, typeof value === "string" ? patchSrcdoc(value) : value);
    },
  });
}

// Safety net: React can set srcdoc through an internal path that skips both
// hooks, so also observe the DOM and rewrite any iframe that slipped through
// (the rewrite triggers one reload of that iframe's document).
const needsPatch = (html: string | null): html is string =>
  !!html &&
  (REWRITES.some(([from]) => html.includes(from)) ||
    REGEX_REWRITES.some(([from]) => new RegExp(from.source).test(html)) ||
    !html.includes(WATCHDOG_MARKER));

function patchIframeElement(el: Element) {
  if (el.tagName !== "IFRAME") return;
  const srcdoc = el.getAttribute("srcdoc");
  if (needsPatch(srcdoc)) {
    el.setAttribute("srcdoc", patchSrcdoc(srcdoc));
  }
}

new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.type === "attributes") {
      patchIframeElement(m.target as Element);
    }
    for (const node of m.addedNodes) {
      if (node instanceof Element) {
        patchIframeElement(node);
        for (const frame of node.querySelectorAll("iframe")) {
          patchIframeElement(frame);
        }
      }
    }
  }
}).observe(document.documentElement, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ["srcdoc"],
});
