#!/bin/bash
# Autonomous task runner for Claude Code
# Loops through .claude-tasks/ and completes all pending tasks

set -e

TASKS_DIR=".claude-tasks"
MAX_ITERATIONS=20  # Safety limit to prevent infinite loops

count_pending() {
    grep -l "status: pending" "$TASKS_DIR"/*.md 2>/dev/null | grep -v "TEMPLATE.md" | wc -l | tr -d ' '
}

notify() {
    local title="$1"
    local message="$2"
    osascript -e "display notification \"$message\" with title \"$title\""
}

echo "=== Claude Task Runner ==="
echo "Tasks directory: $TASKS_DIR"

iteration=0
while true; do
    pending=$(count_pending)

    if [ "$pending" -eq 0 ]; then
        echo ""
        echo "All tasks completed!"
        notify "Claude Task Runner" "All tasks completed! ($iteration iterations)"
        break
    fi

    iteration=$((iteration + 1))
    if [ "$iteration" -gt "$MAX_ITERATIONS" ]; then
        echo ""
        echo "Reached max iterations ($MAX_ITERATIONS). Stopping."
        notify "Claude Task Runner" "Stopped: max iterations reached ($MAX_ITERATIONS)"
        exit 1
    fi

    # Get the first pending task
    next_task=$(grep -l "status: pending" "$TASKS_DIR"/*.md 2>/dev/null | grep -v "TEMPLATE.md" | head -1)
    task_title=$(grep "^title:" "$next_task" | sed 's/^title: *//')

    echo ""
    echo "--- Iteration $iteration | $pending pending task(s) | Working on: $task_title ---"

    # Record the current HEAD so we can verify a commit was made
    head_before=$(git rev-parse HEAD 2>/dev/null || echo "none")

    # Run Claude to work on the next task
    # --print: non-interactive mode, outputs response only
    # --dangerously-skip-permissions: no permission prompts
    claude --print --dangerously-skip-permissions \
        "Work on the next pending task in .claude-tasks/. Follow the task system instructions in CLAUDE.md: read the task, set status to in-progress, complete the work, update the Work Log with today's date and files modified, then set status to completed. IMPORTANT: You MUST commit exactly ONE task per commit. Do NOT work on multiple tasks. Do NOT finish without committing. Commit all changes (including the task file update) as a single commit with a message referencing the task. Do NOT ask any questions - make reasonable decisions and proceed."

    echo ""

    # Verify that a commit was actually made for this task
    head_after=$(git rev-parse HEAD 2>/dev/null || echo "none")
    if [ "$head_before" = "$head_after" ]; then
        echo "WARNING: No commit was made for task: $task_title"
        echo "Checking for uncommitted changes..."
        if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
            echo "ERROR: Found uncommitted changes after task iteration. Committing them now."
            git add -A
            git commit -m "Complete task: $task_title

(Auto-committed by task runner - Claude failed to commit)"
        fi
    else
        echo "Task iteration complete. Commit verified."
    fi
done

echo ""
echo "=== Task Runner Finished ==="
echo "Completed $iteration iteration(s)"
