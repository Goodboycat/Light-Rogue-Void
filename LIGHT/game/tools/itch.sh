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
# itch wants index.html at the archive root
zip -q -r ../light-rogue-void-itch.zip .
cd ..
ls -la light-rogue-void-itch.zip
echo "OK -> $ROOT/out/light-rogue-void-itch.zip"
