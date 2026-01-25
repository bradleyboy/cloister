# Proposal: Claude Notebook

**A local hub for browsing Claude Code conversation history**

---

## Executive Summary

Claude Notebook is a lightweight, beautifully designed local web interface for viewing and searching all Claude Code sessions. It runs as a simple local server, requires no database, and reads directly from Claude's existing session files.

---

## Mechanism: Standalone Local Server

After evaluating the options (Plugin, Skill, MCP Server), I recommend a **standalone local server** for the following reasons:

1. **Independence** - Works without an active Claude Code session
2. **Simplicity** - One command to start: `npx claude-notebook` or `claude-notebook serve`
3. **No Configuration** - Reads directly from `~/.claude/projects/`
4. **Daemon Mode** - Can run in background with `--daemon` flag
5. **Future Extensibility** - Could later integrate as a Claude Code plugin if desired

---

## Technical Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Runtime** | Bun | Fast startup, built-in TypeScript, excellent file watching |
| **Server** | Hono | Lightweight, fast, excellent TypeScript support |
| **Frontend** | Vanilla HTML/CSS/JS | Zero build step, instant loading, no framework bloat |
| **Styling** | Custom CSS | Full control over design aesthetics |
| **Code Highlighting** | Shiki | Same highlighter VS Code uses, beautiful themes |
| **Real-time Updates** | Server-Sent Events | Simple, efficient, built-in reconnection |
| **Database** | None | Reads JSONL files directly; uses file mtimes for caching |

---

## Data Architecture

Claude Code stores sessions in a predictable structure:

```
~/.claude/
├── history.jsonl          # User prompts with timestamps + sessionIds
└── projects/
    └── {encoded-path}/    # e.g., -Users-bdaily-code-project
        ├── {uuid}.jsonl   # Full session conversations
        └── agent-*.jsonl  # Subagent sessions
```

Each session JSONL contains messages with:
- `type`: user | assistant | summary | file-history-snapshot
- `message.content`: Array of text, tool_use, tool_result, or thinking blocks
- `timestamp`, `uuid`, `parentUuid` for ordering
- `cwd`, `sessionId`, `version`, `gitBranch` for metadata

---

## Automatic Tag Classification

Sessions will be automatically classified using keyword analysis:

| Tag | Detection |
|-----|-----------|
| `debugging` | Error messages, stack traces, "fix", "bug" |
| `refactoring` | "refactor", "rename", "extract", "move" |
| `feature` | "add", "implement", "create", "new" |
| `testing` | "test", "spec", "jest", "pytest" |
| `git` | Git commands, commits, PRs |
| `docs` | Markdown files, README, documentation |
| `config` | Config files, .env, settings |

Tags appear as filterable chips in the sidebar.

---

## Information Architecture

### Session List View (Home)
```
┌─────────────────────────────────────────────────────────────────────┐
│  Claude Notebook                                    [Search...]     │
├──────────────────┬──────────────────────────────────────────────────┤
│                  │                                                  │
│  FILTERS         │  ┌────────────────────────────────────────────┐  │
│                  │  │ ● "Fix authentication bug in login..."     │  │
│  ○ All Sessions  │  │   ~/code/myapp · 2 hours ago               │  │
│  ○ Today         │  │   debugging  refactoring                   │  │
│  ○ This Week     │  └────────────────────────────────────────────┘  │
│                  │                                                  │
│  TAGS            │  ┌────────────────────────────────────────────┐  │
│                  │  │   "Add user profile page with avatar..."   │  │
│  [debugging] 12  │  │   ~/code/myapp · Yesterday                 │  │
│  [feature] 8     │  │   feature  react                           │  │
│  [git] 5         │  └────────────────────────────────────────────┘  │
│                  │                                                  │
│  PROJECTS        │  ┌────────────────────────────────────────────┐  │
│                  │  │   "Explore codebase structure..."          │  │
│  myapp (15)      │  │   ~/code/other · 3 days ago                │  │
│  api-server (8)  │  │   exploration                              │  │
│  docs (3)        │  └────────────────────────────────────────────┘  │
│                  │                                                  │
└──────────────────┴──────────────────────────────────────────────────┘
```

