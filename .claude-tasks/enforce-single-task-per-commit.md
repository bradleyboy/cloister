---
title: Enforce single task per commit in task runner
status: completed
created: 2026-01-31
---

## Problem / Goal

The task runner sometimes bundles multiple tasks into a single commit. Each task should always result in its own separate, legible commit.

## Context

Relevant files: `run-tasks.sh`, `CLAUDE.md` (autonomous task loop instructions, step 8). The issue likely stems from how the task loop handles committing after completing work — either the commit step is skipped/deferred, or multiple tasks complete before a commit is made.

## Acceptance Criteria

- [x] Each completed task produces exactly one commit
- [x] The commit message clearly references the specific task it addresses
- [x] No commit contains changes from more than one task

---

## Work Log

### 2026-01-31 - Completed
- Strengthened `run-tasks.sh` prompt to explicitly require one commit per task and forbid multi-task work
- Added post-iteration commit verification in `run-tasks.sh`: records HEAD before Claude runs, checks afterward, and auto-commits if Claude forgot
- Updated CLAUDE.md autonomous task loop: changed step 9 from "loop back" to "STOP", added critical rule emphasizing one-commit-per-task
- Files modified: `run-tasks.sh`, `CLAUDE.md`
