/* =====================================================
 * Light Rogue Void — Part 2 + Part 3 Overlay (patch.js)
 * =====================================================
 * Runtime UI/cinematic layer that sits on top of vendor.js.
 * PART 2 responsibilities (unchanged, kept in this file):
 *   - Draw the Light Energy meter (top-right HUD).
 *   - Mobile BEAM touch button next to dash button.
 *   - Bridge mobile beam pulse -> Input.virtualBeam via
 *     synthesized KeyE keydown.
 *   - Local UI energy approximation via essence-counter tick.
 *
 * PART 3 additions (absorbed into this file per user brief):
 *   A. Special-wave BANNERS (every 5th wave in a map).
 *      Flavors cycle across maps: ELITE / GAUNTLET / CURSE
 *      / AEGIS — visual only. Each has its own color palette
 *      and screen atmospheric.
 *   B. Per-boss HUD ambience (waves 10,20,...,110): subtle
 *      screen tint / vignette per boss identity, plus a
 *      "NOW ARRIVING" preflash the first time each boss
 *      wave is entered.
 *   C. Outside-dialogue interstitials — short whisper
 *      subtitles at surprise wave numbers, layered on top
 *      of the game without pausing it.
 *   D. Secret scenario cutscene for waves 101-110 ("SEAM
 *      OF THE VOID"): darker screen wash, floating whisper
 *      lines that periodically crawl in from the edges,
 *      chromatic flicker.
 *
 * Design constraint: vendor.js is NOT touched. All Part 3
 * effects read the current wave/map from the existing wave
 * HUD DOM signature `MAP X · WAVE Y/10` rendered every frame
 * by vendor.js. Because it re-renders every frame, we just
 * poll it at 200ms and drive our overlays from that.
 *
 * Safe to disable: delete this file and remove its entry
 * from boot.js. Nothing else in the build depends on it.
 * ===================================================== */
