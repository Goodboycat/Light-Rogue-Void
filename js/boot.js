/* =====================================================
 * Light Rogue Void — Boot Loader
 * =====================================================
 * Single entry-point loader. `index.html` only references
 * this file; all other JS modules are lazily fetched and
 * executed in a defined dependency order, so a failure in
 * any one file surfaces a clear message instead of a
 * silent white screen.
 *
 * Load order:
 *   1. js/vendor.js  — React + ReactDOM + Framer Motion +
 *                      Lucide icons + the whole game app
 *                      (self-mounting on #root at end of
 *                      file).
 *   2. js/i18n.js    — Translation / language switching
 *                      layer. MUST load AFTER vendor.js
 *                      because it walks the React-rendered
 *                      DOM and swaps strings in place.
 * ===================================================== */
(function () {
  "use strict";

  // Ordered list of scripts to load. Each entry has a src
  // (relative to index.html) and an optional "critical"
  // flag; a failure in a critical script stops the boot
  // and shows a fatal error overlay.
  var SCRIPTS = [
    { src: "js/vendor.js", critical: true },
    { src: "js/patch.js", critical: false },
    { src: "js/i18n.js", critical: false },
  ];

  // Simple sequential loader. We deliberately do NOT use
  // <script async> or Promise.all() here — each script
  // depends on globals defined by the previous one.
  function loadScript(entry) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = entry.src;
      s.defer = false;
      s.async = false;
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        reject(new Error("Failed to load " + entry.src));
      };
      document.head.appendChild(s);
    });
  }

  function showFatalError(err) {
    var root = document.getElementById("root");
    if (!root) return;
    root.innerHTML =
      '<div style="position:fixed;inset:0;background:#020617;color:#e2e8f0;' +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      'padding:2rem;text-align:center;font-family:sans-serif;">' +
      '<h1 style="color:#ef4444;font-size:2rem;margin-bottom:1rem;">BOOT FAILURE</h1>' +
      '<p style="max-width:40rem;margin-bottom:1rem;">The universe could not be initialized.</p>' +
      '<code style="background:#0f172a;padding:1rem;border-radius:6px;max-width:40rem;' +
      'display:block;color:#fca5a5;font-size:0.85rem;">' +
      (err && err.message ? err.message : String(err)) +
      "</code></div>";
  }

  // Sequentially load each script.
  var chain = Promise.resolve();
  SCRIPTS.forEach(function (entry) {
    chain = chain.then(function () {
      return loadScript(entry).catch(function (err) {
        if (entry.critical) {
          showFatalError(err);
          throw err;
        }
        // Non-critical: log and continue.
        console.warn("[boot] optional script failed:", entry.src, err);
      });
    });
  });
})();
