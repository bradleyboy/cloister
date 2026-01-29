#!/usr/bin/env bash
set -euo pipefail

# Release script for Cloister
# Usage: ./release.sh [patch|minor|major]

VERSION_TYPE="${1:-}"

# Prompt for version type if not provided
if [ -z "$VERSION_TYPE" ]; then
  echo "Select release type:"
  echo "  1) patch"
  echo "  2) minor"
  echo "  3) major"
  read -rp "Choice [1/2/3]: " choice
  case "$choice" in
    1) VERSION_TYPE="patch" ;;
    2) VERSION_TYPE="minor" ;;
    3) VERSION_TYPE="major" ;;
    *) echo "Error: Invalid choice '$choice'. Expected 1, 2, or 3." >&2; exit 1 ;;
  esac
fi

# Validate version type
if [[ "$VERSION_TYPE" != "patch" && "$VERSION_TYPE" != "minor" && "$VERSION_TYPE" != "major" ]]; then
  echo "Error: Invalid version type '$VERSION_TYPE'. Must be patch, minor, or major." >&2
  exit 1
fi

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working directory is not clean. Commit or stash changes first." >&2
  exit 1
fi

# Get current version tag
CURRENT_VERSION="v$(node -p "require('./package.json').version")"
echo "Current version: $CURRENT_VERSION"

# Generate changelog from commits since last tag
echo ""
echo "Generating changelog..."

if git rev-parse "$CURRENT_VERSION" >/dev/null 2>&1; then
  COMMITS=$(git log "$CURRENT_VERSION"..HEAD --pretty=format:"- %s" --no-merges)
else
  echo "Warning: Tag $CURRENT_VERSION not found. Using all commits." >&2
  COMMITS=$(git log --pretty=format:"- %s" --no-merges)
fi

if [ -z "$COMMITS" ]; then
  echo "Warning: No new commits since $CURRENT_VERSION." >&2
  COMMITS="- No notable changes"
fi

# Bump version (this also creates a git tag)
echo ""
echo "Running npm version $VERSION_TYPE..."
npm version "$VERSION_TYPE"

NEW_VERSION="v$(node -p "require('./package.json').version")"
echo "New version: $NEW_VERSION"

# Prepend to CHANGELOG.md
CHANGELOG_ENTRY="## $NEW_VERSION ($(date +%Y-%m-%d))

$COMMITS
"

if [ -f CHANGELOG.md ]; then
  EXISTING=$(cat CHANGELOG.md)
  printf "# Changelog\n\n%s\n\n%s" "$CHANGELOG_ENTRY" "$(echo "$EXISTING" | sed '1{/^# Changelog$/d;}' | sed '/./,$!d')" > CHANGELOG.md
else
  printf "# Changelog\n\n%s\n" "$CHANGELOG_ENTRY" > CHANGELOG.md
fi

echo "Updated CHANGELOG.md"

# Amend the version commit to include the changelog
git add CHANGELOG.md
git commit --amend --no-edit

# Re-tag since we amended
git tag -f "$NEW_VERSION"

# Push commits and tags
echo ""
echo "Pushing to remote..."
git push
git push --tags

# Publish to npm
echo ""
echo "Publishing to npm..."
npm publish

echo ""
echo "Released $NEW_VERSION successfully!"
