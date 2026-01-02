#!/bin/bash
# Setup GitHub labels from .github/labels.yaml
# Usage: ./scripts/setup-labels.sh

set -e

LABELS_FILE=".github/labels.yaml"

if [ ! -f "$LABELS_FILE" ]; then
  echo "Error: $LABELS_FILE not found"
  exit 1
fi

echo "Setting up GitHub labels..."

# Parse YAML and create labels
while IFS= read -r line; do
  if [[ $line =~ ^-\ name:\ (.+)$ ]]; then
    NAME="${BASH_REMATCH[1]}"
  elif [[ $line =~ ^\ \ description:\ (.+)$ ]]; then
    DESC="${BASH_REMATCH[1]}"
  elif [[ $line =~ ^\ \ color:\ \"(.+)\"$ ]]; then
    COLOR="${BASH_REMATCH[1]}"
    echo "Creating label: $NAME"
    gh label create "$NAME" --description "$DESC" --color "$COLOR" --force 2>/dev/null || \
    gh label edit "$NAME" --description "$DESC" --color "$COLOR" 2>/dev/null || \
    echo "  Skipped (may already exist)"
  fi
done < "$LABELS_FILE"

echo "Done!"
