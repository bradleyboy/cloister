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

    # --- Staff Engineer Code Review ---
    task_basename=$(basename "$next_task")

    # Skip review for review-fix tasks (safety valve)
    if [[ "$task_basename" == review-fix-* ]]; then
        echo "Skipping review for review-fix task: $task_basename"
    else
        echo "Running staff engineer code review..."

        # Get the diff (truncate if over 500 lines)
        diff_output=$(git diff HEAD~1..HEAD 2>/dev/null || echo "")
        diff_lines=$(echo "$diff_output" | wc -l | tr -d ' ')
        file_list=$(git diff --name-only HEAD~1..HEAD 2>/dev/null || echo "")

        if [ "$diff_lines" -gt 500 ]; then
            diff_output=$(echo "$diff_output" | head -500)
            diff_output="$diff_output

... (truncated at 500 lines — $diff_lines total lines changed)

Full file list:
$file_list

NOTE: The diff was truncated. Read the files directly for full context."
        fi

        review_prompt="Review the following commit for task: $task_title
Task file: $next_task

<diff>
$diff_output
</diff>

Follow the instructions in REVIEW-PROMPT.md exactly."

        for review_attempt in 1 2; do
            echo "  Review attempt $review_attempt..."

            review_output=$(claude --print --dangerously-skip-permissions "$review_prompt" 2>/dev/null || echo "VERDICT: NO NOTES")

            # Parse verdict (fail-open: default to NO NOTES if parsing fails)
            verdict=$(echo "$review_output" | grep -m1 "VERDICT:" | grep -oi "PASS\|NEEDS WORK\|NO NOTES" | head -1)
            verdict=${verdict:-"NO NOTES"}

            echo "  Review verdict: $verdict"

            if [ "$verdict" = "NO NOTES" ]; then
                echo "  Clean review — no notes."
                break
            elif [ "$verdict" = "PASS" ]; then
                # Append review summary to task work log
                review_summary=$(echo "$review_output" | tail -5)
                echo "" >> "$next_task"
                echo "**Code review**: PASS — $review_summary" >> "$next_task"
                echo "  Review passed with notes. Appended to work log."
                break
            elif [ "$verdict" = "NEEDS WORK" ]; then
                # Append review feedback to task work log
                echo "" >> "$next_task"
                echo "**Code review (attempt $review_attempt)**: NEEDS WORK" >> "$next_task"
                echo "$review_output" | tail -20 >> "$next_task"

                if [ "$review_attempt" -eq 1 ]; then
                    echo "  Review found issues. Sending feedback for fix attempt..."

                    fix_prompt="A staff engineer reviewed your recent commit for task '$task_title' ($next_task) and found issues.

Review feedback:
$review_output

Fix the issues identified above. Read the task file and the relevant source files, make the corrections, and commit the changes. Do NOT ask questions — make reasonable decisions and proceed."

                    claude --print --dangerously-skip-permissions "$fix_prompt"

                    # Update diff for re-review
                    diff_output=$(git diff HEAD~1..HEAD 2>/dev/null || echo "")
                    diff_lines=$(echo "$diff_output" | wc -l | tr -d ' ')
                    if [ "$diff_lines" -gt 500 ]; then
                        file_list=$(git diff --name-only HEAD~1..HEAD 2>/dev/null || echo "")
                        diff_output=$(echo "$diff_output" | head -500)
                        diff_output="$diff_output

... (truncated at 500 lines — $diff_lines total lines changed)

Full file list:
$file_list

NOTE: The diff was truncated. Read the files directly for full context."
                    fi

                    review_prompt="Review the following commit for task: $task_title
Task file: $next_task

<diff>
$diff_output
</diff>

Follow the instructions in REVIEW-PROMPT.md exactly."
                else
                    echo "  Review still found issues after retry. Moving on."
                    notify "Claude Task Runner" "Review failed after retry: $task_title"
                fi
            fi
        done
    fi
done

echo ""
echo "=== Task Runner Finished ==="
echo "Completed $iteration iteration(s)"
