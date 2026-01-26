---
title: Update README with npx/bunx usage instructions
status: completed
created: 2026-01-25
---

## Problem / Goal

The README should clearly show two ways to use Cloister:
1. Quick usage via `npx` or `bunx` (for end users)
2. Local development setup (for contributors making changes to Cloister itself)

These should be clearly separated so users know which instructions apply to them.

## Context

- `README.md` - main readme file
- Package name: `cloister` (npm package)

## Acceptance Criteria

- [ ] README shows how to run via `npx cloister` and `bunx cloister`
- [ ] Local development instructions are in a separate section (e.g., "Development")
- [ ] Clear distinction between "using" vs "developing" Cloister

---

## Work Log

### 2026-01-25 - Completed
- Restructured README to clearly separate usage from development instructions
- Added "Usage" section showing `npx cloister` and `bunx cloister` commands with options
- Added "Development" section with clone/install/dev instructions for contributors
- Files modified: `README.md`
