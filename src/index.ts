#!/usr/bin/env node
// Cloister - Local hub for Claude Code history

import { createServer as createNetServer } from "node:net";
import { serve } from "@hono/node-server";
import { createServer } from "./server.js";

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
  npx cloister [options]

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

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createNetServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

async function findAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (port > 65535) break;
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found (tried ${startPort}-${startPort + maxAttempts - 1})`);
}

async function main() {
  const { port: desiredPort, daemon } = parseArgs();
  const app = await createServer();
  const port = await findAvailablePort(desiredPort);

  if (daemon) {
    // For daemon mode, we'd typically use a process manager
    // For now, just run in background-friendly mode
    console.log(`Starting Cloister daemon on port ${port}...`);
  }

  if (port !== desiredPort) {
    console.log(`Port ${desiredPort} is in use, using port ${port} instead.`);
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

  serve({
    fetch: app.fetch,
    port,
  });
}

main().catch(console.error);
