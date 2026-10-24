#!/usr/bin/env bash
# Prints the next chat ID (first token of the README "Next:" line) and shows its prompt file.
# Run from anywhere: bash LIGHT/game/tools/next.sh
cd "$(dirname "$0")/../.."
NEXT=$(grep -m1 '^Next:' README.md | sed 's/^Next:[[:space:]]*//' | awk '{print $1}')
if [ -z "$NEXT" ]; then echo "No 'Next:' line in README.md — nothing scheduled."; exit 0; fi
echo "NEXT CHAT: $NEXT"
echo "Prompt:    prompts/$NEXT.md"
echo "Handoff:   docs/HANDOFF.md"
echo "----------------------------------------"
[ -f "prompts/$NEXT.md" ] && cat "prompts/$NEXT.md" || echo "(prompt file missing)"
