---
title: Update README to document /task command
status: completed
created: 2025-01-25
---

## Problem / Goal

The README's "Creating a Task" section (lines 82-87) documents the old manual approach of copying a template file. It should instead document using the `/task` agent command to create tasks.

## Context

- File: `README.md`
- Section: "Creating a Task" (lines 82-87)
- Current content tells users to copy `.claude-tasks/TEMPLATE.md` manually
- Should be updated to show using `/task <description>` instead

## Acceptance Criteria

- [ ] "Creating a Task" section updated to document the `/task` command
- [ ] Include example usage like `/task fix the SSE reconnection bug`
- [ ] Remove or de-emphasize the manual template copy approach

---

## Work Log

### 2025-01-25 - Completed
- Updated "Creating a Task" section in README.md to document the `/task` command
- Added example usage showing `/task fix the SSE reconnection bug` and `/task add search functionality across sessions`
- Removed the old manual template copy instructions
- Files modified: `README.md`
