---
title: Fix README Options section to use npx/bunx prefix
status: completed
created: 2026-01-25
---

## Problem / Goal

The Options section in the README shows `cloister --port 8080` but cloister cannot be called directly - it must be prefixed with `npx` or `bunx`.

## Context

- `README.md` - Options section

## Acceptance Criteria

- [ ] All example commands in Options section use `npx cloister` or `bunx cloister` prefix
- [ ] Commands are consistent with the Usage section format

---

## Work Log

### 2026-01-25 - Completed
- Updated Options section example commands to use `npx cloister` prefix instead of bare `cloister`
- Commands now consistent with Usage section format
- Files modified: `README.md`
