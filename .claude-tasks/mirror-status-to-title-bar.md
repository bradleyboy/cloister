---
title: Mirror session status to browser title bar
status: completed
created: 2026-01-29
---

## Problem / Goal

The browser tab title should reflect the current session's status so users can see at a glance whether Claude is working or waiting for input, even when the tab is in the background.

## Context

- `public/app.js` - client-side state and rendering, likely where session status is tracked
- `public/index.html` - base page title
- Session status detection already exists (`working` / `awaiting` / `idle` states)

## Acceptance Criteria

- [x] When viewing a session in `working` state, browser title shows "Cloister: Claude is working..."
- [x] When viewing a session in `awaiting` state, browser title shows "Cloister: Claude is waiting for your input"
- [x] When navigating away from a detail page (back to session list), title resets to "Cloister"
- [x] Title updates in real-time via SSE as session status changes

---

## Work Log

### 2026-01-29 - Completed
- Added `updateDocumentTitle(status)` helper function that maps session status to descriptive browser titles
- Called from SSE `status` event handler for real-time updates
- Called from `navigateToSession()` for initial title set on session load
- Reset title to "Cloister" in all three list-return functions: `returnToListView()`, `showList()`, `returnToListViewWithoutUrlUpdate()`
- Files modified: `public/app.js`
