---
title: Add permalinks to session detail views
status: completed
created: 2025-01-25
---

## Problem / Goal

Enable direct URL linking to specific session detail views. Users should be able to share or bookmark a URL that opens directly to a particular session. The session UUID from Claude's metadata should be used in the URL path or hash.

## Context

- Session files are stored as `~/.claude/projects/{encoded-path}/{uuid}.jsonl`
- `public/app.js` - Client-side routing and state management
- `src/server.ts` - Hono routes
- `src/sessions.ts` - Session discovery and parsing

## Acceptance Criteria

- [x] URLs update when viewing a session (e.g., `#/session/{uuid}` or `/session/{uuid}`)
- [x] Loading a permalink URL opens directly to that session's detail view
- [x] Browser back/forward navigation works correctly
- [x] Invalid session UUIDs show appropriate error or fallback
- [x] URLs should not use fragments, use standard paths (no `#`)

---

## Work Log

### 2026-01-25 - Completed
- Implemented hash-based routing for session permalinks using URL format `#session/{uuid}`
- Added `setupHashRouting()` function to listen for `hashchange` events
- Added `handleHashChange()` to parse the hash and navigate to the session
- Added `navigateToSession()` as the common navigation function for both click and hash-based navigation
- Added `updateHashForSession()` to update URL hash when opening a session via click
- Added `clearHash()` to clear the hash when returning to list view
- Added `returnToListViewWithoutHashUpdate()` to handle back navigation without triggering hash update loops
- Added `showSessionNotFoundError()` to display a user-friendly error when session ID is invalid
- Added CSS styling for the back link button in error states
- On page load, `init()` now calls `handleHashChange()` to load any session specified in the URL
- Browser back/forward navigation is handled automatically via the `hashchange` event listener
- Files modified: `public/app.js`, `public/styles.css`

### 2026-01-25 - Converted to path-based routing
- Replaced hash-based routing (`#session/{uuid}`) with standard path-based routing (`/session/{uuid}`)
- Server-side changes (`src/server.ts`):
  - Added `/session/:id` route that serves `index.html` for client-side routing
- Client-side changes (`public/app.js`):
  - Replaced `setupHashRouting()` with `setupRouting()` using `popstate` event
  - Replaced `handleHashChange()` with `handleRoute()` that reads `window.location.pathname`
  - Replaced `updateHashForSession()` with `updateUrlForSession()` using `history.pushState`
  - Replaced `clearHash()` with `clearSessionUrl()` using `history.pushState`
  - Renamed `returnToListViewWithoutHashUpdate()` to `returnToListViewWithoutUrlUpdate()`
- URLs now use clean paths: `/session/abc-123-uuid` instead of `#session/abc-123-uuid`
- Files modified: `src/server.ts`, `public/app.js`
