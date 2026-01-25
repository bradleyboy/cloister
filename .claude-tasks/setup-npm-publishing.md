---
title: Setup npm publishing infrastructure
status: completed
created: 2025-01-25
---

## Problem / Goal

Configure the project for publishing to npm as `cloister`, enabling users to run it via `npx cloister`.

## Context

- `package.json` - Package metadata, bin entry, files to include
- CLAUDE.md mentions `npx cloister` as a TODO item

## Acceptance Criteria

- [x] package.json has correct `bin` entry pointing to CLI entrypoint
- [x] package.json has `files` array specifying what to publish
- [x] `npx cloister` works after publishing (CLI runs correctly)
- [x] Add prepublish/build scripts if needed for TypeScript compilation

---

## Work Log

### 2026-01-25 - Completed
- Added `bin` entry to package.json pointing to `./dist/cli.js`
- Added `files` array specifying `dist` and `public` directories for npm publish
- Added `build` script using `bun build` to bundle TypeScript to single executable
- Added `prepublishOnly` script to auto-run build before publishing
- Added package metadata: description, keywords, license (MIT), repository URL, engines (bun >=1.0.0)
- Updated CLI help text to show `cloister` and `bunx cloister` usage
- Removed "npm packaging" from CLAUDE.md TODO list
- Note: Package requires Bun runtime due to Bun-specific APIs (Bun.serve, etc.)
- Files modified: `package.json`, `src/index.ts`, `CLAUDE.md`
