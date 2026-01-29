---
title: [Bug] Empty "You" boxes
status: completed
created: 2025-01-25
---

## Problem / Goal

Early on in the development of this project, we fixed an issue where some "You" boxes were empty. This has regressed and we now see empty boxes again. 

Update: 2026-01-28: This has regressed again. We need guardrails to ensure it does not happen again.

## Acceptance Criteria

- [x] "You" boxes only show when they have meaningful content

---

## Work Log

### 2026-01-25 - Completed
- Root cause: `hasDisplayableContent()` was returning `true` for `tool_result` blocks with non-string content (objects), but `renderToolResult()` only renders string content that looks like code or bash output - all other content returns empty string
- Fixed `hasDisplayableContent()` to accurately predict what `renderToolResult()` will actually render:
  - Returns `false` for non-string content (which renderToolResult doesn't render)
  - Returns `false` for string content that doesn't look like code or bash output
  - Only returns `true` for strings containing code patterns (`function`, `const `, `import ` with newlines) or bash patterns (`$`, `npm`, `bun`)
- Files modified: `public/app.js`

### 2026-01-28 - Completed
- Root cause: `renderToolResult()` always returns `''` (tool results are now integrated into tool_use cards), but `hasDisplayableContent()` still had heuristic logic trying to predict which tool_result blocks would render. These heuristics were unreliable and caused regressions.
- Fix 1: Simplified `hasDisplayableContent()` to always return `false` for `tool_result` blocks, matching the fact that `renderToolResult()` never renders anything.
- Fix 2 (guardrail): Added empty-content check in `MessageLoader.loadMessage()` so that even if `hasDisplayableContent()` has a future bug, messages with empty rendered HTML are hidden (`display: none`) instead of showing empty boxes. The direct-render and SSE-append paths already had this guardrail; the lazy-loading path was missing it.
- Files modified: `public/app.js`
