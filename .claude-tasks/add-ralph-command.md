---
title: Add bun ralph command to run task runner
status: completed
created: 2025-01-25
---

## Problem / Goal

Add a bun script command called `ralph` that executes `./run-tasks.sh` (the autonomous task runner script).

## Context

- `package.json` - Where scripts are defined
- `run-tasks.sh` - Existing task runner script

## Acceptance Criteria

- [x] `bun run ralph` executes `./run-tasks.sh`
- [x] Script entry added to package.json scripts section
- [x] Document usage in readme

---

## Work Log

### 2026-01-25 - Completed
- Added `ralph` script to package.json that executes `./run-tasks.sh`
- Updated README.md to document `bun run ralph` as the primary way to run the task runner
- Files modified: `package.json`, `README.md`
