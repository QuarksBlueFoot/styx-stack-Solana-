#!/bin/bash
# Export StyxStack to public repo, excluding private infrastructure

set -e

echo "🚀 Exporting StyxStack to public repository..."

# Where to export
EXPORT_DIR="${1:-../styxstack-public}"

# Create export directory
rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"

# Copy everything except private folders
rsync -av \
  --exclude='.git' \
  --exclude='.infrastructure' \
  --exclude='.secrets' \
  --exclude='node_modules' \
  --exclude='target' \
  --exclude='dist' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='*.log' \
  --exclude='pnpm-lock.yaml' \
  . "$EXPORT_DIR/"

echo ""
echo "✅ Export complete: $EXPORT_DIR"
echo ""
echo "Excluded (PRIVATE - NOT IN PUBLIC REPO):"
echo "  - .infrastructure/  (indexer, API, analytics)"
echo "  - .secrets/         (keypairs, oath inscriber)"
echo ""
echo "To initialize the public repo:"
echo "  cd $EXPORT_DIR"
echo "  git init"
echo "  git add ."
echo "  git commit -m 'Initial public release'"
echo "  git remote add origin git@github.com:QuarksBlueFoot/StyxStack.git"
echo "  git push -u origin main"
