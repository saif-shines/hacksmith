#!/usr/bin/env bash
set -euo pipefail

# Publish from the package directory using np
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PKG_DIR="${SCRIPT_DIR%/scripts}"
ROOT_DIR="$(git -C "$PKG_DIR" rev-parse --show-toplevel)"

cd "$PKG_DIR"

# Run np (monorepo-safe publish, but np won't commit/tag in a subdir)
# Pass through any extra args
pnpm dlx np --no-2fa "$@"

# Read the new version from the package.json in the package directory
VERSION=$(node -p "require('./package.json').version")

# Commit, tag, and push from the repo root so git sees .git
cd "$ROOT_DIR"

# Ensure the version file is staged
git add "packages/hacksmith/package.json"

# Create a conventional commit and tag; then push
if git diff --cached --quiet; then
  echo "No changes to commit. Skipping commit."
else
  git commit -m "chore(release): bump version to v$VERSION"
fi

# Create or move the tag to the new version
TAG="v$VERSION"
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists. Skipping tag creation."
else
  git tag "$TAG"
fi

git push origin main
# Push tags explicitly to avoid missing tags
git push origin --tags

echo "Published hacksmith@$VERSION and pushed commit/tag."