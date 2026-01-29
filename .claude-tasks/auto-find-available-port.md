---
title: Auto-find available port when desired port is taken
status: completed
created: 2025-01-26
---

## Problem / Goal

When the desired port (default 3333 or user-specified) is already in use, the server crashes instead of gracefully finding an available port. It should automatically try the next port and inform the user which port it ended up using.

## Context

- `src/index.ts` (server startup, port binding)

## Acceptance Criteria

- [x] If the desired port is taken, automatically try subsequent ports until one is available
- [x] Print the actual port being used to the console so the user knows where to connect
- [x] Still respect `--port` flag as the preferred/starting port

---

## Work Log

### 2026-01-28 - Completed
- Added `isPortAvailable()` using Node's `net.createServer` to probe ports
- Added `findAvailablePort()` that tries up to 10 consecutive ports starting from the desired port
- If the desired port is taken, prints a message like "Port 3333 is in use, using port 3334 instead."
- The `--port` flag is still respected as the starting port for the search
- Files modified: `src/index.ts`
