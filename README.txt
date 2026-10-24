Light Rogue Void — itch.io Web Build (PART 3 PATCH APPLIED)
=============================================================

This is a fully static build. No Vite, no bundler, no build step.
Upload the contents of this folder to itch.io as an HTML game.


What is new in Part 3
---------------------
Part 3 is an OVERLAY-ONLY patch. Nothing in vendor.js was
touched — every Part 3 feature lives in js/patch.js as a
DOM/UI/cinematic layer that reads the current wave from the
existing wave HUD ("MAP x · WAVE y/10") and drives visuals
from that. This makes Part 3 safe to enable/disable simply
by removing or keeping patch.js in boot.js.

Part 3 additions on top of Part 2:

  A. Special-wave banners (every 5th wave in a map).
     Each map's 5th wave gets a full-screen title reveal
     with a flavor and a matching screen vignette:

        Wave  5   ELITE RUSH    (amber)   "The swarm sharpens its teeth."
        Wave 15   GAUNTLET      (violet)  "Walls of them. Straight through."
        Wave 25   CURSE         (crimson) "Every kill leaves a mark. Move."
        Wave 35   AEGIS TRIAL   (cyan)    "Only what shines survives."
        Wave 45   ELITE RUSH    (amber)   "You know this song."
        Wave 55   GAUNTLET      (violet)  "The corridor closes."
        Wave 65   CURSE         (crimson) "The void tastes iron."
        Wave 75   AEGIS TRIAL   (cyan)    "Prove your center holds."
        Wave 85   ELITE RUSH    (amber)   "One last honest fight."
        Wave 95   CURSE         (crimson) "The threshold thins."

     These are VISUAL flavors only — actual spawn-table
     variety per flavor is deferred to Part 4 (see below).
     Part 2's elite-rush spawn-interval halving still runs
     underneath all of these.

  B. Per-boss HUD ambience (waves 10, 20, ..., 110).
     A "NOW ARRIVING" reveal with the boss name in its own
     color, plus a matching color-tinted vignette pulse.
     Colors are pulled from each boss's canonical palette
     so you get a visual cue for which boss is coming even
     before it walks on screen. Fires once per run per boss.

  C. Outside-dialogue interstitials.
     Short whisper-style captions layered on top of the
     game (they do NOT pause it) at surprise wave numbers
     that vendor.js's mid-beat table does not already cover:

        wave  3, 7, 12, 17, 23, 33, 41, 49, 57, 63, 68,
        wave 77, 83, 88, 93, 97, 103, 107, 109

     A new voice — WATCHER — is introduced here. It never
     speaks in the main Part 2 story. Meant to unsettle
     rather than explain: something outside both Light and
     Darkness has been listening.

  D. Secret scenario: "SEAM OF THE VOID" (waves 101-110).
     When you cross into wave 101 for the first time in a
     run, a one-off "SEAM OF THE VOID / Beyond the Story"
     title card is shown, then a persistent atmospheric
     wash tints the screen for the rest of that final map:

       - dark violet / plum vignette (multiply blend),
       - occasional chromatic flicker every few seconds,
       - whisper subtitles crawling in from the screen
         edges every 6-10 seconds, drawn from a pool of
         WATCHER / LIGHT / DARKNESS / WISDOM lines that
         thematically fit "the rules are peeling."

     Everything auto-clears the moment you're no longer in
     waves 101-110 (death, victory, or leaving the run).

  E. Right-click context menu is now suppressed whenever
     the game canvas is on screen, so the beam trigger
     never opens the browser menu.


How Part 3 interacts with Part 2
--------------------------------
Nothing in vendor.js is modified by Part 3. Part 2's
mechanical changes (110 waves, 11 bosses, Light Energy
paralysis, elite rush at every 5th wave, 11-chapter story
with mid-beats, boss intros/outros) all still function
exactly the same. Part 3 layers ONLY visuals and narrative
overlays on top of them. If patch.js is removed:

  * Part 2 mechanics still work.
  * The Light Energy meter and mobile BEAM button go away
    (that HUD lived in patch.js since Part 2).
  * The Part 3 banners / interstitials / seam scenario
    go away.

To disable Part 3 while keeping the Part 2 HUD, delete the
sections between the "PART 3" comment markers in patch.js.


Folder structure (unchanged from Part 2)
----------------------------------------
  index.html               Entry document (references boot.js and CSS).
  README.txt               This file.
  css/
    main.css               Core layout, canvas, scrollbar, fonts.
    mobile-fixes.css       Landscape-phone / short-viewport overrides.
  js/
    boot.js                Single entry-point loader.
    vendor.js              React + ReactDOM + Framer Motion +
                           Lucide icons + the entire game code
                           (Part 1 + Part 2 patches baked in).
                           Not touched by Part 3.
    patch.js               Part 2 + Part 3 runtime overlay. Draws
                           the Light Energy meter, the mobile
                           BEAM button, special-wave banners,
                           boss "NOW ARRIVING" reveals, outside-
                           dialogue interstitials, and the
                           SEAM OF THE VOID atmospheric scenario
                           for waves 101-110.
    i18n.js                Runtime English/Spanish translation
                           layer.


How to upload to itch.io
------------------------
1. Zip the CONTENTS of this folder (not the folder itself),
   so that `index.html` sits at the root of the archive.
2. On itch.io: Edit game → Kind of project = "HTML".
3. Upload the zip, check "This file will be played in the browser".
4. Set viewport, for example 1280 x 720, or leave it responsive.


What is deferred to Part 4
--------------------------
Per your latest instruction, Part 4 is only:

  * Divide the big files into lots of smaller ones — split
    js/vendor.js and js/patch.js into a directory of
    smaller, focused modules loaded in order by boot.js.
    (No new gameplay features; purely structural.)

Everything else already listed as deferred in Part 3's
overlay-only scope — full special-wave gameplay variety,
truly unique boss AI patterns per corrupted-light boss,
and difficulty balance for the 110-wave length — remains
out of scope of the current sequence and is not part of
Part 4.
