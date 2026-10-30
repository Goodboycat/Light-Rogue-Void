# Prompt for the next chat — copy everything below the line and attach `LIGHT.tar.gz`

---

Continue **LIGHT (Light Rogue Void)**, my passion project. You may not finish everything; that is expected. The attached `LIGHT.tar.gz` is the whole repo (`LIGHT/` = repo root, game in `LIGHT/game/`, docs in `LIGHT/docs/`, one instruction file per chat in `LIGHT/prompts/`).

## Setup (do this first, no questions)
1. Extract the tar so the repo is at `/home/user/webapp/LIGHT` (or `git clone https://github.com/Goodboycat/Light-Rogue-Void /home/user/webapp/LIGHT`).
2. `cd /home/user/webapp && bash LIGHT/game/tools/github.sh <TOKEN>` once (I paste the token here: `<TOKEN>`).
3. `cd LIGHT/game && npm install && npm run build` must be green before you touch anything.
4. `bash LIGHT/game/tools/next.sh` prints the chat ID you must do and shows its prompt file. Read `docs/CONVENTIONS.md` and `docs/HANDOFF.md` first, then that prompt. Do that ID first. **When its handoff is finished (README/HANDOFF/itch/push), run `next.sh` again and continue with the next ID in the same chat** — repeat until credits run low. Do not re-plan, do not reorder. Report to me after every finished ID (you may get axed at any time).

## Chat 10 note
Chat 10 was owner-directed. Before running next.sh, read `docs/HANDOFF.md` → "Chat 10" and do its **Next** list first (Darkness Moves, 60 s interrupt, dash skill, glowing-arrow onboarding). Screenshots: `sudo npx playwright install-deps chromium` once, then `node tools/shots.mjs`.

## Rules
- **Roguelite, not roguelike.** All permanent power is the Skill Tree. No in-run power picking, no "choose 1 of 3", no boon drafts, no node map, no mercy. Run-only things are *discovered* on the map, never offered.
- Pillars: **storytelling · action · discovery · stressful but fair bosses**.
- Commit + `git push origin main` after **every step** of the prompt, message `<ID>: <step>`. Small tasks, small commits.
- Credits are scarce: `grep -n` + `sed -n a,bp`, no re-reading big files, no Playwright unless the prompt says so, edits over rewrites.
- Art stays procedural Canvas 2D (5A/5B later turn it into PNGs via a gallery screenshot). Audio comes from Ludo.ai — only prompt lists + loaders in the repo. No generated images/audio committed.
- The rejected AI "fixed" version is branch `fixed-fork`; the original is `original-complete`. Read fork files with `bash LIGHT/game/tools/fork.sh <path>`; `docs/FORK_AUDIT.md` says what to port and what is forbidden.
- I will do nothing except upload the `LIGHT` folder to the next chat. Everything the next chat needs must be in the repo.

## Finish the chat (mandatory even if credits run low)
1. README: move the ID to the "Done" table, remove it from the `Next:` line (if half-done, leave it first with `(cont.)` in its row).
2. `docs/HANDOFF.md`: what is done, what is half-done, exact file/line pointers, known bugs, measured numbers.
3. `bash LIGHT/game/tools/itch.sh` → upload `LIGHT/out/light-rogue-void-itch.zip` as a download link named **light-rogue-void-itch**.
4. Also give me a download link of the whole `LIGHT` folder as `LIGHT.tar.gz` (exclude `node_modules`, `dist`, `out`).
5. Push. Then report to me in chat: what you did, what you skipped and why, and the exact prompt for the next chat (update this file `prompts/NEXT_CHAT.md` if anything about the setup changed).
6. **Then continue with the next ID** (`bash LIGHT/game/tools/next.sh`) in this same chat, repeating steps 1–5 for it. Stop only when credits are nearly out — always leave the repo pushed with README/HANDOFF current.

`npm run typecheck` is clean since 7A — it is part of the gate together with `npm run build` (the build does NOT catch missing imports; typecheck does — that is what broke the itch upload once).

Do not ask me to confirm the plan. Do not ask me to choose. Report, don't ask.
