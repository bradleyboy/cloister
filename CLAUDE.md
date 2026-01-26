# Cloister

Local web UI for browsing Claude Code conversation history.

## Quick Start

```bash
npm install        # Install dependencies
npm run dev        # Start dev server with watch mode (localhost:3333)
npm run start      # Start production server
```

## Tech Stack

- **Runtime**: Node.js (18+)
- **Server**: Hono (TypeScript) with @hono/node-server
- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **Database**: None - reads directly from `~/.claude/projects/` JSONL files

## Architecture

```
src/
├── index.ts       # CLI entry point, Node.js HTTP server
├── server.ts      # Hono routes and SSE streaming
├── paths.ts       # Path resolution for dev vs npm package
├── sessions.ts    # Session discovery and parsing
├── parser.ts      # JSONL message parsing
├── tagger.ts      # Auto-classification (debugging, feature, git, etc.)
└── watcher.ts     # File watching for live updates

public/
├── index.html     # Single-page app shell
├── app.js         # Client-side state, rendering, SSE
└── styles.css     # All styles (CSS variables, dark theme)
```

## Key Patterns

**Data source**: Reads Claude Code session files from `~/.claude/projects/{encoded-path}/{uuid}.jsonl`

**Real-time updates**: SSE (Server-Sent Events) at `/api/sessions/:id/events` for live session watching

**Lazy loading**: Sessions with 20+ messages use `IntersectionObserver` to defer content rendering and syntax highlighting until visible. See `MessageLoader` class in `app.js:19`.

**Deferred tool results**: Collapsed tool cards store raw content in `data-raw-content` attribute and only render when user expands them.

**Session status**: Analyzes last message to detect `working` / `awaiting` / `idle` state.

## Code Conventions

- Vanilla JS in `public/` - no frameworks, no build step
- TypeScript in `src/`
- CSS custom properties for theming (`--bg-primary`, `--accent`, etc.)
- GitHub Dark color scheme

## Testing

- Test fixtures in `test-fixtures/` directory
- Manual testing: load sessions with 100+ messages to verify lazy loading performance

## Task System

This project uses a task specification system in `.claude-tasks/` for tracking bugs and features.

### Directory Structure

```
.claude-tasks/
├── fix-sse-reconnection.md
├── add-keyboard-navigation.md
└── search-across-sessions.md
```

### Task File Format

```markdown
---
title: Short descriptive title
status: pending
created: 2025-01-25
---

## Problem / Goal

What's broken or what should exist.

## Context

Relevant files, how it manifests, constraints.

## Acceptance Criteria

- [ ] Specific testable outcome
- [ ] What "done" looks like

---

## Work Log

### 2025-01-25 - Completed
- Solution summary
- Files modified: `src/foo.ts`, `src/bar.ts`
```

### Statuses

- `pending` - Available for work
- `in-progress` - Currently being worked on
- `completed` - Done and verified

### Running the Task Runner

```bash
./run-tasks.sh    # Runs Claude in a loop until all tasks are completed
```

The script runs non-interactively with `--dangerously-skip-permissions` to avoid prompts. It has a safety limit of 20 iterations.

### Autonomous Task Loop

When asked to "work on the next task" or similar:

1. Scan `.claude-tasks/*.md` for `status: pending`
2. Read and assess each pending task (severity, dependencies, complexity)
3. Select one task, set `status: in-progress`
4. Complete the work
5. Check off each acceptance criteria item (`- [ ]` → `- [x]`) as it is verified
6. Append to Work Log with date, solution summary, and files modified
7. Set `status: completed` (only after all acceptance criteria are checked off)
8. Commit all changes as a single commit with message referencing the task
9. Loop back to step 1 if requested

## Lessons Learned

Guidelines derived from past mistakes to avoid repeating them:

- **Search before inventing values**: When adding URLs, paths, names, or other values that likely already exist in the codebase, search for them first rather than guessing or constructing them from memory.

## Known Limitations & TODOs

**Not yet implemented**:
- Full-text search across sessions
- Browser notifications for "awaiting input" state
- Tab title badge with awaiting session count
- Daemon mode (`--daemon` flag is stubbed)

**Current limitations**:
- No persistence of user preferences (filters reset on refresh)
- Session chain detection relies on title matching
- Mobile layout is minimal (sidebar hidden)

**Performance notes**:
- Lazy loading threshold: 20 messages (see `LAZY_LOAD_THRESHOLD` in `renderMessages()`)
- Very large sessions (500+) may still have memory pressure from skeleton DOM nodes
