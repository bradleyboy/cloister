---
title: Add GitHub link to sidebar
status: completed
created: 2025-01-25
---

## Problem / Goal

Add a "View on GitHub" link with the GitHub logo to the bottom left of the sidebar.

## Context

- `public/index.html` - sidebar markup
- `public/styles.css` - sidebar styling
- Repository URL: https://github.com/bradleyboy/cloister

## Acceptance Criteria

- [x] GitHub logo and "View on GitHub" link appears at bottom left of sidebar
- [x] Link opens the repository in a new tab
- [x] Styling matches the existing sidebar aesthetic

---

## Work Log

### 2026-01-25 - Completed
- Added `.sidebar-footer` container at the bottom of the sidebar
- Added GitHub link with inline SVG icon (GitHub Octicon mark)
- Link opens in new tab with `target="_blank"` and `rel="noopener noreferrer"` for security
- Added CSS styling:
  - `.sidebar-footer`: padding, top border, and `margin-top: auto` to push to bottom
  - `.github-link`: flexbox layout with gap, muted text color with hover transition
  - `.github-icon`: 16x16px SVG sizing
- Styling uses existing CSS variables to match sidebar aesthetic
- Files modified: `public/index.html`, `public/styles.css`
