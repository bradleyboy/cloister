---
title: Pin session status indicator to bottom of message list
status: completed
created: 2025-01-28
---

## Problem / Goal

The "Claude is working" / "Claude is waiting for your input" status indicator sometimes gets mixed in with other messages instead of always appearing at the bottom. It should be pinned as the last element in the message list, enforced with logic that keeps it after all other messages.

## Context

- `public/app.js` (message rendering, status indicator placement)
- `public/styles.css` (possibly needs sticky/fixed positioning)

## Acceptance Criteria

- [x] Status indicator always renders as the last item in the message list
- [x] New messages arriving via SSE do not displace the status indicator
- [x] Status indicator remains at the bottom after lazy-loaded content renders

---

## Work Log

### 2025-01-28 - Completed
- Root cause: `appendMessage()` used `container.appendChild(messageDiv)` which added new SSE messages after the status indicator, displacing it from the bottom position.
- Fix: Changed `appendMessage()` to check for an existing `.status-indicator-message` element and use `container.insertBefore(messageDiv, statusIndicator)` to insert new messages above it, keeping the indicator pinned at the bottom.
- Lazy-loaded content was already safe since `MessageLoader` replaces skeleton content in-place rather than appending new elements.
- Files modified: `public/app.js`
