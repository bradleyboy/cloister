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

    # Run Claude to work on the next task
    # --print: non-interactive mode, outputs response only
    # --dangerously-skip-permissions: no permission prompts
    # --verbose: show what's happening
    claude --print --dangerously-skip-permissions \
        "Work on the next pending task in .claude-tasks/. Follow the task system instructions in CLAUDE.md: read the task, set status to in-progress, complete the work, update the Work Log with today's date and files modified, then set status to completed. Do NOT ask any questions - make reasonable decisions and proceed."

    echo ""
    echo "Task iteration complete."
done

echo ""
echo "=== Task Runner Finished ==="
echo "Completed $iteration iteration(s)"
