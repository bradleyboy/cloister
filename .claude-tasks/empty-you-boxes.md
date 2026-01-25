---
title: [Bug] Empty "You" boxes
status: completed
created: 2025-01-25
---

## Problem / Goal

Early on in the development of this project, we fixed an issue where some "You" boxes were empty. This has regressed and we now see empty boxes again. 

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

