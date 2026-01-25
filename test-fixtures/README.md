# Test Fixtures

This directory contains test fixtures for manual QA testing of Cloister.

## Quick Start

```bash
./load-fixtures.sh
```

This will create test sessions in `~/.claude/projects/-Users-demo-test-project/`.

## What's Tested

### demo-session.jsonl

A comprehensive session that tests:

**Markdown Rendering:**
- Headers (h2, h3)
- Code blocks with language hints (TypeScript, Python, Rust, Go)
- Inline code
- Bold text
- Numbered and bulleted lists
- Tables
- Blockquotes

**Tool Cards:**
- `Read` - File reading with result display
- `Edit` - Diff view with old/new code
- `Write` - Full file content with syntax highlighting
- `Glob` - Pattern search
- `Grep` - Content search
- `Bash` - Command execution with output
- `TaskCreate` - Creating tasks
- `TaskUpdate` - Updating task status
- `TaskList` - Displaying task list with status icons
- `Task` (subagent) - Agent spawning
- `AskUserQuestion` - Question card with options and selected answer

**Other Features:**
- Thinking blocks (collapsible)
- Multiple languages for syntax highlighting
- Tool results

### Generated Sessions

The `load-fixtures.sh` script also creates:

| Session | Tests |
|---------|-------|
| `awaiting-session-002` | "Awaiting input" status, floating indicator |
| `working-session-003` | "Working" status indicator |
| `chain-session-00[1-3]` | Session chain detection and collapsing |

## Manual Test Checklist

After loading fixtures:

1. [ ] Session list loads without errors
2. [ ] Demo session shows syntax-highlighted code blocks
3. [ ] All tool cards render with appropriate icons
4. [ ] Edit tool shows diff with red/green highlighting
5. [ ] TaskList shows tasks with status checkboxes
6. [ ] AskUserQuestion shows selected answer highlighted
7. [ ] Thinking block is collapsed by default, expands on click
8. [ ] Tables render correctly
9. [ ] Awaiting session shows yellow highlight in list
10. [ ] Awaiting session shows top banner and floating indicator
11. [ ] Working session shows purple "Working..." indicator
12. [ ] Chain sessions are grouped with collapse toggle
13. [ ] Scroll to bottom works on session load
14. [ ] Scrolling doesn't snap back unexpectedly
15. [ ] Performance is acceptable with demo session (~30 messages)

## Cleanup

To remove test fixtures:

```bash
rm -rf ~/.claude/projects/-Users-demo-test-project
```
