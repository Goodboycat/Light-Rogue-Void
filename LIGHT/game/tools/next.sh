#!/usr/bin/env bash
# Prints the next chat ID (first token of the README "Next:" line) and shows its prompt file.
# Run from anywhere: bash LIGHT/game/tools/next.sh
cd "$(dirname "$0")/../.."   # LIGHT/
cd "$(git rev-parse --show-toplevel)"   # repo root (LIGHT/ lives inside it)
NEXT=$(grep -m1 '^Next:' LIGHT/README.md | sed 's/^Next:[[:space:]]*//' | awk '{print $1}')
if [ -z "$NEXT" ]; then echo "No 'Next:' line in LIGHT/README.md — nothing scheduled."; exit 0; fi
echo "NEXT CHAT: $NEXT"
echo "Prompt:    LIGHT/prompts/$NEXT.md"
echo "Handoff:   LIGHT/docs/HANDOFF.md"
echo "----------------------------------------"
[ -f "LIGHT/prompts/$NEXT.md" ] && cat "LIGHT/prompts/$NEXT.md" || echo "(prompt file missing)"
