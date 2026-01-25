---
title: Spacing issue between checkmark icon and title in choice list
status: completed
created: 2026-01-25
---

## Problem / Goal

The selected state for choice lists has the checkmark icon title to the title, there should be the appropriate spacing between the icon and the title.

## Acceptance Criteria

- [x] Checkmark and title have the appropriate spacing like other elements in the UI

---

## Work Log

### 2026-01-25 - Completed
- Fixed CSS `::before` pseudo-element for selected choice options
- Changed from using a trailing space in content (`'\2713 '`) to using `margin-right: 6px` for proper spacing
- Files modified: `public/styles.css`