(function () {
  "use strict";

  /* =====================================================
   * PART 2: Light Energy meter + mobile beam button.
   * (Original Part 2 patch.js content, unchanged.)
   * ===================================================== */

  var meterEl = null;
  var barEl = null;
  var labelEl = null;
  var mobileBtn = null;

  function ensureMeter() {
    if (meterEl && document.body.contains(meterEl)) return;
    meterEl = document.createElement("div");
    meterEl.id = "lrv-patch-lightenergy";
    meterEl.style.cssText = [
      "position:fixed",
      "top:110px",
      "right:20px",
      "z-index:60",
      "pointer-events:none",
      "font-family:'Rajdhani',sans-serif",
      "letter-spacing:0.3em",
      "color:#fef3c7",
      "text-shadow:0 0 8px rgba(253,224,71,0.5)",
      "user-select:none",
      "display:none",
    ].join(";");
    meterEl.innerHTML =
      '<div style="font-size:10px;opacity:0.7;margin-bottom:4px;">LIGHT ENERGY</div>' +
      '<div style="width:180px;height:8px;border:1px solid rgba(253,224,71,0.4);' +
      "background:rgba(0,0,0,0.5);border-radius:4px;overflow:hidden;\">" +
      '<div id="lrv-patch-lightenergy-bar" style="height:100%;width:0%;' +
      'background:linear-gradient(90deg,#fef3c7,#fbbf24);transition:width 0.12s linear;box-shadow:0 0 12px #fbbf24;"></div>' +
      "</div>" +
      '<div id="lrv-patch-lightenergy-label" style="font-size:9px;opacity:0.6;margin-top:4px;text-align:right;">RIGHT-CLICK TO FIRE BEAM</div>';
    document.body.appendChild(meterEl);
    barEl = document.getElementById("lrv-patch-lightenergy-bar");
    labelEl = document.getElementById("lrv-patch-lightenergy-label");
  }

  function ensureMobileButton() {
    if (mobileBtn && document.body.contains(mobileBtn)) return;
    var isTouch = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
    if (!isTouch) return;
    mobileBtn = document.createElement("button");
    mobileBtn.id = "lrv-patch-beam-btn";
    mobileBtn.textContent = "BEAM";
    mobileBtn.style.cssText = [
      "position:fixed",
      "bottom:100px",
      "right:20px",
      "z-index:70",
      "width:72px",
      "height:72px",
      "border-radius:50%",
      "border:2px solid rgba(253,224,71,0.6)",
      "background:radial-gradient(circle,rgba(253,224,71,0.25),rgba(0,0,0,0.7))",
      "color:#fef3c7",
      "font-family:'Orbitron',sans-serif",
      "font-size:12px",
      "font-weight:700",
      "letter-spacing:0.15em",
      "text-shadow:0 0 6px rgba(253,224,71,0.8)",
      "box-shadow:0 0 15px rgba(253,224,71,0.35)",
      "touch-action:manipulation",
      "-webkit-user-select:none",
      "user-select:none",
      "cursor:pointer",
      "opacity:0.4",
      "transition:opacity 0.15s,transform 0.1s",
      "display:none",
    ].join(";");
    var press = function (e) {
      if (e) e.preventDefault();
      window.__lrvBeamPulse = true;
      mobileBtn.style.transform = "scale(0.9)";
      setTimeout(function () { mobileBtn.style.transform = "scale(1)"; }, 100);
    };
    mobileBtn.addEventListener("touchstart", press, { passive: false });
    mobileBtn.addEventListener("mousedown", press);
    document.body.appendChild(mobileBtn);
  }

  function pulseKeyE() {
    var ev = new KeyboardEvent("keydown", { code: "KeyE", key: "e", bubbles: true });
    window.dispatchEvent(ev);
    setTimeout(function () {
      var up = new KeyboardEvent("keyup", { code: "KeyE", key: "e", bubbles: true });
      window.dispatchEvent(up);
    }, 60);
  }

  /* =====================================================
   * PART 3: Wave probe.
   *
   * The wave HUD label rendered by vendor.js (line 47413)
   * uses the exact shape:
   *
   *     MAP {m} · WAVE {w}/10
   *
   * with a middle-dot (\u00B7). We scan for that node every
   * 200ms and parse the numbers out. Once we know the wave
   * we can drive every Part 3 overlay from it.
   * ===================================================== */

  var waveState = {
    map: 0,
    wave: 0,
    total: 0,          // 1..110
    lastTotal: -1,     // detect change
    inGame: false,
  };

  // Regex tolerant to whitespace, middle-dot variants, and
  // future rewording (e.g. bullet or dash instead of dot).
  var WAVE_RE = /MAP\s+(\d+)\s*[^\d]+WAVE\s+(\d+)\s*\/\s*10/i;

  function scanWaveHud() {
    // Vendor.js writes the wave HUD into a small text div.
    // Grabbing all short spans/divs and filtering by regex
    // is cheap and safe.
    var nodes = document.querySelectorAll("div,span");
    for (var i = 0; i < nodes.length; i++) {
      var txt = nodes[i].textContent || "";
      if (txt.length > 40) continue; // skip long blocks
      var m = WAVE_RE.exec(txt);
      if (m) {
        var mp = parseInt(m[1], 10);
        var wv = parseInt(m[2], 10);
        if (mp >= 1 && wv >= 1 && wv <= 10) {
          waveState.map = mp;
          waveState.wave = wv;
          waveState.total = (mp - 1) * 10 + wv;
          waveState.inGame = true;
          return;
        }
      }
    }
    waveState.inGame = false;
  }

  /* =====================================================
   * PART 3 A. Special-wave banners.
   *
   * Waves 5,15,25,...,95 are Part 2's "elite rush" — every
   * map's 5th wave. Part 3 adds a VISUAL flavor per map so
   * they don't all look the same:
   *   Map 1  wave 5   ELITE RUSH   (amber)
   *   Map 2  wave 15  GAUNTLET     (violet)
   *   Map 3  wave 25  CURSE        (crimson)
   *   Map 4  wave 35  AEGIS TRIAL  (cyan)
   *   Map 5  wave 45  ELITE RUSH   (amber)
   *   Map 6  wave 55  GAUNTLET     (violet)
   *   Map 7  wave 65  CURSE        (crimson)
   *   Map 8  wave 75  AEGIS TRIAL  (cyan)
   *   Map 9  wave 85  ELITE RUSH   (amber)
   *   Map 10 wave 95  CURSE        (crimson)
   * Boss waves (10,20,...,110) get their OWN banners handled
   * in Part 3 B below.
   * ===================================================== */

  var SPECIAL_FLAVORS = {
    5:  { name: "ELITE RUSH",   color: "#fbbf24", glow: "rgba(251,191,36,0.55)",   sub: "The swarm sharpens its teeth." },
    15: { name: "GAUNTLET",     color: "#a78bfa", glow: "rgba(167,139,250,0.55)",  sub: "Walls of them. Straight through." },
    25: { name: "CURSE",        color: "#f87171", glow: "rgba(248,113,113,0.55)",  sub: "Every kill leaves a mark. Move." },
    35: { name: "AEGIS TRIAL",  color: "#67e8f9", glow: "rgba(103,232,249,0.55)",  sub: "Only what shines survives." },
    45: { name: "ELITE RUSH",   color: "#fbbf24", glow: "rgba(251,191,36,0.55)",   sub: "You know this song." },
    55: { name: "GAUNTLET",     color: "#a78bfa", glow: "rgba(167,139,250,0.55)",  sub: "The corridor closes." },
    65: { name: "CURSE",        color: "#f87171", glow: "rgba(248,113,113,0.55)",  sub: "The void tastes iron." },
    75: { name: "AEGIS TRIAL",  color: "#67e8f9", glow: "rgba(103,232,249,0.55)",  sub: "Prove your center holds." },
    85: { name: "ELITE RUSH",   color: "#fbbf24", glow: "rgba(251,191,36,0.55)",   sub: "One last honest fight." },
    95: { name: "CURSE",        color: "#f87171", glow: "rgba(248,113,113,0.55)",  sub: "The threshold thins." },
  };

  var BOSS_BANNERS = {
    10:  { name: "HIVE MIND",          color: "#f472b6", glow: "rgba(244,114,182,0.6)"  },
    20:  { name: "FALLEN STAR",        color: "#fbbf24", glow: "rgba(251,191,36,0.6)"   },
    30:  { name: "VOID WARDEN",        color: "#c084fc", glow: "rgba(192,132,252,0.6)"  },
    40:  { name: "FALSE DAWN",         color: "#fde68a", glow: "rgba(253,230,138,0.6)"  },
    50:  { name: "CRIMSON ECLIPSE",    color: "#ef4444", glow: "rgba(239,68,68,0.6)"    },
    60:  { name: "HOLLOW HALO",        color: "#fef9c3", glow: "rgba(254,249,195,0.6)"  },
    70:  { name: "COLLAPSING NEUTRON", color: "#60a5fa", glow: "rgba(96,165,250,0.6)"   },
    80:  { name: "MIRROR SUN",         color: "#e0e7ff", glow: "rgba(224,231,255,0.6)"  },
    90:  { name: "ENTROPY TITAN",      color: "#a3e635", glow: "rgba(163,230,53,0.6)"   },
    100: { name: "BROKEN DAWN",        color: "#fef3c7", glow: "rgba(254,243,199,0.6)"  },
    110: { name: "DARKNESS",           color: "#7c3aed", glow: "rgba(124,58,237,0.7)"   },
  };

  // Track which banners we've shown so we don't re-fire when
  // the wave HUD ticks the same number multiple frames.
  var shownBanners = {};

  function showBanner(kind, wave, spec) {
    var key = kind + ":" + wave;
    if (shownBanners[key]) return;
    shownBanners[key] = true;

    var host = document.createElement("div");
    host.className = "lrv-part3-banner";
    host.style.cssText = [
      "position:fixed",
      "top:38%",
      "left:50%",
      "transform:translate(-50%,-50%)",
      "z-index:65",
      "pointer-events:none",
      "text-align:center",
      "font-family:'Orbitron',sans-serif",
      "opacity:0",
      "transition:opacity 0.35s ease-out",
      "text-shadow:0 0 24px " + spec.glow,
    ].join(";");

    var kicker = kind === "boss" ? "NOW ARRIVING" : "SPECIAL WAVE";
    host.innerHTML =
      '<div style="font-size:12px;letter-spacing:0.6em;color:' + spec.color + ';opacity:0.85;">' + kicker + '</div>' +
      '<div style="font-size:56px;font-weight:800;letter-spacing:0.2em;color:' + spec.color + ';margin-top:8px;text-shadow:0 0 28px ' + spec.glow + ';">' + spec.name + '</div>' +
      (spec.sub ? '<div style="font-size:13px;letter-spacing:0.35em;color:#e2e8f0;opacity:0.75;margin-top:14px;font-family:Rajdhani,sans-serif;">' + spec.sub + '</div>' : '');

    document.body.appendChild(host);
    // Fade in.
    requestAnimationFrame(function () { host.style.opacity = "1"; });
    // Fade out after ~2.2s, remove at 2.8s.
    setTimeout(function () { host.style.opacity = "0"; }, 2200);
    setTimeout(function () { if (host.parentNode) host.parentNode.removeChild(host); }, 2800);

    // Also drive the atmospherics for special/curse/aegis/gauntlet flavors.
    if (kind === "special") {
      pulseVignette(spec.glow, 2200);
    } else if (kind === "boss") {
      pulseVignette(spec.glow, 1800);
    }
  }

  /* =====================================================
   * PART 3 A/B (screen atmospheric): vignette pulse.
   *
   * Single reusable full-screen radial gradient overlay
   * that fades in and out. Colors driven by the caller.
   * ===================================================== */
  var vignetteEl = null;
  function ensureVignette() {
    if (vignetteEl && document.body.contains(vignetteEl)) return;
    vignetteEl = document.createElement("div");
    vignetteEl.id = "lrv-part3-vignette";
    vignetteEl.style.cssText = [
      "position:fixed",
      "inset:0",
      "pointer-events:none",
      "z-index:55",
      "opacity:0",
      "transition:opacity 0.5s ease-out",
      "mix-blend-mode:screen",
      "background:radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0) 60%, rgba(0,0,0,0) 100%)",
    ].join(";");
    document.body.appendChild(vignetteEl);
  }

  function pulseVignette(glow, holdMs) {
    ensureVignette();
    vignetteEl.style.background =
      "radial-gradient(circle at center, rgba(0,0,0,0) 30%, " + glow + " 78%, rgba(0,0,0,0.85) 100%)";
    vignetteEl.style.opacity = "0.7";
    setTimeout(function () { vignetteEl.style.opacity = "0"; }, holdMs || 1600);
  }

  /* =====================================================
   * PART 3 C. Outside-dialogue interstitials.
   *
   * Whisper-style captions that appear near the bottom of
   * the screen for ~3s WITHOUT pausing the game, on wave
   * numbers that are NOT already handled by vendor.js's
   * mid-beat table (5,15,25,...,105) and not boss waves.
   *
   * Speakers include an unnamed WATCHER — a hint that
   * something outside both Light and Darkness has been
   * listening. Meant to unsettle rather than explain.
   * ===================================================== */

  var INTERSTITIALS = {
    3:   { who: "LIGHT",     text: "The first swarm smells warm.  Then hungry." },
    7:   { who: "DARKNESS",  text: "Still burning.  Curious." },
    12:  { who: "WATCHER",   text: "…the small one keeps refusing…" },
    17:  { who: "LIGHT",     text: "The star copied my color and forgot to copy my will." },
    23:  { who: "DARKNESS",  text: "Walls are a mercy.  You should thank me." },
    33:  { who: "LIGHT",     text: "That was not a sunrise.  That was a set piece." },
    41:  { who: "WATCHER",   text: "…someone else is watching him win…" },
    49:  { who: "DARKNESS",  text: "Eclipses were the old fear.  You keep the new one." },
    57:  { who: "WISDOM",    text: "Halos are geometry.  Yours is choice." },
    63:  { who: "LIGHT",     text: "Every empty crown I break gets lighter." },
    68:  { who: "WATCHER",   text: "…the seam remembers him…" },
    77:  { who: "LIGHT",     text: "The reflection blinked before I did." },
    83:  { who: "DARKNESS",  text: "You are ruining a proof I have kept for eons." },
    88:  { who: "WATCHER",   text: "…he was never supposed to reach the machine…" },
    93:  { who: "LIGHT",     text: "The titan's gears sound tired.  So do I." },
    97:  { who: "DARKNESS",  text: "One dawn left.  Then only me." },
    103: { who: "WATCHER",   text: "…nothing here is fair…  that is the point…" },
    107: { who: "LIGHT",     text: "The rules are peeling.  Under them is only him." },
    109: { who: "WISDOM",    text: "You went farther than the story wanted.  Finish it." },
  };

  function speakerColor(who) {
    if (who === "LIGHT")    return "#fef3c7";
    if (who === "DARKNESS") return "#c084fc";
    if (who === "WISDOM")   return "#67e8f9";
    if (who === "WATCHER")  return "#94a3b8";
    return "#e2e8f0";
  }

  function showInterstitial(wave, line) {
    var key = "int:" + wave;
    if (shownBanners[key]) return;
    shownBanners[key] = true;

    var col = speakerColor(line.who);
    var host = document.createElement("div");
    host.className = "lrv-part3-interstitial";
    host.style.cssText = [
      "position:fixed",
      "bottom:22%",
      "left:50%",
      "transform:translate(-50%, 30px)",
      "z-index:64",
      "pointer-events:none",
      "opacity:0",
      "text-align:center",
      "font-family:'Rajdhani',sans-serif",
      "transition:opacity 0.6s ease-out, transform 0.6s ease-out",
      "max-width:min(90vw, 640px)",
      "padding:10px 18px",
      "background:linear-gradient(180deg, rgba(2,6,23,0.0), rgba(2,6,23,0.55))",
      "border-top:1px solid " + col + "44",
      "border-bottom:1px solid " + col + "44",
    ].join(";");
    var italic = line.who === "WATCHER" ? "italic" : "normal";
    host.innerHTML =
      '<div style="font-size:10px;letter-spacing:0.55em;color:' + col + ';opacity:0.85;">' + line.who + '</div>' +
      '<div style="font-size:18px;letter-spacing:0.06em;color:#f1f5f9;margin-top:4px;font-style:' + italic + ';text-shadow:0 0 12px ' + col + '55;">' + line.text + '</div>';

    document.body.appendChild(host);
    requestAnimationFrame(function () {
      host.style.opacity = "1";
      host.style.transform = "translate(-50%, 0)";
    });
    setTimeout(function () {
      host.style.opacity = "0";
      host.style.transform = "translate(-50%, -12px)";
    }, 3400);
    setTimeout(function () { if (host.parentNode) host.parentNode.removeChild(host); }, 4200);
  }

  /* =====================================================
   * PART 3 D. Secret scenario — "SEAM OF THE VOID".
   *
   * Only active when waveState.total is in [101, 110].
   * Effects:
   *   1. Persistent dark violet screen wash (below UI).
   *   2. Chromatic flicker every 4-8s (single frame).
   *   3. Whisper-lines that crawl in from screen edges
   *      periodically (independent of wave changes).
   *   4. Onset flash + title reveal exactly once when the
   *      player first crosses into wave 101.
   * ===================================================== */

  var seamWashEl = null;
  var seamFlickerEl = null;
  var seamActive = false;
  var seamTitleShown = false;
  var seamWhisperTimer = 0;

  var SEAM_WHISPERS = [
    { who: "WATCHER", text: "…you are the wrong answer to a very old question…" },
    { who: "WATCHER", text: "…the story does not know what to do with you…" },
    { who: "DARKNESS", text: "You should be a lesson by now." },
    { who: "LIGHT",    text: "I am a lesson.  Just not the one you wanted." },
    { who: "WATCHER", text: "…the seam remembers every stubborn thing…" },
    { who: "WISDOM",   text: "You are outside the room the void built.  Keep going." },
    { who: "DARKNESS", text: "Even here?  Even here you burn?" },
    { who: "LIGHT",    text: "Even here." },
    { who: "WATCHER", text: "…he is quieter now, and that scares them more…" },
    { who: "DARKNESS", text: "Finish it, then.  Prove I was wrong to make you a myth." },
  ];

  function ensureSeamWash() {
    if (seamWashEl && document.body.contains(seamWashEl)) return;
    seamWashEl = document.createElement("div");
    seamWashEl.id = "lrv-part3-seamwash";
    seamWashEl.style.cssText = [
      "position:fixed",
      "inset:0",
      "pointer-events:none",
      "z-index:50",
      "opacity:0",
      "transition:opacity 1.4s ease-in-out",
      "background:radial-gradient(ellipse at center, rgba(88,28,135,0.15) 0%, rgba(30,7,50,0.35) 55%, rgba(0,0,0,0.55) 100%)",
      "mix-blend-mode:multiply",
    ].join(";");
    document.body.appendChild(seamWashEl);

    seamFlickerEl = document.createElement("div");
    seamFlickerEl.id = "lrv-part3-seamflicker";
    seamFlickerEl.style.cssText = [
      "position:fixed",
      "inset:0",
      "pointer-events:none",
      "z-index:51",
      "opacity:0",
      "transition:opacity 0.08s linear",
      "background:linear-gradient(0deg, rgba(124,58,237,0.15), rgba(56,189,248,0.1), rgba(124,58,237,0.15))",
      "mix-blend-mode:screen",
    ].join(";");
    document.body.appendChild(seamFlickerEl);
  }

  function activateSeam() {
    if (seamActive) return;
    seamActive = true;
    ensureSeamWash();
    seamWashEl.style.opacity = "1";

    if (!seamTitleShown) {
      seamTitleShown = true;
      // Show the once-only "SEAM OF THE VOID" title card.
      var title = document.createElement("div");
      title.style.cssText = [
        "position:fixed",
        "top:50%",
        "left:50%",
        "transform:translate(-50%,-50%)",
        "z-index:66",
        "pointer-events:none",
        "text-align:center",
        "font-family:'Orbitron',sans-serif",
        "opacity:0",
        "transition:opacity 1.2s ease-in-out",
      ].join(";");
      title.innerHTML =
        '<div style="font-size:11px;letter-spacing:0.7em;color:#a78bfa;opacity:0.9;">BEYOND THE STORY</div>' +
        '<div style="font-size:64px;font-weight:800;letter-spacing:0.24em;color:#e9d5ff;margin-top:14px;text-shadow:0 0 40px rgba(167,139,250,0.6);">SEAM OF THE VOID</div>' +
        '<div style="font-size:13px;letter-spacing:0.4em;color:#e2e8f0;opacity:0.7;margin-top:20px;font-family:Rajdhani,sans-serif;">The rules are peeling.  Ten waves remain.</div>';
      document.body.appendChild(title);
      requestAnimationFrame(function () { title.style.opacity = "1"; });
      setTimeout(function () { title.style.opacity = "0"; }, 3800);
      setTimeout(function () { if (title.parentNode) title.parentNode.removeChild(title); }, 5100);
    }
  }

  function deactivateSeam() {
    if (!seamActive) return;
    seamActive = false;
    if (seamWashEl) seamWashEl.style.opacity = "0";
    if (seamFlickerEl) seamFlickerEl.style.opacity = "0";
  }

  function showSeamWhisper() {
    var line = SEAM_WHISPERS[Math.floor(Math.random() * SEAM_WHISPERS.length)];
    var col = speakerColor(line.who);
    var host = document.createElement("div");
    // Random-ish placement along the edges so it doesn't cover the boss.
    var edges = [
      { top: "18%", left: "8%",  translateX: "-40px" },
      { top: "18%", right:"8%",  translateX: "40px"  },
      { top: "72%", left: "8%",  translateX: "-40px" },
      { top: "72%", right:"8%",  translateX: "40px"  },
    ];
    var e = edges[Math.floor(Math.random() * edges.length)];
    host.style.cssText = [
      "position:fixed",
      "top:" + e.top,
      (e.left ? "left:" + e.left : "right:" + e.right),
      "z-index:64",
      "pointer-events:none",
      "opacity:0",
      "font-family:'Rajdhani',sans-serif",
      "max-width:min(45vw, 320px)",
      "padding:6px 12px",
      "font-style:italic",
      "background:linear-gradient(90deg, rgba(2,6,23,0.55), rgba(2,6,23,0.0))",
      "border-left:2px solid " + col + "88",
      "transform:translate(" + e.translateX + ", 0)",
      "transition:opacity 0.8s ease-out, transform 0.8s ease-out",
    ].join(";");
    host.innerHTML =
      '<div style="font-size:9px;letter-spacing:0.5em;color:' + col + ';opacity:0.8;">' + line.who + '</div>' +
      '<div style="font-size:13px;color:#e2e8f0;opacity:0.92;text-shadow:0 0 10px ' + col + '55;">' + line.text + '</div>';
    document.body.appendChild(host);
    requestAnimationFrame(function () {
      host.style.opacity = "1";
      host.style.transform = "translate(0,0)";
    });
    setTimeout(function () { host.style.opacity = "0"; }, 4000);
    setTimeout(function () { if (host.parentNode) host.parentNode.removeChild(host); }, 5000);
  }

  function seamFlicker() {
    if (!seamFlickerEl) return;
    seamFlickerEl.style.opacity = "0.5";
    setTimeout(function () { seamFlickerEl.style.opacity = "0"; }, 80);
    setTimeout(function () { seamFlickerEl.style.opacity = "0.3"; }, 140);
    setTimeout(function () { seamFlickerEl.style.opacity = "0"; }, 220);
  }

  /* =====================================================
   * MAIN POLL LOOP (200ms).
   *
   * Also handles the Part 2 energy-meter probe as before,
   * plus every Part 3 driver above.
   * ===================================================== */

  var uiEnergy = 0;
  var uiMax = 100;
  window.__lrvLightEnergyMax = uiMax;
  var lastMatter = 0;

  function readMatterCounter() {
    var nodes = document.querySelectorAll("div,span");
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i].textContent || "";
      var m = t.match(/^\s*([\d,]+)\s*$/);
      if (m && nodes[i].className && /tabular-nums/.test(nodes[i].className)) {
        return parseInt(m[1].replace(/,/g, ""), 10) || 0;
      }
    }
    return -1;
  }

  var seamTickAcc = 0;

  setInterval(function () {
    ensureMeter();
    ensureMobileButton();
    ensureVignette();

    // Detect if the game canvas is currently visible (not on menu).
    var canvas = document.querySelector("canvas");
    var gameVisible = !!canvas && canvas.offsetParent !== null &&
      !document.querySelector("[data-menu-open]") &&
      !Array.from(document.querySelectorAll("h1,h2,div")).some(function (el) {
        return /LIGHT ROGUE VOID/i.test(el.textContent || "") && el.getBoundingClientRect().height > 40;
      });

    var energy = window.__lrvLightEnergy;
    var max = window.__lrvLightEnergyMax || 100;

    if (gameVisible && typeof energy === "number") {
      meterEl.style.display = "block";
      if (mobileBtn) mobileBtn.style.display = "block";
      var pct = Math.max(0, Math.min(100, (energy / max) * 100));
      if (barEl) barEl.style.width = pct + "%";
      if (labelEl) {
        if (pct >= 100) {
          labelEl.textContent = "READY — RIGHT-CLICK / BEAM";
          labelEl.style.color = "#fde047";
          labelEl.style.opacity = "1";
          meterEl.style.filter = "drop-shadow(0 0 12px rgba(253,224,71,0.9))";
          if (mobileBtn) mobileBtn.style.opacity = "1";
        } else {
          labelEl.textContent = "RIGHT-CLICK TO FIRE BEAM";
          labelEl.style.color = "#fef3c7";
          labelEl.style.opacity = "0.6";
          meterEl.style.filter = "";
          if (mobileBtn) mobileBtn.style.opacity = "0.35";
        }
      }
    } else {
      meterEl.style.display = "none";
      if (mobileBtn) mobileBtn.style.display = "none";
    }

    if (window.__lrvBeamPulse) {
      window.__lrvBeamPulse = false;
      pulseKeyE();
    }

    /* ------- Part 3 wave-driven overlays ------- */
    scanWaveHud();
    if (!waveState.inGame) {
      // Player left the run. Reset shownBanners so returning
      // to the game (new run) will re-fire them properly.
      if (waveState.lastTotal !== -1) {
        shownBanners = {};
        waveState.lastTotal = -1;
        deactivateSeam();
        seamTitleShown = false;
      }
      return;
    }

    // On wave change: consider banners + interstitials.
    if (waveState.total !== waveState.lastTotal) {
      var w = waveState.total;
      waveState.lastTotal = w;

      if (BOSS_BANNERS[w]) {
        showBanner("boss", w, BOSS_BANNERS[w]);
      } else if (SPECIAL_FLAVORS[w]) {
        showBanner("special", w, SPECIAL_FLAVORS[w]);
      } else if (INTERSTITIALS[w]) {
        showInterstitial(w, INTERSTITIALS[w]);
      }

      // Seam scenario: activate on entry to 101, deactivate on leaving 101-110.
      if (w >= 101 && w <= 110) {
        activateSeam();
      } else {
        deactivateSeam();
        seamTitleShown = false; // allow it to re-play on future runs
      }
    }

    // Seam ongoing effects (whispers + flicker), only when active.
    if (seamActive) {
      seamTickAcc += 200; // interval in ms
      // Whisper every 6-10 seconds.
      if (seamTickAcc >= 6000 + Math.floor(Math.random() * 4000)) {
        seamTickAcc = 0;
        showSeamWhisper();
        // Occasional flicker paired with whisper.
        if (Math.random() < 0.55) seamFlicker();
      } else if (Math.random() < 0.008) {
        // Rare standalone chromatic flicker.
        seamFlicker();
      }
    }
  }, 100);

  /* =====================================================
   * PART 2 essence-tick approximation (unchanged).
   * ===================================================== */
  setInterval(function () {
    var m = readMatterCounter();
    if (m < 0) return;
    if (lastMatter === 0) { lastMatter = m; return; }
    var gained = m - lastMatter;
    lastMatter = m;
    if (gained > 0) {
      uiEnergy = Math.min(uiMax, uiEnergy + Math.min(15, gained * 0.15));
      window.__lrvLightEnergy = uiEnergy;
    }
  }, 200);

  window.addEventListener("keydown", function (ev) {
    if (ev.code === "KeyE" && uiEnergy >= uiMax) {
      uiEnergy = 0;
      window.__lrvLightEnergy = 0;
    }
  }, true);
  window.addEventListener("mousedown", function (ev) {
    if (ev.button === 2 && uiEnergy >= uiMax) {
      uiEnergy = 0;
      window.__lrvLightEnergy = 0;
    }
  }, true);

  // Block the browser context menu so right-click can be used as the beam key.
  // vendor.js already dispatches its own contextmenu preventDefault when the
  // game canvas has focus, but on some layouts right-click still opens the
  // browser menu over the meter/vignette overlays. Suppress globally while
  // a game canvas is visible.
  window.addEventListener("contextmenu", function (ev) {
    var canvas = document.querySelector("canvas");
    if (canvas && canvas.offsetParent !== null) {
      ev.preventDefault();
    }
  }, true);

  console.log("[patch.js] Part 2 + Part 3 overlay initialised — Light Energy + special banners + seam scenario ready.");
})();
