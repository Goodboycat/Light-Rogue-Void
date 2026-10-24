#!/usr/bin/env bash
# Builds the single-file itch.io build and zips it to out/light-rogue-void-itch.zip
set -e
cd "$(dirname "$0")/.."
rm -rf out/light-rogue-void-itch out/light-rogue-void-itch.zip
mkdir -p out
ITCH=1 npx vite build --mode itch --outDir out/light-rogue-void-itch
cd out/light-rogue-void-itch
# itch wants index.html at the archive root
zip -q -r ../light-rogue-void-itch.zip .
cd ..
ls -la light-rogue-void-itch.zip
echo "OK -> out/light-rogue-void-itch.zip"