### Session Detail View
```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back    "Fix authentication bug in login flow"                   │
│            ~/code/myapp · Jan 24, 2026 · 45 messages                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ YOU ────────────────────────────────────────────────────────┐   │
│  │ The login is failing with a 401 error. Can you help debug?   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ CLAUDE ─────────────────────────────────────────────────────┐   │
│  │ I'll investigate the authentication flow. Let me start by    │   │
│  │ looking at the login handler.                                 │   │
│  │                                                               │   │
│  │ ┌─ Read: src/auth/login.ts ────────────────────────────────┐ │   │
│  │ │ 1  import { verify } from './jwt';                        │ │   │
│  │ │ 2                                                         │ │   │
│  │ │ 3  export async function login(req, res) {                │ │   │
│  │ │ 4    const { email, password } = req.body;                │ │   │
│  │ │ ...                                                       │ │   │
│  │ └───────────────────────────────────────────────────────────┘ │   │
│  │                                                               │   │
│  │ I found the issue. The JWT secret is undefined...             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ CLAUDE ─────────────────────────────────────────────────────┐   │
│  │ ┌─ Edit: src/auth/login.ts ────────────────────────────────┐ │   │
│  │ │  - const secret = process.env.SECRET;                     │ │   │
│  │ │  + const secret = process.env.JWT_SECRET;                 │ │   │
│  │ └───────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Design System

### Message Types

| Type | Visual Treatment |
|------|-----------------|
| **User Message** | Left-aligned, subtle background, "YOU" label |
| **Assistant Text** | Left-aligned, "CLAUDE" label, full-width |
| **Tool Use** | Collapsible card with icon (Read, Edit, Bash, etc.) |
| **Tool Result** | Nested inside tool use, syntax highlighted |
| **Thinking** | Collapsed by default, italic, dimmed |
| **Code Block** | Dark background, line numbers, copy button, language tag |
| **Diff** | Red/green highlighting for edits |

### Code Blocks

Code blocks are critical for this use case. Design priorities:
- Shiki syntax highlighting (VS Code quality)
- Line numbers (toggleable)
- Language label in corner
- Copy button on hover
- Horizontal scroll for long lines (no wrapping)
- Dark theme (GitHub Dark default)

---

## Real-time Updates

For sessions currently open in Claude Code:

1. **File Watching** - Server watches active session JSONL files
2. **SSE Push** - When file changes, parse new lines and push to browser
3. **Smooth Append** - New messages animate in at bottom
4. **Activity Indicator** - Pulsing dot shows session is active

---

## Session Status Detection & Notifications

A key feature: **alerting users when Claude is waiting for their input**.

### Session States

| State | Visual | Detection Logic |
|-------|--------|-----------------|
| **Working** | Purple pulsing dot, "Working..." | Last assistant message has pending `tool_use` |
| **Awaiting Input** | Amber pulsing dot, "Needs input" | Last message is assistant with no pending tools, OR `AskUserQuestion` tool was used |
| **Idle** | Green dot, "Live" | Session file exists but no recent changes |
| **Closed** | No indicator | No file watcher active |

### Detection Algorithm

```typescript
function getSessionStatus(messages: Message[]): SessionStatus {
  const lastMsg = messages[messages.length - 1];

  // If last message is from user, Claude is working on response
  if (lastMsg.type === 'user') return 'working';

  // Check assistant message content
  const content = lastMsg.message.content;

  // Explicit question = awaiting
  const hasQuestion = content.some(c =>
    c.type === 'tool_use' && c.name === 'AskUserQuestion'
  );
  if (hasQuestion) return 'awaiting';

  // Pending tool call = working
  const hasPendingTool = content.some(c => c.type === 'tool_use');
  // Check if there's a corresponding tool_result in next message
  // If not, still working
  if (hasPendingTool && !hasToolResult(messages)) return 'working';

  // Default: Claude finished, waiting for user
  return 'awaiting';
}
```

### Browser Notifications

When a session transitions to "Awaiting Input":

1. **In-page banner** - Prominent amber banner at top of session detail
2. **List view badge** - Amber highlight on session card
3. **Browser notification** - Uses Web Notifications API
   - Title: "Claude needs your input"
   - Body: First line of the question or session title
   - Click to focus browser and jump to session
   - `requireInteraction: true` - stays until dismissed
4. **Tab title** - Changes to "(1) Claude Notebook" with count of awaiting sessions

### Notification Settings

Users can configure in the UI:
- Enable/disable browser notifications
- Sound alerts (optional)
- Which sessions to watch (all, favorites, specific projects)

---

## Search Implementation

Full-text search across all sessions:

```
[Search: "authentication jwt"]
```

Search indexes:
- User prompts
- Assistant responses (text only, not tool output)
- File paths mentioned
- Git commit messages

Results ranked by:
1. Recency
2. Match quality
3. Session length (longer = more substantial)

---

## CLI Interface

```bash
# Start server (foreground)
claude-notebook serve

# Start as daemon
claude-notebook serve --daemon

# Stop daemon
claude-notebook stop

# Open in browser
claude-notebook open

# Specify port
claude-notebook serve --port 3456
```

Default port: `3333` → http://localhost:3333

---

## File Structure

```
claude-notebook/
├── src/
│   ├── server.ts          # Hono server, API routes
│   ├── parser.ts          # JSONL parsing, message normalization
│   ├── tagger.ts          # Auto-classification logic
│   ├── watcher.ts         # File system watching for live updates
│   └── search.ts          # Full-text search implementation
├── public/
│   ├── index.html         # SPA shell
│   ├── styles.css         # All styles
│   ├── app.js             # Client-side JavaScript
│   └── shiki/             # Syntax highlighting assets
├── package.json
└── README.md
```

---

## Visual Example

Attached: `example.html` - A standalone HTML file demonstrating the proposed design, including:
- Session list with project grouping
- Session detail view with message types
- Code block styling with syntax highlighting
- Tool call cards (Read, Edit, Bash)
- Search interface
- Tag filtering

Open `example.html` in a browser to preview the design.

---

## Next Steps

1. **Review this proposal** and provide feedback on design direction
2. **Review example.html** for visual design approval
3. **Phase 1**: Build core server + session list
4. **Phase 2**: Session detail view + code highlighting
5. **Phase 3**: Search + filtering
6. **Phase 4**: Real-time updates
7. **Phase 5**: Package for distribution (npm)

---

*Submitted by Claude Opus 4.5*
