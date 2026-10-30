# SUGGESTIONS — chat 10 (from the owner's insight + play test). Ordered by impact.

## 1. Darkness Moves — random, rotating wave events (core of the "frustration" pillar)
- A pool of ~12 **Darkness Moves**. From wave 3 on, every wave rolls 0–1 move (later waves 1–2) from the pool, seeded by the run, so no two runs see the same order. A move never repeats in two waves in a row.
- Ideas: **Eclipse** (the screen goes black, only the spark's light radius shows enemies) · **Grasp** (huge hands rise from the screen edges and close in; only one gap) · **Rain of Eyes** (eyes that shoot when you are NOT looking/moving toward them) · **Mirror** (controls reverse for 6 s, telegraphed by a crack sound) · **Tide** (the arena shrinks into a ring of void that drains HP) · **Hunger** (essence pickups flee from you) · **Pursuer** (one unkillable shadow follows your path with a 2 s delay — dashing into your own trail hurts) · **Silence** (dash disabled for 8 s; you must weave) · **Collapse** (meteor grid with safe tiles that change) · **Swap** (all enemies teleport to mirrored positions) · **False Light** (fake essence that explodes) · **The Stare** (a giant eye opens; standing in its beam = burn).
- Each move = 1 s telegraph (sound + a Darkness line), then 8–15 s of effect. This also fixes "waves pass without the player noticing".

## 2. The 60-second Darkness interrupt (cinematic + "aaaah!")
- About 60 s into a run (and again about every 3 waves), freeze for 1.5 s, letterbox, and show one typed Darkness line ("You think running is living?"). Then something **enormous** spawns: a screen-wide maw closing from below, a hand slamming down with a 1 s shadow telegraph, or a wall of eyes sweeping across the arena. Show it at 3–5× normal enemy scale, with screen shake and `boss_arrive`.
- It must be survivable only by **reading** it, never by spam-dashing. Example: the hand's shadow tracks the dash direction, so a blind dash runs into it.

## 3. Make dash a skill, not a crutch
- Dash charges (1–2) with a visible recharge, plus a "perfect dash" window: dashing through a bullet in its last 6 frames refunds the charge and slows time briefly.
- Enemies that **punish spam**: Dash-eaters (they lunge toward the dash end point), mines that arm when you dash near them, and lasers that sweep along your dash vector.
- Track `dashes per minute`. If it stays very high, Darkness taunts ("Running again?") and the next move targets the dash.

## 4. Enemy variety per wave (kills "they aren't a big deal")
- Per wave, pick 2–3 enemy archetypes from the chapter pool instead of the whole pool. Add 1 **wave signature** (e.g. "The Swarm", "The Hunters", "Glass Wave") with its own name banner.
- One **mini-elite** per wave with a unique name and HP bar, spawned at a random time.
- Scale enemy size and silhouette up across chapters so late enemies *look* more dangerous, not just have more HP.

## 5. Guidance like Balatro (first 10 waves decide everything)
- **Glowing arrow** onboarding: after the first death, a pulsing arrow points to the Skill Tree button and then to the cheapest affordable node, with one line: "Spend light to grow." Repeat until the first 3 nodes are bought (save flag `tutorialTree`).
- Show a "+X new upgrades affordable" badge on the game-over screen, with the arrow pointing to it.
- Use 3–4 word tooltips on the first visit of each screen, never a wall of text.
- In wave 1–3, show context hints for 3 s each: "Dash through bullets", "Stay in the light", "Elites drop relics".

## 6. Juice / readability (looks professional)
- Cap full-screen tints (wave 5 vignette, Eclipse flash) to ≤ 35 % alpha and keep a dark ring around the player so they are always visible.
- Give Darkness a real silhouette (void body with white rim light, eyes) instead of a white blob.
- Make "VOID" in the logo bright on hover/idle, or switch it to a filled glow.
- Bigger HUD fonts and a UI scale setting (100/125/150 %). itch embeds at 960×540.
- Use hit-stop (2–3 frames) on elite and boss hits, plus a stronger death animation for enemies (shards).

## 7. Itch page / release
- Use the 6 screenshots + banner in `LIGHT_extras/itch/`. Record a 15 s GIF of a Darkness Move for the first image, because motion sells.
- Tagline idea: "A tiny light. An endless dark that hates you."
- Get the music next (9 tracks in `AUDIO_REMAINING.md`). It is the biggest perceived-quality jump per credit.
