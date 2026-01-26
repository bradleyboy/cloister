---
title: Require checking acceptance criteria before completing tasks
status: completed
created: 2025-01-25
---

## Problem / Goal

When the implementation agent completes tasks, it marks `status: completed` but doesn't check off the `- [ ]` acceptance criteria items in the markdown file. The implementation is actually complete, but the checkboxes remain unchecked.

## Context

- File: `CLAUDE.md`
- Section: "Autonomous Task Loop" (step-by-step instructions for the agent)
- Current instructions don't explicitly require checking off acceptance criteria boxes before setting status to completed

## Acceptance Criteria

- [x] Update "Autonomous Task Loop" instructions to require checking off each `- [ ]` item as `- [x]` when criteria is met
- [x] Make it clear this must happen before setting `status: completed`

---

## Work Log

### 2025-01-25 - Completed
- Added step 5 to require checking off acceptance criteria items as they are verified
- Updated step 7 to clarify status should only be set to completed after all criteria are checked
- Files modified: `CLAUDE.md`
