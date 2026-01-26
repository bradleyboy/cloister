---
title: Fix NPM package repository URL
status: completed
created: 2025-01-25
---

## Problem / Goal

The NPM package has the wrong repository URL. It currently points to `/bdaily/cloister` but should be `/bradleyboy/cloister`.

## Context

- File: `package.json` (likely where repository field is defined)
- The published NPM package shows incorrect repository link

## Acceptance Criteria

- [x] Update repository URL in package.json to use `bradleyboy/cloister`
- [x] Verify no other files reference the incorrect `/bdaily/cloister` path

---

## Work Log

### 2025-01-25 - Completed
- Changed repository URL from `https://github.com/bdaily/cloister` to `https://github.com/bradleyboy/cloister`
- Searched codebase and confirmed no other files reference the incorrect path
- Files modified: `package.json`
