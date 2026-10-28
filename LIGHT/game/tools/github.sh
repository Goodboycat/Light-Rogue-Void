#!/usr/bin/env bash
# Usage: bash LIGHT/game/tools/github.sh <GITHUB_TOKEN>
# Stores the token in git's credential store (never committed) and sets the remote.
# Repo root contains LIGHT/ (the game + docs); this script cd's to the git root.
set -e
TOKEN="$1"
if [ -z "$TOKEN" ]; then echo "usage: bash LIGHT/game/tools/github.sh <TOKEN>"; exit 1; fi
cd "$(dirname "$0")/../.."   # LIGHT/
cd "$(git rev-parse --show-toplevel)"   # repo root (LIGHT/ lives inside it)
git config --global credential.helper store
printf 'https://x-access-token:%s@github.com\n' "$TOKEN" > "$HOME/.git-credentials"
chmod 600 "$HOME/.git-credentials"
git config user.name  >/dev/null 2>&1 || git config user.name  "Goodboycat"
git config user.email >/dev/null 2>&1 || git config user.email "goodboycat@users.noreply.github.com"
git remote get-url origin >/dev/null 2>&1 \
  && git remote set-url origin https://github.com/Goodboycat/Light-Rogue-Void.git \
  || git remote add origin https://github.com/Goodboycat/Light-Rogue-Void.git
git fetch -q origin && echo "github: ok ($(git rev-parse --short HEAD) local, origin/main $(git rev-parse --short origin/main))"
