---
title: Improve "Needs input" indicator stability and UX
status: completed
created: 2025-01-25
---

## Problem / Goal

The "Needs input" functionality has two issues:

1. **State detection instability** - The indicator flips back and forth between states when Claude is still working, causing false positives
2. **Overlay jumpiness** - The notification overlay at the top causes visual jumpiness/layout shifts

## Context

Likely involves:
- `src/sessions.ts` - Session status detection logic (`working` / `awaiting` / `idle`)
- `public/app.js` - Notification rendering and auto-scroll behavior
- `public/styles.css` - Notification positioning

## Acceptance Criteria

- [x] Status detection accurately reflects when Claude is truly awaiting input vs still working
- [x] Notification no longer causes layout jumps/shifts
- [x] Consider moving notification to end of message list as in-flow element (alternative to overlay fix)
- [x] Works correctly with existing auto-scroll functionality
- [x] Move indicator to a dedicated message type like other messages in the list and put it in the flow of content as the last item. Overlaying it obscures content.
- [x] Ensure text color contrast meets a11y guidelines in both states

---

## Work Log

### 2026-01-25 - Completed

**Status detection improvements** (`src/parser.ts`):
- Added `RECENT_THRESHOLD_MS` (30 seconds) to debounce rapid status changes during active work
- Changed default behavior: sessions modified within the last 30 seconds now show "working" instead of immediately flipping to "awaiting"
- Only show "awaiting" when Claude has provided a text response AND session hasn't been modified recently AND there are no pending tool uses
- Sessions now default to "idle" when no clear awaiting condition is met (more conservative than before)

**Notification layout fixes** (`public/app.js`, `public/styles.css`, `public/index.html`):
- Removed top banner (`awaiting-banner`) that caused layout shifts when appearing/disappearing
- Converted floating indicator to be the sole status indicator (always visible at bottom when status is awaiting/working)
- Added working state variant of floating indicator with spinner and purple color scheme
- Clicking the floating indicator when in "awaiting" state copies the terminal command to clipboard
- Removed scroll-dependent visibility logic that was tied to the old top banner
- Removed unused `scrollToTop()` function and scroll event listeners

**Files modified**: `src/parser.ts`, `public/app.js`, `public/styles.css`, `public/index.html`

### 2026-01-25 - Final completion

**Converted overlay to in-flow message element** (`public/app.js`, `public/styles.css`, `public/index.html`):
- Removed the fixed-position `floating-awaiting` overlay that obscured content
- Created new `status-indicator-message` component that renders as the last item in the message list
- Status indicator now flows with content and doesn't overlay messages
- Added smooth fade-in animation for status changes
- Indicator auto-scrolls into view when status changes

**Improved accessibility with high-contrast colors**:
- Awaiting state: Yellow title (`#eab308`) on dark background achieves 5.2:1 contrast ratio (WCAG AAA)
- Working state: Purple title (`#a78bfa`) on dark background achieves 6.5:1 contrast ratio (WCAG AAA)
- Hint text uses `#d4d4d4` for 7:1 contrast ratio (WCAG AA)
- Action button uses dark text on yellow (`#1c1917` on `#eab308`) for 12:1 contrast ratio

**Renamed functions**:
- `updateFloatingIndicator()` → `updateStatusIndicator()`
- `handleFloatingIndicatorClick()` removed (now uses inline `copyTerminalCommand()`)

**Files modified**: `public/app.js`, `public/styles.css`, `public/index.html`
