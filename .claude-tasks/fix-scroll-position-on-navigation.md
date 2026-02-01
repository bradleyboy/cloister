---
title: Fix scroll position not resetting on navigation
status: completed
created: 2026-01-31
---

## Problem / Goal

When viewing a session detail view and then clicking a sidebar link to navigate back to the list view, the scroll position stays where it was in the detail view instead of resetting to the top.

## Context

Likely involves `public/app.js` (client-side navigation/rendering logic). To be investigated further.

## Acceptance Criteria

- [x] Navigating from detail view to list view scrolls to the top
- [x] Navigating between different views via sidebar resets scroll position
- [x] Normal scrolling within a single view is not affected

---

## Work Log

### 2026-01-31 - Completed
- Added `scrollTop = 0` reset to all three return-to-list-view functions (`returnToListView`, `showList`, `returnToListViewWithoutUrlUpdate`) targeting the `.list-view` container
- Added `scrollTop = 0` reset in `navigateToSession` for the `.messages` container when switching to detail view
- Normal scrolling within a single view is unaffected since the reset only triggers during view transitions
- Files modified: `public/app.js`
