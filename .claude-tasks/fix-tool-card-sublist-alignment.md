---
title: Fix sublist alignment in tool cards like TodoTask
status: completed
created: 2025-01-28
---

## Problem / Goal

Tool cards like "TodoTask" that contain sublists have alignment issues. The sublists do not share the same left margin/padding as the card title, causing them to appear misaligned.

Update: the initial fixes were rejected and we are still seeing misalignment. any subcontent of these boxes must left-align with the content in the title so it is a straight line down visually. This has gotten worse with recent fixes.

See @sublist-spacing-issue.png for an example of the issue.

## Context

- `public/styles.css` (tool card styles, list margin/padding)
- `public/app.js` (tool card HTML rendering)

## Acceptance Criteria

- [x] Sublists within tool cards are left-aligned with the card title
- [x] Consistent padding/margin across all tool card types that contain lists

---

## Work Log

### 2025-01-28 - Completed
- Root cause: Tool card header uses `padding: 10px 14px` (14px horizontal), but content areas (`.todo-list`, `.tool-section-content`, `.task-agent-content`) used `padding: 12px` (12px horizontal), causing a 2px left-alignment mismatch between card titles and their body content.
- Fixed all three content containers to use `padding: 10px 14px` to match the header's horizontal padding.
- Files modified: `public/styles.css`

### 2026-01-28 - Completed
- Root cause: The previous fix matched horizontal padding values (14px) between header and body, but missed that the header text actually starts at 48px from the left edge (14px padding + 24px icon + 10px gap). Body content at 14px left padding was 34px to the left of where header text begins.
- Fixed all tool card body containers to use `padding-left: 48px` so content aligns with the title text after the icon:
  - `.todo-list`: `10px 14px` → `10px 14px 10px 48px`
  - `.task-agent-content`: `10px 14px` → `10px 14px 10px 48px`
  - `.tool-section-content`: `10px 14px` → `10px 14px 10px 48px`
  - `.tool-detail`: `12px` → `10px 14px 10px 48px`
  - `.search-content`: `12px` → `10px 14px 10px 48px`
  - `.bash-content`: `12px` → `10px 14px 10px 48px`
- Files modified: `public/styles.css`

### 2026-01-29 - Completed
- Root cause: The previous fix set all body containers to `padding-left: 48px`, which aligned the start of body content with the title text. But for todo items that have their own checkbox + gap before text, this pushed the todo text ~30px further right than the title text. The fundamental issue was that the 48px approach tried to skip past the icon, but body content with its own leading elements (checkboxes) needs the same padding as the header so that leading elements (checkbox icons) align with the header icon, and text aligns with header text.
- Fixed by reverting all body containers to `padding: 10px 14px` (matching header horizontal padding) so body content starts at the same left offset as header content. For `.todo-checkbox`, added `width: 24px` and `text-align: center` to match the `.tool-icon` dimensions, ensuring todo checkboxes align with the header icon and todo text aligns with the header title text. Also fixed `.tool-section-header` padding from `8px 12px` to `8px 14px` for consistency.
- Containers updated: `.todo-list`, `.task-agent-content`, `.tool-section-content`, `.tool-detail`, `.search-content`, `.bash-content`
- Files modified: `public/styles.css`
