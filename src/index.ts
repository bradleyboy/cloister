#!/usr/bin/env bun
// Cloister - Local hub for Claude Code history

import { createServer } from "./server";

const DEFAULT_PORT = 3333;

function parseArgs(): { port: number; daemon: boolean } {
  const args = process.argv.slice(2);
  let port = DEFAULT_PORT;
  let daemon = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--port" || arg === "-p") {
      const portStr = args[++i];
      const parsed = parseInt(portStr, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 65536) {
        port = parsed;
      }
    } else if (arg === "--daemon" || arg === "-d") {
      daemon = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Cloister - Local hub for Claude Code history

Usage:
  cloister [options]
  bunx cloister [options]

Options:
  -p, --port <port>  Port to run server on (default: ${DEFAULT_PORT})
  -d, --daemon       Run in background (daemon mode)
  -h, --help         Show this help message
      `);
      process.exit(0);
    }
  }

  return { port, daemon };
}

async function main() {
  const { port, daemon } = parseArgs();
  const app = createServer();

  if (daemon) {
    // For daemon mode, we'd typically use a process manager
    // For now, just run in background-friendly mode
    console.log(`Starting Cloister daemon on port ${port}...`);
  }

  const url = `http://localhost:${port}`;
  const urlLine = `Running at ${url}`.padEnd(33);
  console.log(`
  ╭──────────────────────────────────────╮
  │                                      │
  │   Cloister                           │
  │   Local hub for Claude Code history  │
  │                                      │
  │   ${urlLine}  │
  │                                      │
  ╰──────────────────────────────────────╯
  `);

  Bun.serve({
    port,
    fetch: app.fetch,
  });
}

main().catch(console.error);
