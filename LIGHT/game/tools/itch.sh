#!/usr/bin/env bash
# Builds the single-file itch.io build and zips it to LIGHT/out/light-rogue-void-itch.zip
# Run from anywhere: bash LIGHT/game/tools/itch.sh
set -e
cd "$(dirname "$0")/.."            # LIGHT/game
ROOT="$(cd .. && pwd)"             # LIGHT
rm -rf "$ROOT/out/light-rogue-void-itch" "$ROOT/out/light-rogue-void-itch.zip"
mkdir -p "$ROOT/out"
ITCH=1 npx vite build --mode itch --outDir "$ROOT/out/light-rogue-void-itch"
cd "$ROOT/out/light-rogue-void-itch"
# (5B) public/sprites/ (149 PNG + atlas.json, ~1.4 MB) is copied by vite next to index.html and shipped in the zip
# (too big to inline as base64 — budget 1 MB). SpriteRenderer resolves `sprites/` relative to document.baseURI.
[ -f sprites/atlas.json ] || { echo "itch: sprites/atlas.json missing (run npm run art)"; exit 1; }
# itch wants index.html at the archive root
zip -q -r ../light-rogue-void-itch.zip .
cd ..
ls -la light-rogue-void-itch.zip
unzip -l light-rogue-void-itch.zip | grep -q ' index.html$' || { echo "itch: index.html not at zip root"; exit 1; }
echo "OK -> $ROOT/out/light-rogue-void-itch.zip"
