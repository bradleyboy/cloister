---
title: Claude choice lists don't update live, only on reload
status: completed
created: 2026-01-25
---

## Problem / Goal

When a user is monitoring a live session and claude asks a multiple-choice question, the question and choices show up, but once the user answers, the display does not reflect the user's choices until the user refreshes the page. 

## Context

It's likely this is due to performance optimizations to only update the list with _new_ items. We'll need to figure out a way to fix this while also maintaining performance.

## Acceptance Criteria

- [x] Choice lists update live after a user has completed the question(s)
- [x] Long sessions maintain performance

---

## Work Log

### 2026-01-25 - Completed
- Root cause: When a `tool_result` message arrived via SSE containing the user's answer, it was appended as a new message but the existing question card wasn't updated
- Added detection in `appendMessage()` to check if incoming messages contain `tool_result` blocks that answer questions
- Added new function `updateQuestionCardIfNeeded()` that:
  - Finds the original `AskUserQuestion` tool_use block by matching `tool_use_id`
  - Parses the selected answers from the tool_result content
  - Finds the corresponding question card in the DOM by matching question text
  - Updates the card's title from "Claude is asking" to "Claude asked"
  - Adds the `selected` class to the chosen option(s)
- Performance maintained: only question cards are selectively updated, no full re-render
- Files modified: `public/app.js`

