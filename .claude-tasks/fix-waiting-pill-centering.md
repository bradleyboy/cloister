---
title: Fix "waiting for input" pill centering
status: completed
created: 2025-01-25
---

## Problem / Goal

The "waiting for input" status pill is not properly centered - it appears too far to the left.

## Context

- `public/styles.css` - Likely contains the pill styling
- `public/app.js` - Renders the status pill
- To be investigated: which CSS class/element controls the pill positioning

## Acceptance Criteria

- [x] "Waiting for input" pill is visually centered in its container
- [x] Other status pills (if any) remain properly aligned

---

## Work Log

### 2026-01-25 - Completed
- Root cause: The `.floating-awaiting` indicator used `left: 50%` which centers at 50% of the viewport, but the 280px sidebar shifts the main content area to the right
- Fixed by changing `left: 50%` to `left: calc(50% + 140px)` to account for half the sidebar width
- Added responsive override in `@media (max-width: 768px)` to reset to `left: 50%` when sidebar is hidden on mobile
- The "working" status indicator (same element, different class) also benefits from this fix
- Files modified: `public/styles.css`
