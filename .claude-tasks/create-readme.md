---
title: Create README.md for project
status: completed
created: 2025-01-25
---

## Problem / Goal

The project needs a README.md file at the root with:
- Project overview (what Claude Notebook does)
- How to contribute (this project uses Claude-driven development via `/task` command and `run-tasks.sh`)
- License (MIT)
- Basic usage/setup instructions

## Context

- Technical details are in `CLAUDE.md`
- Task system documented in `CLAUDE.md` under "Task System"
- `run-tasks.sh` runs Claude in a loop to complete tasks
- README should be human-friendly and public-facing

## Acceptance Criteria

- [ ] README.md exists at project root
- [ ] Contains project overview and purpose
- [ ] Explains contribution workflow (task-based, Claude-driven)
- [ ] Includes MIT license section

---

## Work Log

### 2026-01-25 - Completed
- Created README.md at project root with:
  - Project overview explaining what Claude Notebook does
  - Features list (live monitoring, keyboard navigation, lazy loading, etc.)
  - Quick start instructions for running with Bun
  - Contributing section explaining the Claude-driven task system
  - Task creation and running instructions
  - Link to CLAUDE.md for technical details
  - Tech stack summary
  - Full MIT license text
- Files modified: `README.md`
