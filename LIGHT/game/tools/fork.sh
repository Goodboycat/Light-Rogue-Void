#!/usr/bin/env bash
# Print a file from the "fixed-fork" branch (the AI roguelike version) without checking it out.
# Usage: bash LIGHT/game/tools/fork.sh <path-in-fork>          e.g. components/game/HitFeedback.ts
#        bash LIGHT/game/tools/fork.sh --ls [dir]               list files
#        bash LIGHT/game/tools/fork.sh --orig <path>            same, from the original-complete branch
set -e
cd "$(dirname "$0")/../.."   # LIGHT/
cd "$(git rev-parse --show-toplevel)"   # repo root (LIGHT/ lives inside it)
BR=origin/fixed-fork
if [ "$1" = "--orig" ]; then BR=origin/original-complete; shift; fi
git rev-parse -q --verify "$BR" >/dev/null 2>&1 || git fetch -q origin fixed-fork original-complete
if [ "$1" = "--ls" ]; then git ls-tree -r --name-only "$BR" ${2:+-- "$2"}; exit 0; fi
[ -z "$1" ] && { echo "usage: bash LIGHT/game/tools/fork.sh [--orig] <path> | --ls [dir]"; exit 1; }
git show "$BR:$1"
