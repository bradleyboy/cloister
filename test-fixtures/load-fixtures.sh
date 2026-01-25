#!/bin/bash
# Load test fixtures into Claude projects directory for manual testing

CLAUDE_PROJECTS_DIR="$HOME/.claude/projects"
TEST_PROJECT_DIR="$CLAUDE_PROJECTS_DIR/-Users-demo-test-project"

# Create test project directory
mkdir -p "$TEST_PROJECT_DIR"

# Copy the demo session
cp "$(dirname "$0")/demo-session.jsonl" "$TEST_PROJECT_DIR/demo-session-001.jsonl"

# Create an "awaiting" session (ends with AskUserQuestion)
cp "$(dirname "$0")/demo-session.jsonl" "$TEST_PROJECT_DIR/awaiting-session-002.jsonl"
# Truncate to end at the question
head -n 23 "$TEST_PROJECT_DIR/awaiting-session-002.jsonl" > "$TEST_PROJECT_DIR/awaiting-session-002.jsonl.tmp"
mv "$TEST_PROJECT_DIR/awaiting-session-002.jsonl.tmp" "$TEST_PROJECT_DIR/awaiting-session-002.jsonl"
# Touch to make it recent (within 5 min)
touch "$TEST_PROJECT_DIR/awaiting-session-002.jsonl"

# Create a "working" session (ends with user message/tool result)
cat > "$TEST_PROJECT_DIR/working-session-003.jsonl" << 'EOF'
{"type":"user","message":{"id":"msg-001","content":[{"type":"text","text":"Analyze this codebase and tell me what improvements can be made."}]},"timestamp":"2026-01-24T10:00:00.000Z"}
EOF
# Touch to make it recent
touch "$TEST_PROJECT_DIR/working-session-003.jsonl"

# Create a chain of sessions with same title
for i in 1 2 3; do
  cat > "$TEST_PROJECT_DIR/chain-session-00$i.jsonl" << EOF
{"type":"user","message":{"id":"msg-001","content":[{"type":"text","text":"Fix the authentication bug"}]},"timestamp":"2026-01-2${i}T10:00:00.000Z"}
{"type":"assistant","message":{"id":"msg-002","content":[{"type":"text","text":"I'll help fix the authentication bug. This is session $i of the chain."}]},"timestamp":"2026-01-2${i}T10:01:00.000Z"}
EOF
done

echo "Test fixtures loaded to: $TEST_PROJECT_DIR"
echo ""
echo "Created sessions:"
echo "  - demo-session-001: Full demo with all tool types"
echo "  - awaiting-session-002: Ends with AskUserQuestion (awaiting state)"
echo "  - working-session-003: Ends with user message (working state)"
echo "  - chain-session-00[1-3]: Three sessions with same title (chain test)"
echo ""
echo "Restart the notebook server to see the test sessions."
