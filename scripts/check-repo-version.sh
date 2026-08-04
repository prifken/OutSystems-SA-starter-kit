#!/bin/bash
# Check if the starter kit repo is up to date and offer to pull if behind

set -e

# Get the count of commits we're behind
BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0")

if [ "$BEHIND" = "0" ]; then
  echo "✓ You're on the latest version of the starter kit."
  exit 0
fi

if [ "$BEHIND" = "1" ]; then
  COMMIT_TEXT="1 commit"
else
  COMMIT_TEXT="$BEHIND commits"
fi

echo "⚠ You're $COMMIT_TEXT behind the main branch."
echo ""
echo "Recent fixes available:"
git log --oneline HEAD..origin/main | sed 's/^/  • /'
echo ""
echo "Run 'git pull' to update, or ask Claude to pull the latest changes."
exit 1
