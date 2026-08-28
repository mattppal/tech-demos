/* Minimal gsap + ScrollTrigger stand-in for the hero iframes.
   The hero canvases animate on requestAnimationFrame; gsap is only used for
   decorative text reveals that ThreeUI's isolation script hides. But each
   source's canvas boot lives in the same DOMContentLoaded handler as a
   leading `gsap.registerPlugin(ScrollTrigger)` call, so `gsap` must exist and
   must not throw or the canvas never starts. Real ScrollTrigger can also
   misbehave inside a sandboxed srcdoc iframe, so a benign stub is both
   smaller and more reliable than the real library here. */
(function () {
  var tween = {
    then: function (f) {
      if (f) f();
      return Promise.resolve();
    },
  };
  ["kill", "pause", "play", "resume", "reverse", "restart", "progress", "seek", "timeScale"].forEach(function (k) {
    tween[k] = function () {
      return tween;
    };
  });
  var timeline = {};
  [
    "to", "from", "fromTo", "set", "add", "addLabel", "call", "kill", "pause",
    "play", "seek", "clear", "progress", "timeScale", "then",
  ].forEach(function (k) {
    timeline[k] = function () {
      return timeline;
    };
  });
  window.gsap = {
    registerPlugin: function () {},
    to: function () {
      return tween;
    },
    from: function () {
      return tween;
    },
    fromTo: function () {
      return tween;
    },
    set: function () {
      return tween;
    },
    delayedCall: function () {
      return tween;
    },
    killTweensOf: function () {},
    timeline: function () {
      return timeline;
    },
    ticker: { add: function () {}, remove: function () {}, fps: function () {}, lagSmoothing: function () {} },
    utils: {
      toArray: function (v) {
        if (typeof v === "string") return Array.prototype.slice.call(document.querySelectorAll(v));
        return Array.isArray(v) ? v : [v];
      },
      clamp: function (min, max) {
        return function (v) {
          return Math.min(max, Math.max(min, v));
        };
      },
      random: function (min, max) {
        return min + Math.random() * (max - min);
      },
    },
  };
  window.ScrollTrigger = {
    create: function () {
      return { kill: function () {} };
    },
    refresh: function () {},
    update: function () {},
    getAll: function () {
      return [];
    },
  };
})();
