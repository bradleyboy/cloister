---
title: Fix CLI banner border alignment
status: completed
created: 2025-01-25
---

## Problem / Goal

The CLI startup banner has a misaligned right border on the "Running at http://localhost:3333" line. The right `│` character is not aligned with the other border elements.

Example of the issue:
```
  ╭──────────────────────────────────────╮
  │                                      │
  │   Cloister                           │
  │   Local hub for Claude Code history  │
  │                                      │
  │   Running at http://localhost:3333    │  <-- right border misaligned
  │                                      │
  ╰──────────────────────────────────────╯
```

## Context

- `src/index.ts` - CLI entry point, likely contains the banner output
- Issue is likely padding/spacing inconsistency in the URL line

## Acceptance Criteria

- [x] All right border characters align vertically
- [x] Banner looks correct with various port numbers
- [x] Even amount of spacing on left and right inside the box

---

## Work Log

### 2026-01-25 - Completed
- Root cause: The URL line used `.padEnd(34)` but the box interior is 38 chars with 3 left + 2 right padding spaces, leaving only 33 chars for content
- Fixed by changing `.padEnd(34)` to `.padEnd(33)` to match the content width of other lines
- All lines now have consistent 3-space left padding and 2-space right padding before the border
- Tested with ports: 80, 443, 3333, 8080, 12345, 65535 - all produce 40-character lines matching the other content lines
- Files modified: `src/index.ts`
