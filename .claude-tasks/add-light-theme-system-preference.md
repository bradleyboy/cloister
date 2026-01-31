---
title: Add light theme with system preference detection
status: completed
created: 2026-01-31
---

## Problem / Goal

The UI only has a dark theme. Users expect both light and dark modes that automatically follow their OS/system preference (via `prefers-color-scheme`).

## Context

- Current dark theme uses CSS custom properties (`--bg-primary`, `--accent`, etc.) defined in `public/styles.css`
- The existing dark theme is the design quality bar — the light theme should be equally polished
- No user preference persistence exists yet; system preference detection is sufficient for now

## Acceptance Criteria

- [x] Light theme implemented with same design quality as existing dark theme
- [x] Theme automatically switches based on `prefers-color-scheme` media query
- [x] All UI elements (tool cards, code blocks, syntax highlighting, scrollbars, etc.) look correct in both themes
- [x] No flash of wrong theme on page load

---

## Work Log

### 2026-01-31 - Completed
- Added light theme via `@media (prefers-color-scheme: light)` media query overriding all CSS custom properties
- Added `color-scheme: light dark` on HTML element for native UI element theming
- Loaded both highlight.js `github-dark` and `github` themes with media-query-gated `<link>` tags for flash-free syntax highlighting
- Overrode all hardcoded colors: tags, syntax highlighting, tool icons, status indicators, diff colors, skeleton shimmer, scrollbars, question cards, awaiting banners, session card states
- Files modified: `public/styles.css`, `public/index.html`
