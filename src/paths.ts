// Path resolution utilities for both development and npm package contexts

import { dirname, join, resolve } from "node:path";
import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Get the directory where this module is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolves the public directory path.
 * When running via npx, the dist folder is in the package root,
 * and public is a sibling directory.
 * When running in development, we're in src/ and public is at the project root.
 */
export async function resolvePublicDir(): Promise<string> {
  // Candidates in order of preference:
  // 1. Sibling of dist (npm package structure: package/dist/cli.js, package/public/)
  // 2. Current working directory (development: ./public/)
  // 3. Parent of __dirname (development from src/: ../public/)

  const candidates = [
    join(__dirname, "..", "public"), // npm package: dist/../public
    join(process.cwd(), "public"), // development cwd
    resolve("public"), // relative to cwd
  ];

  for (const candidate of candidates) {
    try {
      const s = await stat(candidate);
      if (s.isDirectory()) {
        return candidate;
      }
    } catch {
      // Try next candidate
    }
  }

  // Fallback to cwd-relative path (will fail gracefully on first request)
  return join(process.cwd(), "public");
}
