---
title: Create release script with changelog generation
status: completed
created: 2025-01-28
---

## Problem / Goal

Need a release script that automates the full release workflow:
1. Find commits since the last npm release and write a summary to `CHANGELOG.md` (create this file)
2. Run `npm version [patch/minor/major]` (accept as argument or prompt user)
3. Run `git push`
4. Run `npm publish`

## Context

- New file: `release.sh` (or similar)
- New file: `CHANGELOG.md`
- `package.json` (version field used to find last release tag)

## Acceptance Criteria

- [x] Release script accepts patch/minor/major as an argument (or prompts if not provided)
- [x] Script generates a changelog summary from commits since the last npm version tag and appends to `CHANGELOG.md`
- [x] Script runs `npm version`, `git push`, and `npm publish` in sequence
- [x] Script exits early with a clear error if any step fails

---

## Work Log

### 2026-01-28 - Completed
- Created `release.sh` that accepts patch/minor/major as argument or prompts interactively
- Script finds commits since last version tag, generates changelog entry, runs `npm version`, amends commit to include CHANGELOG.md, pushes, and publishes
- Uses `set -euo pipefail` to exit early on any failure with clear error messages
- Created initial `CHANGELOG.md` with history for v1.0.1 through v1.0.3
- Files created: `release.sh`, `CHANGELOG.md`
- Files modified: `.claude-tasks/create-release-script.md`
