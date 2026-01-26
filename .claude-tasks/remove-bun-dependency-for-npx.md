---
title: Make npx work without requiring Bun
status: completed
created: 2025-01-25
---

## Problem / Goal

Running the package via `npx cloister` currently requires Bun to be installed. The package should be standalone so users can run it with just Node.js/npx without needing Bun as a dependency.

## Context

To be investigated. Likely involves:
- `package.json` (bin field, scripts, engines)
- Entry point files that may use Bun-specific APIs
- Build/bundle configuration

## Acceptance Criteria

- [x] `npx cloister` works on a system with only Node.js installed (no Bun)
- [x] All functionality remains intact when running via Node.js
- [x] Update documentation if usage instructions change

---

## Work Log

### 2026-01-26 - Completed

Migrated the entire project from Bun to Node.js:

**Problem identified:**
- `Bun.serve()` for HTTP server in `src/index.ts`
- `Bun.file()` for file reading in `src/server.ts`
- `serveStatic` from `hono/bun` for static file serving
- Build configuration targeting Bun runtime
- Shebang using `#!/usr/bin/env bun`

**Solution:**
- Added `@hono/node-server` dependency for Node.js HTTP server
- Replaced `Bun.serve()` with Hono's `serve()` function
- Replaced `Bun.file()` with Node.js `readFile` from `node:fs/promises`
- Replaced `serveStatic` from `hono/bun` with `@hono/node-server/serve-static`
- Created `src/paths.ts` to resolve public directory correctly in both dev and npm package contexts
- Updated `tsconfig.json` to use `NodeNext` module resolution
- Changed build from Bun bundler to `tsc`
- Added `.js` extensions to all local imports for ESM compatibility
- Changed shebang to `#!/usr/bin/env node`
- Updated `engines` field from `bun` to `node >=18.0.0`

**Files modified:**
- `src/index.ts`
- `src/server.ts`
- `src/sessions.ts`
- `src/watcher.ts`
- `src/tagger.ts`
- `src/paths.ts` (new)
- `package.json`
- `tsconfig.json`
- `README.md`
- `CLAUDE.md`
